import {dayKey,validDay} from './calendar.js';
export const VISIT_REWARD=10;
export function restoreVisitDays(value=[],now=Date.now()){
  if(!Array.isArray(value)||value.length>36600||new Set(value).size!==value.length||value.some(d=>!validDay(d)||d>dayKey(now)))throw new Error('Invalid visit receipts');
  return [...value].sort();
}
export function reduceVisit(state,now){
  const day=dayKey(now),days=state.visitDays||[];
  // A clock moving backwards cannot mint missed historical gifts.
  if(days.some(d=>d>=day))return state;
  return {...state,coins:state.coins+VISIT_REWARD,visitDays:[...days,day]};
}
