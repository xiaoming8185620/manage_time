import React, {useReducer, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {gameReducer,initialState} from '../../src/game';
import '../../src/styles.css';
function Lab(){
 const [state,dispatch]=useReducer(gameReducer,null,()=>({...initialState(),greeted:true}));
 const [win,setWin]=useState(true);
 return <><App cloud={{state,paused:false,dispatch:action=>dispatch(action.type==='COLLECT_CRYSTAL'?{...action,roll:win?.1:.9}:action)}}/><div style={{position:'fixed',bottom:4,left:4,zIndex:1000,background:'#fffbea',padding:8,borderRadius:8,fontSize:12}}><strong>临时验收 · 不写入存档</strong> <label><input type="checkbox" checked={win} onChange={e=>setWin(e.target.checked)}/>测试掉落</label> <output>采集 {state.skyRewards?.attempts||0} 次 / 收入 {state.skyRewards?.earned||0} / 地面 {state.skyRewards?.pending.length||0}</output><button onClick={()=>dispatch({type:'COLLECT_CRYSTAL',attempt:(state.skyRewards?.attempts||0)+1,roll:win?.1:.9})}>模拟采集完成</button></div></>;
}
createRoot(document.getElementById('root')).render(<Lab/>);
