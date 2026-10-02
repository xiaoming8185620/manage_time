import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,gameReducer,restoreState,serializeState} from '../src/game.js';
import {dayStart} from '../shared/calendar.js';
import {nextGuideStep,guidePreferences} from '../shared/onboarding.js';
import {restoreVisitDays} from '../shared/visits.js';
const now=dayStart('2026-10-02');
test('arrival gift is once per Beijing day, independent of tasks and skips absent days',()=>{
  let s={...initialState(),createdAt:now};
  s=gameReducer(s,{type:'VISIT_TOWN',now:now-1});assert.equal(s.coins,10);
  s=gameReducer(s,{type:'VISIT_TOWN',now});assert.equal(s.coins,20);
  assert.equal(gameReducer(s,{type:'VISIT_TOWN',now:now+1000}),s);
  assert.equal(gameReducer(s,{type:'VISIT_TOWN',now:now-86400000}),s);
  s=gameReducer(s,{type:'VISIT_TOWN',now:now+3*86400000});assert.equal(s.coins,30);assert.equal(s.tasks.length,0);
  assert.deepEqual(s.visitDays,['2026-10-01','2026-10-02','2026-10-05']);
});
test('old saves remain valid; daily receipts and guide dismissal survive restoration',()=>{
  const old=initialState();assert.equal(restoreState(serializeState(old)).corrupt,false);
  let s=gameReducer(old,{type:'VISIT_TOWN',now});
  s=gameReducer(s,{type:'GUIDE_PREFERENCE',dismissed:true});
  const restored=restoreState(serializeState(s));assert.equal(restored.corrupt,false);
  assert.equal(gameReducer(restored.state,{type:'VISIT_TOWN',now}),restored.state);
  assert.deepEqual(guidePreferences(restored.state),{introSeen:true,dismissed:true});
  for(const days of [['2026-10-02','2026-10-02'],['2026-02-30'],['2026-10-03'],[false],{}])assert.throws(()=>restoreVisitDays(days,now));
});
test('guidance follows real progress without marking tasks done or granting rewards',()=>{
  let s=initialState();const act=a=>s=gameReducer(s,{...a,now});
  assert.equal(nextGuideStep(s,'2026-10-02').key,'greet');
  act({type:'GREET'});assert.equal(nextGuideStep(s,'2026-10-02').key,'plan');
  act({type:'ADD_TASK',task:{id:'reading',title:'读 10 页书',estimate:15,day:'2026-10-02'}});
  assert.equal(nextGuideStep(s,'2026-10-02').key,'start');
  act({type:'START_TASK',id:'reading'});assert.equal(nextGuideStep(s,'2026-10-02').key,'record');
  act({type:'RECORD_TASK',id:'reading',status:'partial',note:'读了五页'});
  assert.equal(nextGuideStep(s,'2026-10-02').key,'start');assert.equal(s.coins,0);
  act({type:'START_TASK',id:'reading'});
  s=gameReducer(s,{type:'RECORD_TASK',id:'reading',status:'done',actualMinutes:20,now:now+1200000});
  assert.equal(nextGuideStep(s,'2026-10-02').key,'reward');
  act({type:'CLAIM_REWARD',id:'reading'});assert.equal(nextGuideStep(s,'2026-10-02').key,'reflect');
  act({type:'REFLECT',id:'reading',answer:'longer'});assert.equal(nextGuideStep(s,'2026-10-02').key,'explore');
  assert.equal(s.coins,10);
});
test('future plans stay intentional and an old resident is not forced through onboarding',()=>{
  const s={...initialState(),greeted:true,tasks:[{id:'future',day:'2026-10-03',status:'planned'}]};
  assert.equal(guidePreferences(s).introSeen,true);
  assert.equal(nextGuideStep(s,'2026-10-02').future,true);
  assert.equal(guidePreferences({...s,tasks:[{rewardClaimed:true}]}).dismissed,true);
});
