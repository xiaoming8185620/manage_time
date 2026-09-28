import React, { useEffect, useRef, useState } from 'react';
import { Heart } from '@phosphor-icons/react';
import { BUILD_SLOTS, canWalk } from './game';

export function TownAtmosphere({ paused }) {
  return <div className={`town-atmosphere ${paused ? 'life-paused' : ''}`} aria-hidden="true">
    <div className="sky-drift">
      <img className="drift-cloud cloud-high" src="/assets/cloud-drift.png" alt="" draggable="false" />
      <img className="drift-cloud cloud-far" src="/assets/cloud-drift.png" alt="" draggable="false" />
    </div>
    <div className="under-town-mist">
      <img className="drift-cloud cloud-near" src="/assets/cloud-drift.png" alt="" draggable="false" />
      <img className="drift-cloud cloud-low" src="/assets/cloud-drift.png" alt="" draggable="false" />
    </div>
  </div>;
}

const HOME = { x: .40, y: .621 };
const STOPS = [{ x: .345, y: .579 }, { x: .466, y: .632 }, { x: .575, y: .604 }, { x: .643, y: .517 }, { x: .735, y: .553 }, { x: .525, y: .678 }];
const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * .72);
// Visible bounds in the 1254 px sheet, aligned to one height and paw baseline.
const TROT_BOUNDS = [[80, 119, 603, 577], [696, 120, 1200, 583], [80, 687, 601, 1147], [698, 686, 1200, 1149]];
const TROT_FRAMES = TROT_BOUNDS.map(([left, top, right, bottom]) => {
  const height = bottom - top;
  const widthScale = 86 / 1.2;
  return { width: `${1254 / height * widthScale}%`, left: `${50 - (left + right) / 2 / height * widthScale}%`, top: `${93 - bottom / height * 86}%` };
});

export function CatCompanion({ boy, greeted, paused, buildings, petSignal, petMood, positionRef, visitSignal, onPet, onCare }) {
  const [pose, setPose] = useState({ ...HOME, action: 'idle', facing: 'right', duration: 0, bubble: '' });
  const current = useRef(pose);
  const environment = useRef({ boy, greeted, paused, buildings });
  environment.current = { boy, greeted, paused, buildings };
  const timers = useRef(new Set());
  const motion = useRef(null);
  const lastPet = useRef(petSignal);
  const lastVisit = useRef(null);
  const outing = useRef(0);

  function update(patch) {
    current.current = { ...current.current, ...patch };
    if (positionRef) positionRef.current = { x: current.current.x, y: current.current.y };
    setPose(current.current);
  }
  function later(fn, ms) {
    const timer = setTimeout(() => { timers.current.delete(timer); fn(); }, ms);
    timers.current.add(timer);
  }
  function stop() {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    if (motion.current) {
      const { from, to, start, duration } = motion.current;
      const amount = Math.min(1, (performance.now() - start) / duration);
      update({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount, duration: 0 });
      motion.current = null;
    }
  }
  function clearOfBuildings(point) {
    return canWalk(point.x, point.y) && !environment.current.buildings.some(b => {
      const slot = BUILD_SLOTS.find(s => s.id === b.slot);
      return Math.hypot((point.x - slot.x) / .07, (point.y - slot.y) / .06) < 1;
    });
  }
  function resumeAfter(ms = 4300) { later(roam, ms); }
  function gesture(action, bubble = '') {
    stop();
    update({ action, bubble, duration: 0 });
    later(() => update({ action: 'idle' }), action === 'hop' ? 1000 : 2100);
    later(() => update({ bubble: '' }), 4300);
    resumeAfter(5000);
  }
  function travel(target, bubble = '') {
    stop();
    if (environment.current.paused || !clearOfBuildings(target)) { update({ action: 'idle', bubble: '' }); return; }
    const from = { x: current.current.x, y: current.current.y };
    const duration = Math.max(700, Math.min(2700, distance(from, target) * 11000));
    if (distance(from, target) < .012) { gesture('sniff', bubble); return; }
    motion.current = { from, to: target, start: performance.now(), duration };
    update({ ...target, duration, facing: target.x >= from.x ? 'right' : 'left', action: 'trot', bubble: '' });
    later(() => { motion.current = null; update({ action: 'sniff', bubble }); }, duration);
    later(() => update({ action: 'idle', bubble: '' }), duration + 1800);
    resumeAfter(duration + 4300 + Math.random() * 1700);
  }
  function roam() {
    const env = environment.current;
    if (env.paused) return;
    outing.current += 1;
    if (outing.current % 3 === 0) { gesture('hop'); return; }
    const choices = env.greeted ? STOPS : [{ x: .375, y: .60 }, HOME, { x: .439, y: .648 }];
    const available = choices.filter(p => clearOfBuildings(p) && distance(p, current.current) > .04);
    if (available.length) travel(available[Math.floor(Math.random() * available.length)]);
    else gesture('sniff');
  }

  useEffect(() => {
    stop();
    update({ action: 'idle', bubble: '', duration: 0 });
    if (!paused) resumeAfter(2200);
    return stop;
  }, [paused]);

  useEffect(() => {
    if (paused || !greeted) return;
    stop();
    later(() => {
      const offsets = [{ x: -.075, y: .023 }, { x: .075, y: .023 }, { x: 0, y: .08 }, { x: 0, y: -.075 }];
      const target = offsets.map(p => ({ x: boy.x + p.x, y: boy.y + p.y })).find(clearOfBuildings);
      if (target) travel(target);
      else { update({ action: 'idle', bubble: '' }); resumeAfter(); }
    }, 430);
  }, [boy.x, boy.y, greeted, paused]);

  useEffect(() => {
    if (petSignal === lastPet.current) return;
    lastPet.current = petSignal;
    gesture(paused ? 'idle' : petMood === 'groom' ? 'sniff' : petSignal % 2 ? 'hop' : 'sniff', petMood === 'groom' ? '毛毛梳顺啦，呼噜～' : petSignal % 2 ? '喵～陪我玩一会儿。' : '蹭蹭，今天也喜欢你。');
  }, [petSignal, paused]);

  useEffect(() => {
    if (paused || !visitSignal || visitSignal === lastVisit.current) return;
    lastVisit.current = visitSignal;
    const target = [{ x: visitSignal.x - .085, y: visitSignal.y + .025 }, { x: visitSignal.x + .08, y: visitSignal.y + .025 }].find(clearOfBuildings);
    if (target) travel(target, '这里有新的小天地！');
  }, [visitSignal, paused]);

  return <><button className={`actor cat cat-companion ${paused ? 'life-paused' : ''}`} data-action={pose.action} data-facing={pose.facing} style={{ left: `${pose.x * 100}%`, top: `${pose.y * 100}%`, zIndex: Math.round(pose.y * 100), '--cat-travel': `${pose.duration}ms` }} onClick={() => onPet({ x: pose.x, y: pose.y })} aria-label="和小乖互动" title="点点小乖，陪它玩一会儿">
    <span className="cat-facing"><span className="cat-body"><img className="cat-still" src="/assets/xiaoguai.png" alt="小乖，白底带黑灰色块的英短猫" draggable="false" /><span className="cat-gait" aria-hidden="true">{TROT_FRAMES.map((style, index) => <span className="cat-trot-frame" key={index} style={{ '--frame-index': index }}><img src="/assets/xiaoguai-trot.png" alt="" style={style} draggable="false" /></span>)}</span></span></span>
    <span className="cat-name">小乖</span>
    {pose.bubble && <span className="cat-speech"><Heart size={13} weight="fill" />{pose.bubble}</span>}
  </button>{pose.bubble && greeted && onCare && <button className="cat-care-shortcut" style={{ left: `${pose.x * 100}%`, top: `${pose.y * 100}%` }} onClick={() => onCare({ x: pose.x, y: pose.y })}>照料小乖</button>}</>;
}
