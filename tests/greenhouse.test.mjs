import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer,initialState,restoreState,serializeState } from '../src/game.js';
import { HABITATS,GREENHOUSE_TARGETS,greenhouseAnimalAt,canWalkGreenhouse } from '../shared/greenhouse.js';
import { availableCareTargets,careRecord } from '../shared/scene-care.js';
import { plantFrame,plantParts,plantKind } from '../shared/plant-render.js';
test('six species have distinct growth crops and fixed roots through all four stages',()=>{
  const plants=GREENHOUSE_TARGETS.filter(t=>t.kind==='plant');
  assert.equal(plants.length,6);
  for(const plant of plants){
    const parts=[0,1,2,3].map(count=>plantParts(plant,count)[0]);
    assert.equal(new Set(parts.map(p=>JSON.stringify(p.crop))).size,4);
    parts.forEach(p=>{assert.equal(p.x,plant.x);assert.equal(p.y,plant.y);assert.ok(p.bounds[2]>p.bounds[0]);});
    assert.equal(plantFrame(plantKind(plant),4).level,3);
  }
});
test('greenhouse care shares wallet, caps growth and survives save restore without changing town',()=>{
  let state={...initialState(),coins:30};
  for(let i=0;i<4;i++)state=gameReducer(state,{type:'CARE_SCENE',targetId:'gh-broadleaf',verb:'care',expectedCount:i,careId:`greenhouse-event-${i}`,now:1000+i*3000});
  assert.equal(state.coins,21);assert.equal(careRecord(state,'gh-broadleaf').careCount,3);
  assert.equal(state.care['door-plant'],undefined);
  const saved=restoreState(serializeState(state));assert.equal(saved.corrupt,false);assert.deepEqual(saved.state.care,state.care);
  assert.equal(availableCareTargets(state,'town').some(t=>t.scene==='greenhouse'),false);
  assert.equal(availableCareTargets(state,'greenhouse').length,8);
});
test('habitats spend once, reject insufficient funds and restore their care records',()=>{
  assert.equal(gameReducer(initialState(),{type:'BUILD_HABITAT',habitatId:'parrot-perch'}).coins,0);
  let state={...initialState(),coins:30};
  for(const h of HABITATS){state=gameReducer(state,{type:'BUILD_HABITAT',habitatId:h.id});const once=state;assert.equal(gameReducer(state,{type:'BUILD_HABITAT',habitatId:h.id}),once);}
  assert.equal(state.coins,10);
  state=gameReducer(state,{type:'CARE_SCENE',targetId:'gh-perch-care',verb:'care',expectedCount:0,careId:'perch-care-123',now:1000});
  assert.equal(state.coins,8);assert.equal(restoreState(serializeState(state)).corrupt,false);
  assert.equal(restoreState(serializeState({...state,habitats:[]})).corrupt,true);
});
test('animal routes and articulated frames stay inside glasshouse; resting has stable anchors',()=>{
  for(const kind of ['gh-parrot','gh-snake']){
    const frames=new Set();for(let ms=0;ms<88000;ms+=100){const p=greenhouseAnimalAt(kind,ms);frames.add(p.frame);assert.ok(p.x>.04&&p.x<.9&&p.y>.1&&p.y<.85);}
    assert.equal(frames.size,4);
  }
  assert.equal(greenhouseAnimalAt('gh-parrot',25000,['parrot-perch']).rest,true);
  assert.deepEqual(greenhouseAnimalAt('gh-snake',40000),greenhouseAnimalAt('gh-snake',41000));
  assert.ok(canWalkGreenhouse(.38,.6));assert.ok(canWalkGreenhouse(.5,.7));assert.equal(canWalkGreenhouse(.83,.45),false);
});
