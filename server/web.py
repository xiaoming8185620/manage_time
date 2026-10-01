import hashlib
import ipaddress
import json
import secrets
import socket
import time
import unicodedata
import uuid
from functools import wraps
from pathlib import Path
from urllib.parse import urlsplit
from flask import Flask, request, jsonify, g, send_from_directory
from werkzeug.exceptions import HTTPException
from .domain import Problem, day_key, day_start, week_start, add_days
from .store import Store
from .mail import mail_config, read_config, recipient_from
from .weather import WeatherService


def create_app(data_dir, client_dir, config_path, clock=None, weather_fetcher=None):
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024
    store = Store(data_dir)
    app.extensions['town_store'] = store
    now = clock or (lambda: int(time.time() * 1000))
    weather = WeatherService(data_dir, now, **({'fetcher': weather_fetcher} if weather_fetcher else {}))
    app.extensions['town_weather'] = weather
    attempts = {}

    @app.before_request
    def guard():
        host = (urlsplit(request.host_url).hostname or '').lower()
        try:
            local_host = ipaddress.ip_address(host).is_private
        except ValueError:
            local_host = host in ('localhost', socket.gethostname().lower(), socket.gethostname().split('.')[0].lower() + '.local')
        if not local_host:
            raise Problem('请使用这台 Mac 的局域网 IP 地址访问。', 403)
        if request.path.startswith('/api/') and request.method not in ('GET', 'HEAD', 'OPTIONS'):
            origin = request.headers.get('Origin', '')
            if origin != f'{request.scheme}://{request.host}' or request.headers.get('Sec-Fetch-Site') == 'cross-site':
                raise Problem('请从小镇页面发起操作。', 403)

    @app.after_request
    def headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.errorhandler(Problem)
    def problem(error):
        return jsonify(error=str(error), current=error.current), error.status

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error='请求无法处理，请刷新后重试。'), error.code

    def body():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise Problem('请求格式不正确。')
        return data

    def session_user():
        token = request.cookies.get('miaomiao_session', '')
        if not token:
            return None
        g.token = hashlib.sha256(token.encode()).hexdigest()
        return store.one('SELECT users.id,name,role FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?', (g.token, now()))

    def auth(role=None):
        def decorator(fn):
            @wraps(fn)
            def wrapped(*args, **kwargs):
                g.user = session_user()
                if not g.user:
                    raise Problem('请重新输入名字进入小镇。', 401)
                if role and g.user['role'] != role:
                    raise Problem('请从“家长看记录”入口进行这个操作。' if role == 'parent' else '请用孩子的名字进入小镇。', 403)
                return fn(*args, **kwargs)
            return wrapped
        return decorator

    def throttle():
        key, stamp = request.remote_addr, now()
        with store.lock:
            if len(attempts) > 2000:
                attempts.clear()
            previous = [t for t in attempts.get(key, []) if stamp - t < 15 * 60000]
            if len(previous) >= 10:
                raise Problem('尝试次数较多，请 15 分钟后再试。', 429)
            attempts[key] = previous + [stamp]

    def read_name(data):
        value = data.get('name', '')
        if not isinstance(value, str):
            raise Problem('名字请填写 1—20 个字。')
        value = unicodedata.normalize('NFC', value.strip())
        if not 1 <= len(value) <= 20 or not value.isprintable():
            raise Problem('名字请填写 1—20 个字。')
        return value

    def enter(user):
        token = secrets.token_urlsafe(32)
        store.write('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), user['id'], now() + 7 * 86400000))
        public_user = {key: user[key] for key in ('id', 'name', 'role')}
        response = jsonify(user=public_user, child=store.child())
        response.set_cookie('miaomiao_session', token, max_age=7 * 86400, httponly=True, samesite='Strict', secure=request.is_secure)
        with store.lock:
            attempts.pop(request.remote_addr, None)
        return response

    @app.get('/api/session')
    def session():
        user = session_user()
        return jsonify(initialized=bool(store.settings()), canSetup=request.remote_addr in ('127.0.0.1', '::1'), user=user, child=store.child() if user else None)

    @app.post('/api/setup')
    def setup():
        if request.remote_addr not in ('127.0.0.1', '::1'):
            raise Problem('请先在运行服务的 Mac 上，用 localhost 打开页面并输入名字，让小镇安家。', 403)
        throttle()
        data, users = body(), []
        if 'email' in data or 'recipient' in data:
            raise Problem('收件邮箱由服务器固定配置，无需在页面填写。')
        name = read_name(data)
        for role in ('parent', 'child'):
            # Legacy columns remain for existing databases; names are the only child entry input.
            users.append(dict(id=str(uuid.uuid4()), role=role, username=role, name='家长' if role == 'parent' else name, password=''))
        store.setup(*users, '', now())
        return enter(users[1])

    @app.post('/api/login')
    def login():
        throttle()
        data = body()
        role = data.get('role', 'child')
        if role not in ('child', 'parent'):
            raise Problem('请选择小镇或家长记录入口。')
        user = store.one('SELECT id,name,role FROM users WHERE role=?', (role,))
        if not user:
            raise Problem('小镇还没有安家，请先在 Mac 上输入孩子的名字。', 409)
        if role == 'child' and read_name(data).casefold() != unicodedata.normalize('NFC', user['name'].strip()).casefold():
            raise Problem('请填写第一次进入小镇时使用的名字，进度还在等你。', 401)
        return enter(user)

    @app.post('/api/logout')
    @auth()
    def logout():
        store.write('DELETE FROM sessions WHERE token=?', (g.token,))
        response = jsonify(ok=True)
        response.delete_cookie('miaomiao_session')
        return response

    @app.get('/api/state')
    @auth()
    def state():
        return jsonify(store.state(store.child()['id']))

    @app.post('/api/actions')
    @auth('child')
    def actions():
        return jsonify(store.command(g.user['id'], body(), now()))

    @app.post('/api/import')
    @auth('child')
    def import_save():
        return jsonify(store.import_save(g.user['id'], body(), now()))

    @app.post('/api/usage')
    @auth('child')
    def usage():
        data = body()
        store.heartbeat(g.user['id'], g.token, data.get('tab'), data.get('active'), now())
        return jsonify(ok=True)

    @app.get('/api/weather')
    def current_weather():
        return jsonify(weather.get())

    @app.get('/api/report')
    @auth()
    def report():
        day = request.args.get('day', day_key(now()))
        day_start(day)
        if request.args.get('mode') == 'week':
            first = week_start(day)
            last = add_days(first, 6)
        else:
            first = last = day
        with store.lock:
            return jsonify(store.report(store.child()['id'], first, last, now()))

    @app.get('/api/reports')
    @auth()
    def reports():
        rows = store.report_list(store.child()['id'])
        if g.user['role'] == 'child':
            for row in rows:
                row.pop('recipient', None)
        return jsonify(reports=rows)

    @app.get('/api/settings')
    @auth('parent')
    def settings():
        return jsonify(mailEnabled=bool(store.settings()['mailEnabled']), recipient=recipient_from(read_config(config_path)), smtpConfigured=bool(mail_config(config_path)), reportTime='周日 20:00 · 北京时间')

    @app.post('/api/settings')
    @auth('parent')
    def save_settings():
        data = body()
        if 'email' in data or 'recipient' in data:
            raise Problem('收件邮箱由服务器固定配置，不能在页面修改。')
        if not isinstance(data.get('mailEnabled'), bool):
            raise Problem('请选择是否接收周报邮件。')
        store.write('UPDATE settings SET mail_enabled=? WHERE id=1', (int(data['mailEnabled']),))
        return jsonify(ok=True)

    @app.post('/api/reports/<identifier>/retry')
    @auth('parent')
    def retry_mail(identifier):
        report = store.one('SELECT mail_status FROM reports WHERE id=?', (identifier,))
        if not report or report['mail_status'] not in ('failed', 'unknown', 'disabled', 'unconfigured'):
            raise Problem('这份周报暂时无需重发。')
        if report['mail_status'] == 'unknown' and body().get('confirmPossibleDuplicate') is not True:
            raise Problem('上次发送结果未知，请先检查收件箱，再确认重试。')
        updated = store.write("UPDATE reports SET mail_status='pending',attempts=0,attempted_at=NULL WHERE id=? AND mail_status=?", (identifier, report['mail_status']))
        if not updated.rowcount:
            raise Problem('发送状态已经更新，请刷新投递记录后查看。', 409)
        return jsonify(ok=True)

    @app.get('/api/export')
    @auth()
    def export():
        state = store.state(store.child()['id'])['state']
        response = jsonify(state)
        response.headers['Content-Disposition'] = 'attachment; filename="miaomiao-save.json"'
        return response

    @app.get('/', defaults={'path': ''})
    @app.get('/<path:path>')
    def static(path):
        if path.startswith('api/'):
            raise Problem('接口不存在。', 404)
        root = Path(client_dir)
        if not (root / 'index.html').exists():
            return '前端尚未构建。请在项目目录执行 npm run build:family。', 503
        if path and (root / path).is_file():
            return send_from_directory(root, path)
        if path:
            raise Problem('文件不存在。', 404)
        return send_from_directory(root, 'index.html', max_age=0)

    return app
