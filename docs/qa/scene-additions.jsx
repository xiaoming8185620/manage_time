import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {initialState,gameReducer} from '../../src/game';
import {ALL_HABITATS} from '../../shared/greenhouse';
import {availableCareTargets} from '../../shared/scene-care';
import {WORKSHOP_GROWTH} from '../../shared/workshop-growth';
import '../../src/styles.css';
function preset(mode){
  let s={...initialState(),coins:1000,greeted:true};
  if(mode!=='empty'){
    for(const h of ALL_HABITATS)s=gameReducer(s,{type:'BUILD_HABITAT',habitatId:h.id});
    s=gameReducer(s,{type:'BUILD',itemId:'cat-tree',slot:'sunny'});
    s=gameReducer(s,{type:'BUILD',itemId:'flowerbed',slot:mode==='legacy'?'garden':'porch-bed'});
  }
  if(mode==='grown'){
    for(const item of WORKSHOP_GROWTH)for(let i=0;i<3;i++)s=gameReducer(s,{type:'UPGRADE_WORKSHOP',targetId:item.id,expectedLevel:i});
    for(const scene of ['town','greenhouse'])for(const target of availableCareTargets(s,scene).filter(t=>t.kind==='plant'))for(let i=0;i<3;i++)s=gameReducer(s,{type:'CARE_SCENE',targetId:target.id,verb:'care',careId:`qa-${target.id}-${i}`,expectedCount:i,now:10000+i*3000});
  }
  return s;
}
function Fixture(){const [state,dispatch]=useReducer((s,a)=>a.type==='QA_PRESET'?preset(a.mode):gameReducer(s,a),preset('empty'));return <><div style={{position:'fixed',top:0,left:0,zIndex:999,background:'#fff8e9',padding:6,fontSize:12}}>临时验收，不读写家庭存档：{[['empty','空白建设'],['built','全部建成·初生'],['grown','全部建成·盛放'],['legacy','旧花圃']].map(([mode,name])=><button key={mode} onClick={()=>dispatch({type:'QA_PRESET',mode})}>{name}</button>)}</div><App cloud={{state,dispatch,paused:false}}/></>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
