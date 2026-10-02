import React from 'react';
import {TRAIN_VIEWS} from '../shared/workshop-rail';

// Crops are measured against the generated PNGs, never resized per pose.
// A fixed crop and translated shoe baseline prevent breathing-size walk frames.
const MACHINE = {cleaner:[64,200,510,476],drone:[724,130,754,490],brain:[1495,40,650,635]};
export function WorkshopArt({kind,frame=0,style,className=''}) {
  let source='workshop-machines-v1.png',size=[2172,724],crop=MACHINE[kind];
  if(kind==='dog'){source='workshop-dog-walk-v1.png';crop=[frame*543+45,150+[553,547,571,561][frame]-571,445,430];}
  if(kind==='earth'){source='workshop-earth-v1.png';size=[1944,809];crop=[frame*648+45-[0,2.15,7.7][frame],170,558,506];}
  if(kind==='train'){source='workshop-locomotive-v1.png';size=[1774,887];crop=TRAIN_VIEWS[frame].crop;style={...style,transform:TRAIN_VIEWS[frame].flip?'scaleX(-1)':undefined};}
  if(kind==='dock'||kind==='gantry'){source='workshop-buildings-v1.png';size=[1774,887];crop=kind==='dock'?[40,200,847,590]:[927,165,810,650];}
  if(kind==='pad'){source='workshop-base-v1.png';size=[1487,1058];crop=[255,393,226,80];}
  const [x,y,w,h]=crop||MACHINE.brain;
  return <span className={`workshop-art ${className}`} style={{aspectRatio:`${w}/${h}`,...style}} aria-hidden="true"><img src={`/assets/${source}`} alt="" draggable="false" style={{width:`${size[0]/w*100}%`,height:`${size[1]/h*100}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`}}/></span>;
}
