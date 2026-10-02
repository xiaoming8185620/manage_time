import React from 'react';
import {careTarget, careRecord} from '../shared/scene-care';
import './habitat-additions.css';

export function HabitatArt({item}) {
  const [x,y,right,bottom] = item.crop;
  return <span className="habitat-art" style={{aspectRatio:`${right-x} / ${bottom-y}`,'--habitat-ratio':(right-x)/(bottom-y)}}><img src={item.image} alt="" draggable="false" style={{width:`${1254/(right-x)*100}%`,left:`${-x/(right-x)*100}%`,top:`${-y/(bottom-y)*100}%`}}/></span>;
}

export function HabitatAddition({item,state,paused,disabled,hints,now,onOpen}) {
  const target=careTarget(item.targetId), event=careRecord(state,item.targetId).lastEvent;
  const responding=event && now-event.at<5000;
  // Keep antennas and transparent artwork edges out of neighbouring controls.
  const hit=item.hit || {x:.5,y:.5,w:1,h:1};
  return <div className={`habitat-addition ${paused?'life-paused':''} ${responding?'habitat-responding':''}`} data-habitat={item.id} style={{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.width*100}%`,zIndex:Math.round(item.y*100)}}>
    <HabitatArt item={item}/>
    <button className={`habitat-hit ${hints?'show-habitat-hint':''}`} style={{left:`${hit.x*100}%`,top:`${hit.y*100}%`,width:`${hit.w*100}%`,height:`${hit.h*100}%`}} disabled={disabled} aria-label={`和${item.name}互动`} onClick={()=>onOpen(target)}><span className="habitat-name">{item.name}</span></button>
    {responding&&<span className="habitat-response" role="status">{event.verb==='care'?target.careReply:target.reply}</span>}
  </div>;
}
