import test from 'node:test';
import assert from 'node:assert/strict';
import { readMusicVolume, SceneMusicEngine } from '../src/scene-music.js';

function fixture(loadBuffer = async () => ({ duration: 80 })) {
  const gains = [], sources = [], statuses = [];
  const context = {
    currentTime: 0, state: 'suspended', destination: {},
    resume() { this.state = 'running'; return Promise.resolve(); },
    suspend() { this.state = 'suspended'; return Promise.resolve(); },
    close() { this.state = 'closed'; return Promise.resolve(); },
    createGain() {
      const node = { connect() {}, disconnect() {}, gain: {
        value: 0, cancelScheduledValues() {},
        setValueAtTime(v) { this.value = v; },
        linearRampToValueAtTime(v, t) { this.target = v; this.end = t; },
        setTargetAtTime(v) { this.target = v; },
      } };
      gains.push(node); return node;
    },
    createBufferSource() {
      const node = { connect() {}, disconnect() {}, start(t, offset) { this.offset = offset; }, stop(t) { this.stopAt = t ?? 0; } };
      sources.push(node); return node;
    },
  };
  const engine = new SceneMusicEngine({ contextFactory: () => context, loadBuffer, onStatus: value => statuses.push(value) });
  return { engine, context, sources, gains, statuses };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('music is silent until requested; crossfades and panel ducking use independent gains', async () => {
  const { engine, context, sources, gains } = fixture();
  engine.select('greenhouse');
  assert.equal(sources.length, 0);
  await engine.play();
  assert.equal(sources[0].loop, true);
  context.currentTime = 8;
  await engine.play('workshop');
  assert.equal(sources[0].stopAt, 9.5);
  assert.equal(gains[1].gain.target, 0);
  assert.equal(gains[2].gain.target, 1);
  engine.mix(.5, true);
  assert.equal(gains[0].gain.target, .14);
  engine.mix(0, false);
  assert.equal(gains[0].gain.target, 0);
  engine.dispose();
});

test('pause while loading prevents a late soundtrack from starting', async () => {
  let finish;
  const { engine, sources, statuses } = fixture(() => new Promise(resolve => { finish = resolve; }));
  const pending = engine.play('town');
  engine.pause();
  finish({ duration: 80 });
  await pending;
  assert.equal(sources.length, 0);
  assert.equal(statuses.at(-1), 'paused');
  engine.dispose();
});

test('a slow previous scene cannot overtake the latest scene', async () => {
  const finish = {};
  const { engine, sources } = fixture((context, file) => new Promise(resolve => { finish[file] = resolve; }));
  const town = engine.play('town');
  const workshop = engine.play('workshop');
  finish['/audio/workshop-v1.m4a']({ duration: 65 });
  await workshop;
  finish['/audio/town-v1.m4a']({ duration: 74 });
  await town;
  assert.equal(sources.length, 1);
  assert.equal(sources[0].buffer.duration, 65);
  engine.dispose();
});

test('hidden page stops audio, resumes the same position, and explicit pause stays paused', async () => {
  const { engine, context, sources } = fixture();
  await engine.play();
  context.currentTime = 7;
  engine.visibility(true);
  assert.equal(engine.voices.size, 0);
  assert.equal(context.state, 'suspended');
  engine.visibility(false);
  await tick();
  assert.equal(sources[1].offset, 7);
  engine.pause();
  engine.visibility(true);
  engine.visibility(false);
  await tick();
  assert.equal(sources.length, 2);
  engine.dispose();
});

test('failed loading can retry; disposal cancels pending playback', async () => {
  let attempts = 0;
  const { engine, context, statuses } = fixture(async () => {
    if (++attempts === 1) throw new Error('offline');
    return { duration: 80 };
  });
  await engine.play();
  assert.equal(statuses.at(-1), 'error');
  await engine.play();
  assert.equal(statuses.at(-1), 'playing');
  engine.dispose();
  assert.equal(context.state, 'closed');
  const other = fixture(async () => ({ duration: 80 }));
  const pending = other.engine.play();
  other.engine.dispose();
  await pending;
  assert.equal(other.sources.length, 0);
});

test('browser playback rejection offers a gesture retry without reporting playing', async () => {
  const { engine, context, statuses, sources } = fixture();
  context.resume = () => Promise.reject(Object.assign(new Error('gesture required'), { name: 'NotAllowedError' }));
  await engine.play();
  assert.equal(statuses.at(-1), 'blocked');
  assert.equal(sources.length, 0);
  engine.dispose();
});

test('volume defaults safely when local settings are missing, invalid or unavailable', () => {
  assert.equal(readMusicVolume({ getItem: () => null }), .45);
  assert.equal(readMusicVolume({ getItem: () => 'oops' }), .45);
  assert.equal(readMusicVolume({ getItem: () => '0' }), 0);
  assert.equal(readMusicVolume({ getItem: () => '2' }), 1);
  assert.equal(readMusicVolume({ getItem() { throw new Error(); } }), .45);
});
