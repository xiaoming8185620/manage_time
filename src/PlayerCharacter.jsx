import React, { useEffect, useRef, useState } from 'react';
import { WalkingSprite } from './WalkingSprite';
import './player-character.css';

// Frame positions are calibrated to the generated asset's shoe baseline.
const FRAME_METRICS = [
  { top: 22, bottom: 622, footX: 347 },
  { top: 22, bottom: 623, footX: 912 },
  { top: 641, bottom: 1237, footX: 355 },
  { top: 640, bottom: 1237, footX: 914.5 },
];
const FRAMES = FRAME_METRICS.map(({ top, bottom, footX }, index) => {
  const scale = 88 / (bottom - top);
  const right = index % 2 === 0 ? 50 : 0;
  const below = index < 2 ? 50 : 0;
  return { width: `${1254 * scale * 1.5}%`, left: `${50 - footX * scale * 1.5}%`, top: `${94 - bottom * scale}%`, clipPath: `inset(${50 - below}% ${right}% ${below}% ${50 - right}%)` };
});

export function PlayerCharacter({ position, moving, walkDuration, direction, paused, ready, blocked, greeted, taskActive, depthScale=1 }) {
  const [action, setAction] = useState('idle');
  const [speech, setSpeech] = useState('');
  const timers = useRef(new Set());
  const welcomed = useRef(false);
  const lastGreeting = useRef(-Infinity);
  const greetingCount = useRef(0);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }
  function later(callback, delay) {
    const timer = setTimeout(() => { timers.current.delete(timer); callback(); }, delay);
    timers.current.add(timer);
  }
  function greet(line) {
    clearTimers();
    welcomed.current = true;
    lastGreeting.current = performance.now();
    setSpeech(line);
    setAction(paused ? 'idle' : 'wave');
    later(() => setAction('idle'), 2400);
    later(() => setSpeech(''), 3800);
  }
  function interact(event) {
    event.stopPropagation();
    if (blocked || moving || performance.now() - lastGreeting.current < 1200) return;
    const lines = taskActive
      ? ['回来啦，按你的节奏来。', '这次做得怎样？慢慢说就好。', '休息一会儿，也没关系。']
      : ['嗨，很高兴见到你！', '今天想先做点什么？', '慢慢来，我陪你一起。'];
    greet(lines[greetingCount.current++ % lines.length]);
  }

  useEffect(() => {
    clearTimers();
    setAction('idle');
    setSpeech('');
    if (ready && !paused && !moving && !welcomed.current) {
      later(() => greet(greeted ? '嗨，欢迎回到小镇！' : '嗨，一起认识这个小镇吧！'), 1300);
    }
    return clearTimers;
  }, [paused, moving, ready, blocked]);

  return <button
    type="button"
    className={`actor boy player-character ${paused ? 'life-paused' : ''}`}
    style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, zIndex: Math.round(position.y * 100), '--player-travel': `${walkDuration}ms`, '--player-depth': depthScale }}
    data-action={moving && !paused ? 'walk' : action}
    data-facing={direction}
    aria-label="和主角打招呼"
    title="点点我，打个招呼"
    tabIndex={blocked ? -1 : 0}
    aria-disabled={blocked || undefined}
    onClick={interact}
  >
    <span className="player-body" aria-hidden="true">
      <WalkingSprite />
      <span className="player-poses">{FRAMES.map((style, index) => <span key={index} className={`player-frame player-frame-${index}`}><img src="/assets/boy-greetings.png" alt="" style={style} draggable="false" /></span>)}</span>
    </span>
    <span className="player-label" aria-hidden="true">打个招呼</span>
    {speech && <span className="player-speech" role="status">{speech}</span>}
  </button>;
}
