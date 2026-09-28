import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from server.store import Store
from server.domain import Problem, reduce_game, initial_state


class SkyRewardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = self.make_store(Path(self.temp.name) / 'one')

    def make_store(self, path):
        store = Store(path)
        store.setup(dict(id='p',username='p',name='P',role='parent',password=''), dict(id='c',username='c',name='QA',role='child',password=''), '', 1000)
        return store

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, **overrides):
        return self.store.command('c', dict(action=action, operationId=str(uuid.uuid4()), revision=self.store.state('c')['revision']) | overrides, 2000)

    def test_probability_server_ignores_client_roll_and_amount(self):
        state = initial_state(0)
        with patch('server.sky_rewards.secrets.randbelow', side_effect=range(100)):
            for i in range(100):
                state = reduce_game(state, dict(type='COLLECT_CRYSTAL', attempt=i+1, roll=0), 1000)
        self.assertEqual(len(state['skyRewards']['pending']), 30)
        self.assertEqual(state['coins'], 0)
        state = reduce_game(state, dict(type='PICKUP_SKY_COIN', id=1, amount=999), 1000)
        self.assertEqual(state['coins'], 1)
        self.assertEqual(reduce_game(state, dict(type='PICKUP_SKY_COIN',id=1), 1000), state)

    def test_retry_restart_conflict_and_daily_event(self):
        op = str(uuid.uuid4())
        action = dict(type='COLLECT_CRYSTAL',attempt=1)
        with patch('server.sky_rewards.secrets.randbelow', return_value=29) as roll:
            result = self.act(action, operationId=op, revision=0)
            self.assertEqual(self.act(action,operationId=op,revision=0), result)
            self.act(action)
            self.assertEqual(roll.call_count,1)
        self.store.close()
        self.store=Store(Path(self.temp.name)/'one')
        self.assertEqual(self.store.state('c')['state']['skyRewards']['pending'],[1])
        revision=self.store.state('c')['revision']
        self.act(dict(type='PICKUP_SKY_COIN',id=1))
        with self.assertRaises(Problem): self.act(dict(type='PICKUP_SKY_COIN',id=1),revision=revision)
        self.act(dict(type='PICKUP_SKY_COIN',id=1))
        self.assertEqual(self.store.state('c')['state']['coins'],1)
        self.assertEqual(len(self.store.all("SELECT * FROM events WHERE kind='PICKUP_SKY_COIN'")),1)

    def test_export_import_preserves_income_pending_and_failed_trials(self):
        with patch('server.sky_rewards.secrets.randbelow',side_effect=[0,30,29]):
            for i in range(1,4): self.act(dict(type='COLLECT_CRYSTAL',attempt=i))
        self.act(dict(type='PICKUP_SKY_COIN',id=1))
        saved=self.store.state('c')['state']
        other=self.make_store(Path(self.temp.name)/'two')
        try:
            other.import_save('c',saved,3000)
            restored=other.state('c')['state']
            self.assertEqual(restored['coins'],1)
            self.assertEqual(restored['skyRewards'],dict(attempts=3,earned=1,pending=[3]))
        finally: other.close()

    def test_invalid_or_skipped_trial_does_not_roll(self):
        with patch('server.sky_rewards.secrets.randbelow') as roll:
            for attempt in [True,0,2,'1',None]: self.act(dict(type='COLLECT_CRYSTAL',attempt=attempt))
            roll.assert_not_called()
