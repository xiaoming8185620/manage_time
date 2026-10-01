import {growthItem,growthRecord} from './workshop-growth.js';
import catalogue from './greenhouse.json' with { type:'json' };
import { WORKSHOP_HABITATS } from './workshop.js';
export const HABITATS = catalogue.habitats;
export const ALL_HABITATS = [...HABITATS, ...WORKSHOP_HABITATS];
export const GREENHOUSE_TARGETS = catalogue.targets;
export function restoreHabitats(value = []) {
  if (!Array.isArray(value) || value.some(id=>!ALL_HABITATS.some(h=>h.id===id)) || new Set(value).size!==value.length) throw new Error('Invalid habitats');
  return [...value];
}
export function reduceHabitat(state, action) {
  const item=ALL_HABITATS.find(h=>h.id===action.habitatId), owned=state.habitats||[];
  if (item && ['robot-dock','drone-gantry'].includes(item.id) && growthRecord(state,item.id==='robot-dock'?'dog':'pad').level>0)return state;
  if (!item || owned.includes(item.id) || state.coins<item.cost) return state;
  return {...state,coins:state.coins-item.cost,habitats:[...owned,item.id]};
}
export function canWalkGreenhouse(x,y) {
  return Number.isFinite(x) && Number.isFinite(y) && ((x>.32 && x<.72 && y>.45 && y<.74) || (x>.15 && x<.38 && y>.53 && y<.63) || (x>.36 && x<.61 && y>=.74 && y<.88));
}
export function greenhouseAnimalAt(kind, ms, habitats=[]) {
  const seconds=Math.max(0,ms)/1000;
  if(kind==='gh-parrot') {
    const t=seconds%28;
    const rest=t>=22;
    const u=Math.min(t,22)/22;
    const x=.395+.34*Math.sin(u*Math.PI*2);
    const y=.245-.08*Math.sin(u*Math.PI*2)+.035*Math.sin(u*Math.PI*4);
    return {x:rest?.395:x,y:rest?.245:y,facing:Math.cos(u*Math.PI*2)<0?'left':'right',frame:rest?1:Math.floor(seconds*7)%4,rest};
  }
  const t=seconds%44, rest=t>=36, u=Math.min(t,36)/36;
  const furnished=habitats.includes('snake-rest');
  return {x:(furnished?.655:.57)+(furnished?.08:.13)*Math.sin(u*Math.PI*2),y:.755+.028*Math.sin(u*Math.PI*4),facing:Math.cos(u*Math.PI*2)<0?'left':'right',frame:rest?0:Math.floor(seconds*3)%4,rest};
}
