import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from server.web import create_app
from server.domain import initial_state, day_start, week_due

ROOT = Path(__file__).resolve().parents[1]
NOW = day_start('2026-10-01')


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = create_app(self.temp.name, ROOT / 'dist/family', Path(self.temp.name) / 'mail.json', clock=lambda: NOW)
        self.client = self.app.test_client()
        self.post('/api/setup', {'name':'临时验收'})
        self.store = self.app.extensions['town_store']

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def post(self, path, data):
        return self.client.post(path, json=data, headers={'Origin':'http://localhost'})

    def done_save(self):
        state = initial_state(NOW - 10000)
        state['tasks'] = [dict(id='one',title='阅读',estimate=10,startTime='17:00',day='2026-10-01',category='学习',status='done',elapsedMs=1000,startedAt=None,rewardClaimed=True,note='',createdAt=NOW-5000,actualMinutes=10,finishedAt=NOW-1000)]
        state['coins'] = 10
        return state

    def test_invalid_import_fields_cannot_mint_rewards_or_poison_json(self):
        cases=[]
        for field,value in [('rewardClaimed','false'),('actualMinutes',True),('createdAt',True),('elapsedMs','NaN')]:
            data=self.done_save();data['tasks'][0][field]=value;cases.append((field,data))
        data=self.done_save();data['buildings']=[dict(itemId='flowerbed',slot='sunny',builtAt='NaN')];cases.append(('builtAt',data))
        for field,data in cases:
            with self.subTest(field=field):
                try:
                    response=self.post('/api/import',data)
                    self.assertEqual(response.status_code,400)
                    self.assertEqual(self.client.get('/api/state').json['revision'],0)
                finally:
                    # Every malformed input runs against a fresh temporary town,
                    # including when an unfixed importer incorrectly accepts it.
                    self.store.write('UPDATE states SET revision=0,data=?',(json.dumps(initial_state(NOW)),))
                    self.store.write('DELETE FROM events')

    def test_valid_export_import_remains_readable(self):
        response=self.post('/api/import',self.done_save())
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json['state']['coins'],10)
        json.loads(self.client.get('/api/export').data, parse_constant=lambda value:self.fail(value))

    def test_retry_does_not_reset_a_report_claimed_by_sender(self):
        self.post('/api/login',{'role':'parent'})
        self.store.generate_due_reports(week_due('2026-09-28'))
        report=self.store.one('SELECT id FROM reports')
        self.store.write("UPDATE reports SET mail_status='failed',attempts=1 WHERE id=?",(report['id'],))
        original=self.store.one
        def sender_claims_after_read(sql,args=()):
            row=original(sql,args)
            if sql.startswith('SELECT mail_status FROM reports'):
                self.store.write("UPDATE reports SET mail_status='sending',attempts=2 WHERE id=?",args)
            return row
        with patch.object(self.store,'one',side_effect=sender_claims_after_read):
            response=self.post('/api/reports/'+report['id']+'/retry',{})
        self.assertEqual(response.status_code,409)
        row=self.store.one('SELECT mail_status,attempts FROM reports WHERE id=?',(report['id'],))
        self.assertEqual(row,{'mail_status':'sending','attempts':2})

    def test_ipv6_loopback_is_a_valid_local_host(self):
        self.assertEqual(self.client.get('/api/session',base_url='http://[::1]:4180').status_code,200)
