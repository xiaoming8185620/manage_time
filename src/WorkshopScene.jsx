import {HabitatArt,HabitatAddition} from './HabitatArt';
import {growthItem,growthRecord} from '../shared/workshop-growth';
import {WorkshopGrowthArt} from './WorkshopGrowth';
import React,{useEffect,useRef,useState} from 'react';
import {Check,ArrowRight,Compass,Notebook} from '@phosphor-icons/react';
import {WORKSHOP_HABITATS,workshopLifeAt,workshopAdvice} from '../shared/workshop';
import {careTarget,careRecord} from '../shared/scene-care';
import {WorkshopArt} from './WorkshopArt';
import {WorkshopSupply} from './WorkshopSupply';
import {supplyAt} from '../shared/workshop-supply';
import {WORKSHOP_LAYOUT as layout} from '../shared/workshop-layout';
import {SceneCareLayer} from './SceneCare';
import './workshop.css';

function useWorkshopClock(paused) {
  const elapsed=useRef(0),[time,setTime]=useState(0);
  useEffect(()=>{
    if(paused)return;
    let id,last,paint=0;
    const tick=t=>{
      elapsed.current+=last==null?0:Math.max(0,Math.min(100,t-last));last=t;
      if(t-paint>=32){setTime(elapsed.current);paint=t;}
      id=requestAnimationFrame(tick);
    };
    id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);
  },[paused]);
  return time;
}

export function WorkshopScene({state,paused,disabled,onOpen,hints,effect,now,previewTime}) {
  const clock=useWorkshopClock(paused||previewTime!=null),time=previewTime??clock,visit=supplyAt(time,growthRecord(state,'supply-lift').level);
  function object(kind,id,point,width,extra={}) {
    const target=careTarget(id),event=careRecord(state,id).lastEvent;
    const responding=event&&now-event.at<4500;
    const item=growthItem(id),growth=growthRecord(state,id),gEvent=growth.lastEvent,active=gEvent&&now-gEvent.at<9000&&(kind!=='drone'||gEvent.kind!=='upgrade');
    const growing=['brain','dog','cleaner','pad','bench','energy'].includes(kind);
    const option=item?.options.find(o=>o[0]===gEvent?.kind);
    return <button key={id} type="button" className={`workshop-object workshop-${kind} ${hints?'show-workshop-hint':''} ${responding?'workshop-responding':''} ${paused?'life-paused':''} ${active?'growth-active':''} ${active&&gEvent.kind==='upgrade'?'growth-install':''}`} aria-label={`和${target.name}互动`} disabled={disabled} data-theme={growth.selection} data-level={growth.level} data-phase={point.rest?'resting':'moving'} data-frame={point.frame||0} style={{left:`${point.x*100}%`,top:`${point.y*100}%`,width:`${width*100}%`,zIndex:Math.round(point.y*100),opacity:point.opacity??1,...extra}} onClick={()=>onOpen({...target,x:point.x,y:point.y})}>
      <span className="workshop-facing" style={{transform:(kind==='dog'&&point.facing==='left')||(kind==='cleaner'&&point.facing==='right')?'scaleX(-1)':undefined}}>{growing?<WorkshopGrowthArt kind={kind} level={kind==='brain'&&growth.level===3?2:growth.level}/>:<WorkshopArt kind={kind} frame={point.frame||0}/>}
        {kind==='brain'&&growth.level>=1&&<span className={`brain-arm-response ${active?'arm-active':''}`} aria-hidden="true"/>}</span>
      <span className="workshop-name">{target.name}{item?` · ${item.stages[growth.level]}`:''}</span>{active&&<span className="workshop-growth-feedback">{gEvent.kind==='upgrade'?'新部件安装完成':option?.[1]}</span>}
      {responding&&<span className="workshop-response" aria-label={`${target.name}的回应`}>{event.verb==='care'?target.careReply:target.reply}</span>}
    </button>;
  }
  const dog=workshopLifeAt('dog',time,state.habitats),cleaner=workshopLifeAt('cleaner',time),drone=workshopLifeAt('drone',time);
  const earth=growthRecord(state,'earth'),pad=growthRecord(state,'pad'),clean=growthRecord(state,'cleaner'),brain=growthRecord(state,'brain'),bench=growthRecord(state,'bench');
  if(clean.level>0&&['center','east','helper'].includes(clean.selection)){const center=clean.selection==='center';cleaner.x=(center?.60:.77)+.045*Math.sin(time/4200);cleaner.y=(center?.69:.705)+.008*Math.cos(time/4200);}
  if(pad.level>0){
    const selected=pad.selection,flight=time/9000;
    if(selected==='service'||selected==='landing'){drone.x=.235;drone.y=pad.level===3?.31:.39;drone.rest=true;}
    if(selected==='skylight'){drone.x=.32+.12*Math.sin(flight);drone.y=.23-.05*Math.cos(flight);drone.rest=false;}
    if(selected==='globe'){drone.x=.52+.16*Math.sin(flight);drone.y=.27+.045*Math.cos(flight);drone.rest=false;}
  }
  if(visit.drone&&!pad.selection){Object.assign(drone,visit.drone,{rest:false});}
  const earthPhase=time/16000%3,earthFrame=Math.floor(earthPhase),fade=Math.max(0,(earthPhase%1-.72)/.28);
  return <>
    <img className="world-background" src="/assets/workshop-supply-base-v1.png" alt="星核机械港：玻璃天窗下的巨大机械车间，悬浮补给港面向云海，中央投影基座与右侧智脑工作站" draggable="false"/>
    <SceneCareLayer scene="workshop" state={state} paused={paused} disabled={disabled} onOpen={onOpen} hints={hints} effect={effect} now={now}/>
    <button className={`workshop-earth workshop-object ${hints?'show-workshop-hint':''}`} aria-label="和地球全息仪互动" disabled={disabled} onClick={()=>onOpen(careTarget('ws-earth'))}>
      {earth.level>0?<WorkshopGrowthArt kind="earth" level={earth.selection==='solar'?3:earth.selection==='moon'?2:1}/>:<><WorkshopArt kind="earth" frame={earthFrame} style={{opacity:1-fade}}/><WorkshopArt kind="earth" frame={(earthFrame+1)%3} className="earth-next" style={{opacity:fade}}/></>}
      <span className="workshop-name">地球全息仪</span>
    </button>
    {object('brain','ws-brain',layout.brain,layout.brain.width,{'--brain-tilt':`${Math.sin(time/4300)*1.2}deg`,zIndex:35})}
    {WORKSHOP_HABITATS.filter(item=>!item.image&&state.habitats?.includes(item.id)&&growthRecord(state,item.id==='robot-dock'?'dog':'pad').level< (item.id==='robot-dock'?3:2)).map(item=>object(item.art,item.id==='robot-dock'?'ws-dock-care':'ws-gantry-care',{x:item.x,y:item.y,rest:true},item.width))}
    {WORKSHOP_HABITATS.filter(item=>item.image&&state.habitats?.includes(item.id)).map(item=><HabitatAddition key={item.id} {...{item,state,paused,disabled,hints,now,onOpen}}/>)}
    {object('dog','ws-dog',dog,layout.dog.width)}
    {object('cleaner','ws-cleaner',cleaner,layout.cleaner.width)}
    {object('bench','ws-bench',{...layout.bench,rest:true},layout.bench.width)}
    {object('energy','ws-energy',{...layout.energy,rest:true},layout.energy.width)}
    {pad.level>0&&object('pad','ws-pad',{...layout.pad,rest:true},layout.pad.width,{zIndex:40})}
    {brain.level===3&&<span className="workshop-assistant-ball" style={{left:`${(layout.brain.x-.09+.012*Math.sin(time/2400))*100}%`,top:`${(layout.brain.y-.13+.018*Math.cos(time/2400))*100}%`}} aria-hidden="true"><img src="/assets/workshop-growth-brain-v1.png" alt=""/></span>}
    {bench.level===3&&['flower','satellite','star'].includes(bench.selection)&&<span className="workshop-collectible" aria-label={`装配台收藏：${({flower:'齿轮花',satellite:'小卫星',star:'机械星星'})[bench.selection]}`} style={{left:`${(layout.bench.x-.01)*100}%`,top:`${(layout.bench.y-.10)*100}%`,'--collectible-index':['flower','satellite','star'].indexOf(bench.selection)}}><img src="/assets/workshop-collectibles-v1.png" alt=""/></span>}
    {object('drone','ws-drone',drone,layout.drone.width,{zIndex:46,'--drone-hover':`${paused||drone.rest?0:Math.sin(time/430)*2}px`})}
    <WorkshopSupply state={state} time={time} visit={visit} paused={paused} disabled={disabled} hints={hints} onOpen={onOpen} now={now}/>
  </>;
}

export function WorkshopBrief({state,today,onPlan}) {
  return <aside className="workshop-brief"><strong><Compass size={18}/>墨子的今日建议</strong><p>{workshopAdvice(state,today)}</p><button className="text-button" onClick={onPlan}><Notebook size={17}/>打开今日计划<ArrowRight size={16}/></button></aside>;
}

export function WorkshopShop({state,dispatch,busy,items=WORKSHOP_HABITATS.filter(item=>item.image)}) {
  const [confirm,setConfirm]=useState(null);
  return <div className="habitat-shop"><p className="soft-copy left">给机械伙伴添一处安静的角落。建设永久保留，日常互动一直免费。</p><div className="care-wallet"><span>我的星球币</span><strong>{state.coins} 星球币</strong></div>
    {items.map(item=>{const owned=state.habitats?.includes(item.id);return <article className="habitat-card" key={item.id}><div className="habitat-preview">{item.image?<HabitatArt item={item}/>:<WorkshopArt kind={item.art}/>}</div><h3>{item.name}</h3><p>{item.description}</p>{owned?<span className="habitat-owned"><Check size={17}/>已经建好 · 永久保留</span>:confirm===item.id?<div className="habitat-confirm"><p>使用 {item.cost} 星球币，余额将变为 {Math.max(0,state.coins-item.cost)}。</p><button className="primary-button" disabled={busy||state.coins<item.cost} onClick={()=>dispatch({type:'BUILD_HABITAT',habitatId:item.id})}>确认建造 · {item.cost} 星球币<Check/></button><button className="text-button" disabled={busy} onClick={()=>setConfirm(null)}>先不花币</button></div>:<button className="secondary-button" disabled={busy||state.coins<item.cost} onClick={()=>setConfirm(item.id)}>{state.coins<item.cost?`还差 ${item.cost-state.coins} 星球币`:`添置 · ${item.cost} 星球币`}<ArrowRight size={16}/></button>}</article>;})}
  </div>;
}
