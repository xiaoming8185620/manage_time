import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,gameReducer,restoreState,serializeState,availableBuildSlots,buildingPosition} from '../src/game.js';
import {ALL_HABITATS,GREENHOUSE_TARGETS,canWalkGreenhouse,greenhouseAnimalAt} from '../shared/greenhouse.js';
import {canWalkWorkshop,workshopLifeAt} from '../shared/workshop.js';
import {WORKSHOP_LAYOUT} from '../shared/workshop-layout.js';
import {plantHitbox} from '../shared/plant-render.js';
import {SUPPLY_SPOTS,supplyAt} from '../shared/workshop-supply.js';
import {careTarget,availableCareTargets} from '../shared/scene-care.js';

// Convert art-local touch regions to scene pixels, including the real 44 px
// minimum. Check spatial relationships, not a frozen list of coordinates.
const sceneRatio=1058/1487;
function touchRect(h,width){
  const height=width*sceneRatio, artW=h.width*width;
  const artH=artW*(h.crop[3]-h.crop[1])/(h.crop[2]-h.crop[0]);
  const hit=h.hit||{x:.5,y:.5,w:1,h:1};
  const w=Math.max(44,artW*hit.w),sizeY=Math.max(44,artH*hit.h);
  return {x:h.x*width+(hit.x-.5)*artW-w/2,y:h.y*height+(hit.y-.96)*artH-sizeY/2,w,h:sizeY};
}
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const targetRect=(p,width,min=44)=>{const h=width*sceneRatio,w=Math.max(min,p.w*width),height=Math.max(min,p.h*h);return{x:p.x*width-w/2,y:p.y*h-height/2,w,h:height};};

test('new facilities leave existing floor routes, portals, plans and plants usable',()=>{
  for(const item of ALL_HABITATS.filter(h=>h.image)){
    const scene=careTarget(item.targetId).scene;
    const canWalk=scene==='greenhouse'?canWalkGreenhouse:canWalkWorkshop;
    // Ground footprint, not the upper visual silhouette; tall antennas may
    // extend above another depth plane without occupying its floor.
    for(const dx of [-.38,0,.38])for(const dy of [-.008,0,.008])assert.equal(canWalk(item.x+dx*item.width,item.y+dy),false,`${item.id}: walkable footprint`);
    for(const width of [768,1012,1280]){
      const hit=touchRect(item,width), height=width*sceneRatio;
      assert.ok(hit.w>=44&&hit.h>=44);
      const plan=scene==='greenhouse'?{x:.195,y:.59,w:.054}:{x:.792,y:.575,w:.056};
      assert.ok(!overlaps(hit,targetRect({x:plan.x,y:plan.y-plan.w*.66/sceneRatio,w:plan.w,h:plan.w*1.5/sceneRatio},width)),`${item.id}: plan`);
      if(scene==='greenhouse'){
        for(const plant of GREENHOUSE_TARGETS.filter(t=>t.kind==='plant'))for(let level=0;level<4;level++)assert.ok(!overlaps(hit,targetRect(plantHitbox(plant,level),width)),`${item.id}: ${plant.id} stage ${level}`);
        for(const portal of [{x:.01*width,y:.34*height,w:.13*width,h:.19*height},{x:.39*width,y:.84*height,w:.18*width,h:.13*height}])assert.ok(!overlaps(hit,portal),`${item.id}: portal`);
        for(const [x,y] of [[.40,.65],[.54,.55],[.68,.66]])assert.ok(!overlaps(hit,targetRect({x,y,w:0,h:0},width,52)),`${item.id}: coin`);
        for(const habitats of [[],['snake-rest']])for(let ms=0;ms<44000;ms+=250){const p=greenhouseAnimalAt('gh-snake',ms,habitats);assert.ok(!overlaps(hit,targetRect({...p,w:.12,h:.1},width)),`${item.id}: snake route`);}
      }else{
        for(let ms=0;ms<46000;ms+=100){
          const p=workshopLifeAt('cleaner',ms),w=WORKSHOP_LAYOUT.cleaner.width*width,h=w*590/540;
          assert.ok(!overlaps(hit,{x:p.x*width-w/2,y:p.y*height-.94*h,w,h}),`${item.id}: cleaner route`);
        }
        for(const p of Object.values(SUPPLY_SPOTS))assert.ok(!overlaps(hit,targetRect({x:p.x,y:p.y-.025,w:.06,h:.06},width)),`${item.id}: supply control`);
        for(const level of [0,3])for(let ms=0;ms<70000;ms+=250){
          const p=supplyAt(ms,level);
          if(p.opacity>.1)assert.ok(!overlaps(hit,targetRect({x:p.x,y:p.y-.04,w:.06,h:.06},width)),`${item.id}: visiting pod`);
          if(p.cargo.opacity>.1)assert.ok(!overlaps(hit,targetRect({...p.cargo,w:.04,h:.04},width,0)),`${item.id}: cargo route`);
        }
      }
    }
  }
});

test('four new facilities require construction, spend once and preserve free/daily care',()=>{
  const additions=ALL_HABITATS.filter(h=>h.image);
  assert.equal(additions.length,4);
  let state={...initialState(),coins:48};
  for(const item of additions){
    const target=careTarget(item.targetId);
    assert.ok(!availableCareTargets(state,target.scene).some(t=>t.id===target.id));
    assert.equal(gameReducer(initialState(),{type:'BUILD_HABITAT',habitatId:item.id}).coins,0);
    state=gameReducer(state,{type:'BUILD_HABITAT',habitatId:item.id,cost:0});
    assert.ok(availableCareTargets(state,target.scene).some(t=>t.id===target.id));
    assert.equal(gameReducer(state,{type:'BUILD_HABITAT',habitatId:item.id}),state);
    const coins=state.coins;
    state=gameReducer(state,{type:'CARE_SCENE',targetId:target.id,verb:'interact',careId:`free-${item.id}`,now:1000});
    assert.equal(state.coins,coins);
    state=gameReducer(state,{type:'CARE_SCENE',targetId:target.id,verb:'care',expectedCount:0,careId:`paid-${item.id}`,now:5000});
    assert.equal(state.coins,coins-2);
    assert.equal(gameReducer(state,{type:'CARE_SCENE',targetId:target.id,verb:'care',expectedCount:1,careId:`again-${item.id}`,now:9000}),state);
  }
  assert.equal(state.coins,0);
  const restored=restoreState(serializeState(state));
  assert.equal(restored.corrupt,false);assert.deepEqual(restored.state.habitats,state.habitats);assert.deepEqual(restored.state.care,state.care);
});

test('retired nursery keeps historical saves but has no placement or care',()=>{
  assert.deepEqual(availableBuildSlots('flowerbed',[]),[]);
  for(const slot of ['sunny','window','garden','porch-bed','east-bed']){
    const state={...initialState(),coins:13,buildings:[{itemId:'flowerbed',slot,builtAt:1000}],care:{'built-flowerbed':{careCount:1,caredAt:5000}}};
    const saved=restoreState(serializeState(state));
    assert.equal(saved.corrupt,false);
    assert.equal(saved.state.care['built-flowerbed'].careCount,1);
    assert.deepEqual(gameReducer(state,{type:'BUILD',itemId:'flowerbed',slot,now:6000}),state);
    for(const verb of ['water','care']) assert.deepEqual(gameReducer(state,{type:'CARE_SCENE',targetId:'built-flowerbed',verb,expectedCount:1,careId:'retired-flower-check',now:9000}),state);
    assert.equal(availableBuildSlots('cat-tree',state.buildings).length,3);
    const built=gameReducer(state,{type:'BUILD',itemId:'cat-tree',slot:'sunny',now:10000});
    assert.equal(built.coins,3);
    assert.equal(restoreState(serializeState(built)).corrupt,false);
  }
});
