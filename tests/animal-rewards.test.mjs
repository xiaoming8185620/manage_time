import test from 'node:test';
import assert from 'node:assert/strict';
import {gameReducer,initialState,serializeState,restoreState} from '../src/game.js';
import {ANIMALS,ANIMAL_SPOTS,animalResumeTime,animalTrialDue} from '../shared/animal-rewards.js';
import {canWalkGreenhouse} from '../shared/greenhouse.js';
test('animal drops are 30%, land only on walkable spots and never pay before pickup',()=>{
 let s=initialState();
 for(let i=0;i<100;i++)s=gameReducer(s,{type:'ANIMAL_DROP',animal:'gh-parrot',attempt:i+1,roll:i/100,spotRoll:(i%3)/3});
 assert.equal(s.animalRewards.pending.length,30);assert.equal(s.coins,0);
 assert.equal(new Set(s.animalRewards.pending.map(c=>c.spot)).size,3);
 ANIMAL_SPOTS.forEach(p=>assert.ok(canWalkGreenhouse(p.x,p.y)));
});
test('sources have independent sequences, retry never rerolls and pickup awards exactly once',()=>{
 let s=initialState();
 for(const animal of ANIMALS){s=gameReducer(s,{type:'ANIMAL_DROP',animal:animal.id,attempt:1,roll:.1,spotRoll:.2});}
 const before=s;s=gameReducer(s,{type:'ANIMAL_DROP',animal:'gh-parrot',attempt:1,roll:.1,spotRoll:.9});assert.equal(s,before);
 s=gameReducer(s,{type:'PICKUP_ANIMAL_COIN',id:'gh-parrot:1',amount:999});assert.equal(s.coins,1);assert.equal(s.animalRewards.pending.length,1);
 assert.equal(gameReducer(s,{type:'PICKUP_ANIMAL_COIN',id:'gh-parrot:1'}),s);
 assert.deepEqual(restoreState(serializeState(s)).state.animalRewards,s.animalRewards);
 assert.equal(restoreState(serializeState(initialState())).corrupt,false);
});
test('rest begins one trial per active cycle; resume does not repeat a saved trial',()=>{
 for(const a of ANIMALS){assert.equal(animalTrialDue(a.id,a.end-1,0),false);assert.equal(animalTrialDue(a.id,a.end,0),true);assert.equal(animalTrialDue(a.id,animalResumeTime(a.id,1),1),false);assert.equal(animalTrialDue(a.id,a.end+a.period,1),true);}
});
test('malformed animal drop saves are rejected',()=>{
 const good=gameReducer(initialState(),{type:'ANIMAL_DROP',animal:'gh-snake',attempt:1,roll:.1,spotRoll:.2}).animalRewards;
 for(const animalRewards of [null,{...good,pending:[...good.pending,...good.pending]},{...good,earned:1},{...good,pending:[{...good.pending[0],spot:20}]},{...good,pending:[{...good.pending[0],id:'gh-snake:2'}]}])assert.equal(restoreState(serializeState({...initialState(),animalRewards})).corrupt,true);
});
