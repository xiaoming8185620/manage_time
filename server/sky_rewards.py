"""Server owns the 30% roll. State and the idempotent command commit together."""
import secrets


def empty_sky_rewards():
    return dict(attempts=0, earned=0, pending=[])


def restore_sky_rewards(value):
    if not isinstance(value, dict):
        raise ValueError('掉落记录不完整。')
    attempts, earned, pending = value.get('attempts'), value.get('earned'), value.get('pending')
    if type(attempts) is not int or not 0 <= attempts <= 9007199254740991 or type(earned) is not int or earned < 0 or not isinstance(pending, list):
        raise ValueError('掉落记录不完整。')
    if any(type(i) is not int or not 1 <= i <= attempts for i in pending) or len(set(pending)) != len(pending) or earned + len(pending) > attempts:
        raise ValueError('掉落记录不完整。')
    return dict(attempts=attempts, earned=earned, pending=pending.copy())


def reduce_sky_rewards(state, action):
    sky = state.get('skyRewards', empty_sky_rewards())
    if action['type'] == 'COLLECT_CRYSTAL':
        attempt = action.get('attempt')
        if type(attempt) is not int or attempt != sky['attempts'] + 1:
            return state
        pending = sky['pending'].copy()
        if secrets.randbelow(100) < 30:
            pending.append(attempt)
        state['skyRewards'] = dict(attempts=attempt, earned=sky['earned'], pending=pending)
    elif type(action.get('id')) is int and action['id'] in sky['pending']:
        state['coins'] += 1
        state['skyRewards'] = dict(attempts=sky['attempts'], earned=sky['earned'] + 1, pending=[i for i in sky['pending'] if i != action['id']])
    return state
