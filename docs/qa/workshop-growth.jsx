import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {initialState,gameReducer} from '../../src/game';
import {WORKSHOP_GROWTH} from '../../shared/workshop-growth';
import '../../src/styles.css';
function preset(level){let s={...initialState(),coins:WORKSHOP_GROWTH.length*16+30,greeted:true};for(const item of WORKSHOP_GROWTH)for(let i=0;i<level;i++)s=gameReducer(s,{type:'UPGRADE_WORKSHOP',targetId:item.id,expectedLevel:i});return s;}
function Fixture(){const [state,dispatch]=useReducer((s,a)=>a.type==='QA_PRESET'?preset(a.level):gameReducer(s,a),preset(0));return <><div style={{position:'fixed',top:0,left:0,zIndex:999,background:'#fff8e9',padding:8,fontSize:12}}>仅临时验收，不读写家庭存档：{['初始','一级','二级','满级'].map((name,level)=><button key={level} onClick={()=>dispatch({type:'QA_PRESET',level})}>{name}</button>)}</div><App cloud={{state,dispatch,paused:false}}/></>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
