import React,{useReducer,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {initialState,gameReducer} from '../../src/game';
import '../../src/styles.css';
import {dayKey} from '../../shared/calendar';
function Fixture(){
  const [state,dispatch]=useReducer(gameReducer,undefined,initialState);
  useEffect(()=>dispatch({type:'VISIT_TOWN'}),[]);
  return <><div style={{position:'fixed',top:0,left:0,zIndex:999,background:'#fff8e9',padding:6,fontSize:12}}>新朋友验收 · 仅内存存档，不读写家庭进度</div><App cloud={{state,dispatch,paused:false,visitDay:dayKey()}}/></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
