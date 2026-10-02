import {SceneMusicEngine, MUSIC_TRACKS} from '../../src/scene-music.js';
const result = document.querySelector('#result');
let player;
document.querySelector('#run').onclick = async () => {
  player?.dispose();
  player = new SceneMusicEngine();
  player.mix(0, false);
  result.textContent = '检查中…';
  const report = [];
  for (const scene of Object.keys(MUSIC_TRACKS)) {
    await player.play(scene);
    const buffer = await player.cache.get(scene);
    if (!buffer || ![...player.voices].some(v => v.scene === scene && !v.retiring)) throw new Error(`Failed: ${scene}`);
    report.push(`${scene}: decoded ${buffer.duration.toFixed(2)}s, ${buffer.numberOfChannels} channels, ${player.context.state}`);
  }
  await new Promise(resolve => setTimeout(resolve, 1900));
  report.push(`Crossfade settled: ${player.voices.size} voice`);
  player.visibility(true);
  report.push(`Hidden: ${player.voices.size} voices`);
  player.visibility(false);
  await new Promise(resolve => setTimeout(resolve, 200));
  report.push(`Returned: ${player.voices.size} voice`);
  player.pause();
  report.push(`Paused: ${player.voices.size} voices`);
  player.dispose();
  report.push('PASS');
  result.textContent = report.join('\n');
};
window.addEventListener('pagehide', () => player?.dispose());
