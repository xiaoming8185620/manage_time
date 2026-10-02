import test from 'node:test';
import assert from 'node:assert/strict';
import {supplyAt,SUPPLY_PERIOD_MS} from '../shared/workshop-supply.js';
import {initialState,gameReducer,serializeState,restoreState} from '../src/game.js';
import {availableCareTargets} from '../shared/scene-care.js';

test('supply visit approaches, stops to work and exits forward without visible jumps',()=>{
 const phases=new Set();let previous=supplyAt(0);
 for(let ms=20;ms<SUPPLY_PERIOD_MS*2;ms+=20){
  const p=supplyAt(ms);phases.add(p.phase);
  for(const key of ['x','y','scale','opacity'])assert.ok(Number.isFinite(p[key]));
  assert.ok(p.opacity>=0&&p.opacity<=1);
  if(p.opacity>.01&&previous.opacity>.01){
   assert.ok(p.x<=previous.x+1e-8,'never travels backwards');
   assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<.005,'continuous visible route');
  }
  if(p.cargo.opacity>.01&&previous.cargo.opacity>.01)assert.ok(Math.hypot(p.cargo.x-previous.cargo.x,p.cargo.y-previous.cargo.y)<.005);
  previous=p;
 }
 assert.deepEqual([...phases].sort(),['rest','arriving','docking','scanning','unloading','ready','departing'].sort());
 assert.equal(supplyAt(15000).x,supplyAt(25000).x);
 assert.equal(supplyAt(45000).opacity,0);
 for(const invalid of [NaN,Infinity,-1])assert.deepEqual(supplyAt(invalid),supplyAt(0));
 assert.deepEqual(supplyAt(SUPPLY_PERIOD_MS),supplyAt(0));
 // Raised level-three deck receives the crate at its own height, continuously.
 assert.ok(supplyAt(36000,3).cargo.y<supplyAt(36000,0).cargo.y);
 for(const level of [0,1,2,3])assert.ok(Math.abs(supplyAt(35999,level).cargo.y-supplyAt(36000,level).cargo.y)<.001);
});

test('new supply objects are free to visit and legacy train receipts remain restorable',()=>{
 let s={...initialState(),coins:10};
 s=gameReducer(s,{type:'CARE_SCENE',targetId:'ws-train',verb:'care',careId:'historic-train-receipt',expectedCount:0,now:10000});
 assert.equal(s.coins,6);
 const targets=availableCareTargets(s,'workshop');
 assert.ok(!targets.some(t=>t.id==='ws-train'));
 const supply=targets.filter(t=>t.id.startsWith('ws-supply-'));assert.equal(supply.length,4);
 for(const t of supply)s=gameReducer(s,{type:'CARE_SCENE',targetId:t.id,verb:'interact',careId:`free-${t.id}`,now:12000});
 assert.equal(s.coins,6);
 s=gameReducer(s,{type:'UPGRADE_WORKSHOP',targetId:'supply-dock',expectedLevel:0,now:13000});
 assert.equal(s.coins,3);
 const restored=restoreState(serializeState(s));assert.equal(restored.corrupt,false);
 assert.deepEqual(restored.state.care,s.care);
 assert.deepEqual(restored.state.workshopGrowth,s.workshopGrowth);
 assert.equal(gameReducer(s,{type:'UPGRADE_WORKSHOP',targetId:'supply-dock',expectedLevel:1,now:14000}),s);
});
