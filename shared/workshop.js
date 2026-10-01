import catalogue from './workshop.json' with {type:'json'};
import { taskDay } from './calendar.js';
import { workshopTrainAt } from './workshop-rail.js';

export const WORKSHOP_TARGETS = catalogue.targets;
export const WORKSHOP_HABITATS = catalogue.habitats;
// A convex walking area keeps every straight journey clear of the projector,
// cargo dock and the foreground stairwell. Values are image-space feet.
export const WORKSHOP_FLOOR = [[.27,.535],[.67,.535],[.84,.63],[.78,.73],[.35,.73],[.17,.62]];
export function canWalkWorkshop(x,y) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  return WORKSHOP_FLOOR.every(([ax,ay],i)=>{
    const [bx,by]=WORKSHOP_FLOOR[(i+1)%WORKSHOP_FLOOR.length];
    return (bx-ax)*(y-ay)-(by-ay)*(x-ax)>=-1e-8;
  });
}
export const workshopDepth = y => .88 + Math.max(0,Math.min(1,(y-.535)/.195))*.20;
export function workshopAdvice(state,today) {
  const tasks=state.tasks.filter(t=>taskDay(t)===today);
  const active=tasks.find(t=>t.status==='active');
  if(active)return `「${active.title}」正在进行。先做完眼前这一小段，回来再如实记下用时，也可以暂停休息。`;
  const partial=tasks.find(t=>t.status==='partial'||t.status==='paused');
  if(partial)return `「${partial.title}」已经留下了进展。下一步可以再拆小一点，调整计划也没关系。`;
  const planned=tasks.find(t=>t.status==='planned');
  if(planned)return `「${planned.title}」预计 ${planned.estimate} 分钟。开始前备好需要的东西，结束后看看实际用了多久。`;
  return tasks.length?'今天的进展已经记下。看看估时和实际用时，也给运动、朋友和休息留一点时间。':'先在今日计划里写下一件具体的小事，估一估用时。只安排一件，也很好。';
}
const blend=(a,b,t)=>a+(b-a)*t;
function route(points,t) {
  const i=points.findIndex(p=>p[0]>=t);
  const b=points[Math.max(1,i<0?points.length-1:i)],a=points[Math.max(0,(i<0?points.length-1:i)-1)];
  const u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
  return {x:blend(a[1],b[1],u),y:blend(a[2],b[2],u),facing:b[1]>=a[1]?'right':'left',frame:b[3]??0};
}
export function workshopLifeAt(kind,ms,habitats=[]) {
  const s=Math.max(0,Number.isFinite(ms)?ms:0)/1000;
  if(kind==='dog') {
    const [x,y]=habitats.includes('robot-dock')?[.23,.59]:[.29,.63];
    return {x,y,facing:'right',rest:true,frame:0,opacity:1};
  }
  if(kind==='cleaner')return {...route([[0,.82,.70],[5,.82,.70],[17,.68,.71],[24,.68,.71],[38,.81,.64],[46,.82,.70]],s%46),rest:s%46<5,opacity:1};
  if(kind==='drone') {
    const t=s%40,rest=t<5||t>35;
    return {...route([[0,.235,.35],[5,.235,.35],[9,.23,.23],[18,.37,.16],[25,.34,.24],[32,.235,.25],[35,.235,.35],[40,.235,.35]],t),rest,opacity:1};
  }
  return workshopTrainAt(ms);
}
