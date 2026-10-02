"""Scene care rules share their target catalogue with the browser."""
import copy
import json
import math
from pathlib import Path
from .greenhouse import CATALOGUE
from .workshop import CATALOGUE as WORKSHOP
from .workshop_growth import item_for

TARGETS = {t['id']: t for t in json.loads((Path(__file__).resolve().parents[1] / 'shared' / 'scene-care.json').read_text())}
TARGETS.update({t['id']: t for t in CATALOGUE['targets']})
TARGETS.update({t['id']: t for t in WORKSHOP['targets']})
LEVELS = ('初生', '舒展', '繁茂', '盛放')


def record_for(state, target_id):
    return dict(careCount=0, waterCount=0, interactionCount=0, caredAt=None, wateredAt=None, interactedAt=None, lastEvent=None) | state.get('care', {}).get(target_id, {})


def reduce_care(state, action, now, day_key):
    target_id, verb, care_id = action.get('targetId'), action.get('verb'), action.get('careId')
    target = TARGETS.get(target_id) if isinstance(target_id, str) else None
    if target and target.get('retired'):
        raise ValueError('这项建设已经下架，原有记录仍然保留。')
    if not target or verb not in ('water', 'care', 'interact') or not isinstance(care_id, str) or not 10 <= len(care_id) <= 80:
        raise ValueError('照料操作格式不正确。')
    if target.get('itemId') and not any(b['itemId'] == target['itemId'] for b in state['buildings']):
        raise ValueError('先建好这处小天地，再来照料。')
    if target.get('habitatId') and target['habitatId'] not in state.get('habitats', []):
        raise ValueError('先建好这处栖息地，再来照料。')
    if (verb == 'water' and target['kind'] != 'plant') or (verb == 'interact' and target['kind'] == 'plant'):
        raise ValueError('这处场景不支持这个动作。')
    record = record_for(state, target_id)
    if record['lastEvent'] and record['lastEvent']['id'] == care_id:
        return state
    if verb == 'care' and item_for(target_id):
        raise ValueError('请使用成长面板安装新部件，日常保养免费。')
    if verb == 'care':
        if type(action.get('expectedCount')) is not int or action['expectedCount'] != record['careCount']:
            return state
        if target['kind'] == 'plant' and record['careCount'] >= 3:
            return state
        if target['kind'] != 'plant' and record['caredAt'] is not None and day_key(record['caredAt']) == day_key(now):
            return state
        if state['coins'] < target['cost']:
            raise ValueError('星球币还不够，免费互动随时都可以。')
    elif record['lastEvent'] and now - record['lastEvent']['at'] < 2500:
        return state
    cost = target['cost'] if verb == 'care' else 0
    count, stamp = {'care': ('careCount', 'caredAt'), 'water': ('waterCount', 'wateredAt'), 'interact': ('interactionCount', 'interactedAt')}[verb]
    record[count] += 1
    record[stamp] = now
    record['lastEvent'] = dict(id=care_id, verb=verb, at=now, cost=cost)
    state.setdefault('care', {})[target_id] = record
    state['coins'] -= cost
    return state


def restore_care(raw, buildings, now, habitats=()):
    if not isinstance(raw, dict):
        raise ValueError('照料记录不正确。')
    result = {}
    for target_id, source in raw.items():
        target = TARGETS.get(target_id)
        if not target or not isinstance(source, dict) or (target.get('itemId') and not any(b['itemId'] == target['itemId'] for b in buildings)):
            raise ValueError('照料对象不正确。')
        if target.get('habitatId') and target['habitatId'] not in habitats:
            raise ValueError('栖息地照料记录不正确。')
        record = record_for({'care': {target_id: copy.deepcopy(source)}}, target_id)
        for key in ('careCount', 'waterCount', 'interactionCount'):
            if type(record[key]) is not int or not 0 <= record[key] <= 100000:
                raise ValueError('照料次数不正确。')
        if (target['kind'] == 'plant' and (record['careCount'] > 3 or record['interactionCount'])) or (target['kind'] != 'plant' and record['waterCount']):
            raise ValueError('照料类型不正确。')
        for stamp, count in (('caredAt', 'careCount'), ('wateredAt', 'waterCount'), ('interactedAt', 'interactionCount')):
            value = record[stamp]
            if (record[count] and value is None) or (value is not None and (type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= now)):
                raise ValueError('照料时间不正确。')
        event = record['lastEvent']
        if event and (not isinstance(event, dict) or not isinstance(event.get('id'), str) or event.get('verb') not in ('water', 'care', 'interact') or type(event.get('at')) not in (int, float) or not 0 <= event['at'] <= now or event.get('cost') != (target['cost'] if event.get('verb') == 'care' else 0)):
            raise ValueError('照料凭据不正确。')
        result[target_id] = record
    return result


def care_spent(records):
    return sum(TARGETS[target_id]['cost'] * record['careCount'] for target_id, record in records.items())


def care_detail(action, state):
    target, verb = TARGETS[action['targetId']], action['verb']
    if verb == 'water':
        return f"{target['name']} · 浇水（免费）"
    if verb == 'interact':
        return f"{target['name']} · {target.get('freeLabel', '互动')}（免费）"
    growth = ' · ' + LEVELS[state['care'][target['id']]['careCount']] if target['kind'] == 'plant' else ''
    return f"{target['name']} · {target.get('paidLabel', '施肥修剪')} · 使用 {target['cost']} 星球币{growth}"
