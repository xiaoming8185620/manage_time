import React from 'react';
export function GreenhouseArt({ animal, column=0, frame=0 }) {
  // Measured atlas bands retain full wing tips; generated rows are not equal-height.
  const snake=animal===1, y=snake?.62:0, h=snake?.36:.61;
  return <span className="greenhouse-art" style={{aspectRatio:animal==null?'1':`${.5/h}`}}><img src={animal==null?'/assets/greenhouse-habitats-v1.png':'/assets/greenhouse-animals-v1.png'} alt="" draggable="false" style={animal==null?{width:'200%',left:`-${column*100}%`}:{width:'400%',height:`${100/h}%`,left:`-${frame*100}%`,top:`-${y/h*100}%`}}/></span>;
}
