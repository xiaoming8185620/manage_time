import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, initialState, restoreState, serializeState, canWalk } from '../src/game.js';
import { COLLECTION_ENDS, crossedCollection, skyResumeTime, DROP_SPOTS } from '../shared/sky-rewards.js';
import { skyVisitorsAt, advanceSkyClock } from '../shared/sky-life.js';

test('exactly 30 out of 100 equally spaced rolls drop, without paying before pickup',()=>{
  let state = initialState();
  for(let i=0;i<100;i++) state=gameReducer(state,{type:'COLLECT_CRYSTAL',attempt:i+1,roll:i/100});
  assert.equal(state.skyRewards.pending.length,30);
  assert.equal(state.coins,0);
  assert.equal(state.skyRewards.attempts,100);
  const saved=restoreState(serializeState(state));
  assert.equal(saved.corrupt,false);
  assert.deepEqual(saved.state.skyRewards,state.skyRewards);
});
test('saved trials cannot reroll; coins can only be claimed once',()=>{
  let state=gameReducer(initialState(),{type:'COLLECT_CRYSTAL',attempt:1,roll:.3});
  assert.equal(gameReducer(state,{type:'COLLECT_CRYSTAL',attempt:1,roll:0}),state);
  state=gameReducer(state,{type:'COLLECT_CRYSTAL',attempt:2,roll:.29999});
  assert.equal(gameReducer(state,{type:'PICKUP_SKY_COIN',id:1}),state);
  state=gameReducer(state,{type:'PICKUP_SKY_COIN',id:2,amount:999});
  assert.equal(state.coins,1);
  assert.equal(gameReducer(state,{type:'PICKUP_SKY_COIN',id:2}),state);
  assert.equal(restoreState(serializeState(state)).state.skyRewards.earned,1);
});
test('collection end triggers once, pause never triggers, resume and cycle wrap preserve sequence',()=>{
  for(let i=0;i<2;i++) {
    const end=COLLECTION_ENDS[i];
    assert.equal(skyVisitorsAt(end-1).find(v=>v.kind==='collector').phase,'collecting');
    assert.equal(skyVisitorsAt(end+1).find(v=>v.kind==='collector').phase,'cruising');
    assert.equal(crossedCollection(end-1,end+1,i),true);
    assert.equal(crossedCollection(end+1,end+32,i),false);
    assert.equal(crossedCollection(end-1,advanceSkyClock(end-1,60000,true),i),false);
    assert.equal(skyResumeTime(i+1),end+1);
  }
  assert.equal(crossedCollection(167990,10,2),false);
  assert.equal(crossedCollection(34699,34701,2),true);
  DROP_SPOTS.forEach(({x,y})=>assert.ok(canWalk(x,y)));
});
test('legacy saves restore; invalid or duplicate pending coins are rejected',()=>{
  assert.equal(restoreState(serializeState(initialState())).corrupt,false);
  for(const skyRewards of [null,{attempts:1,earned:0,pending:[1,1]},{attempts:1,earned:1,pending:[1]},{attempts:1,earned:0,pending:[2]}]) {
    assert.equal(restoreState(serializeState({...initialState(),skyRewards})).corrupt,true);
  }
});
