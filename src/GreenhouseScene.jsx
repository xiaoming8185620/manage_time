import React, { useEffect, useRef, useState } from 'react';
import { Leaf, Check, ArrowRight } from '@phosphor-icons/react';
import { HABITATS, greenhouseAnimalAt } from '../shared/greenhouse';
import { careTarget, careRecord } from '../shared/scene-care';
import { SceneCareLayer } from './SceneCare';
import './greenhouse.css';
import { ANIMALS, animalResumeTime, animalTrialDue } from '../shared/animal-rewards';
import { GreenhouseArt } from './GreenhouseArt';

export function GreenhouseScene({ state, paused, disabled, onOpen, hints, effect, now, onAnimalDrop }) {
  const completed=useRef(Object.fromEntries(ANIMALS.map(a=>[a.id,state.animalRewards?.attempts[a.id]||0])));
  const clocks=useRef(Object.fromEntries(ANIMALS.map(a=>[a.id,animalResumeTime(a.id,completed.current[a.id])])));
  const [times,setTimes]=useState({...clocks.current});
  const callback=useRef(onAnimalDrop); callback.current=onAnimalDrop;
  useEffect(()=>{
    for(const a of ANIMALS){
      const saved=state.animalRewards?.attempts[a.id]||0;
      if(saved>completed.current[a.id]){completed.current[a.id]=saved;clocks.current[a.id]=animalResumeTime(a.id,saved);}
    }
    setTimes({...clocks.current});
  },[state.animalRewards?.attempts]);
  useEffect(()=>{
    if(paused)return;
    // A cancelled or rejected household save must not skip this animal's trial forever.
    for(const a of ANIMALS){
      const saved=state.animalRewards?.attempts[a.id]||0;
      if(saved<completed.current[a.id]){completed.current[a.id]=saved;clocks.current[a.id]=animalResumeTime(a.id,saved);}
    }
    let frame,last,painted=0;
    const tick=t=>{
      const delta=last===undefined?0:Math.max(0,Math.min(100,t-last));last=t;
      for(const a of ANIMALS){
        clocks.current[a.id]+=delta;
        if(callback.current && animalTrialDue(a.id,clocks.current[a.id],completed.current[a.id])){
          // One command per frame, so household saves cannot swallow a second source.
          completed.current[a.id]+=1; callback.current(a.id,completed.current[a.id]);break;
        }
      }
      if(t-painted>=40){setTimes({...clocks.current});painted=t;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[paused]);
  return <>
    <img className="world-background" src="/assets/greenhouse-base-v1.png" alt="云海之上的玻璃穹顶温室，暖木步道环绕六处种植槽，玻璃外是漂浮岛屿" draggable="false"/>
    <div className={`greenhouse-light ${paused?'life-paused':''}`} aria-hidden="true"/>
    <SceneCareLayer scene="greenhouse" state={state} paused={paused} disabled={disabled} onOpen={onOpen} hints={hints} effect={effect} now={now}/>
    {HABITATS.filter(item=>state.habitats?.includes(item.id)).map(item=><div className="greenhouse-habitat" key={item.id} style={{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.width*100}%`,zIndex:Math.round(item.y*100)}}><GreenhouseArt column={item.column}/></div>)}
    {['gh-parrot','gh-snake'].map((id,index)=>{
      const point=greenhouseAnimalAt(id,times[id],state.habitats), target=careTarget(id), event=careRecord(state,id).lastEvent;
      const reply=event && now-event.at<5000;
      return <button key={id} className={`greenhouse-animal ${index?'greenhouse-snake':'greenhouse-parrot'} ${!index&&point.rest?'parrot-perched':''} ${paused?'life-paused':''}`} data-phase={point.rest?'resting':index?'slithering':'flying'} data-frame={point.frame} style={{left:`${point.x*100}%`,top:`${point.y*100}%`,zIndex:index?89:92}} aria-label={`和${target.name}互动`} disabled={disabled} onClick={()=>onOpen({...target,x:point.x,y:point.y})}>
        <span className="animal-facing" style={{transform:point.facing==='left'?'scaleX(-1)':undefined}}><span className={reply?'animal-response':''}>{!index&&point.rest?<img className="perched-parrot" src="/assets/greenhouse-parrot-perched-v1.png" alt="" draggable="false"/>:<GreenhouseArt animal={index} frame={point.frame}/>}</span></span>
        <span className="animal-name">{target.name}</span>
        {reply && <span className="animal-reply" role="status">{event.verb==='care'?target.careReply:target.reply}</span>}
      </button>;
    })}
  </>;
}

export function HabitatShop({state,dispatch,busy}) {
  const [confirm,setConfirm]=useState(null);
  return <div className="habitat-shop"><p className="soft-copy left">为伙伴添一处喜欢的角落。它们一直可以免费互动，不需要先建造。</p>
    <div className="care-wallet"><span>我的星球币</span><strong>{state.coins} 星球币</strong></div>
    {HABITATS.map(item=>{const owned=state.habitats?.includes(item.id);return <article key={item.id} className="habitat-card"><div className="habitat-preview"><GreenhouseArt column={item.column}/></div><h3>{item.name}</h3><p>{item.description}</p>{owned?<span className="habitat-owned"><Check size={17}/>已经建好 · 永久保留</span>:confirm===item.id?<div className="habitat-confirm"><p>使用 {item.cost} 星球币，余额将变为 {Math.max(0,state.coins-item.cost)}。</p><button className="primary-button" disabled={busy||state.coins<item.cost} onClick={()=>dispatch({type:'BUILD_HABITAT',habitatId:item.id})}>确认建造 · {item.cost} 星球币<Check/></button><button className="text-button" disabled={busy} onClick={()=>setConfirm(null)}>先不花币</button></div>:<button className="secondary-button" disabled={busy||state.coins<item.cost} onClick={()=>setConfirm(item.id)}>{state.coins<item.cost?`还差 ${item.cost-state.coins} 星球币`:`添置 · ${item.cost} 星球币`}<ArrowRight size={16}/></button>}</article>})}
    <p className="gentle-note"><Leaf size={18}/>按自己的心情建设，不用着急。</p></div>;
}
