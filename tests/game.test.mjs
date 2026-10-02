import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, gameReducer as reduce, elapsed, restoreState, serializeState, canWalk, validateTask, BUILD_SLOTS } from '../src/game.js';
const task = { id: 'math', title: '数学前六题', category: '学习', estimate: 25, startTime: '17:50' };

test('task estimates require ten minutes while historical short records stay readable',()=>{
  for(const estimate of [1,5,9,9.99])assert.ok(validateTask({...task,estimate}));
  const old={...withTask(),tasks:[{...withTask().tasks[0],estimate:5}]};
  assert.equal(restoreState(serializeState(old)).corrupt,false);
});
test('completion is timed, review freezes the clock, and five-minute tolerance is inclusive',()=>{
  const active=reduce(withTask(),{type:'START_TASK',id:'math',now:1000});
  const complete=(s,actualMinutes,now)=>reduce(s,{type:'RECORD_TASK',id:'math',status:'done',actualMinutes,now});
  assert.equal(complete(active,10,600999),active);
  const reviewed=reduce(active,{type:'REVIEW_TASK',id:'math',now:1201000});
  assert.equal(reviewed.tasks[0].elapsedMs,1200000);
  for(const value of [14,26,9])assert.equal(complete(reviewed,value,9000000),reviewed);
  for(const value of [15,25]){const done=complete(reviewed,value,9000000);assert.equal(done.tasks[0].status,'done');assert.equal(done.tasks[0].reviewAt,1201000);assert.equal(done.tasks[0].elapsedMs,1200000);}
});
test('forgotten pause recovery preserves explanation and requires a fresh valid segment',()=>{
  let s=reduce(withTask(),{type:'START_TASK',id:'math',now:1000});
  s=reduce(s,{type:'RESET_TASK_TIMER',id:'math',note:'吃饭后忘记暂停',now:7201000});
  assert.equal(s.tasks[0].timingCorrections[0].elapsedMs,7200000);
  assert.equal(s.tasks[0].elapsedMs,0);
  assert.equal(restoreState(serializeState(s)).corrupt,false);
  assert.equal(reduce(s,{type:'RECORD_TASK',id:'math',status:'done',actualMinutes:10,now:9000000}),s);
  assert.equal(reduce(s,{type:'CLAIM_REWARD',id:'math'}).coins,0);
});
const withTask = () => reduce(initialState(), { type: 'ADD_TASK', task, now: 1000 });
const care = (targetId, verb, count = 0, now = 4000) => ({ type: 'CARE_SCENE', targetId, verb, expectedCount: count, careId: `care-test-${targetId}-${verb}-${now}`, now });
function completed() { return reduce(reduce(withTask(),{type:'START_TASK',id:task.id,now:1000}), { type: 'RECORD_TASK', id: task.id, status: 'done', actualMinutes: 35, now: 2101000 }); }

test('a completed real-world goal can claim its reward exactly once', () => {
  const done = completed();
  const claimed = reduce(done, { type: 'CLAIM_REWARD', id: task.id });
  assert.equal(claimed.coins, 10);
  assert.equal(claimed.tasks[0].rewardClaimed, true);
  assert.deepEqual(reduce(claimed, { type: 'CLAIM_REWARD', id: task.id }), claimed);
});
test('partial work is retained and does not grant completion rewards', () => {
  const state = reduce(withTask(), { type: 'RECORD_TASK', id: task.id, status: 'partial', note: '做完前四题' });
  assert.equal(state.tasks[0].note, '做完前四题');
  assert.equal(reduce(state, { type: 'CLAIM_REWARD', id: task.id }).coins, 0);
});
test('timer survives leaving and reloading and excludes paused time', () => {
  let state = reduce(withTask(), { type: 'START_TASK', id: task.id, now: 0 });
  state = restoreState(serializeState(state)).state;
  assert.equal(elapsed(state.tasks[0], 60000), 60000);
  state = reduce(state, { type: 'PAUSE_TASK', id: task.id, now: 60000 });
  assert.equal(elapsed(state.tasks[0], 120000), 60000);
  state = reduce(state, { type: 'START_TASK', id: task.id, now: 180000 });
  assert.equal(elapsed(state.tasks[0], 240000), 120000);
});
test('starting a second task pauses the first and preserves its elapsed time', () => {
  let state = reduce(withTask(), { type: 'ADD_TASK', task: { ...task, id: 'reading', title: '读十页书' } });
  state = reduce(state, { type: 'START_TASK', id: 'math', now: 1000 });
  state = reduce(state, { type: 'START_TASK', id: 'reading', now: 61000 });
  assert.equal(state.tasks[0].status, 'paused');
  assert.equal(state.tasks[0].elapsedMs, 60000);
  assert.equal(state.tasks.filter(t => t.status === 'active').length, 1);
});
test('changing a plan preserves honest progress and updates category and estimate', () => {
  let state = reduce(withTask(), { type: 'START_TASK', id: task.id, now: 1000 });
  state = reduce(state, { type: 'EDIT_TASK', id: task.id, task: { ...task, title: '先出门走一走', estimate: 15, category: '运动' }, now: 61000 });
  assert.equal(state.tasks[0].elapsedMs, 60000);
  assert.equal(state.tasks[0].estimate, 15);
  assert.equal(state.tasks[0].category, '运动');
  assert.ok(state.achievements.includes('adjust'));
});
test('construction is atomic: enough coins, valid unoccupied slot, no duplicate building', () => {
  let state = reduce(completed(), { type: 'CLAIM_REWARD', id: task.id });
  assert.deepEqual(reduce(initialState(), { type: 'BUILD', itemId: 'cat-tree', slot: 'sunny' }), initialState(), 'empty wallet cannot build');
  assert.deepEqual(reduce(state, { type: 'BUILD', itemId: 'cat-tree', slot: 'not-real' }), state);
  const built = reduce(state, { type: 'BUILD', itemId: 'cat-tree', slot: 'sunny', now: 3000 });
  assert.equal(built.coins, 0);
  assert.equal(built.buildings.length, 1);
  assert.deepEqual(reduce(built, { type: 'BUILD', itemId: 'cat-tree', slot: 'window' }), built);
  assert.deepEqual(reduce({ ...built, coins: 10 }, { type: 'BUILD', itemId: 'flowerbed', slot: 'sunny' }), { ...built, coins: 10 });
});
test('save restores completed tasks, balance, building choice and reflections together', () => {
  let state = reduce(completed(), { type: 'CLAIM_REWARD', id: task.id });
  state = reduce(state, { type: 'BUILD', itemId: 'cat-tree', slot: 'window', now: 5000 });
  state = reduce(state, { type: 'REFLECT', id: task.id, answer: 'longer', now: 6000 });
  const loaded = restoreState(serializeState(state));
  assert.equal(loaded.corrupt, false);
  assert.deepEqual(loaded.state.tasks, state.tasks);
  assert.deepEqual(loaded.state.buildings, state.buildings);
  assert.deepEqual(loaded.state.reflections, state.reflections);
  assert.equal(loaded.state.coins, 0);
});
test('invalid save is surfaced, not silently accepted as a valid town', () => {
  assert.equal(restoreState('{invalid').corrupt, true);
  assert.equal(restoreState(JSON.stringify({ version: 1 })).corrupt, true);
  assert.equal(restoreState(null).corrupt, false);
});
test('malformed local tasks and duplicate buildings are rejected before rendering', () => {
  const base=withTask();
  for (const override of [{createdAt:'not-a-date'},{day:'2026-02-30'},{rewardClaimed:'false'},{status:'active',startedAt:'yesterday'},{estimate:-1},{note:{}},{category:{}}]) {
    const raw={...base,tasks:[{...base.tasks[0],...override}]};
    assert.equal(restoreState(JSON.stringify(raw)).corrupt,true,JSON.stringify(override));
  }
  assert.equal(restoreState(JSON.stringify({...base,tasks:[base.tasks[0],base.tasks[0]]})).corrupt,true);
  const buildings=[{itemId:'cat-tree',slot:'window',builtAt:1000},{itemId:'cat-tree',slot:'sunny',builtAt:1000}];
  assert.equal(restoreState(JSON.stringify({...base,buildings})).corrupt,true);
  assert.equal(restoreState(JSON.stringify({...base,reflections:[null]})).corrupt,true);
});
test('specific task, valid estimates, clock fields and actual time are required', () => {
  assert.ok(validateTask({ ...task, title: '   ' }));
  assert.ok(validateTask({ ...task, estimate: 0 }));
  assert.ok(validateTask({ ...task, startTime: '29:99' }));
  assert.equal(validateTask(task), '');
  const state = withTask();
  assert.deepEqual(reduce(state, { type: 'RECORD_TASK', id: task.id, status: 'done', actualMinutes: -1 }), state);
});
test('movement and construction slots stay on the walkable deck', () => {
  assert.equal(canWalk(.5, .6), true);
  assert.equal(canWalk(.95, .95), false);
  assert.equal(canWalk(.1, .1), false);
  assert.ok(BUILD_SLOTS.every(s => canWalk(s.x, s.y)));
});
test('watering is free, and paid growth is permanent, bounded and idempotent', () => {
  let state = reduce(initialState(), care('rail-front-west', 'water'));
  assert.equal(state.coins, 0);
  assert.equal(state.care['rail-front-west'].waterCount, 1);
  assert.deepEqual(reduce(state, care('rail-front-west', 'care')), state);
  state = reduce(completed(), { type: 'CLAIM_REWARD', id: task.id });
  for (let i = 0; i < 3; i++) {
    const action = care('rail-front-west', 'care', i, 5000 + i * 3000);
    state = reduce(state, action);
    assert.equal(state.coins, 10 - (i + 1) * 3);
    assert.deepEqual(reduce(state, action), state);
    assert.equal(restoreState(serializeState(state)).state.care['rail-front-west'].careCount, i + 1);
  }
  assert.deepEqual(reduce(state, care('rail-front-west', 'care', 3, 20000)), state);
  assert.equal(reduce(state, care('rail-front-west', 'water', 3, 21000)).coins, 1);
});
test('stale care, unknown targets and unbuilt items cannot spend coins', () => {
  const state = reduce(completed(), { type: 'CLAIM_REWARD', id: task.id });
  for (const action of [care('unknown', 'care'), care('built-flowerbed', 'care'), care('rail-west', 'care', 1), care('xiaoguai', 'water')]) assert.deepEqual(reduce(state, action), state);
  assert.equal(reduce(state, { ...care('rail-west', 'care'), cost: 0 }).coins, 7);
});
test('fixture daily cap uses Beijing day and old saves need no care field', () => {
  let state = reduce(completed(), { type: 'CLAIM_REWARD', id: task.id });
  const before = Date.parse('2026-09-24T15:59:00Z');
  state = reduce(state, care('xiaoguai', 'care', 0, before));
  assert.equal(state.coins, 8);
  assert.deepEqual(reduce(state, care('xiaoguai', 'care', 1, before + 1000)), state);
  state = reduce(state, care('xiaoguai', 'care', 1, before + 61000));
  assert.equal(state.coins, 6);
  const old = { ...initialState() }; delete old.care;
  assert.deepEqual(restoreState(JSON.stringify(old)).state.care, {});
});
