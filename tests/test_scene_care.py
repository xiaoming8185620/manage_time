import tempfile
import unittest
import uuid
from server.domain import initial_state, reduce_game, Problem, day_start
from server.store import Store

NOW = day_start('2026-09-24')


def action(target='rail-front-west', verb='care', count=0, **extra):
    return dict(type='CARE_SCENE', targetId=target, verb=verb, expectedCount=count, careId=str(uuid.uuid4()), **extra)


def funded():
    state = initial_state(NOW)
    for i in range(3):
        task = dict(id=f'task-{i}', title='读十页书', category='学习', estimate=10, startTime='17:00')
        for a in [dict(type='ADD_TASK', task=task), dict(type='START_TASK',id=task['id']), dict(type='RECORD_TASK', id=task['id'], status='done', actualMinutes=10), dict(type='CLAIM_REWARD', id=task['id'])]:
            state = reduce_game(state, a, NOW - 600000 if a['type'] in ('ADD_TASK','START_TASK') else NOW)
    return state


class SceneCareTests(unittest.TestCase):
    def test_growth_has_fixed_cost_three_tiers_and_keeps_water_free(self):
        state = funded()
        for level in range(3):
            paid = action(count=level, cost=0)
            state = reduce_game(state, paid, NOW + level * 3000)
            self.assertEqual(state['coins'], 30 - (level + 1) * 3)
            self.assertEqual(reduce_game(state, paid, NOW + 20000), state)
        self.assertEqual(reduce_game(state, action(count=3), NOW + 30000), state)
        watered = reduce_game(state, action(verb='water'), NOW + 30000)
        self.assertEqual(watered['coins'], 21)
        self.assertEqual(watered['care']['rail-front-west']['careCount'], 3)

    def test_insufficient_coins_wrong_target_and_stale_count(self):
        with self.assertRaises(Problem):
            reduce_game(initial_state(NOW), action(), NOW)
        free = reduce_game(initial_state(NOW), action(verb='water'), NOW)
        self.assertEqual(free['coins'], 0)
        state = funded()
        self.assertEqual(reduce_game(state, action(count=1), NOW), state)
        for a in [action('unknown'), action('built-flowerbed'), action('xiaoguai', 'water')]:
            with self.assertRaises(Problem):
                reduce_game(state, a, NOW)

    def test_fixture_daily_limit_is_beijing_calendar_day(self):
        before = NOW + 86400000 - 1000
        state = reduce_game(funded(), action('xiaoguai'), before)
        self.assertEqual(state['coins'], 28)
        self.assertEqual(reduce_game(state, action('xiaoguai', count=1), before + 500), state)
        state = reduce_game(state, action('xiaoguai', count=1), before + 1000)
        self.assertEqual(state['coins'], 26)

    def test_import_persistence_replay_and_activity_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(directory)
            parent = dict(id='p', username='parent', name='家长', role='parent', password='fixture')
            child = dict(id='c', username='child', name='验收', role='child', password='fixture')
            store.setup(parent, child, '', NOW)
            state = reduce_game(funded(), action(), NOW + 1000)
            imported = store.import_save('c', state, NOW + 2000)
            self.assertEqual(imported['state']['coins'], 27)
            self.assertEqual(imported['state']['care']['rail-front-west']['careCount'], 1)
            request = dict(action=action(count=1), operationId=str(uuid.uuid4()), revision=imported['revision'])
            paid = store.command('c', request, NOW + 3000)
            self.assertEqual(store.command('c', request, NOW + 4000), paid)
            self.assertEqual(paid['state']['coins'], 24)
            stale = dict(action=action(count=1), operationId=str(uuid.uuid4()), revision=paid['revision'])
            self.assertEqual(store.command('c', stale, NOW + 5000)['state']['coins'], 24)
            records = store.report('c', '2026-09-24', '2026-09-24', NOW + 6000)['activities']
            receipts = [r for r in records if r['kind'] == 'CARE_SCENE']
            self.assertEqual(len(receipts), 1)
            self.assertIn('3 星球币', receipts[0]['detail'])
            store.close()
            reopened = Store(directory)
            self.assertEqual(reopened.state('c')['state']['care']['rail-front-west']['careCount'], 2)
            reopened.close()
