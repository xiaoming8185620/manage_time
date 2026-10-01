"""Permanent, priced workshop growth; no daily loss or passive coin creation."""
import json
import math
from pathlib import Path
CATALOGUE=json.loads((Path(__file__).resolve().parents[1]/'shared/workshop-growth.json').read_text())
ITEMS={i['id']:i for i in CATALOGUE['items']}
def item_for(identifier):
    return next((i for i in ITEMS.values() if identifier in [i['id'],i['target'],*i.get('aliases',[])]),None)
def total(level): return sum(CATALOGUE['costs'][:level])
def reduce_growth(state,action,now):
    item=item_for(action.get('targetId'))
    if not item: raise ValueError('没有这项成长设施。')
    r=dict(level=0,spent=0,credit=0,selection=None,crafted=[],lastEvent=None)|state.get('workshopGrowth',{}).get(item['id'],{})
    credit=10 if item.get('habitat') in state.get('habitats',[]) else 0
    cost=0
    if action['type']=='UPGRADE_WORKSHOP':
        if type(action.get('expectedLevel')) is not int or action['expectedLevel']!=r['level'] or r['level']>=3: return state
        cost=max(0,total(r['level']+1)-credit)-max(0,total(r['level'])-credit)
        if state['coins']<cost: raise ValueError('星球币还不够，免费互动随时可以。')
        r=dict(r,level=r['level']+1,spent=r['spent']+cost,credit=credit,selection=['earth','moon','solar'][r['level']] if item['id']=='earth' else r['selection'],lastEvent=dict(at=now,kind='upgrade',cost=cost))
    else:
        option=next((o for o in item['options'] if o[0]==action.get('option') and o[2]<=r['level']),None)
        if not option: raise ValueError('先完成对应升级，再体验这个互动。')
        crafted=list(r['crafted'])
        if item['id']=='bench' and option[2]==3 and option[0] not in crafted: crafted.append(option[0])
        r=dict(r,selection=option[0],crafted=crafted,lastEvent=dict(at=now,kind=option[0],cost=0))
    state.setdefault('workshopGrowth',{})[item['id']]=r
    state['coins']-=cost
    return state
def restore_growth(raw,habitats,now):
    if not isinstance(raw,dict): raise ValueError('机械港成长记录不正确。')
    out={}
    for key,r in raw.items():
        item=ITEMS.get(key)
        if not item or not isinstance(r,dict) or type(r.get('level')) is not int or not 1<=r['level']<=3: raise ValueError('机械港成长等级不正确。')
        credit=10 if item.get('habitat') in habitats else 0
        if type(r.get('credit')) is not int or r['credit']!=credit or type(r.get('spent')) is not int or r['spent']!=max(0,total(r['level'])-credit): raise ValueError('机械港消费记录不正确。')
        valid=[o[0] for o in item['options'] if o[2]<=r['level']]
        if r.get('selection') is not None and r['selection'] not in valid: raise ValueError('互动尚未解锁。')
        crafted=r.get('crafted')
        if not isinstance(crafted,list) or any(not isinstance(v,str) or item['id']!='bench' or r['level']!=3 or v not in ('flower','satellite','star') for v in crafted) or len(set(crafted))!=len(crafted): raise ValueError('收藏记录不正确。')
        e=r.get('lastEvent')
        if not isinstance(e,dict) or type(e.get('at')) not in (int,float) or not math.isfinite(e['at']) or not 0<=e['at']<=now or e.get('kind') not in ['upgrade',*valid] or type(e.get('cost')) is not int: raise ValueError('成长凭据不正确。')
        expected=max(0,total(r['level'])-credit)-max(0,total(r['level']-1)-credit) if e['kind']=='upgrade' else 0
        if e['cost']!=expected: raise ValueError('成长金额不正确。')
        out[key]=dict(r,crafted=list(crafted))
    return out
def growth_spent(state): return sum(r['spent'] for r in state.get('workshopGrowth',{}).values())
def growth_detail(action,state):
    item=item_for(action['targetId']);r=state['workshopGrowth'][item['id']]
    return f"{item['name']} · {item['stages'][r['level']]} · 使用 {r['lastEvent']['cost']} 星球币" if action['type']=='UPGRADE_WORKSHOP' else f"{item['name']} · {next(o[1] for o in item['options'] if o[0]==action['option'])}（免费）"
