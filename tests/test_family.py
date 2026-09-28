import json
import shutil
import smtplib
import subprocess
import tempfile
import unittest
import uuid
from pathlib import Path
from server.domain import initial_state, reduce_game, Problem, day_start, day_key, week_start, week_due
from server.store import Store
from server.mail import run_jobs
from server.web import create_app

ROOT = Path(__file__).resolve().parents[1]
MONDAY = day_start('2026-09-21')
TASK = dict(id='math', title='数学前六题', category='学习', estimate=25, startTime='17:30', day='2026-09-21')


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.parent = dict(id='p', username='parent', name='家长', role='parent', password='not-a-real-password')
        self.child = dict(id='c', username='child', name='验收居民', role='child', password='not-a-real-password')
        self.store.setup(self.parent, self.child, 'parent@example.invalid', MONDAY)
        self.mail_path = Path(self.temp.name) / 'mail.json'

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, at=MONDAY, op=None, revision=None):
        current = self.store.state('c')
        return self.store.command('c', dict(action=action, operationId=op or str(uuid.uuid4()), revision=current['revision'] if revision is None else revision), at)

    def task(self):
        self.act(dict(type='ADD_TASK', task=TASK))

    def configure_mail(self):
        self.mail_path.write_text(json.dumps(dict(host='smtp.example.invalid', port=465, username='qa', password='qa-fixture-only', recipient='fixed@example.invalid', **{'from': 'qa@example.invalid'})))

    def test_partial_pause_completion_and_reward_are_preserved(self):
        self.task()
        self.act(dict(type='START_TASK', id='math'), MONDAY + 1000)
        self.act(dict(type='PAUSE_TASK', id='math'), MONDAY + 61000)
        self.act(dict(type='RECORD_TASK', id='math', status='partial', note='完成前四题'), MONDAY + 62000)
        self.assertEqual(self.store.state('c')['state']['tasks'][0]['elapsedMs'], 60000)
        self.act(dict(type='RECORD_TASK', id='math', status='done', actualMinutes=35), MONDAY + 100000)
        identifier = str(uuid.uuid4())
        first = self.act(dict(type='CLAIM_REWARD', id='math'), op=identifier)
        replay = self.act(dict(type='CLAIM_REWARD', id='math'), op=identifier, revision=0)
        self.assertEqual(first, replay)
        self.act(dict(type='CLAIM_REWARD', id='math'))
        self.assertEqual(self.store.state('c')['state']['coins'], 10)
        self.assertEqual(self.store.report('c', '2026-09-21', '2026-09-21', MONDAY + 200000)['completedCount'], 1)

    def test_daily_snapshot_does_not_change_when_tomorrow_changes(self):
        self.task()
        self.act(dict(type='RECORD_TASK', id='math', status='partial', note='先做四题'), MONDAY + 1000)
        self.act(dict(type='EDIT_TASK', id='math', task={**TASK, 'title': '剩下两题', 'day': '2026-09-22'}), MONDAY + 86400000)
        self.act(dict(type='RECORD_TASK', id='math', status='done', actualMinutes=15), MONDAY + 86460000)
        old = self.store.report('c', '2026-09-21', '2026-09-21', MONDAY + 2 * 86400000)
        self.assertEqual(old['tasks'][0]['title'], '数学前六题')
        self.assertEqual(old['tasks'][0]['status'], 'partial')
        self.assertEqual(old['completedCount'], 0)
        new = self.store.report('c', '2026-09-22', '2026-09-22', MONDAY + 2 * 86400000)
        self.assertEqual(new['completedCount'], 1)

    def test_stale_device_cannot_overwrite_new_progress(self):
        self.task()
        with self.assertRaises(Problem) as context:
            self.act(dict(type='START_TASK', id='math'), revision=0)
        self.assertEqual(context.exception.status, 409)
        self.assertEqual(self.store.state('c')['state']['tasks'][0]['status'], 'planned')

    def test_backdated_plan_is_visible_and_labeled_as_later_entry(self):
        later = MONDAY + 86400000
        self.act(dict(type='ADD_TASK', task=TASK), later)
        record = self.store.report('c', '2026-09-21', '2026-09-21', later + 1000)
        self.assertEqual(record['plannedCount'], 1)
        self.assertEqual(record['tasks'][0]['recordedLaterAt'], later)
        self.assertEqual(record['activities'], [])

    def test_usage_union_midnight_and_hidden_gap(self):
        midnight = MONDAY + 86400000
        for session in ('session-one', 'session-two'):
            self.store.heartbeat('c', session, 'valid-tab-identifier', True, midnight - 15000)
            self.store.heartbeat('c', session, 'valid-tab-identifier', False, midnight + 15000)
        self.assertEqual(self.store.report('c', '2026-09-21', '2026-09-21', midnight + 50000)['usageMs'], 14999)
        self.assertEqual(self.store.report('c', '2026-09-22', '2026-09-22', midnight + 50000)['usageMs'], 15000)
        self.store.heartbeat('c', 'session-one', 'valid-tab-identifier', True, midnight + 300000)
        self.assertEqual(self.store.report('c', '2026-09-22', '2026-09-22', midnight + 500000)['usageMs'], 15000)

    def test_schedule_boundary_restart_catchup_and_no_duplicate(self):
        due = week_due('2026-09-21')
        self.store.generate_due_reports(due - 1)
        self.assertEqual(self.store.report_list('c'), [])
        self.store.generate_due_reports(due)
        self.store.generate_due_reports(due + 1)
        self.assertEqual(len(self.store.report_list('c')), 1)
        self.store.close()
        self.store = Store(self.temp.name)
        self.store.generate_due_reports(due + 8 * 86400000)
        self.assertEqual(len(self.store.report_list('c')), 2)
        self.assertEqual(week_start('2027-01-01'), '2026-12-28')

    def test_mail_success_is_sent_once_and_content_is_a_checklist(self):
        self.task(); self.configure_mail()
        sent = []
        sender = lambda config, message: sent.append(message)
        due = week_due('2026-09-21')
        run_jobs(self.store, due, self.mail_path, sender)
        run_jobs(self.store, due + 60000, self.mail_path, sender)
        self.assertEqual(len(sent), 1)
        self.assertIn('数学前六题', sent[0].get_content())
        self.assertEqual(sent[0]['To'], 'fixed@example.invalid')
        self.assertEqual(self.store.report_list('c')[0]['recipient'], 'fixed@example.invalid')
        self.assertEqual(self.store.report_list('c')[0]['mailStatus'], 'sent')

    def test_missing_or_invalid_fixed_recipient_never_uses_legacy_address(self):
        self.configure_mail()
        config = json.loads(self.mail_path.read_text())
        config.pop('recipient')
        for recipient in ('missing', '', None, [], 'one@example.invalid,two@example.invalid', 'one@example.invalid\nBcc: two@example.invalid'):
            with self.subTest(recipient=recipient):
                if recipient != 'missing':
                    config['recipient'] = recipient
                self.mail_path.write_text(json.dumps(config))
                run_jobs(self.store, week_due('2026-09-21'), self.mail_path, lambda *_: self.fail('must not send without one fixed recipient'))
                row = self.store.one('SELECT mail_status,attempts,recipient FROM reports')
                self.assertEqual(row, dict(mail_status='unconfigured', attempts=0, recipient=None))

    def test_unconfigured_and_unknown_delivery_do_not_claim_success(self):
        due = week_due('2026-09-21')
        run_jobs(self.store, due, self.mail_path, lambda *_: self.fail('should not send'))
        self.assertEqual(self.store.report_list('c')[0]['mailStatus'], 'unconfigured')
        self.configure_mail()
        def interrupted(*_):
            raise TimeoutError('simulated lost acknowledgement')
        run_jobs(self.store, due + 60000, self.mail_path, interrupted)
        self.assertEqual(self.store.report_list('c')[0]['mailStatus'], 'unknown')
        run_jobs(self.store, due + 3600000, self.mail_path, lambda *_: self.fail('unknown must not auto-retry'))

    def test_rejected_mail_retries_with_backoff(self):
        self.configure_mail()
        attempts = []
        def rejected(*_):
            attempts.append(1)
            raise smtplib.SMTPAuthenticationError(535, b'test rejection')
        due = week_due('2026-09-21')
        for delta in (0, 60000, 900000, 1800000, 2700000):
            run_jobs(self.store, due + delta, self.mail_path, rejected)
        self.assertEqual(len(attempts), 3)
        self.assertEqual(self.store.report_list('c')[0]['mailStatus'], 'failed')

    def test_backup_and_import_do_not_overwrite_progress(self):
        raw = reduce_game(initial_state(MONDAY), dict(type='ADD_TASK', task=TASK), MONDAY)
        result = self.store.import_save('c', raw, MONDAY + 1000)
        self.assertTrue(result['state']['tasks'][0]['imported'])
        with self.assertRaises(Problem):
            self.store.import_save('c', raw, MONDAY + 2000)
        self.store.backup(MONDAY + 2000)
        self.assertTrue((Path(self.temp.name) / 'backups' / '2026-09-21.sqlite').exists())

    @unittest.skipUnless(shutil.which('node'), 'Node only needed for frontend/backend contract check')
    def test_python_and_existing_javascript_game_rules_agree(self):
        actions = [dict(type='GREET'), dict(type='ADD_TASK', task=TASK), dict(type='START_TASK', id='math'), dict(type='PAUSE_TASK', id='math'), dict(type='EDIT_TASK', id='math', task={**TASK, 'estimate': 20}), dict(type='START_TASK', id='math'), dict(type='RECORD_TASK', id='math', status='partial', note='先做到这里'), dict(type='START_TASK', id='math'), dict(type='RECORD_TASK', id='math', status='done', actualMinutes=25, note='完成了'), dict(type='CLAIM_REWARD', id='math'), dict(type='CLAIM_REWARD', id='math'), dict(type='BUILD', itemId='cat-tree', slot='sunny'), dict(type='REFLECT', id='math', answer='longer')]
        actions += [dict(type='CARE_SCENE', targetId='rail-west', verb='water', careId='contract-water-001'), dict(type='ADD_TASK', task={**TASK, 'id': 'second'}), dict(type='RECORD_TASK', id='second', status='done', actualMinutes=10), dict(type='CLAIM_REWARD', id='second')]
        actions += [dict(type='CARE_SCENE', targetId='rail-west', verb='care', expectedCount=i, careId=f'contract-care-00{i}') for i in range(3)]
        state = initial_state(MONDAY)
        for i, action in enumerate(actions):
            action['now'] = MONDAY + i * 60000
            state = reduce_game(state, action, action['now'])
        script = "import{initialState,gameReducer}from'./src/game.js';let input=JSON.parse(process.argv[1]);let state={...initialState(),createdAt:input.now};for(const a of input.actions)state=gameReducer(state,a);console.log(JSON.stringify(state));"
        value = subprocess.check_output(['node', '--input-type=module', '-e', script, json.dumps(dict(now=MONDAY, actions=actions))], cwd=ROOT)
        self.assertEqual(state, json.loads(value))


class APITests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.now = MONDAY
        self.app = create_app(self.temp.name, Path(self.temp.name) / 'client', Path(self.temp.name) / 'mail.json', lambda: self.now)
        self.client = self.app.test_client()
        self.headers = {'Origin': 'http://localhost'}
        self.setup_data = dict(name='孩子')

    def tearDown(self):
        self.app.extensions['town_store'].close()
        self.temp.cleanup()

    def post(self, path, data):
        return self.client.post(path, json=data, headers=self.headers)

    def initialize(self):
        self.assertEqual(self.post('/api/setup', self.setup_data).status_code, 200)

    def test_setup_is_local_only_and_csrf_rejected(self):
        result = self.client.post('/api/setup', json=self.setup_data, headers=self.headers, environ_base={'REMOTE_ADDR': '192.168.1.7'})
        self.assertEqual(result.status_code, 403)
        self.assertEqual(self.client.post('/api/setup', json=self.setup_data, headers={'Origin':'https://evil.example'}).status_code, 403)
        self.initialize()
        self.assertEqual(self.post('/api/setup', self.setup_data).status_code, 409)

    def test_login_cookie_permissions_logout_and_private_reports(self):
        self.initialize()
        self.post('/api/logout', {})
        self.assertEqual(self.client.get('/api/report').status_code, 401)
        response = self.post('/api/login', dict(name='孩子'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('HttpOnly', response.headers['Set-Cookie'])
        self.assertIn('SameSite=Strict', response.headers['Set-Cookie'])
        self.assertNotIn('password', response.json['user'])
        self.assertEqual(self.client.get('/api/state').status_code, 200)
        self.assertEqual(self.post('/api/settings', dict(email='else@example.invalid', mailEnabled=True)).status_code, 403)
        self.assertEqual(self.post('/api/logout', {}).status_code, 200)
        self.assertEqual(self.client.get('/api/state').status_code, 401)

    def test_two_clients_share_state_and_stale_write_conflicts(self):
        self.initialize()
        self.post('/api/login', dict(name='孩子'))
        other = self.app.test_client()
        other.post('/api/login', json=dict(name='孩子'), headers=self.headers)
        payload = dict(operationId=str(uuid.uuid4()), revision=0, action=dict(type='ADD_TASK', task=TASK))
        self.assertEqual(self.post('/api/actions', payload).status_code, 200)
        self.assertEqual(other.get('/api/state').json['state']['tasks'][0]['title'], TASK['title'])
        payload.update(operationId=str(uuid.uuid4()), action=dict(type='START_TASK', id='math'))
        self.assertEqual(other.post('/api/actions', json=payload, headers=self.headers).status_code, 409)

    def test_fixed_recipient_is_read_only_and_can_be_set_before_smtp(self):
        self.assertEqual(self.post('/api/setup', {**self.setup_data, 'email': 'other@example.invalid'}).status_code, 400)
        self.initialize()
        self.post('/api/login', dict(role='parent'))
        self.assertEqual(self.client.get('/api/settings').json['recipient'], '')
        path = Path(self.temp.name) / 'mail.json'
        path.write_text(json.dumps(dict(recipient='fixed@example.invalid', password='never-return-this-secret')))
        data = self.client.get('/api/settings').json
        self.assertEqual(data['recipient'], 'fixed@example.invalid')
        self.assertFalse(data['smtpConfigured'])
        self.assertNotIn('password', data)
        for key in ('email', 'recipient'):
            self.assertEqual(self.post('/api/settings', {key: 'other@example.invalid', 'mailEnabled': False}).status_code, 400)
        self.assertTrue(self.client.get('/api/settings').json['mailEnabled'])
        self.assertEqual(self.post('/api/settings', dict(mailEnabled=False)).status_code, 200)
        self.assertFalse(self.client.get('/api/settings').json['mailEnabled'])
        self.assertEqual(self.client.get('/api/settings').json['recipient'], 'fixed@example.invalid')
        self.assertEqual(json.loads(path.read_text())['recipient'], 'fixed@example.invalid')

    def test_expiry_and_invalid_dates_are_errors(self):
        self.initialize()
        self.post('/api/login', dict(role='parent'))
        self.assertEqual(self.client.get('/api/report?day=2026-02-30').status_code, 400)
        self.assertEqual(self.post('/api/actions', dict()).status_code, 403)
        self.now += 8 * 86400000
        self.assertEqual(self.client.get('/api/report').status_code, 401)

    def test_login_is_rate_limited(self):
        self.initialize()
        for _ in range(10):
            self.assertEqual(self.post('/api/login', dict(name='其他名字')).status_code, 401)
        self.assertEqual(self.post('/api/login', dict(name='其他名字')).status_code, 429)

    def test_first_name_creates_and_enters_town_in_one_step(self):
        response = self.post('/api/setup', dict(name='  小宇  '))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['user']['name'], '小宇')
        self.assertEqual(response.json['user']['role'], 'child')
        self.assertNotIn('password', response.json['user'])
        self.assertNotIn('username', response.json['user'])
        self.assertIn('HttpOnly', response.headers['Set-Cookie'])
        self.assertEqual(self.client.get('/api/state').status_code, 200)
        store = self.app.extensions['town_store']
        self.assertEqual(store.all('SELECT password FROM users'), [{'password': ''}, {'password': ''}])
        self.post('/api/logout', {})
        self.assertEqual(self.post('/api/login', dict(name=' 小宇 ')).status_code, 200)
        self.post('/api/logout', {})
        self.assertEqual(self.post('/api/login', dict(role='parent')).json['user']['role'], 'parent')
        self.assertEqual(self.client.get('/api/settings').status_code, 200)
        self.assertEqual(self.post('/api/actions', {}).status_code, 403)

    def test_name_only_entry_preserves_existing_password_era_town(self):
        store = self.app.extensions['town_store']
        parent = dict(id='legacy-parent', username='old_parent', name='家长', role='parent', password='unused-legacy-hash')
        child = dict(id='legacy-child', username='old_child', name='Lily', role='child', password='unused-legacy-hash')
        store.setup(parent, child, 'old@example.invalid', MONDAY)
        saved = store.command(child['id'], dict(action=dict(type='ADD_TASK', task=TASK), operationId=str(uuid.uuid4()), revision=0), MONDAY)
        response = self.post('/api/login', dict(name=' lily '))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['user']['id'], child['id'])
        self.assertEqual(self.client.get('/api/state').json, saved)
        self.post('/api/logout', {})
        self.assertEqual(self.post('/api/login', dict(name='不同的孩子')).status_code, 401)
        self.assertIsNone(self.client.get('/api/session').json['user'])
        self.assertEqual(store.one('SELECT COUNT(*) AS count FROM users')['count'], 2)
        self.assertEqual(store.state(child['id']), saved)
        self.assertEqual(self.post('/api/login', dict(role='parent')).json['user']['id'], parent['id'])

    def test_invalid_names_do_not_initialize_town(self):
        for name in ('', '  ', None, [], '小' * 21, '名\n字'):
            with self.subTest(name=name):
                self.assertEqual(self.post('/api/setup', dict(name=name)).status_code, 400)
                self.assertFalse(self.client.get('/api/session').json['initialized'])


if __name__ == '__main__':
    unittest.main()
