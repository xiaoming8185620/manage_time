import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,gameReducer,restoreState,serializeState} from '../src/game.js';
import {WORKSHOP_GROWTH,growthQuote,restoreWorkshopGrowth} from '../shared/workshop-growth.js';
const up=(s,id,level)=>gameReducer(s,{type:'UPGRADE_WORKSHOP',targetId:id,expectedLevel:level,now:10000,cost:0});
test('all workshop and supply upgrades spend authoritative prices, persist and stop at maximum',()=>{
 let s={...initialState(),coins:WORKSHOP_GROWTH.length*16};
 for(const item of WORKSHOP_GROWTH){for(let level=0;level<3;level++){
  const before=s;s=up(s,item.id,level);assert.equal(before.coins-s.coins,[3,5,8][level]);assert.equal(up(s,item.id,level),s);
 }assert.equal(up(s,item.id,3),s);}
 assert.equal(s.coins,0);assert.equal(Object.keys(s.workshopGrowth).length,WORKSHOP_GROWTH.length);
 const restored=restoreState(serializeState(s));assert.equal(restored.corrupt,false);assert.deepEqual(restored.state.workshopGrowth,s.workshopGrowth);
 assert.equal(up(s,'train',0),s);assert.equal(up({...initialState(),coins:2},'brain',0).coins,2);
});
test('old habitats credit ten coins once, with no later double building',()=>{
 let s={...initialState(),coins:6,habitats:['robot-dock']};
 for(let l=0;l<3;l++){assert.equal(growthQuote(s,'dog').cost,[0,0,6][l]);s=up(s,'dog',l);}
 assert.equal(s.coins,0);assert.equal(s.workshopGrowth.dog.spent,6);
 assert.deepEqual(restoreWorkshopGrowth(s.workshopGrowth,s.habitats),s.workshopGrowth);
 let other=up({...initialState(),coins:30},'pad',0);
 assert.equal(gameReducer(other,{type:'BUILD_HABITAT',habitatId:'drone-gantry'}),other);
 assert.throws(()=>restoreWorkshopGrowth(s.workshopGrowth,[]));
});
test('locked options cannot run; collections and display choices are permanent and free',()=>{
 let s={...initialState(),coins:20};const act=(s,option)=>gameReducer(s,{type:'INTERACT_WORKSHOP',targetId:'bench',option,now:10001});
 assert.equal(act(s,'satellite'),s);
 for(let l=0;l<3;l++)s=up(s,'bench',l);
 for(const v of ['flower','satellite','star','flower'])s=act(s,v);
 assert.equal(s.coins,4);assert.deepEqual(s.workshopGrowth.bench.crafted,['flower','satellite','star']);
 assert.equal(s.workshopGrowth.bench.selection,'flower');assert.equal(act(s,'unknown'),s);
 const bad=structuredClone(s.workshopGrowth);bad.bench.spent=0;assert.throws(()=>restoreWorkshopGrowth(bad));
 bad.bench.spent=16;bad.bench.level=1;assert.throws(()=>restoreWorkshopGrowth(bad));
});
