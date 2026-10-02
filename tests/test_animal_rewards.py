import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from server.store import Store
from server.domain import Problem, initial_state, reduce_game
from server.animal_rewards import restore_animal_rewards


class AnimalRewardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = self.make_store('one')

    def make_store(self, name):
        store = Store(Path(self.temp.name)/name)
        store.setup(dict(id='p',username='p',name='P',role='parent',password=''), dict(id='c',username='c',name='QA',role='child',password=''), '', 1000)
        return store

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def act(self, action, **overrides):
        return self.store.command('c', dict(action=action, operationId=str(uuid.uuid4()), revision=self.store.state('c')['revision']) | overrides, 2000)

    def test_probability_and_server_random_spot(self):
        state=initial_state(0)
        for i in range(100):
            with patch('server.animal_rewards.secrets.randbelow',side_effect=[i,i%3]):
                state=reduce_game(state,dict(type='ANIMAL_DROP',animal='gh-parrot',attempt=i+1,roll=0,spotRoll=0),1000)
        self.assertEqual(len(state['animalRewards']['pending']),30)
        self.assertEqual({c['spot'] for c in state['animalRewards']['pending']},{0,1,2})
        self.assertEqual(state['coins'],0)

    def test_retry_two_sources_restart_income_and_import(self):
        op=str(uuid.uuid4());action=dict(type='ANIMAL_DROP',animal='gh-parrot',attempt=1)
        with patch('server.animal_rewards.secrets.randbelow',side_effect=[0,2]) as roll:
            result=self.act(action,operationId=op,revision=0)
            self.assertEqual(self.act(action,operationId=op,revision=0),result)
            self.act(action)
            self.assertEqual(roll.call_count,2)
        with patch('server.animal_rewards.secrets.randbelow',side_effect=[29,1,30]):
            self.act(dict(type='ANIMAL_DROP',animal='gh-snake',attempt=1))
            self.act(dict(type='ANIMAL_DROP',animal='gh-snake',attempt=2))
        self.store.close();self.store=Store(Path(self.temp.name)/'one')
        revision=self.store.state('c')['revision']
        self.act(dict(type='PICKUP_ANIMAL_COIN',id='gh-parrot:1',amount=999))
        with self.assertRaises(Problem):self.act(dict(type='PICKUP_ANIMAL_COIN',id='gh-parrot:1'),revision=revision)
        self.act(dict(type='PICKUP_ANIMAL_COIN',id='gh-parrot:1'))
        saved=self.store.state('c')['state'];self.assertEqual(saved['coins'],1)
        events=self.store.all("SELECT * FROM events WHERE kind='PICKUP_ANIMAL_COIN'")
        self.assertEqual(len(events),1);self.assertIn('鹦鹉阿羽',events[0]['detail'])
        other=self.make_store('two')
        try:
            restored=other.import_save('c',saved,3000)['state']
            self.assertEqual(restored['coins'],1);self.assertEqual(restored['animalRewards'],saved['animalRewards'])
        finally:other.close()

    def test_invalid_trial_does_not_roll_and_invalid_save_is_rejected(self):
        with patch('server.animal_rewards.secrets.randbelow') as roll:
            for animal,attempt in [('unknown',1),('gh-snake',True),('gh-snake',2),([],1)]:
                self.act(dict(type='ANIMAL_DROP',animal=animal,attempt=attempt))
            roll.assert_not_called()
        for value in [None,{},dict(attempts={'gh-parrot':1,'gh-snake':0},earned=0,pending=[dict(id='gh-parrot:1',animal='gh-parrot',attempt=1,spot=3)])]:
            with self.assertRaises(ValueError):restore_animal_rewards(value)
