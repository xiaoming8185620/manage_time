import React from 'react';
import { plantParts, plantFrame, plantKind } from '../shared/plant-render';
import { CARE_LEVELS } from '../shared/scene-care';
import './plant-sprites.css';

export function PlantCell({ frame, className = '' }) {
  if (frame.crop) {
    const [x,y,right,bottom]=frame.crop, [rx,ry]=frame.anchor;
    return <span className={`plant-cell ${className}`} style={{'--root-x':`${frame.root[0]/627*100}%`,'--root-y':`${frame.root[1]/627*100}%`}}><img src={frame.src} alt="" draggable="false" style={{width:`${1448/480*100}%`,height:`${1086/480*100}%`,left:`${frame.root[0]/627*100-rx/480*100}%`,top:`${frame.root[1]/627*100-ry/480*100}%`,clipPath:`inset(${y/1086*100}% ${(1448-right)/1448*100}% ${(1086-bottom)/1086*100}% ${x/1448*100}%)`}}/></span>;
  }
  return <span className={`plant-cell ${className}`} style={{ '--root-x':`${frame.root[0]/627*100}%`, '--root-y':`${frame.root[1]/627*100}%` }}><img src={frame.src} style={{ left:`-${frame.column*100}%`,top:`-${frame.row*100}%` }} alt="" draggable="false" /></span>;
}
export function PlantGrowth({ target, count, watered, paused }) {
  const parts=plantParts(target,count), canopy=target.id==='shade-tree';
  const sprites=parts.map((p,i)=><div key={i} className={`plant-sprite ${paused?'growth-paused':''} ${watered?'recently-watered':''}`} style={{left:`${p.x*100}%`,top:`${p.y*100}%`,width:`${p.width*100}%`,transform:`translate(-${p.root[0]/627*100}%,-${p.root[1]/627*100}%)`,zIndex:Math.round((target.floorY??p.y)*100)+1,'--sway-delay':`${-i*1.3-target.x*10}s`}}><PlantCell frame={p}/></div>);
  return <div className={`plant-group ${canopy?'canopy-mask':''}`} data-target={target.id} data-level={parts[0].level} aria-label={`${target.name} · ${CARE_LEVELS[parts[0].level]}`}>{sprites}</div>;
}
export function PlantPreview({ target, level }) {
  return <div className={`plant-preview-art ${plantKind(target)}`}><PlantCell frame={plantFrame(plantKind(target),level)} /></div>;
}
