import tempfile
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from server.domain import day_start, initial_state, Problem
from server.store import Store
from server.web import create_app

NOW = day_start('2026-10-02')

class VisitTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.store.setup(dict(id='p', username='p', name='家长', role='parent', password=''), dict(id='c', username='c', name='验收', role='child', password=''), '', NOW-86400000)

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, now=NOW):
        return self.store.command('c', dict(action=action, operationId=str(uuid.uuid4()), revision=self.store.state('c')['revision']), now)

    def test_two_connections_retries_restart_and_day_boundary(self):
        other = Store(self.temp.name)
        try:
            with ThreadPoolExecutor(max_workers=4) as pool:
                list(pool.map(lambda i: (self.store if i%2 else other).visit('c',NOW-1), range(16)))
            self.assertEqual(self.store.state('c')['state']['coins'],10)
            self.assertEqual(len(self.store.all("SELECT * FROM events WHERE kind='DAILY_VISIT'")),1)
            self.assertEqual(self.store.state('c')['revision'],1)
        finally:
            other.close()
        self.store.close(); self.store = Store(self.temp.name)
        self.assertEqual(self.store.visit('c',NOW-1)['state']['coins'],10)
        self.assertEqual(self.store.visit('c',NOW)['state']['coins'],20)
        self.assertEqual(self.store.visit('c',NOW+3*86400000)['state']['coins'],30)
        self.assertEqual(self.store.visit('c',NOW+86400000)['state']['coins'],30)
        report = self.store.report('c','2026-10-02','2026-10-02',NOW+1000)
        self.assertEqual(report['completedCount'],0)
        self.assertEqual(len(report['activities']),1)
        self.assertEqual(report['activities'][0]['kind'],'DAILY_VISIT')

    def test_visit_does_not_block_legacy_import_or_duplicate_imported_gifts(self):
        self.assertTrue(self.store.visit('c',NOW)['canImport'])
        self.act(dict(type='GUIDE_PREFERENCE',dismissed=True))
        source=initial_state(NOW-86400000)
        source.update(visitDays=['2026-10-01','2026-10-02'],coins=9999,buildings=[dict(itemId='flowerbed',slot='porch-bed',builtAt=NOW)])
        result=self.store.import_save('c',source,NOW)
        self.assertEqual(result['state']['coins'],10)
        self.assertFalse(result['canImport'])
        self.assertEqual(self.store.visit('c',NOW)['state']['coins'],10)
        with self.assertRaises(Problem):self.store.import_save('c',source,NOW)

    def test_bad_receipts_and_real_progress_cannot_be_overwritten(self):
        for days in [['2026-10-02','2026-10-02'],['2026-02-30'],['2026-10-03'],[True],{}]:
            with self.assertRaises(Problem):self.store.import_save('c',dict(initial_state(NOW),visitDays=days),NOW)
        self.assertEqual(self.store.state('c')['revision'],0)
        self.store.visit('c',NOW)
        self.act(dict(type='BUILD',itemId='cat-tree',slot='sunny'))
        with self.assertRaises(Problem):self.store.import_save('c',initial_state(NOW),NOW)
        self.assertEqual(self.store.state('c')['state']['coins'],0)

    def test_empty_import_still_only_allowed_once(self):
        self.store.visit('c',NOW)
        result=self.store.import_save('c',initial_state(NOW),NOW)
        self.assertEqual(result['state']['coins'],10)
        with self.assertRaises(Problem):self.store.import_save('c',initial_state(NOW),NOW)

class VisitApiTests(unittest.TestCase):
    def test_server_time_child_only_and_get_requests_are_read_only(self):
        with tempfile.TemporaryDirectory() as directory:
            clock=[NOW]
            app=create_app(directory,Path(directory)/'client',Path(directory)/'mail.json',clock=lambda:clock[0])
            client=app.test_client();headers={'Origin':'http://localhost'}
            try:
                self.assertEqual(client.post('/api/visit',json={},headers=headers).status_code,401)
                client.post('/api/setup',json={'name':'验收'},headers=headers)
                self.assertEqual(client.get('/api/state').json['state']['coins'],0)
                gift=client.post('/api/visit',json={'now':NOW+86400000,'amount':9999},headers=headers).json
                self.assertEqual(gift['state']['coins'],10);self.assertEqual(gift['visitDay'],'2026-10-02')
                self.assertEqual(client.post('/api/visit',json={},headers=headers).json['revision'],gift['revision'])
                client.post('/api/logout',json={},headers=headers)
                client.post('/api/login',json={'role':'parent'},headers=headers)
                clock[0]+=86400000
                self.assertEqual(client.post('/api/visit',json={},headers=headers).status_code,403)
                self.assertEqual(client.get('/api/state').json['state']['coins'],10)
                client.post('/api/login',json={'name':'验收'},headers=headers)
                self.assertEqual(client.post('/api/visit',json={},headers=headers).json['state']['coins'],20)
            finally:app.extensions['town_store'].close()
