import test from 'node:test';
import assert from 'node:assert/strict';
import { SKY_CYCLE_MS, advanceSkyClock, skyVisitorsAt } from '../shared/sky-life.js';

test('sky traffic stays bounded and clears before repeating', () => {
  const kinds = new Set();
  for (let time = 0; time < SKY_CYCLE_MS * 3; time += 50) {
    const visitors = skyVisitorsAt(time);
    assert.ok(visitors.length <= 2, `crowded sky at ${time}`);
    for (const v of visitors) {
      kinds.add(v.kind);
      assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
      assert.ok(v.opacity >= 0 && v.opacity <= 1);
      if (v.depth === 'far') assert.ok(v.y < .4, 'distant traffic must avoid the deck');
      if (v.kind === 'carpet') assert.ok(v.x < .36 && v.y > .88, 'carpet must stay in lower-left clouds, outside the deck');
    }
  }
  assert.deepEqual([...kinds].sort(), ['carpet','collector','courier','inspector','meteor']);
  assert.equal(skyVisitorsAt(SKY_CYCLE_MS - 1).length, 0);
  assert.equal(skyVisitorsAt(SKY_CYCLE_MS).length, 0);
});

test('carpet arrives early, pauses to greet, then disappears into the lower clouds', () => {
  const carpet = time => skyVisitorsAt(time).find(v => v.kind === 'carpet');
  assert.equal(carpet(32000).phase,'arriving');
  const hello = carpet(39000), later = carpet(41000);
  assert.equal(hello.phase,'greeting');
  assert.equal(later.phase,'greeting');
  assert.deepEqual([hello.x,hello.y],[later.x,later.y]);
  assert.notEqual(hello.roll,later.roll);
  assert.equal(carpet(45000).phase,'departing');
  assert.ok(carpet(52000).opacity < .2);
  assert.equal(carpet(55000),undefined);
  assert.notDeepEqual([carpet(32000).x,carpet(32000).y],[carpet(119000).x,carpet(119000).y]);
  assert.deepEqual(carpet(advanceSkyClock(39000,60000,true)),hello);
});

test('visitors have identifiable work stops instead of only crossing the scene', () => {
  assert.ok(skyVisitorsAt(28000).some(v => v.kind === 'collector' && v.phase === 'collecting'));
  assert.ok(skyVisitorsAt(58000).some(v => v.kind === 'inspector' && v.phase === 'inspecting'));
  assert.ok(skyVisitorsAt(70000).some(v => v.kind === 'inspector' && v.phase === 'inspecting' && v.x < .75));
});

test('inspector continues forward past the town and leaves on the left', () => {
  let previousX = Infinity;
  for (let time = 46000; time < 78000; time += 50) {
    const inspector = skyVisitorsAt(time).find(v => v.kind === 'inspector');
    assert.ok(inspector.x <= previousX, `inspector reversed at ${time}`);
    previousX = inspector.x;
  }
  assert.ok(previousX < -.1, 'the entire inspector must clear the left edge');
  assert.equal(skyVisitorsAt(78000).find(v => v.kind === 'inspector'), undefined);
});

test('pause and browser suspension cannot fast forward the visit schedule', () => {
  let elapsed = 58000;
  const before = skyVisitorsAt(elapsed);
  elapsed = advanceSkyClock(elapsed, 60 * 60 * 1000, true);
  assert.deepEqual(skyVisitorsAt(elapsed), before);
  assert.equal(advanceSkyClock(elapsed, 16, false), 58016);
  assert.equal(advanceSkyClock(elapsed, 60000, false), 58100);
  assert.equal(advanceSkyClock(elapsed, -1, false), elapsed);
  assert.equal(advanceSkyClock(elapsed, NaN, false), elapsed);
  assert.equal(advanceSkyClock(SKY_CYCLE_MS - 10, 20, false), 10);
});
