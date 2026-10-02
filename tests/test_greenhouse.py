import tempfile
import unittest
import uuid
from pathlib import Path
from server.store import Store
from server.domain import Problem

class GreenhouseTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.store=self.make_store(Path(self.temp.name)/'one')
    def make_store(self,path):
        store=Store(path);store.setup(dict(id='p',username='p',name='P',role='parent',password=''),dict(id='c',username='c',name='C',role='child',password=''),'',1000);return store
    def tearDown(self):self.store.close();self.temp.cleanup()
    def act(self,action,at=10000000,**kwargs):return self.store.command('c',dict(action=action,operationId=str(uuid.uuid4()),revision=self.store.state('c')['revision'])|kwargs,at)
    def fund(self):
        for i in range(4):
            self.act(dict(type='ADD_TASK',task=dict(id=str(i),title='测试',estimate=10)),at=9400000)
            self.store.command('c',dict(action=dict(type='START_TASK',id=str(i)),operationId=str(uuid.uuid4()),revision=self.store.state('c')['revision']),9400000)
            self.act(dict(type='RECORD_TASK',id=str(i),status='done',actualMinutes=10))
            self.act(dict(type='CLAIM_REWARD',id=str(i)))
    def test_growth_habitat_retry_and_import(self):
        self.fund()
        for i in range(4):self.act(dict(type='CARE_SCENE',targetId='gh-berry',verb='care',expectedCount=i,careId=str(uuid.uuid4())))
        self.assertEqual(self.store.state('c')['state']['care']['gh-berry']['careCount'],3)
        op=str(uuid.uuid4());revision=self.store.state('c')['revision'];action=dict(type='BUILD_HABITAT',habitatId='parrot-perch',cost=0)
        first=self.act(action,operationId=op);self.assertEqual(first['state']['coins'],21)
        self.assertEqual(self.act(action,operationId=op,revision=revision),first)
        self.act(action);self.assertEqual(self.store.state('c')['state']['coins'],21)
        self.act(dict(type='CARE_SCENE',targetId='gh-perch-care',verb='care',expectedCount=0,careId=str(uuid.uuid4())))
        state=self.store.state('c')['state'];other=self.make_store(Path(self.temp.name)/'two')
        try:
            imported=other.import_save('c',state,20000000)['state'];self.assertEqual(imported['coins'],19);self.assertEqual(imported['habitats'],['parrot-perch']);self.assertEqual(imported['care'],state['care'])
        finally:other.close()
        self.assertEqual(len(self.store.all("SELECT * FROM events WHERE kind='BUILD_HABITAT'")),1)
        self.store.close();self.store=Store(Path(self.temp.name)/'one');self.assertEqual(self.store.state('c')['state']['habitats'],['parrot-perch'])
    def test_free_interaction_no_entry_gate_and_invalid_spend_atomic(self):
        self.act(dict(type='CARE_SCENE',targetId='gh-parrot',verb='interact',careId=str(uuid.uuid4())))
        self.act(dict(type='CARE_SCENE',targetId='gh-moss',verb='water',careId=str(uuid.uuid4())))
        before=self.store.state('c');self.assertFalse(before['state']['greeted']);self.assertEqual(before['state']['coins'],0)
        for action in [dict(type='BUILD_HABITAT',habitatId='snake-rest'),dict(type='BUILD_HABITAT',habitatId='unknown'),dict(type='CARE_SCENE',targetId='gh-rest-care',verb='interact',careId=str(uuid.uuid4()))]:
            with self.assertRaises(Problem):self.act(action)
            self.assertEqual(self.store.state('c'),before)
