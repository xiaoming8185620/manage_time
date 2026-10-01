import React from 'react';
import {TRAIN_VIEWS,workshopTrainAt} from '../shared/workshop-rail';
import {careTarget} from '../shared/scene-care';
import {WorkshopArt} from './WorkshopArt';

export function WorkshopTrain({time,disabled=false,hints=false,onOpen=()=>{}}) {
  const train=workshopTrainAt(time),view=TRAIN_VIEWS[train.frame];
  const [, ,w,h]=view.crop,[ax,ay]=view.anchor;
  const visibleNose=train.opacity>=.4&&((train.x>.015&&train.x<.42&&train.y<.83)||(train.x>.955&&train.x<1&&train.y<.42));
  // Neither transparent atlas padding nor a large bounding box intercepts the
  // floor. Only the small locomotive button can receive pointer events.
  return <div className="workshop-train-car" data-frame={train.frame} data-heading={train.heading.toFixed(1)} data-distance={train.distance.toFixed(4)} style={{left:`${train.x*100}%`,top:`${train.y*100}%`,width:`${23*train.scale*w/view.density}%`,opacity:train.opacity,zIndex:train.y<.47?15:80,transform:`translate(${-ax/w*100}%,${-ay/h*100}%)`}} aria-hidden={train.opacity<.4||undefined}>
    <WorkshopArt kind="train" frame={train.frame}/>
    <button className={`workshop-train-hit ${hints?'show-workshop-hint':''}`} style={{left:`${ax/w*100}%`,top:`${Math.max(.12,ay/h-.15)*100}%`,transform:'translate(-50%,-50%)'}} aria-label="和环轨机车互动" aria-hidden={!visibleNose||undefined} disabled={disabled||!visibleNose} onClick={()=>onOpen({...careTarget('ws-train'),x:train.x,y:train.y})}><span className="workshop-name">环轨机车</span></button>
  </div>;
}
