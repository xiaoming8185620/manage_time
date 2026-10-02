import tempfile
import unittest
import uuid
from pathlib import Path
from server.domain import Problem, reduce_game
from server.store import Store
from server.greenhouse import HABITATS


class SceneAdditionsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = self.new_store('original')

    def new_store(self, name):
        store = Store(Path(self.temp.name) / name)
        store.setup(dict(id='p', username='p', name='P', role='parent', password=''), dict(id='c', username='c', name='C', role='child', password=''), '', 1000)
        return store

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, now=10000000, **overrides):
        return self.store.command('c', dict(action=action, operationId=str(uuid.uuid4()), revision=self.store.state('c')['revision']) | overrides, now)

    def fund(self):
        for i in range(5):
            self.act(dict(type='ADD_TASK', task=dict(id=str(i), title='临时任务', estimate=10)),now=9400000)
            self.act(dict(type='START_TASK',id=str(i)),now=9400000)
            self.act(dict(type='RECORD_TASK', id=str(i), status='done', actualMinutes=10))
            self.act(dict(type='CLAIM_REWARD', id=str(i)))

    def test_new_facilities_authoritative_price_retry_care_and_import(self):
        additions = [h for h in HABITATS.values() if h.get('image')]
        self.assertEqual(len(additions), 4)
        for item in additions:
            with self.assertRaises(Problem):
                self.act(dict(type='BUILD_HABITAT', habitatId=item['id']))
        self.fund()
        for item in additions:
            action = dict(type='BUILD_HABITAT', habitatId=item['id'], cost=0)
            operation = str(uuid.uuid4())
            revision = self.store.state('c')['revision']
            once = self.act(action, operationId=operation)
            self.assertEqual(self.act(action, operationId=operation, revision=revision), once)
            self.act(action)
            self.act(dict(type='CARE_SCENE', targetId=item['targetId'], verb='interact', careId=str(uuid.uuid4())))
            action = dict(type='CARE_SCENE', targetId=item['targetId'], verb='care', expectedCount=0, careId=str(uuid.uuid4()), cost=0)
            self.act(action, now=15000)
            self.act(action, now=18000)
            self.act(action | dict(expectedCount=1, careId=str(uuid.uuid4())), now=21000)
        state = self.store.state('c')['state']
        self.assertEqual(state['coins'], 2)
        self.assertEqual(len(self.store.all("SELECT * FROM events WHERE kind='BUILD_HABITAT'")), 4)
        restored = self.new_store('imported')
        try:
            imported = restored.import_save('c', state, 25000000)['state']
            for key in ['coins','habitats','care']:
                self.assertEqual(imported[key], state[key])
        finally:
            restored.close()

    def test_flower_sites_survive_import_without_resetting_growth(self):
        self.fund()
        state = self.store.state('c')['state']
        state.update(coins=37, buildings=[dict(itemId='flowerbed',slot='east-bed',builtAt=10000000)], care={'built-flowerbed':dict(careCount=1,caredAt=10000000)})
        restored = self.new_store('flower-import')
        try:
            imported = restored.import_save('c', state, 20000000)['state']
            self.assertEqual(imported['coins'], 37)
            self.assertEqual(imported['buildings'], state['buildings'])
            self.assertEqual(imported['care']['built-flowerbed']['careCount'], 1)
            self.assertEqual(imported['care']['built-flowerbed']['caredAt'], 10000000)
            self.assertEqual(reduce_game(imported, dict(type='BUILD',itemId='flowerbed',slot='porch-bed'), 20000000), imported)
            for verb in ('water', 'care'):
                with self.assertRaises(Problem):
                    reduce_game(imported, dict(type='CARE_SCENE',targetId='built-flowerbed',verb=verb,careId=str(uuid.uuid4()),expectedCount=1), 20000000)
            cat = reduce_game(imported, dict(type='BUILD',itemId='cat-tree',slot='sunny'), 20000000)
            self.assertEqual(cat['coins'], 27)
        finally:
            restored.close()
