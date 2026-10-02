import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,gameReducer,restoreState,serializeState} from '../src/game.js';
import {availableCareTargets} from '../shared/scene-care.js';
import {WORKSHOP_FLOOR,WORKSHOP_TARGETS,WORKSHOP_HABITATS,canWalkWorkshop,workshopDepth,workshopLifeAt,workshopAdvice} from '../shared/workshop.js';
import {dayKey} from '../shared/calendar.js';
import {workshopTrainAt,WORKSHOP_TRAIN_PERIOD_MS,WORKSHOP_RAIL_LENGTH} from '../shared/workshop-rail.js';

test('workshop shares save and wallet; free care has no greeting or balance gate',()=>{
  let state=initialState();
  assert.equal(availableCareTargets(state,'workshop').length,12);
  for(const t of WORKSHOP_TARGETS.filter(t=>!t.habitatId))state=gameReducer(state,{type:'CARE_SCENE',targetId:t.id,verb:'interact',careId:`workshop-${t.id}`,now:10000});
  assert.equal(state.coins,0);assert.equal(state.greeted,false);assert.equal(Object.keys(state.care).length,13);
  const funded={...state,coins:30+WORKSHOP_HABITATS.reduce((sum,h)=>sum+h.cost,0)};state=funded;
  for(const item of WORKSHOP_HABITATS){state=gameReducer(state,{type:'BUILD_HABITAT',habitatId:item.id,cost:0});assert.equal(gameReducer(state,{type:'BUILD_HABITAT',habitatId:item.id}),state);}
  assert.equal(state.coins,30);assert.equal(availableCareTargets(state,'workshop').length,12+WORKSHOP_HABITATS.length);
  state=gameReducer(state,{type:'CARE_SCENE',targetId:'ws-dock-care',verb:'interact',careId:'dock-free-check',now:14000});
  state=gameReducer(state,{type:'CARE_SCENE',targetId:'ws-train',verb:'care',careId:'ws-dock-paid-123',expectedCount:0,now:15000});
  assert.equal(state.coins,26);
  assert.equal(gameReducer(state,{type:'CARE_SCENE',targetId:'ws-train',verb:'care',careId:'ws-dock-paid-456',expectedCount:1,now:18000}),state);
  const restored=restoreState(serializeState(state));assert.equal(restored.corrupt,false);assert.deepEqual(restored.state.care,state.care);assert.deepEqual(restored.state.habitats,state.habitats);
  assert.equal(restoreState(serializeState({...state,habitats:[]})).corrupt,true);
  assert.ok(availableCareTargets(state,'greenhouse').every(t=>!t.id.startsWith('ws-')));
});
test('every accepted straight walk stays on the convex floor and scales continuously',()=>{
  assert.ok(canWalkWorkshop(.49,.67));
  for(const p of [[.52,.46],[.08,.50],[.49,.9],[NaN,.6],[.5,Infinity]])assert.equal(canWalkWorkshop(...p),false);
  for(const a of WORKSHOP_FLOOR)for(const b of WORKSHOP_FLOOR)for(let t=0;t<=1;t+=.1)assert.ok(canWalkWorkshop(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t));
  for(let y=.535;y<.73;y+=.001)assert.ok(workshopDepth(y+.001)-workshopDepth(y)<.002);
  assert.ok(workshopDepth(.73)>workshopDepth(.535));
});
test('mechanical routes stay bounded; dog rests and train never teleports',()=>{
  const dogFrames=new Set();
  for(let ms=0;ms<96000;ms+=100){
    for(const kind of ['dog','cleaner','drone','train']){
      const p=workshopLifeAt(kind,ms);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.opacity>=0&&p.opacity<=1);
      if(kind==='dog'){dogFrames.add(p.frame);assert.ok(canWalkWorkshop(p.x,p.y));}
      if(kind==='train'){
        const n=workshopLifeAt(kind,ms+100);
        assert.ok(Math.hypot(n.x-p.x,n.y-p.y)<.01,'continuous train route, including hidden sections and cycle boundary');
      }
    }
  }
  assert.equal(dogFrames.size,1);
  for(const habitats of [[],['robot-dock']])for(let ms=0;ms<100000;ms+=173){
    assert.deepEqual(workshopLifeAt('dog',ms,habitats),workshopLifeAt('dog',0,habitats));
  }
  assert.notDeepEqual(workshopLifeAt('dog',0),workshopLifeAt('dog',0,['robot-dock']));
  assert.deepEqual(workshopLifeAt('dog',1000),workshopLifeAt('dog',4000));
});
test('brain advice uses the selected real task and respects pause and partial progress',()=>{
  const today=dayKey(Date.now());
  assert.match(workshopAdvice({tasks:[]},today),/只安排一件/);
  assert.match(workshopAdvice({tasks:[{title:'读三页',status:'planned',day:today,estimate:7}]},today),/7 分钟/);
  assert.match(workshopAdvice({tasks:[{title:'读三页',status:'partial',day:today}]},today),/调整计划也没关系/);
});
test('train follows the perimeter at stable speed and turns from the axle direction',()=>{
  const step=40,expected=WORKSHOP_RAIL_LENGTH*step/WORKSHOP_TRAIN_PERIOD_MS;
  const frames=new Set();
  for(let ms=0;ms<WORKSHOP_TRAIN_PERIOD_MS*2;ms+=step){
    const a=workshopTrainAt(ms),b=workshopTrainAt(ms+step);
    const travel=Math.hypot(b.x-a.x,(b.y-a.y)*1058/1487);
    assert.ok(travel>expected*.97&&travel<expected*1.01,'no corner speed spikes or cycle jump');
    assert.equal(canWalkWorkshop(a.x,a.y),false,'rail must not cross the walking floor');
    assert.ok(Number.isFinite(a.heading));frames.add(a.frame);
  }
  assert.ok(frames.has(5),'front view used at left bend');
  assert.ok(frames.has(4),'side view used at foreground');
  const start=workshopTrainAt(0),end=workshopTrainAt(WORKSHOP_TRAIN_PERIOD_MS);
  assert.ok(Math.hypot(start.x-end.x,start.y-end.y)<1e-9);
  assert.equal(start.opacity,0);assert.equal(end.opacity,0);
  for(const value of [NaN,Infinity,-1])assert.equal(workshopTrainAt(value).distance,0);
});
