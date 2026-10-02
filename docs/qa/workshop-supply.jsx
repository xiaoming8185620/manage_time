import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkshopScene} from '../../src/WorkshopScene';
import {PlayerCharacter} from '../../src/PlayerCharacter';
import {ScenePlanEntrance} from '../../src/ScenePlanEntrance';
import {initialState,gameReducer} from '../../src/game';
import {WORKSHOP_GROWTH} from '../../shared/workshop-growth';
import '../../src/styles.css';
import '../../src/scene-scale.css';
function Fixture(){
 const [level,setLevel]=useState(0),[time,setTime]=useState(18000);
 let state={...initialState(),coins:300,greeted:true};
 for(const item of WORKSHOP_GROWTH)for(let i=0;i<level;i++)state=gameReducer(state,{type:'UPGRADE_WORKSHOP',targetId:item.id,expectedLevel:i,now:1000});
 return <><div style={{position:'fixed',top:0,left:0,zIndex:999,background:'#fff8e9',padding:8}}>临时验收：{[0,1,2,3].map(l=><button key={l} onClick={()=>setLevel(l)}>{l}级</button>)}{[[6000,'驶入'],[18000,'扫描'],[23000,'卸货'],[31000,'转运'],[39000,'升降'],[55000,'静候']].map(([t,label])=><button key={t} onClick={()=>setTime(t)}>{label}</button>)}</div>
 <main className="game-shell"><div className="game-stage workshop-stage" style={{'--unit':'calc(100cqw / 1487)'}}>
 <WorkshopScene state={state} paused disabled={false} onOpen={()=>{}} hints={false} now={10000} previewTime={time}/>
 <PlayerCharacter position={{x:.49,y:.67}} paused ready greeted blocked depthScale={1}/>
 <ScenePlanEntrance onOpen={()=>{}}/>
 </div></main></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
