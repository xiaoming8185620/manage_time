import tempfile
import unittest
import uuid
from pathlib import Path
from server.store import Store
from server.domain import Problem
from server.workshop import CATALOGUE

class WorkshopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'one'
        self.store = self.make_store(self.path)

    def make_store(self, path):
        store = Store(path)
        store.setup(dict(id='p', username='p', name='P', role='parent', password=''), dict(id='c', username='c', name='C', role='child', password=''), '', 1000)
        return store

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, now=10000, **overrides):
        return self.store.command('c', dict(action=action, operationId=str(uuid.uuid4()), revision=self.store.state('c')['revision']) | overrides, now)

    def fund(self):
        for i in range(5):
            self.act(dict(type='ADD_TASK', task=dict(id=str(i), title='临时验收任务', estimate=1)))
            self.act(dict(type='RECORD_TASK', id=str(i), status='done', actualMinutes=1))
            self.act(dict(type='CLAIM_REWARD', id=str(i)))

    def test_authoritative_prices_once_daily_and_restore(self):
        self.fund()
        for item in CATALOGUE['habitats']:
            action=dict(type='BUILD_HABITAT', habitatId=item['id'], cost=0)
            op=str(uuid.uuid4()); revision=self.store.state('c')['revision']
            once=self.act(action, operationId=op)
            self.assertEqual(self.act(action, operationId=op, revision=revision), once)
            self.act(action)
        self.assertEqual(self.store.state('c')['state']['coins'], 30)
        action=dict(type='CARE_SCENE', targetId='ws-train', verb='care', expectedCount=0, careId=str(uuid.uuid4()), cost=0)
        first=self.act(action)
        self.act(action)
        self.act(action | dict(expectedCount=1, careId=str(uuid.uuid4())))
        self.assertEqual(self.store.state('c')['state']['coins'], 26)
        self.act(action | dict(expectedCount=1, careId=str(uuid.uuid4())), now=86410000)
        state=self.store.state('c')['state']
        self.assertEqual(state['coins'], 22)
        other=self.make_store(Path(self.temp.name)/'two')
        try:
            imported=other.import_save('c',state,86420000)['state']
            self.assertEqual(imported['coins'],22)
            self.assertEqual(imported['care'],state['care'])
            self.assertEqual(imported['habitats'],state['habitats'])
        finally:other.close()
        self.assertEqual(len(self.store.all("SELECT * FROM events WHERE kind='BUILD_HABITAT'")),2)
        self.store.close();self.store=Store(self.path)
        self.assertEqual(self.store.state('c')['state']['care'],state['care'])

    def test_zero_balance_free_interactions_and_atomic_rejections(self):
        for target in CATALOGUE['targets']:
            if not target.get('habitatId'):
                self.act(dict(type='CARE_SCENE', targetId=target['id'], verb='interact', careId=str(uuid.uuid4())))
        before=self.store.state('c')
        self.assertEqual(before['state']['coins'],0)
        self.assertFalse(before['state']['greeted'])
        for action in [dict(type='BUILD_HABITAT',habitatId='robot-dock'),dict(type='CARE_SCENE',targetId='ws-train',verb='care',expectedCount=0,careId=str(uuid.uuid4())),dict(type='CARE_SCENE',targetId='ws-dock-care',verb='interact',careId=str(uuid.uuid4()))]:
            with self.assertRaises(Problem):self.act(action)
            self.assertEqual(self.store.state('c'),before)
