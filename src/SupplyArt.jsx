import React from 'react';

export const SUPPLY_ART = ['supply-dock','supply-arm','supply-pod','supply-lift'];
export function SupplyArt({kind,level=0,className='',style}) {
  const arm = kind === 'supply-arm';
  const size = arm ? [2170,725] : [2172,724];
  const top = kind === 'supply-pod' ? 80 : arm ? 0 : 140;
  const cell = size[0] / 4, height = 665 - top;
  const stage = Math.max(0,Math.min(3,level));
  return <span className={`workshop-art supply-art ${className}`} data-growth-level={stage} style={{aspectRatio:`${cell}/${height}`,...style}} aria-hidden="true">
    <img src={`/assets/workshop-${kind}-v1.png`} alt="" draggable="false" style={{width:'400%',height:`${size[1]/height*100}%`,left:`${-stage*100}%`,top:`${-top/height*100}%`}}/>
  </span>;
}
