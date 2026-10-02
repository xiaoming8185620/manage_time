import React, { useEffect, useRef, useState } from 'react';
import { ANIMALS, ANIMAL_SPOTS } from '../shared/animal-rewards';
import { dropSpot } from '../shared/sky-rewards';
import './sky-coins.css';

function DroppedCoin({ id, point, origin = {x:.77,y:.20}, fresh, paused, disabled, count, selected, onPickup }) {
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
  const x = point.x + (origin.x - point.x) * (1 - p);
  const y = point.y + (origin.y - point.y) * (1 - p * p);
  return <><div className={`sky-coin-visual ${paused ? 'life-paused' : ''}`} style={{left:`${x*100}%`,top:`${y*100}%`,zIndex:p<1?95:Math.round(y*100)-1}} aria-hidden="true"><img src="/assets/miaomiao-coin.png" alt="" draggable="false"/></div><button type="button" className={`sky-coin ${selected ? 'is-targeted' : ''} ${paused ? 'life-paused' : ''}`} data-drop-id={id} data-landed={p === 1} data-targeted={!!selected} style={{left:`${x*100}%`,top:`${y*100}%`,zIndex:95}} disabled={disabled || p < 1} onClick={event => {event.stopPropagation(); onPickup(id);}} aria-busy={selected || undefined} aria-label={`拾起星球币${count > 1 ? `，这里有 ${count} 枚` : ''}`} title="走过去，拾起 1 星球币">
    {count > 1 && <span className="sky-coin-count">{count}</span>}
    <span className="sky-coin-label">{selected ? '正在拾取…' : '拾起 +1'}</span>
  </button></>;
}

export function SkyCoins({ pending = [], paused, disabled, onPickup, selectedId }) {
  const restored = useRef(new Set(pending));
  useEffect(() => { pending.forEach(id => restored.current.add(id)); }, [pending]);
  // Stack at three clear deck positions; every saved coin remains collectible.
  const groups = [0,1,2].map(slot=>pending.filter(id=>(id-1)%3===slot));
  return <>{groups.filter(ids=>ids.length).map(ids=><DroppedCoin key={ids[0]} id={ids[0]} point={dropSpot(ids[0])} selected={selectedId===ids[0]} count={ids.length} fresh={!restored.current.has(ids[0])} paused={paused} disabled={disabled} onPickup={onPickup}/>)}</>;
}

export function AnimalCoins({pending=[], paused, disabled, onPickup, selectedId, habitats=[]}) {
  const restored=useRef(new Set(pending.map(c=>c.id)));
  useEffect(()=>{pending.forEach(c=>restored.current.add(c.id));},[pending]);
  return <>{ANIMAL_SPOTS.map((point,slot)=>{
    const group=pending.filter(c=>c.spot===slot),coin=group[0];
    if(!coin)return null;
    const baseOrigin=ANIMALS.find(a=>a.id===coin.animal).origin;
    const origin=coin.animal==='gh-snake'&&habitats.includes('snake-rest')?{...baseOrigin,x:.655}:baseOrigin;
    return <DroppedCoin key={coin.id} id={coin.id} point={point} origin={origin} selected={selectedId===coin.id} count={group.length} fresh={!restored.current.has(coin.id)} paused={paused} disabled={disabled} onPickup={onPickup}/>;
  })}</>;
}
