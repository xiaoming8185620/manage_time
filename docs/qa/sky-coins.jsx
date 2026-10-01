import React, {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {gameReducer,initialState} from '../../src/game';
import '../../src/styles.css';
function Lab(){
 const [state,setState]=useState(()=>({...initialState(),greeted:true}));
 const [win,setWin]=useState(true), [busy,setBusy]=useState(false), [interrupt,setInterrupt]=useState(false);
 const scheduled=useRef(false);
 function dispatch(action){
  setState(s=>gameReducer(s,['COLLECT_CRYSTAL','ANIMAL_DROP'].includes(action.type)?{...action,roll:win?.1:.9,spotRoll:.6}:action));
  if(action.type==='MOVE'&&interrupt&&!scheduled.current){scheduled.current=true;setTimeout(()=>{setBusy(true);setTimeout(()=>setBusy(false),700);},120);}
 }
 return <><App cloud={{state,paused:busy,dispatch}}/><aside style={{position:'fixed',bottom:4,left:4,zIndex:1000,background:'#fffbea',padding:8,borderRadius:8,fontSize:12,maxWidth:'95vw'}}><strong>临时验收 · 不写入存档</strong> <label><input type="checkbox" checked={win} onChange={e=>setWin(e.target.checked)}/>测试掉落</label> <label><input type="checkbox" checked={interrupt} onChange={e=>{setInterrupt(e.target.checked);scheduled.current=false;}}/>移动途中模拟保存</label><output>余额 {state.coins} / 采集 {state.skyRewards?.attempts||0} / 收入 {state.skyRewards?.earned||0} / 地面 {state.skyRewards?.pending.length||0} / 动物收入 {state.animalRewards?.earned||0} / 动物地面 {state.animalRewards?.pending.length||0} / {busy?'保存中':'空闲'}</output><button onClick={()=>dispatch({type:'COLLECT_CRYSTAL',attempt:(state.skyRewards?.attempts||0)+1})}>模拟采集完成</button>{['gh-parrot','gh-snake'].map(animal=><button key={animal} onClick={()=>dispatch({type:'ANIMAL_DROP',animal,attempt:(state.animalRewards?.attempts[animal]||0)+1})}>模拟{animal==='gh-parrot'?'鹦鹉':'小蛇'}掉落</button>)}</aside></>;
}
createRoot(document.getElementById('root')).render(<Lab/>);
