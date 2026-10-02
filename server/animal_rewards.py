"""Animal rewards share the household wallet; all random choices belong to the server."""
import json
import secrets
from pathlib import Path

CATALOGUE = json.loads((Path(__file__).resolve().parents[1] / 'shared' / 'animal-rewards.json').read_text())
ANIMALS = {a['id']: a for a in CATALOGUE['animals']}


def empty_animal_rewards():
    return dict(attempts={key: 0 for key in ANIMALS}, earned=0, pending=[])


def restore_animal_rewards(value):
    def integer(n): return type(n) is int and 0 <= n <= 9007199254740991
    if not isinstance(value, dict) or not isinstance(value.get('attempts'), dict) or any(not integer(value['attempts'].get(key)) for key in ANIMALS) or not integer(value.get('earned')) or not isinstance(value.get('pending'), list):
        raise ValueError('动物掉落记录不完整。')
    attempts = {key: value['attempts'][key] for key in ANIMALS}
    pending = []
    for coin in value['pending']:
        if not isinstance(coin, dict) or not isinstance(coin.get('animal'), str) or coin['animal'] not in ANIMALS or not integer(coin.get('attempt')) or not 1 <= coin['attempt'] <= attempts[coin['animal']] or coin.get('id') != f"{coin['animal']}:{coin['attempt']}" or not integer(coin.get('spot')) or coin['spot'] >= len(CATALOGUE['spots']):
            raise ValueError('动物掉落记录不完整。')
        pending.append({key: coin[key] for key in ('id', 'animal', 'attempt', 'spot')})
    if len({c['id'] for c in pending}) != len(pending) or value['earned'] + len(pending) > sum(attempts.values()):
        raise ValueError('动物掉落记录不完整。')
    return dict(attempts=attempts, earned=value['earned'], pending=pending)


def reduce_animal_rewards(state, action):
    rewards = state.get('animalRewards', empty_animal_rewards())
    if action['type'] == 'ANIMAL_DROP':
        animal, attempt = action.get('animal'), action.get('attempt')
        if not isinstance(animal, str) or animal not in ANIMALS or type(attempt) is not int or attempt != rewards['attempts'][animal] + 1:
            return state
        pending = rewards['pending'].copy()
        if secrets.randbelow(100) < round(CATALOGUE['chance'] * 100):
            pending.append(dict(id=f'{animal}:{attempt}', animal=animal, attempt=attempt, spot=secrets.randbelow(len(CATALOGUE['spots']))))
        state['animalRewards'] = dict(attempts={**rewards['attempts'], animal: attempt}, earned=rewards['earned'], pending=pending)
    elif action['type'] == 'PICKUP_ANIMAL_COIN' and any(c['id'] == action.get('id') for c in rewards['pending']):
        state['coins'] += 1
        state['animalRewards'] = {**rewards, 'earned': rewards['earned'] + 1, 'pending': [c for c in rewards['pending'] if c['id'] != action['id']]}
    return state
