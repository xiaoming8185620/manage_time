import React, { useEffect, useRef, useState } from 'react';
import { Scan, Sparkle } from '@phosphor-icons/react';
import { advanceSkyClock, skyVisitorsAt } from '../shared/sky-life';
import { crossedCollection, skyResumeTime, reconcileSkyClock } from '../shared/sky-rewards';
import './sky-life.css';

function Visitor({ visitor }) {
  const [failed, setFailed] = useState(false);
  const { kind, x, y, opacity, bob, roll, phase } = visitor;
  if (failed) return null;
  return <div className={`sky-visitor sky-${kind}`} data-kind={kind} data-phase={phase} style={{ left: `${x * 100}%`, top: `${y * 100}%`, opacity, '--sky-bob': `${bob}px`, '--sky-roll': `${roll}deg`, '--sky-yaw': `${visitor.yaw || 0}deg`, '--sky-scale': visitor.scale ?? 1, '--carpet-mist':visitor.mist ?? 0, '--hello-opacity':visitor.helloOpacity ?? 0 }}>
    <div className="sky-visitor-body">
      {kind === 'meteor' ? <><span className="meteor-trail" /><Sparkle weight="fill" /></> : <img src={kind === 'carpet' ? '/assets/sky-carpet-rider-v2.png' : `/assets/sky-${kind}-v1.png`} alt="" draggable="false" onError={() => setFailed(true)} />}
      {kind !== 'meteor' && kind !== 'carpet' && <span className="sky-beacon" />}
      {phase === 'collecting' && <div className="sky-samples"><Sparkle weight="fill" /><Sparkle weight="fill" /><Sparkle weight="fill" /></div>}
      {phase === 'inspecting' && <Scan className="sky-scan" weight="light" />}
    </div>
    {kind === 'carpet' && <img className="carpet-mist" src="/assets/cloud-drift.png" alt="" draggable="false"/>}
    {phase === 'greeting' && <span className="sky-caption carpet-greeting"><Sparkle size={12} weight="duotone"/>嘘……下次在云里见。</span>}
    {phase === 'collecting' && <span className="sky-caption">云晶采集中</span>}
    {phase === 'inspecting' && <span className="sky-caption">悬浮装置巡查中</span>}
  </div>;
}

// Export the same presentation for the visual QA stage, without changing game state.
export function SkyVisitors({ elapsed, paused }) {
  const visitors = skyVisitorsAt(elapsed);
  return <>{['far', 'cloud', 'near'].map(depth => <div key={depth} aria-hidden="true" className={`sky-life sky-life-${depth}${paused ? ' life-paused' : ''}`} data-paused={paused ? 'true' : 'false'}>
    {visitors.filter(v => v.depth === depth).map(v => <Visitor key={v.id} visitor={v} />)}
  </div>)}</>;
}

export function SkyLife({ paused, attempts = 0, onCollection }) {
  const completed = useRef(attempts);
  const clock = useRef(skyResumeTime(attempts));
  const callback = useRef(onCollection);
  callback.current = onCollection;
  const [elapsed, setElapsed] = useState(clock.current);
  useEffect(() => {
    // Another device can finish the same visit. Continue after that saved trial.
    if (attempts > completed.current) {
      completed.current = attempts;
      clock.current = skyResumeTime(attempts);
      setElapsed(clock.current);
    }
  }, [attempts]);
  useEffect(() => {
    if (paused) return;
    const resumed = reconcileSkyClock(clock.current, completed.current, attempts);
    completed.current = resumed.completed;
    clock.current = resumed.time;
    setElapsed(clock.current);
    let frame, previous, painted = 0;
    const tick = time => {
      if (previous !== undefined) {
        const before = clock.current;
        clock.current = advanceSkyClock(before, time - previous, false);
        if (callback.current && crossedCollection(before, clock.current, completed.current)) {
          completed.current += 1;
          callback.current(completed.current);
        }
      }
      previous = time;
      if (time - painted >= 32) { setElapsed(clock.current); painted = time; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);
  return <SkyVisitors elapsed={elapsed} paused={paused} />;
}
