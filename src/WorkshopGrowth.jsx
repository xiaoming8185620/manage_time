import React,{useState} from 'react';
import {WORKSHOP_GROWTH,growthItem,growthRecord,growthQuote} from '../shared/workshop-growth';
import './workshop-growth.css';
import {SupplyArt,SUPPLY_ART} from './SupplyArt';

const BOUNDS={brain:[[24,496],[548,1020],[1044,1551],[1613,2122]],dog:[[57,496],[595,1034],[1133,1571],[1645,2128]],cleaner:[[25,410],[475,902],[972,1481],[1517,2139]],pad:[[32,517],[570,1052],[1111,1592],[1643,2135]],bench:[[48,534],[578,1069],[1105,1598],[1636,2148]],energy:[[51,498],[587,1043],[1121,1578],[1656,2112]],earth:[[3,510],[523,1052],[1068,1593],[1596,2165]]};
const UNIT={brain:520,dog:470,cleaner:540,pad:510,bench:520,energy:490,earth:570};
export function WorkshopGrowthArt({kind,level=0,className='',style}){
 if(SUPPLY_ART.includes(kind))return <SupplyArt kind={kind} level={level} className={className} style={style}/>;
 const [x,right]=BOUNDS[kind][Math.max(0,Math.min(3,level))],w=right-x,u=UNIT[kind];
 const imageStyle={width:`${2172/w*100}%`,height:`${724/590*100}%`,left:`${-x/w*100}%`,top:`${-60/590*100}%`};
 const articulated=kind==='brain'&&level>0;
 return <span className={`workshop-art workshop-growth-art ${className}`} data-growth-level={level} style={{aspectRatio:`${w}/590`,width:`${w/u*100}%`,marginLeft:`${(1-w/u)*50}%`,...style}} aria-hidden="true">{articulated?<><span className="growth-brain-body"><img src={`/assets/workshop-growth-${kind}-v1.png`} alt="" draggable="false" style={imageStyle}/></span><span className="growth-brain-arms"><img src={`/assets/workshop-growth-${kind}-v1.png`} alt="" draggable="false" style={imageStyle}/></span></>:<img src={`/assets/workshop-growth-${kind}-v1.png`} alt="" draggable="false" style={imageStyle}/>}</span>;
}
export function WorkshopGrowthPanel({target,state,busy,onDispatch,onFree,onClose}){
 const item=growthItem(target.id),r=growthRecord(state,item.id),q=growthQuote(state,item.id);
 const [confirm,setConfirm]=useState(null),[zoom,setZoom]=useState(false);
 const view=item.id==='earth'?(r.selection==='solar'?3:r.selection==='moon'?2:Math.min(1,r.level)):r.level;
 const current=confirm===r.level;
 return <div className="workshop-growth-panel">
   <div className={`growth-preview ${zoom?'growth-zoom':''}`}><WorkshopGrowthArt kind={item.art} level={view}/></div>
   <p className="care-description">{target.description} 每次升级留下真实部件，永久保留。</p>
   <ol className="growth-steps">{item.stages.map((s,i)=><li key={s} className={i<=r.level?'reached':''} aria-current={i===r.level?'step':undefined}><span>{i===0?'起点':i+' 级'}</span><strong>{s}</strong></li>)}</ol>
   <div className="care-wallet"><span>星球币余额</span><strong>{state.coins}</strong></div>
   {r.level<3?<section className="growth-next"><h3>下一步 · {item.stages[r.level+1]}</h3><p>{item.benefits[r.level]}</p>{q.credit>0&&<p className="soft-copy left">已有伙伴设施计入 10 币建设抵扣，升级费用已扣除相应部分。</p>}
   {current?<div className="care-confirm"><p>确认使用 {q.cost} 星球币，余额变为 {Math.max(0,state.coins-q.cost)}。部件永久保留。</p><button className="primary-button" disabled={busy||state.coins<q.cost} onClick={()=>{onDispatch({type:'UPGRADE_WORKSHOP',targetId:item.id,expectedLevel:r.level});setConfirm(null);}}>确认升级 · {q.cost} 星球币</button><button className="text-button" disabled={busy} onClick={()=>setConfirm(null)}>先不花币</button></div>:<button className="primary-button" disabled={busy||state.coins<q.cost} onClick={()=>setConfirm(r.level)}>{state.coins<q.cost?`还差 ${q.cost-state.coins} 星球币`:`安装新部件 · ${q.cost} 星球币`}</button>}</section>:<p className="growth-complete">全部部件已装好 · 不再收取成长费用，免费保养一直保留。</p>}
   <button className="secondary-button full-width" disabled={busy} onClick={()=>onFree('interact',target)}>{r.level===3?'免费保养与问候':target.freeLabel||'免费互动'}</button>
   {r.level>0&&<section className="growth-options"><h3>试试新本领 · 免费</h3>{item.options.filter(o=>o[2]<=r.level).map(o=><button key={o[0]} className="secondary-button" aria-pressed={r.selection===o[0]} disabled={busy} onClick={()=>{onDispatch({type:'INTERACT_WORKSHOP',targetId:item.id,option:o[0]});onClose();}}>{o[1]}</button>)}{item.id==='earth'&&<button className="text-button" onClick={()=>setZoom(!zoom)}>{zoom?'缩小观察':'放大观察'}</button>}</section>}
   {item.id==='bench'&&r.crafted.length>0&&<p>已收藏：{r.crafted.map(v=>({flower:'齿轮花',satellite:'小卫星',star:'机械星星'}[v])).join('、')}。再次选择可更换展示，不重复收费。</p>}
   <p className="care-gentle">今天不照料也不会损坏，成长不会倒退。</p><button className="text-button center" disabled={busy} onClick={onClose}>回场景看变化</button>
 </div>;
}
export function WorkshopGrowthDirectory({state,onOpen}){
 return <div className="growth-directory"><p className="care-description">机械伙伴与补给设施，投入哪里，哪里就慢慢成长。</p>{WORKSHOP_GROWTH.map(item=>{const r=growthRecord(state,item.id),q=growthQuote(state,item.id);return <button key={item.id} className="growth-directory-item" onClick={()=>onOpen(item.target)}><WorkshopGrowthArt kind={item.art} level={r.level}/><span><strong>{item.name}</strong><small>{item.stages[r.level]} · {r.level}/3</small></span><b>{r.level===3?'已完成':`${q.cost} 币升级`}</b></button>;})}</div>;
}
