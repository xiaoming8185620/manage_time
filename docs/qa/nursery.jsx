import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {initialState,gameReducer} from '../../src/game';
import '../../src/styles.css';
import {dayKey} from '../../shared/calendar';
function Preview({slot,level,cat}){
  const [state,dispatch]=useReducer(gameReducer,undefined,()=>({...initialState(),greeted:true,coins:30,
    buildings:[...(slot?[{itemId:'flowerbed',slot,builtAt:1}]:[]),...(cat?[{itemId:'cat-tree',slot:cat,builtAt:1}]:[])],
    care:{'built-flowerbed':{careCount:level}},boy:{x:.5,y:.60}}));
  return <App cloud={{state,dispatch,paused:true,visitDay:dayKey()}}/>;
}
function Fixture(){
  const [slot,setSlot]=useState('porch-bed'),[level,setLevel]=useState(0),[cat,setCat]=useState('');
  return <><Preview key={`${slot}-${level}-${cat}`} {...{slot,level,cat}}/><div style={{position:'fixed',top:0,left:0,zIndex:999,background:'#fff8e9',padding:6,fontSize:12}}>
    仅内存验收 · <select aria-label="花圃位置" value={slot} onChange={e=>setSlot(e.target.value)}><option value="">未建设</option><option value="porch-bed">西侧栏杆内缘</option><option value="east-bed">东侧花箱前缘</option></select>
    <select aria-label="成长阶段" value={level} onChange={e=>setLevel(Number(e.target.value))}>{['初生','舒展','繁茂','盛放'].map((v,i)=><option key={v} value={i}>{v}</option>)}</select>
    <select aria-label="猫爬架位置" value={cat} onChange={e=>setCat(e.target.value)}><option value="">无猫爬架</option>{['sunny','window','garden'].map(v=><option key={v}>{v}</option>)}</select>
  </div></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
