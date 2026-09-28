import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherView} from '../shared/weather.js';
import {plantParts,plantHitbox} from '../shared/plant-render.js';
const now=1790305200000;
test('weather codes select rain, snow, mist, cloud, thunder and day/night',()=>{
  for(const [code,kind] of [[0,'clear'],[1,'clear'],[2,'cloudy'],[3,'cloudy'],[45,'fog'],[48,'fog'],[51,'rain'],[67,'rain'],[80,'rain'],[71,'snow'],[86,'snow'],[95,'thunder'],[99,'thunder']]) {
    const view=weatherView({status:'live',weather:{code,observedAt:now,isDay:false,temperature:26.6,windSpeed:5,cloudCover:30}},now);
    assert.equal(view.kind,kind);assert.equal(view.night,true);assert.equal(view.temperature,27);
  }
});
test('expired and unavailable weather do not masquerade as live weather',()=>{
  assert.equal(weatherView(null,now).available,false);
  assert.equal(weatherView({status:'live',weather:{observedAt:now-10800001}},now).available,false);
  assert.equal(weatherView({status:'live',weather:{observedAt:now+300001}},now).available,false);
  assert.equal(weatherView({status:'stale',weather:{code:0,isDay:true,observedAt:now}},now).stale,true);
});
test('plant rendering selects distinct cells including level zero and anchors the root',()=>{
  const target={id:'rail-front-west',style:'vine'};
  const frames=[0,1,2,3].map(level=>plantParts(target,level)[0]);
  assert.deepEqual(frames.map(p=>[p.column,p.row]),[[0,0],[1,0],[0,1],[1,1]]);
  assert.equal(new Set(frames.map(p=>`${p.x}:${p.y}`)).size,1);
  const hits=[0,1,2,3].map(level=>plantHitbox(target,level));
  for(let i=1;i<4;i++){assert.ok(hits[i].w>hits[i-1].w);assert.ok(hits[i].h>hits[i-1].h);}
});
test('built flowerbed plants follow the saved building slot',()=>{
  const a=plantParts({id:'built-flowerbed',x:.4,floorY:.6},2),b=plantParts({id:'built-flowerbed',x:.7,floorY:.5},2);
  assert.equal(a.length,3);
  for(let i=0;i<3;i++){assert.ok(Math.abs(b[i].x-a[i].x-.3)<1e-10);assert.ok(Math.abs(b[i].y-a[i].y+.1)<1e-10);}
});

import {MOTION_KEY,readMotionPreference,motionEnabled} from '../shared/motion.js';
test('system reduction is the default, explicit on restores motion, and off always pauses',()=>{
  for (const reduced of [true,false]) {
    assert.equal(motionEnabled('system',reduced),!reduced);
    assert.equal(motionEnabled('on',reduced),true);
    assert.equal(motionEnabled('off',reduced),false);
  }
});
test('motion choice survives reload without touching the game save',()=>{
  const storage={getItem:key=>key===MOTION_KEY?'on':null};
  assert.equal(readMotionPreference(storage),'on');
  assert.equal(readMotionPreference({getItem:()=>null}),'system');
  assert.equal(readMotionPreference({getItem:()=>{throw new Error('blocked')}}),'system');
});
