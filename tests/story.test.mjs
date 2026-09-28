import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, gameReducer, restoreState, serializeState } from '../src/game.js';
import { manuscript, paidChapters, restoreStory } from '../shared/story.js';
const unlock = (state, id, extra={}) => gameReducer(state,{type:'UNLOCK_STORY',chapterId:id,...extra});
test('story starts free and unlocks permanently in sequence at catalogue prices',()=>{
 let state={...initialState(),coins:20};
 assert.equal(manuscript.chapters[0].cost,0);
 for (const c of paidChapters) { state=unlock(state,c.id,{cost:0}); const again=unlock(state,c.id); assert.equal(again,state); }
 assert.equal(state.coins,2); assert.equal(state.storyUnlocked.length,6);
 assert.deepEqual(restoreState(serializeState(state)).state.storyUnlocked,state.storyUnlocked);
});
test('insufficient balance, invalid chapters and out-of-order requests do not spend coins',()=>{
 const poor={...initialState(),coins:2}; assert.equal(unlock(poor,paidChapters[0].id),poor);
 const rich={...initialState(),coins:20};
 for (const id of [paidChapters[1].id,'unknown','first-light',undefined,{}]) assert.equal(unlock(rich,id),rich);
});
test('legacy saves load and malformed unlock records are surfaced',()=>{
 const old=initialState(); delete old.storyUnlocked;
 assert.deepEqual(restoreState(JSON.stringify(old)).state.storyUnlocked,[]);
 for (const bad of [null,{},['unknown'],[paidChapters[1].id],[paidChapters[0].id,paidChapters[0].id]]) {
  assert.throws(()=>restoreStory(bad)); assert.equal(restoreState(JSON.stringify({...old,storyUnlocked:bad})).corrupt,true);
 }
});
