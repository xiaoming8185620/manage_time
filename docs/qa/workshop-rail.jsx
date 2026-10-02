import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkshopTrain} from '../../src/WorkshopTrain';
import '../../src/workshop.css';
function Fixture(){
  const [seconds,setSeconds]=useState(12);
  return <main style={{maxWidth:1100,margin:'auto',fontFamily:'sans-serif'}}><h2>轨道落点与转向验收 · 不读写存档</h2><label>行程秒数 <input type="number" min="0" max="152" value={seconds} onChange={e=>setSeconds(Number(e.target.value))}/></label>
    <div style={{position:'relative',aspectRatio:'1487/1058',overflow:'hidden',marginTop:16}}>
      <img src="/assets/workshop-base-v2.png" style={{position:'absolute',width:'100%'}}/>
      <WorkshopTrain time={seconds*1000}/>
      <img className="workshop-gate-occlusion" src="/assets/workshop-base-v2.png"/>
      <img className="workshop-stair-occlusion" src="/assets/workshop-base-v2.png"/>
      <img className="workshop-garden-occlusion" src="/assets/workshop-base-v2.png"/>
    </div></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
