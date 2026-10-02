import tempfile
import unittest
import uuid
from pathlib import Path
from server.web import create_app
from server.domain import initial_state, reduce_game, Problem

START = 1790902800000
TASK = dict(id='timing', title='认真读十页书', estimate=15, category='学习', day='2026-10-02', startTime='17:00')


class TimingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.now = START
        self.app = create_app(self.temp.name, Path(self.temp.name)/'dist', Path(self.temp.name)/'mail.json', lambda:self.now)
        self.client = self.app.test_client()
        self.headers = {'Origin':'http://localhost'}
        self.client.post('/api/setup', json={'name':'计时验收'}, headers=self.headers)

    def tearDown(self):
        self.app.extensions['town_store'].close()
        self.temp.cleanup()

    def state(self):
        return self.client.get('/api/state').json

    def act(self, kind, **values):
        return self.client.post('/api/actions', json=dict(operationId=str(uuid.uuid4()),revision=self.state()['revision'],action=dict(type=kind,id='timing',**values)), headers=self.headers)

    def begin(self):
        self.assertEqual(self.act('ADD_TASK',task=TASK).status_code,200)
        self.assertEqual(self.act('START_TASK').status_code,200)

    def test_minimum_and_server_time_cannot_be_forged(self):
        for minutes in (0,1,9,9.99):
            self.assertEqual(self.act('ADD_TASK',task={**TASK,'estimate':minutes}).status_code,400)
        self.begin()
        self.now += 599999
        before = self.state()
        response=self.act('RECORD_TASK',status='done',actualMinutes=10,now=START+99999999,elapsedMs=99999999)
        self.assertEqual(response.status_code,422)
        self.assertIn('不到 10 分钟',response.json['error'])
        self.assertEqual(self.state(),before)
        self.act('CLAIM_REWARD')
        self.assertEqual(self.state()['state']['coins'],0)

    def test_review_freezes_time_and_tolerance_boundaries(self):
        self.begin(); self.now += 20*60000
        self.act('REVIEW_TASK')
        self.now += 2*3600000
        self.act('REVIEW_TASK')
        task=self.state()['state']['tasks'][0]
        self.assertEqual(task['elapsedMs'],20*60000)
        self.assertEqual(task['reviewAt'],START+20*60000)
        for amount in (9,14,26,None,True):
            self.assertEqual(self.act('RECORD_TASK',status='done',actualMinutes=amount).status_code,422)
        for amount in (15,25):
            saved=reduce_game(self.state()['state'],dict(type='RECORD_TASK',id='timing',status='done',actualMinutes=amount),self.now)
            self.assertEqual(saved['tasks'][0]['status'],'done')
        self.assertEqual(self.act('RECORD_TASK',status='done',actualMinutes=20).status_code,200)
        self.act('CLAIM_REWARD'); self.act('CLAIM_REWARD')
        self.assertEqual(self.state()['state']['coins'],10)

    def test_pauses_and_partial_progress_are_kept(self):
        self.begin();self.now+=4*60000;self.act('PAUSE_TASK')
        self.now+=3600000;self.act('START_TASK');self.now+=3*60000
        self.act('REVIEW_TASK');self.act('RECORD_TASK',status='partial',note='做完前半部分')
        self.assertEqual(self.state()['state']['tasks'][0]['elapsedMs'],7*60000)
        self.act('START_TASK');self.now+=3*60000;self.act('REVIEW_TASK')
        self.assertEqual(self.act('RECORD_TASK',status='done',actualMinutes=10).status_code,200)

    def test_long_timer_requires_honest_input_and_recovery_keeps_audit(self):
        self.begin();self.now+=1500*60000;self.act('REVIEW_TASK')
        self.assertEqual(self.act('RECORD_TASK',status='done',actualMinutes=15).status_code,422)
        saved=reduce_game(self.state()['state'],dict(type='RECORD_TASK',id='timing',status='done',actualMinutes=1500),self.now)
        self.assertEqual(saved['tasks'][0]['actualMinutes'],1500)
        self.act('RESET_TASK_TIMER',note='吃饭后忘了暂停，并没有一直阅读')
        task=self.state()['state']['tasks'][0]
        self.assertEqual(task['elapsedMs'],0)
        self.assertEqual(task['timingCorrections'][0]['elapsedMs'],1500*60000)
        # Export/import keeps correction evidence; it cannot restore discarded
        # timer credit and thereby bypass the new ten-minute segment.
        with tempfile.TemporaryDirectory() as directory:
            other=create_app(directory,Path(directory)/'dist',Path(directory)/'mail.json',lambda:self.now)
            client=other.test_client()
            client.post('/api/setup',json={'name':'迁移验收'},headers=self.headers)
            imported=client.post('/api/import',json=self.state()['state'],headers=self.headers)
            self.assertEqual(imported.status_code,200)
            self.assertEqual(imported.json['state']['tasks'][0]['timingCorrections'],task['timingCorrections'])
            self.assertEqual(imported.json['state']['tasks'][0]['elapsedMs'],0)
            other.extensions['town_store'].close()
        self.assertEqual(self.act('RECORD_TASK',status='done',actualMinutes=10).status_code,422)
        self.act('START_TASK');self.now+=10*60000;self.act('REVIEW_TASK')
        self.assertEqual(self.act('RECORD_TASK',status='done',actualMinutes=10).status_code,200)
        self.act('CLAIM_REWARD')
        self.assertEqual(self.state()['state']['coins'],10)

    def test_old_short_tasks_import_without_rewriting_history(self):
        raw=initial_state(START)
        raw['tasks']=[dict(**{**TASK,'estimate':5},status='done',createdAt=START,finishedAt=START,actualMinutes=5,elapsedMs=300000,startedAt=None,rewardClaimed=True,note='旧任务')]
        response=self.client.post('/api/import',json=raw,headers=self.headers)
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json['state']['tasks'][0]['actualMinutes'],5)
