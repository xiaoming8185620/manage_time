import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SkyVisitors } from '../../src/SkyLife';
import { advanceSkyClock } from '../../shared/sky-life';
import { WriterNook } from '../../src/WriterNook';
import { PlayerCharacter } from '../../src/PlayerCharacter';
import { CatCompanion } from '../../src/TownLife';
import { SceneCareLayer } from '../../src/SceneCare';
import { initialState, CATALOG, BUILD_SLOTS } from '../../src/game';
import { availableCareTargets } from '../../shared/scene-care';
import '../../src/styles.css';
import '../../src/town-life.css';
import '../../src/journey.css';
import '../../src/scene-scale.css';

function Lab() {
  const [time, setTime] = useState(() => Number(new URLSearchParams(location.search).get('time')) || 28000), [paused, setPaused] = useState(true), [note, setNote] = useState('');
  const stage = useRef(null), [width, setWidth] = useState(1100);
  const [growth, setGrowth] = useState(0);
  const fixture = {...initialState(), greeted:true, buildings:[{itemId:'cat-tree',slot:'sunny'},{itemId:'flowerbed',slot:'garden'}]};
  fixture.care = Object.fromEntries(availableCareTargets(fixture).filter(t=>t.kind==='plant').map(t=>[t.id,{careCount:growth}]));
  useEffect(() => { const o = new ResizeObserver(([e]) => setWidth(e.contentRect.width)); o.observe(stage.current); return () => o.disconnect(); }, []);
  useEffect(() => { if (paused) return; let frame, last; const tick = now => { if (last) setTime(t => advanceSkyClock(t, now-last, false)); last=now; frame=requestAnimationFrame(tick); }; frame=requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [paused]);
  return <><style>{`body{margin:0;background:#e7eee5;font-family:system-ui;color:#405f58}nav{padding:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}button{padding:9px;border:1px solid #a2bdb0;border-radius:8px;background:#fafbf3;color:inherit;cursor:pointer}.game-stage{position:relative;width:min(100%,calc((100dvh - 192px)*1487/1058),1300px);aspect-ratio:1487/1058;margin:auto;overflow:hidden}.background{width:100%;height:100%;display:block}.life-paused *{animation-play-state:paused!important}output{font-variant-numeric:tabular-nums}`}</style>
    <nav aria-label="访客核验"><strong>场景比例核验 · 临时样例</strong>{[['飞船',15000],['采集机甲',28000],['巡检员',58000],['第二处巡检',70000],['继续前行',74500],['离开左侧',77500],['飞毯靠近',32000],['飞毯问候',39000],['飞毯离开',46000],['另一条路线',119000],['流星',83000]].map(([label,t]) => <button key={label} onClick={() => { setTime(t); setPaused(true); }}>{label}</button>)}<button onClick={() => setPaused(p=>!p)}>{paused?'播放':'暂停'}</button><button onClick={()=>setGrowth(g=>(g+1)%4)}>植物成长 {growth} / 3</button><output>{(time/1000).toFixed(1)} 秒</output><span>{note}</span></nav>
    <div className="game-stage motion-opt-in" ref={stage} style={{'--unit':`${width/1487}px`}}>
      <img className="world-background" src="/assets/town-environment-bare-v2.png" alt="小镇底图"/>
      <SkyVisitors elapsed={time} paused={paused}/><WriterNook paused={paused} onOpen={()=>setNote('书屋入口可点击')}/>
      <SceneCareLayer state={fixture} onOpen={target=>setNote(target.name)} paused disabled={false} now={0}/>
      {fixture.buildings.map(b=>{const item=CATALOG.find(i=>i.id===b.itemId),slot=BUILD_SLOTS.find(s=>s.id===b.slot);return <button key={b.itemId} className={`world-building ${b.itemId}`} style={{left:`${slot.x*100}%`,top:`${slot.y*100}%`,zIndex:Math.round(slot.y*100)}}><img src={b.itemId==='flowerbed'?'/assets/flowerbed-bare-v2.png':item.image} alt={item.shortName}/></button>})}
      <PlayerCharacter position={fixture.boy} paused ready greeted walkDuration={0} direction="left"/>
      <CatCompanion boy={fixture.boy} greeted paused buildings={fixture.buildings} petSignal={0} onPet={()=>setNote('小乖入口可点击')}/>
      <button className="journey-toggle" onClick={()=>setNote('今天的一小步可点击')}>今天的一小步</button>
      <div className="bottom-nav">{['今日计划','建设','背包'].map(name=><button key={name} onClick={()=>setNote(name+'可点击')}>{name}</button>)}</div>
    </div>
  </>;
}
createRoot(document.getElementById('root')).render(<Lab/>);
