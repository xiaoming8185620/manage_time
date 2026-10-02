import catalogue from './workshop-growth.json' with {type:'json'};
export const WORKSHOP_GROWTH=catalogue.items;
export const growthItem=id=>WORKSHOP_GROWTH.find(i=>i.id===id||i.target===id||i.aliases?.includes(id));
export const growthRecord=(state,id)=>({level:0,spent:0,credit:0,selection:null,crafted:[],lastEvent:null,...state.workshopGrowth?.[growthItem(id)?.id||id]});
const total=level=>catalogue.costs.slice(0,level).reduce((a,b)=>a+b,0);
export function growthQuote(state,id){
 const item=growthItem(id),r=growthRecord(state,id);
 const credit=item?.habitat&&state.habitats?.includes(item.habitat)?10:0;
 return {credit,cost:r.level>=3?0:Math.max(0,total(r.level+1)-credit)-Math.max(0,total(r.level)-credit)};
}
export function reduceWorkshopGrowth(state,action,now){
 const item=growthItem(action.targetId);if(!item)return state;
 const r=growthRecord(state,item.id),q=growthQuote(state,item.id);
 let next;
 if(action.type==='UPGRADE_WORKSHOP'){
  if(action.expectedLevel!==r.level||r.level>=3||state.coins<q.cost)return state;
  next={...r,level:r.level+1,spent:r.spent+q.cost,credit:q.credit,selection:item.id==='earth'?['earth','moon','solar'][r.level]:r.selection,lastEvent:{at:now,kind:'upgrade',cost:q.cost}};
 }else{
  const option=item.options.find(o=>o[0]===action.option);
  if(!option||r.level<option[2])return state;
  next={...r,selection:option[0],crafted:item.id==='bench'&&option[2]===3?[...new Set([...r.crafted,option[0]])]:r.crafted,lastEvent:{at:now,kind:option[0],cost:0}};
 }
 return {...state,coins:state.coins-(action.type==='UPGRADE_WORKSHOP'?q.cost:0),workshopGrowth:{...state.workshopGrowth,[item.id]:next}};
}
export function restoreWorkshopGrowth(raw={},habitats=[],now=Date.now()){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid workshop growth');
 const result={};
 for(const [id,r] of Object.entries(raw)){
  const item=WORKSHOP_GROWTH.find(i=>i.id===id);
  if(!item||!r||typeof r!=='object'||!Number.isInteger(r.level)||r.level<1||r.level>3)throw Error('Invalid upgrade');
  const credit=item.habitat&&habitats.includes(item.habitat)?10:0;
  if(r.credit!==credit||r.spent!==Math.max(0,total(r.level)-credit))throw Error('Invalid upgrade cost');
  if(r.selection!==null&&!item.options.some(o=>o[0]===r.selection&&o[2]<=r.level))throw Error('Locked interaction');
  if(!Array.isArray(r.crafted)||new Set(r.crafted).size!==r.crafted.length||r.crafted.some(v=>item.id!=='bench'||r.level!==3||!['flower','satellite','star'].includes(v)))throw Error('Invalid collection');
  const e=r.lastEvent;
  if(!e||!Number.isFinite(e.at)||e.at<0||e.at>now||!Number.isInteger(e.cost)||e.cost<0||!['upgrade',...item.options.filter(o=>o[2]<=r.level).map(o=>o[0])].includes(e.kind)||e.cost!==(e.kind==='upgrade'?Math.max(0,total(r.level)-credit)-Math.max(0,total(r.level-1)-credit):0))throw Error('Invalid workshop event');
  result[id]={...r,crafted:[...r.crafted]};
 }
 return result;
}
export const workshopGrowthSpent=state=>Object.values(state.workshopGrowth||{}).reduce((sum,r)=>sum+r.spent,0);
