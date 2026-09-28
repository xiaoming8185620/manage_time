import json
import sqlite3
import threading
import uuid
from contextlib import contextmanager, closing
from pathlib import Path
from .domain import Problem, initial_state, reduce_game, day_key, day_start, week_start, week_due, add_days, build_report, task_input, STATUSES, SLOTS, ITEMS
from .scene_care import restore_care, care_spent, care_detail
from .story import restore_story, story_spent, story_detail
from .sky_rewards import restore_sky_rewards, empty_sky_rewards


class Store:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(self.directory / 'town.sqlite', check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        (self.directory / 'town.sqlite').chmod(0o600)
        self.db.executescript('''PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
          CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE, name TEXT, role TEXT, password TEXT);
          CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), email TEXT, mail_enabled INTEGER, created_at INTEGER);
          CREATE TABLE IF NOT EXISTS states(user_id TEXT PRIMARY KEY, revision INTEGER, data TEXT);
          CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT, expires INTEGER);
          CREATE TABLE IF NOT EXISTS operations(id TEXT, user_id TEXT, PRIMARY KEY(id,user_id));
          CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, user_id TEXT, at INTEGER, kind TEXT, task TEXT, detail TEXT);
          CREATE INDEX IF NOT EXISTS events_user_at ON events(user_id,at);
          CREATE TABLE IF NOT EXISTS usage_cursor(session TEXT, tab TEXT, user_id TEXT, last_at INTEGER, active INTEGER, PRIMARY KEY(session,tab));
          CREATE TABLE IF NOT EXISTS usage_intervals(id INTEGER PRIMARY KEY, user_id TEXT, start INTEGER, end INTEGER);
          CREATE INDEX IF NOT EXISTS usage_user_time ON usage_intervals(user_id,start,end);
          CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, user_id TEXT, week TEXT, generated_at INTEGER, data TEXT, mail_status TEXT, attempts INTEGER DEFAULT 0, attempted_at INTEGER, sent_at INTEGER, recipient TEXT, UNIQUE(user_id,week));''')
        self.db.execute("UPDATE reports SET mail_status='unknown' WHERE mail_status='sending'")

    @contextmanager
    def transaction(self):
        with self.lock:
            self.db.execute('BEGIN IMMEDIATE')
            try:
                yield
                self.db.execute('COMMIT')
            except Exception:
                self.db.execute('ROLLBACK')
                raise

    def one(self, sql, args=()):
        with self.lock:
            row = self.db.execute(sql, args).fetchone()
            return dict(row) if row else None

    def all(self, sql, args=()):
        with self.lock:
            return [dict(r) for r in self.db.execute(sql, args).fetchall()]

    def write(self, sql, args=()):
        with self.lock:
            return self.db.execute(sql, args)

    def settings(self):
        return self.one('SELECT email,mail_enabled AS mailEnabled,created_at AS createdAt FROM settings WHERE id=1')

    def child(self):
        return self.one("SELECT id,username,name,role FROM users WHERE role='child'")

    def setup(self, parent, child, email, now):
        with self.transaction():
            if self.settings():
                raise Problem('小镇已经初始化。', 409)
            for user in (parent, child):
                self.write('INSERT INTO users VALUES(?,?,?,?,?)', (user['id'], user['username'], user['name'], user['role'], user['password']))
            self.write('INSERT INTO settings VALUES(1,?,1,?)', (email, now))
            self.write('INSERT INTO states VALUES(?,0,?)', (child['id'], json.dumps(initial_state(now))))

    def state(self, user):
        row = self.one('SELECT revision,data FROM states WHERE user_id=?', (user,))
        return dict(revision=row['revision'], state=json.loads(row['data']))

    def event(self, user, now, kind, task=None, detail=None):
        self.write('INSERT INTO events VALUES(?,?,?,?,?,?)', (str(uuid.uuid4()), user, now, kind, json.dumps(task) if task else None, detail))

    def command(self, user, payload, now):
        op, revision = payload.get('operationId'), payload.get('revision')
        if not isinstance(op, str) or not 10 <= len(op) <= 80 or type(revision) is not int:
            raise Problem('操作格式无效。')
        with self.transaction():
            current = self.state(user)
            if self.one('SELECT id FROM operations WHERE id=? AND user_id=?', (op, user)):
                return current
            if current['revision'] != revision:
                raise Problem('另一台设备更新了小镇，请按最新进度重试。', 409, current)
            action = payload.get('action')
            state = reduce_game(current['state'], action, now)
            old_tasks = {t['id']: t for t in current['state']['tasks']}
            for task in state['tasks']:
                old = old_tasks.get(task['id'])
                if old != task:
                    kind = action['type'] if not old or task['id'] == action.get('id') else 'PAUSE_TASK'
                    self.event(user, now, kind, task)
            if action['type'] in ('GREET', 'BUILD', 'REFLECT') and state != current['state']:
                self.event(user, now, action['type'], detail=action.get('itemId') or action.get('answer'))
            if action['type'] == 'CARE_SCENE' and state != current['state']:
                self.event(user, now, 'CARE_SCENE', detail=care_detail(action, state))
            if action['type'] == 'UNLOCK_STORY' and state != current['state']:
                self.event(user, now, 'UNLOCK_STORY', detail=story_detail(action))
            if action['type'] == 'PICKUP_SKY_COIN' and state != current['state']:
                self.event(user, now, 'PICKUP_SKY_COIN', detail='拾起云晶采集掉落的 1 星球币')
            self.write('UPDATE states SET data=?,revision=revision+1 WHERE user_id=?', (json.dumps(state), user))
            self.write('INSERT INTO operations VALUES(?,?)', (op, user))
            return self.state(user)

    def import_save(self, user, raw, now):
        if not isinstance(raw, dict) or raw.get('version') != 1 or not isinstance(raw.get('tasks'), list) or len(raw['tasks']) > 2000:
            raise Problem('这份存档无法读取。')
        state = initial_state(now)
        try:
            for source in raw['tasks']:
                if source['status'] not in STATUSES or not isinstance(source['id'], str) or not 1 <= len(source['id']) <= 80:
                    raise ValueError()
                created = source.get('createdAt', now)
                if not isinstance(created, (int, float)) or not 0 <= created <= now:
                    raise ValueError()
                t = {**task_input({**source, 'day': source.get('day') or day_key(created)}, now), 'id': source['id'], 'createdAt': created, 'status': 'paused' if source['status'] == 'active' else source['status'], 'startedAt': None, 'elapsedMs': max(0, min(float(source.get('elapsedMs', 0)), 31536000000)), 'rewardClaimed': bool(source.get('rewardClaimed')), 'note': str(source.get('note', ''))[:240], 'imported': True}
                if t['status'] == 'done':
                    actual = source['actualMinutes']
                    finished = source['finishedAt']
                    if not isinstance(actual, (int, float)) or not 1 <= actual <= 1440 or not isinstance(finished, (int, float)) or not created <= finished <= now:
                        raise ValueError()
                    t.update(actualMinutes=actual, finishedAt=finished)
                if any(existing['id'] == t['id'] for existing in state['tasks']):
                    raise ValueError()
                state['tasks'].append(t)
            buildings = raw.get('buildings', [])
            if not isinstance(buildings, list) or len(buildings) > 2 or len({b['itemId'] for b in buildings}) != len(buildings) or len({b['slot'] for b in buildings}) != len(buildings):
                raise ValueError()
            for b in buildings:
                if b['itemId'] not in ITEMS or b['slot'] not in SLOTS:
                    raise ValueError()
                state['buildings'].append(dict(itemId=b['itemId'], slot=b['slot'], builtAt=min(float(b.get('builtAt', now)), now)))
            state['care'] = restore_care(raw.get('care', {}), state['buildings'], now)
            state['storyUnlocked'] = restore_story(raw.get('storyUnlocked', []))
            state['skyRewards'] = restore_sky_rewards(raw.get('skyRewards', empty_sky_rewards()))
            state['coins'] = state['skyRewards']['earned'] + 10 * sum(t['status'] == 'done' and t['rewardClaimed'] for t in state['tasks']) - 10 * len(buildings) - care_spent(state['care']) - story_spent(state['storyUnlocked'])
            if state['coins'] < 0:
                raise ValueError()
            state['greeted'] = bool(raw.get('greeted'))
            state['achievements'] = [a for a in raw.get('achievements', []) if a in ('friend', 'plan', 'adjust', 'build', 'reflect')]
            state['reflections'] = [r for r in raw.get('reflections', []) if isinstance(r, dict) and r.get('answer') in ('faster','similar','longer') and any(t['id'] == r.get('taskId') and t['status'] == 'done' for t in state['tasks'])]
        except (KeyError, TypeError, ValueError, OverflowError):
            raise Problem('存档中的任务或建设记录不完整。原文件不会被修改。')
        with self.transaction():
            current = self.state(user)
            if current['revision']:
                raise Problem('只可导入全新的小镇；已有进度不会被覆盖。', 409)
            self.write('UPDATE states SET data=?,revision=1 WHERE user_id=?', (json.dumps(state), user))
            for task in state['tasks']:
                self.event(user, now, 'IMPORT', task)
        return self.state(user)

    def heartbeat(self, user, session, tab, active, now):
        if not isinstance(tab, str) or not 10 <= len(tab) <= 80 or not isinstance(active, bool):
            raise Problem('使用记录格式无效。')
        with self.transaction():
            previous = self.one('SELECT last_at,active FROM usage_cursor WHERE session=? AND tab=?', (session, tab))
            if previous and previous['active'] and 0 < now - previous['last_at'] <= 45000:
                overlaps = self.all('SELECT id,start,end FROM usage_intervals WHERE user_id=? AND end>=? AND start<=?', (user, previous['last_at'], now))
                start, end = min([previous['last_at']] + [r['start'] for r in overlaps]), max([now] + [r['end'] for r in overlaps])
                for row in overlaps:
                    self.write('DELETE FROM usage_intervals WHERE id=?', (row['id'],))
                self.write('INSERT INTO usage_intervals(user_id,start,end) VALUES(?,?,?)', (user, start, end))
            self.write('INSERT INTO usage_cursor VALUES(?,?,?,?,?) ON CONFLICT(session,tab) DO UPDATE SET last_at=excluded.last_at,active=excluded.active', (session, tab, user, now, int(active)))

    def report(self, user, first, last, now):
        events = self.all('SELECT at,kind,task,detail FROM events WHERE user_id=? ORDER BY at,rowid', (user,))
        for event in events:
            event['task'] = json.loads(event['task']) if event['task'] else None
        return build_report(self.state(user)['state'], events, self.all('SELECT start,end FROM usage_intervals WHERE user_id=?', (user,)), first, last, now)

    def generate_due_reports(self, now):
        with self.lock:
            settings = self.settings()
            if not settings:
                return
            user = self.child()['id']
            week = week_start(day_key(settings['createdAt']))
            while week <= day_key(now):
                if now >= week_due(week) and not self.one('SELECT id FROM reports WHERE user_id=? AND week=?', (user, week)):
                    data = self.report(user, week, add_days(week, 6), now)
                    self.write('INSERT OR IGNORE INTO reports(id,user_id,week,generated_at,data,mail_status) VALUES(?,?,?,?,?,?)', (str(uuid.uuid4()), user, week, now, json.dumps(data), 'pending' if settings['mailEnabled'] else 'disabled'))
                week = add_days(week, 7)

    def report_list(self, user):
        return self.all('SELECT id,week,generated_at AS generatedAt,mail_status AS mailStatus,sent_at AS sentAt,recipient FROM reports WHERE user_id=? ORDER BY week DESC', (user,))

    def backup(self, now):
        directory = self.directory / 'backups'
        directory.mkdir(exist_ok=True, mode=0o700)
        path = directory / f'{day_key(now)}.sqlite'
        if path.exists():
            return
        temporary = path.with_suffix('.tmp')
        with self.lock, closing(sqlite3.connect(temporary)) as destination:
            self.db.backup(destination)
        temporary.chmod(0o600)
        temporary.replace(path)
        for old in sorted(directory.glob('????-??-??.sqlite'))[:-14]:
            old.unlink()

    def close(self):
        self.db.close()
