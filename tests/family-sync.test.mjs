import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeFamilySnapshot } from '../src/family-sync.js';

const snapshot = (revision, coins, boy = {x:.5,y:.6}) => ({revision,state:{coins,boy,tasks:[]}});

test('a slow poll cannot roll back a newer saved balance or completed task', async () => {
  let release;
  const oldPoll = new Promise(resolve => {release=resolve;});
  let current = snapshot(3,0);
  const refresh = oldPoll.then(data => {current=mergeFamilySnapshot(current,data);});
  const saved = snapshot(4,10);
  saved.state.tasks=[{id:'math',status:'done',rewardClaimed:true}];
  current=mergeFamilySnapshot(current,saved);
  release(snapshot(3,0));
  await refresh;
  assert.equal(current.revision,4);
  assert.equal(current.state.coins,10);
  assert.equal(current.state.tasks[0].status,'done');
});

test('equal revisions do not replace state every five seconds; new progress retains local position', () => {
  const current=snapshot(5,7,{x:.62,y:.59});
  assert.equal(mergeFamilySnapshot(current,snapshot(5,7)),current);
  const next=mergeFamilySnapshot(current,snapshot(6,8));
  assert.equal(next.state.coins,8);
  assert.deepEqual(next.state.boy,current.state.boy);
  assert.equal(mergeFamilySnapshot(null,snapshot(0,0)).revision,0);
});
