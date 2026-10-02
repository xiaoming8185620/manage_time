import React from 'react';
import {growthRecord} from '../shared/workshop-growth';
import {careTarget,careRecord} from '../shared/scene-care';
import {SUPPLY_SPOTS,SUPPLY_PHASE_LABELS} from '../shared/workshop-supply';
import {SupplyArt} from './SupplyArt';
import {WorkshopArt} from './WorkshopArt';
import './workshop-supply.css';

export function WorkshopSupply({state,time,visit,paused,disabled,hints,onOpen,now}) {
  const pod=growthRecord(state,'supply-pod'),dock=growthRecord(state,'supply-dock'),arm=growthRecord(state,'supply-arm'),lift=growthRecord(state,'supply-lift');
  const records={dock,arm,lift};
  const active=r=>r.lastEvent&&now-r.lastEvent.at<8000&&r.lastEvent.kind!=='upgrade';
  const working=visit.arm||(active(arm)?(Math.sin(time/650)+1)*.5:0);
  const raised=visit.cargo.lift||(active(lift)&&lift.selection==='lift'?(Math.sin(time/1300)+1)*.006:0);
  function facility(kind) {
    const p=SUPPLY_SPOTS[kind],id=`ws-supply-${kind}`,r=records[kind],target=careTarget(id),event=careRecord(state,id).lastEvent;
    const reply=event&&now-event.at<4500;
    return <React.Fragment key={kind}>
      <div className={`supply-facility supply-${kind}`} style={{left:`${p.x*100}%`,top:`${p.y*100}%`,width:`${p.width*100}%`,zIndex:kind==='lift'?78:kind==='arm'?58:50,'--supply-arm-angle':`${-working*8}deg`,'--supply-lift-y':`${-raised*100*1058/1487}cqw`}}>
        {kind==='arm'?<><SupplyArt kind="supply-arm" level={r.level} className="supply-arm-base"/><SupplyArt kind="supply-arm" level={r.level} className="supply-arm-moving"/></>:<SupplyArt kind={`supply-${kind}`} level={r.level}/>}
        {kind==='dock'&&(dock.level>0||visit.phase==='docking')&&<span className="supply-dock-light" style={{opacity:paused?.45:.35+.2*Math.sin(time/1100)}}/>}
        {kind==='dock'&&(visit.scan>0||(active(dock)&&dock.selection==='scan'))&&<span className="supply-scan" style={{opacity:visit.scan||.4,transform:`translateY(${-Math.sin(time/1100)*15}%)`}}/>}
      </div>
      <button className={`supply-facility-hit supply-${kind}-hit ${hints?'show-workshop-hint':''}`} style={{left:`${p.x*100}%`,top:`${(p.y-.025)*100}%`}} aria-label={`和${target.name}互动`} disabled={disabled} onClick={()=>onOpen(target)}><span className="workshop-name">{target.name}</span>{reply&&<span className="workshop-response">{target.reply}</span>}</button>
    </React.Fragment>;
  }
  const visible=visit.opacity>.1;
  const event=careRecord(state,'ws-supply-pod').lastEvent,reply=event&&now-event.at<4500;
  return <>
    <div className="supply-gate-glow" style={{opacity:visit.gate*.25}} aria-hidden="true"/>
    <span className="supply-gate-label" aria-hidden="true">云海补给港</span>
    {['dock','arm','lift'].map(facility)}
    <div className="supply-pod" data-phase={visit.phase} style={{left:`${visit.x*100}%`,top:`${visit.y*100}%`,width:`${.18*visit.scale*100}%`,opacity:visit.opacity,zIndex:visit.y<.44?18:56,'--supply-glow':paused?'.35':String(.35+.1*Math.sin(time/650))}} aria-hidden="true">
      <SupplyArt kind="supply-pod" level={pod.level} className={active(pod)?'supply-pod-response':''}/>
      {pod.level>=3&&<span className="supply-escort" style={{transform:`translateY(${Math.sin(time/800)*3}px)`}}><WorkshopArt kind="drone"/></span>}
    </div>
    {visible&&<button className={`supply-pod-hit ${hints?'show-workshop-hint':''}`} style={{left:`${visit.x*100}%`,top:`${(visit.y-.04)*100}%`}} disabled={disabled} aria-label="和云海补给舱互动" onClick={()=>onOpen(careTarget('ws-supply-pod'))}><span className="workshop-name">云海补给舱 · {SUPPLY_PHASE_LABELS[visit.phase]}</span>{reply&&<span className="workshop-response">{careTarget('ws-supply-pod').reply}</span>}</button>}
    <div className="supply-cargo" style={{left:`${visit.cargo.x*100}%`,top:`${visit.cargo.y*100}%`,opacity:visit.cargo.opacity,zIndex:visit.t>=36?79:Math.max(60,Math.round(visit.cargo.y*100)+2)}} aria-hidden="true"><img src="/assets/workshop-supply-crate-v1.png" alt="" draggable="false"/></div>
    <span className="supply-energy-light" style={{left:`${(10+(time/180%20))*1}%`,opacity:paused?.25:.5}} aria-hidden="true"/>
  </>;
}
