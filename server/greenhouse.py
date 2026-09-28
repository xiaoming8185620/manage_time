import json
from pathlib import Path

CATALOGUE = json.loads((Path(__file__).resolve().parents[1] / 'shared' / 'greenhouse.json').read_text())
HABITATS = {item['id']: item for item in CATALOGUE['habitats']}

def restore_habitats(value):
    if not isinstance(value, list) or any(not isinstance(i,str) or i not in HABITATS for i in value) or len(set(value)) != len(value):
        raise ValueError('温室建设记录不完整。')
    return value.copy()

def build_habitat(state, action):
    identifier = action.get('habitatId')
    item = HABITATS.get(identifier) if isinstance(identifier,str) else None
    if not item:
        raise ValueError('这处温室设施无法建造。')
    owned = state.get('habitats', [])
    if identifier in owned:
        return state
    if state['coins'] < item['cost']:
        raise ValueError('星球币还不够，动物互动一直免费。')
    state['coins'] -= item['cost']
    state['habitats'] = [*owned,identifier]
    return state
