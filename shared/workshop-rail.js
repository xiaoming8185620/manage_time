// Wheel-contact path traced on workshop-base-v1 (1487 × 1058). The front
// bridge hides the lower rail; the final connector is outside the glass hall.
const ASPECT = 1058 / 1487;
const CURVES = [
  [[.070,.333],[.155,.365],[.120,.407],[.088,.455]],
  [[.088,.455],[-.015,.585],[.065,.708],[.280,.786]],
  [[.280,.786],[.500,.940],[.810,1.080],[1.020,.880]],
  [[1.020,.880],[1.100,.790],[1.140,.500],[1.040,.397]],
  [[1.040,.397],[.990,.364],[.985,.351],[.970,.340]],
  [[.970,.340],[.860,.210],[.025,.130],[.070,.333]],
];
const clamp = v => Math.max(0,Math.min(1,v));
const smooth = v => {const t=clamp(v);return t*t*(3-2*t);};
function bezier(points,t) {
  const u=1-t,w=[u*u*u,3*u*u*t,3*u*t*t,t*t*t];
  return {x:points.reduce((n,p,i)=>n+p[0]*w[i],0),y:points.reduce((n,p,i)=>n+p[1]*w[i],0)};
}
// A screen-space arc-length table avoids speeding up on short Bezier handles.
const samples=[];
let length=0;
CURVES.forEach((curve,section)=>{
  for(let i=section?1:0;i<=120;i++){
    const p=bezier(curve,i/120),previous=samples.at(-1);
    if(previous)length+=Math.hypot(p.x-previous.x,(p.y-previous.y)*ASPECT);
    samples.push({...p,distance:length,section});
  }
});
export const WORKSHOP_RAIL_LENGTH=length;
export const WORKSHOP_TRAIN_PERIOD_MS=76000;
export function workshopRailPoint(distance) {
  const d=((distance%length)+length)%length;
  let lo=1,hi=samples.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(samples[mid].distance<d)lo=mid+1;else hi=mid;}
  const a=samples[lo-1],b=samples[lo],t=(d-a.distance)/(b.distance-a.distance);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,section:b.section};
}

// PNG crop, front wheel anchor, original pixel density and projected yaw.
// Extra front/back/side views keep an upright painted body while turning.
export const TRAIN_VIEWS=[
  {frame:0,angle:24,crop:[90,110,410,320],anchor:[325,282],density:500},
  {frame:1,angle:154,crop:[1330,110,365,325],anchor:[120,288],density:500},
  {frame:2,angle:338,crop:[1370,490,345,320],anchor:[285,165],density:500},
  {frame:3,angle:201,crop:[540,490,345,320],anchor:[66,165],density:500},
  {frame:4,angle:0,crop:[70,530,430,275],anchor:[315,230],density:500,flip:true},
  {frame:5,angle:90,crop:[1020,100,195,340],anchor:[95,310],density:500},
  {frame:6,angle:180,crop:[70,530,430,275],anchor:[115,230],density:500},
  {frame:7,angle:270,crop:[1020,490,205,320],anchor:[100,140],density:500},
];
export function workshopTrainAt(ms) {
  const time=Math.max(0,Number.isFinite(ms)?ms:0);
  const distance=time/WORKSHOP_TRAIN_PERIOD_MS*length;
  const p=workshopRailPoint(distance);
  const scale=.42+clamp((p.y-.34)/.52)*.56;
  // The axle chord gives a stable body direction while the nose enters a bend.
  const rear=workshopRailPoint(distance-.085*scale);
  const heading=(Math.atan2((p.y-rear.y)*ASPECT,p.x-rear.x)*180/Math.PI+360)%360;
  const delta=angle=>Math.abs(((angle-heading+540)%360)-180);
  const view=TRAIN_VIEWS.reduce((best,v)=>delta(v.angle)<delta(best.angle)?v:best);
  return {...p,scale,heading,distance,frame:view.frame,rest:false,
    opacity:p.section===5?0:smooth((p.y-.35)/.055)};
}
