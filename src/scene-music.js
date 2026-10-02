export const MUSIC_TRACKS = {
  town: { title: '云上的午后', mood: '暖拨弦 · 轻钟琴', file: '/audio/town-v1.m4a' },
  greenhouse: { title: '玻璃穹顶的呼吸', mood: '空灵铺底 · 水滴音色', file: '/audio/greenhouse-v1.m4a' },
  workshop: { title: '星核的微光', mood: '电子琶音 · 柔和脉冲', file: '/audio/workshop-v1.m4a' },
};
export const MUSIC_VOLUME_KEY = 'planet-town-music-volume-v1';
export function readMusicVolume(storage) {
  try {
    const raw = storage.getItem(MUSIC_VOLUME_KEY);
    const n = raw === null ? .45 : Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : .45;
  } catch { return .45; }
}

// The AudioContext is created/resumed by the music button, never at page load.
// Buffer sources loop without a JS scheduler and GainNodes work on iPad too.
export class SceneMusicEngine {
  constructor({ contextFactory = () => new (window.AudioContext || window.webkitAudioContext)(), loadBuffer, onStatus = () => {} } = {}) {
    this.contextFactory = contextFactory;
    this.loadBuffer = loadBuffer || (async (context, file) => {
      const response = await fetch(file, { signal: this.abort.signal });
      if (!response.ok) throw new Error('Music unavailable');
      return context.decodeAudioData(await response.arrayBuffer());
    });
    this.abort = new AbortController();
    this.onStatus = onStatus;
    this.cache = new Map();
    this.voices = new Set();
    this.positions = {};
    this.generation = 0;
    this.volume = .45;
    this.dimmed = false;
    this.scene = 'town';
    this.wanted = false;
    this.hidden = false;
    this.disposed = false;
  }
  status(value) { if (!this.disposed) this.onStatus(value); }
  mix(volume, dimmed) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.dimmed = dimmed;
    if (this.master) this.master.gain.setTargetAtTime(this.volume * (dimmed ? .28 : 1), this.context.currentTime, .18);
  }
  async play(scene = this.scene) {
    if (this.disposed || !MUSIC_TRACKS[scene]) return;
    this.scene = scene;
    this.wanted = true;
    const generation = ++this.generation;
    if (this.hidden) return;
    this.status('loading');
    try {
      if (!this.context) {
        this.context = this.contextFactory();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.master.gain.value = this.volume * (this.dimmed ? .28 : 1);
        this.context.onstatechange = () => {
          if (this.wanted && !this.hidden && this.context.state !== 'running') this.status('blocked');
        };
      }
      // Invoke before the first await to preserve the button's user gesture.
      const resumed = this.context.resume();
      if (!this.cache.has(scene)) {
        const pending = this.loadBuffer(this.context, MUSIC_TRACKS[scene].file).catch(error => {
          this.cache.delete(scene);
          throw error;
        });
        this.cache.set(scene, pending);
      }
      const [, buffer] = await Promise.all([resumed, this.cache.get(scene)]);
      if (generation !== this.generation || this.disposed || this.hidden || !this.wanted) return;
      if (this.context.state !== 'running') { this.status('blocked'); return; }
      const now = this.context.currentTime;
      // A quick A → B → A switch may return to A before it has finished fading.
      // Retire all older voices on the audio clock, never using stale timeouts.
      for (const voice of this.voices) {
        if (voice.retiring) continue;
        this.positions[voice.scene] = (voice.offset + now - voice.started) % voice.duration;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + 1.4);
        voice.source.stop(now + 1.5);
        voice.retiring = true;
      }
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(this.master);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + 1.4);
      const offset = (this.positions[scene] || 0) % buffer.duration;
      const voice = { scene, source, gain, offset, started: now, duration: buffer.duration };
      source.onended = () => { source.disconnect(); gain.disconnect(); this.voices.delete(voice); };
      this.voices.add(voice);
      source.start(now, offset);
      this.status('playing');
    } catch (error) {
      if (generation !== this.generation || this.disposed) return;
      this.stopVoices();
      this.status(error.name === 'NotAllowedError' ? 'blocked' : 'error');
    }
  }
  select(scene) {
    if (scene === this.scene) return;
    this.scene = scene;
    if (this.wanted && !this.hidden) void this.play(scene);
  }
  stopVoices() {
    const now = this.context?.currentTime || 0;
    for (const voice of this.voices) {
      if (!voice.retiring) this.positions[voice.scene] = (voice.offset + now - voice.started) % voice.duration;
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* Already ended during a transition. */ }
      voice.source.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }
  pause() {
    this.wanted = false;
    ++this.generation;
    this.stopVoices();
    this.context?.suspend().catch(() => {});
    this.status('paused');
  }
  visibility(hidden) {
    this.hidden = hidden;
    if (hidden) {
      ++this.generation;
      this.stopVoices();
      this.context?.suspend().catch(() => {});
      if (this.wanted) this.status('paused');
    } else if (this.wanted) void this.play(this.scene);
  }
  dispose() {
    this.disposed = true;
    this.wanted = false;
    ++this.generation;
    this.abort.abort();
    this.stopVoices();
    if (this.context) { this.context.onstatechange = null; this.context.close().catch(() => {}); }
    this.cache.clear();
  }
}
