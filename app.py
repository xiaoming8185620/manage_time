"""Run the family edition with: python3 app.py --host 0.0.0.0 --port 4180."""
import argparse
import logging
import os
import threading
import time
from pathlib import Path
from server.web import create_app
from server.mail import run_jobs

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description='星球悬浮小镇 · 家庭服务器')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址，0.0.0.0 允许局域网访问')
    parser.add_argument('--port', type=int, default=4180)
    parser.add_argument('--data-dir', default=str(ROOT / 'data' / 'family'))
    parser.add_argument('--mail-config', default=str(ROOT / 'mail-config.json'))
    args = parser.parse_args()
    os.umask(0o077)
    try:
        from waitress import serve
    except ImportError:
        parser.exit(1, '缺少依赖。请先执行：python3 -m pip install -r requirements.txt\n')
    app = create_app(args.data_dir, ROOT / 'dist' / 'family', args.mail_config)
    store = app.extensions['town_store']
    stop = threading.Event()

    def jobs():
        while not stop.is_set():
            try:
                run_jobs(store, int(time.time() * 1000), args.mail_config)
            except Exception:
                logging.exception('周报或备份任务失败，将在下一轮重试')
            stop.wait(60)

    threading.Thread(target=jobs, daemon=True, name='weekly-reports').start()
    print(f'星球悬浮小镇已启动：http://127.0.0.1:{args.port}；其他设备使用 http://旧Mac的局域网IP:{args.port}', flush=True)
    print('第一次请在这台 Mac 上输入孩子的名字。数据保存在：' + str(Path(args.data_dir).resolve()), flush=True)
    try:
        serve(app, host=args.host, port=args.port, threads=4, max_request_body_size=2 * 1024 * 1024, clear_untrusted_proxy_headers=True)
    finally:
        stop.set()


if __name__ == '__main__':
    main()
