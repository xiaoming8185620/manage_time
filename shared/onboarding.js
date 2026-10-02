import {taskDay,dayKey} from './calendar.js';
export function guidePreferences(state){
  const value=state.onboarding;
  if(value===undefined)return {introSeen:!!state.greeted||state.tasks.length>0,dismissed:state.tasks.some(t=>t.rewardClaimed)};
  if(!value||typeof value.introSeen!=='boolean'||typeof value.dismissed!=='boolean')throw new Error('Invalid guide preferences');
  return {introSeen:value.introSeen,dismissed:value.dismissed};
}
export function nextGuideStep(state,today=dayKey()){
  if(!state.greeted)return {key:'greet',title:'先认识伙伴小乖',copy:'点一下小乖，它会陪你开始。随后一起安排现实中的一件小事。',action:'和小乖打招呼'};
  const active=state.tasks.find(t=>t.status==='active');
  if(active)return {key:'record',task:active,title:'去现实中行动，再回来记录',copy:`「${active.title}」正在计时。可以锁屏去做；回来如实记下完成、部分完成或调整。`,action:'查看计时与记录入口'};
  const reward=state.tasks.find(t=>t.status==='done'&&!t.rewardClaimed);
  if(reward)return {key:'reward',task:reward,title:'收下这次行动的奖励',copy:'完成的小目标可以领取一次 10 星球币。到访礼物和任务奖励分别计算。',action:'领取任务奖励'};
  const task=state.tasks.find(t=>t.status!=='done'&&taskDay(t)<=today);
  if(task)return {key:'start',task,title:task.status==='planned'?'准备好了，就开始这件事':'按自己的节奏继续',copy:`「${task.title}」预计 ${task.estimate} 分钟。准备开始时再启动计时，也可以先调整计划。`,action:'打开这件事'};
  const done=[...state.tasks].reverse().find(t=>t.status==='done');
  if(done&&!state.reflections.some(r=>r.taskId===done.id))return {key:'reflect',task:done,title:'比较一下预计和实际用时',copy:'快一点或慢一点都没关系。留下一点经验，下次会更了解自己的节奏。',action:'用一句话回顾'};
  if(done)return {key:'explore',title:'你已经学会小镇的节奏啦',copy:'可以用星球币建设、照料植物，也可以先存起来。明天再安排一个小目标。',action:'看看可以建设什么'};
  const future=state.tasks.some(t=>t.status!=='done');
  return {key:'plan',title:future?'计划已经安排，按约定时间开始':'写下第一个现实小目标',copy:future?'可以查看未来安排，或再为今天留一件小事。':'比如读 10 页书，先估计 15 分钟。任务要在现实中完成，小镇帮你记录与回顾。',action:future?'查看我的计划':'安排第一件小事',future};
}
