import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {initialState,gameReducer} from '../../src/game';
import {GREENHOUSE_TARGETS} from '../../shared/greenhouse';
import '../../src/styles.css';
function Lab(){
 const [state,setState]=useState(()=>({...initialState(),greeted:true,coins:100}));
 const [level,setLevel]=useState(0);
 function growth(){const next=(level+1)%4;setLevel(next);setState(s=>({...s,care:{...s.care,...Object.fromEntries(GREENHOUSE_TARGETS.filter(t=>t.kind==='plant').map(t=>[t.id,{careCount:next}]))}}));}
 return <><App cloud={{state,paused:false,dispatch:a=>setState(s=>gameReducer(s,a.type==='COLLECT_CRYSTAL'?{...a,roll:.9}:a))}}/><aside style={{position:'fixed',bottom:3,left:3,zIndex:1000,background:'#fff9e7',padding:6,borderRadius:8,fontSize:11}}><strong>临时样例 · 不写入孩子存档</strong> <button onClick={growth}>成长 {level}/3</button><button onClick={()=>setState(s=>({...s,coins:0,greeted:false}))}>无币未入门</button><output>余额 {state.coins}</output></aside></>;
}
createRoot(document.getElementById('root')).render(<Lab/>);
