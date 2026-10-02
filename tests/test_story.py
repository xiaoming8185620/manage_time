import tempfile
import unittest
import uuid
from pathlib import Path
from server.store import Store
from server.domain import Problem, day_start
from server.story import CHAPTERS

NOW = day_start('2026-09-28')

class StoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = self.new_store(Path(self.temp.name) / 'one')

    def new_store(self, directory):
        store = Store(directory)
        store.setup(dict(id='p',username='p',name='QA家长',role='parent',password=''),dict(id='c',username='c',name='QA居民',role='child',password=''),'test@example.invalid',NOW)
        return store

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, at=NOW, **overrides):
        payload=dict(action=action, operationId=str(uuid.uuid4()), revision=self.store.state('c')['revision']) | overrides
        return self.store.command('c', payload, at)

    def fund(self):
        for i in range(2):
            id=f'qa-{i}'
            self.act(dict(type='ADD_TASK',task=dict(id=id,title='测试专用任务',estimate=10,category='学习',day='2026-09-28',startTime='')),at=NOW-600000)
            self.act(dict(type='START_TASK',id=id),at=NOW-600000)
            self.act(dict(type='RECORD_TASK',id=id,status='done',actualMinutes=10))
            self.act(dict(type='CLAIM_REWARD',id=id))

    def test_prices_retries_conflicts_and_daily_event(self):
        self.fund()
        rev=self.store.state('c')['revision']
        op=str(uuid.uuid4())
        action=dict(type='UNLOCK_STORY',chapterId=CHAPTERS[0]['id'],cost=0)
        result=self.act(action,operationId=op,revision=rev)
        self.assertEqual(result['state']['coins'],17)
        self.assertEqual(self.act(action,operationId=op,revision=rev),result)
        self.act(action)
        self.assertEqual(self.store.state('c')['state']['coins'],17)
        with self.assertRaises(Problem) as conflict:
            self.act(dict(type='UNLOCK_STORY',chapterId=CHAPTERS[1]['id']),revision=rev)
        self.assertEqual(conflict.exception.status,409)
        self.assertEqual(self.store.state('c')['state']['coins'],17)
        events=self.store.all("SELECT * FROM events WHERE kind='UNLOCK_STORY'")
        self.assertEqual(len(events),1)
        self.assertIn('3 星球币',events[0]['detail'])
        self.assertIn(CHAPTERS[0]['title'],events[0]['detail'])
        self.store.close()
        self.store=Store(Path(self.temp.name)/'one')
        self.assertEqual(self.store.state('c')['state']['storyUnlocked'],[CHAPTERS[0]['id']])

    def test_insufficient_invalid_and_out_of_order_are_atomic(self):
        before=self.store.state('c')
        with self.assertRaises(Problem): self.act(dict(type='UNLOCK_STORY',chapterId=CHAPTERS[0]['id']))
        self.assertEqual(self.store.state('c'),before)
        self.fund()
        before=self.store.state('c')
        for id in ['unknown','first-light',CHAPTERS[1]['id'],None,{}]:
            with self.assertRaises(Problem): self.act(dict(type='UNLOCK_STORY',chapterId=id))
            self.assertEqual(self.store.state('c'),before)

    def test_import_deducts_story_spending_and_keeps_all_chapters(self):
        self.fund()
        for c in CHAPTERS: self.act(dict(type='UNLOCK_STORY',chapterId=c['id']))
        saved=self.store.state('c')['state']
        self.assertEqual(saved['coins'],2)
        other=self.new_store(Path(self.temp.name)/'two')
        try:
            other.import_save('c',saved,NOW)
            restored=other.state('c')['state']
            self.assertEqual(restored['coins'],2)
            self.assertEqual(restored['storyUnlocked'],saved['storyUnlocked'])
        finally: other.close()

    def test_legacy_import_and_invalid_progress(self):
        old=self.store.state('c')['state']; old.pop('storyUnlocked')
        self.store.import_save('c',old,NOW)
        self.assertEqual(self.store.state('c')['state']['storyUnlocked'],[])
        for bad in [None,{},['unknown'],[CHAPTERS[1]['id']],[CHAPTERS[0]['id']]*2]:
            with self.assertRaises(Problem): self.store.import_save('c',old|{'storyUnlocked':bad},NOW)
