import React, { useEffect, useRef, useState } from 'react';
import { MusicNotes, SpeakerSlash, Play, Pause, X } from '@phosphor-icons/react';
import { MUSIC_TRACKS, MUSIC_VOLUME_KEY, readMusicVolume, SceneMusicEngine } from './scene-music';
import './scene-music.css';

export function SceneMusic({ scene, dimmed }) {
  const engine = useRef(null);
  const root = useRef(null);
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [volume, setVolume] = useState(() => {
    try { return readMusicVolume(window.localStorage); } catch { return .45; }
  });
  const playing = status === 'playing' || status === 'loading';
  const track = MUSIC_TRACKS[scene];
  useEffect(() => {
    const player = new SceneMusicEngine({ onStatus: setStatus });
    engine.current = player;
    player.visibility(document.hidden);
    const visibility = () => player.visibility(document.hidden);
    const pagehide = () => player.visibility(true);
    const pageshow = () => player.visibility(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      player.dispose();
    };
  }, []);
  useEffect(() => { engine.current?.select(scene); }, [scene]);
  useEffect(() => { engine.current?.mix(volume, dimmed); }, [volume, dimmed]);
  useEffect(() => { if (dimmed) setOpen(false); }, [dimmed]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function toggle() {
    if (playing) engine.current?.pause();
    else void engine.current?.play(scene);
  }
  function setLevel(value) {
    setVolume(value);
    try { window.localStorage.setItem(MUSIC_VOLUME_KEY, String(value)); } catch { /* Session-only volume is fine. */ }
  }
  const message = status === 'loading' ? '正在准备音乐…' : status === 'error' ? '音乐未能加载，点播放重试' : status === 'blocked' ? '点播放继续音乐' : status === 'playing' ? (volume === 0 ? '已静音' : '正在播放') : '音乐已暂停';
  return <div className="scene-music" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className={`help-button music-toggle ${playing ? 'music-on' : ''}`} aria-label="场景音乐" aria-expanded={open} aria-controls="scene-music-controls" title="场景音乐" onClick={() => {
      setOpen(!open);
      if (status === 'idle') void engine.current?.play(scene);
    }}>{playing && volume > 0 ? <MusicNotes size={23} weight="fill" /> : <MusicNotes size={23} />}</button>
    {open && <section id="scene-music-controls" className="music-panel" aria-label="场景音乐设置">
      <div className="music-heading"><span>场景音乐</span><button aria-label="收起音乐设置" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={17}/></button></div>
      <strong>{track.title}</strong><p>{track.mood}</p>
      <div className="music-controls"><button className="music-play" aria-label={playing ? '暂停背景音乐' : '播放背景音乐'} onClick={toggle}>{playing ? <Pause size={17} weight="fill"/> : <Play size={17} weight="fill"/>}{playing ? '暂停' : '播放'}</button><span role="status">{message}</span></div>
      <label className="music-volume"><SpeakerSlash size={17}/><span className="music-sr">背景音乐音量</span><input aria-label="背景音乐音量" type="range" min="0" max="100" step="5" value={Math.round(volume * 100)} onChange={event => setLevel(Number(event.target.value) / 100)}/><output>{Math.round(volume * 100)}%</output></label>
      <p className="music-hint">随场景换曲 · 打开面板轻声播放</p>
    </section>}
  </div>;
}
