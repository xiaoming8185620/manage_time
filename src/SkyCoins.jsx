import React, { useEffect, useRef, useState } from 'react';
import { dropSpot } from '../shared/sky-rewards';
import './sky-coins.css';

function DroppedCoin({ id, fresh, paused, disabled, count, onPickup }) {
  const point = dropSpot(id);
  const elapsed = useRef(fresh ? 0 : 1600);
  const [progress, setProgress] = useState(fresh ? 0 : 1);
  useEffect(() => {
    if (paused || progress >= 1) return;
    let frame, previous;
    const tick = now => {
      if (previous !== undefined) elapsed.current += Math.min(100, now - previous);
      previous = now;
      setProgress(Math.min(1, elapsed.current / 1600));
      if (elapsed.current < 1600) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, progress >= 1]);
  // A static presentation keeps picking accessible when motion is disabled.
  const p = paused ? 1 : progress;
  const x = point.x + (.77 - point.x) * (1 - p);
  const y = point.y + (.20 - point.y) * (1 - p * p);
  return <button type="button" className={`sky-coin ${paused ? 'life-paused' : ''}`} data-drop-id={id} data-landed={p === 1} style={{left:`${x*100}%`,top:`${y*100}%`,zIndex:p < 1 ? 94 : 80}} disabled={disabled || p < 1} onClick={event => {event.stopPropagation(); onPickup(id);}} aria-label={`拾起星球币${count > 1 ? `，这里有 ${count} 枚` : ''}`} title="走过去，拾起 1 星球币">
    <img src="/assets/miaomiao-coin.png" alt="" draggable="false"/>
    {count > 1 && <span className="sky-coin-count">{count}</span>}
    <span className="sky-coin-label">拾起 +1</span>
  </button>;
}

export function SkyCoins({ pending = [], paused, disabled, onPickup }) {
  const restored = useRef(new Set(pending));
  useEffect(() => { pending.forEach(id => restored.current.add(id)); }, [pending]);
  // Stack at three clear deck positions; every saved coin remains collectible.
  const groups = [0,1,2].map(slot=>pending.filter(id=>(id-1)%3===slot));
  return <>{groups.filter(ids=>ids.length).map(ids=><DroppedCoin key={ids[0]} id={ids[0]} count={ids.length} fresh={!restored.current.has(ids[0])} paused={paused} disabled={disabled} onPickup={onPickup}/>)}</>;
}
