export const MIN_TASK_MINUTES = 10;
export const MAX_ACTUAL_MINUTES = 525600;
export const TIME_TOLERANCE = 5;
export function taskElapsed(task, now) {
  return Math.max(0,task.elapsedMs || 0)+(task.status==='active'&&task.startedAt!=null?Math.max(0,now-task.startedAt):0);
}
export function completionIssue(task,actual,now) {
  const ms=taskElapsed(task,now), recorded=Math.round(ms/60000);
  if(ms<MIN_TASK_MINUTES*60000)return '这一段计时还不到 10 分钟。给自己一点时间认真试试吧；也可以先记下做了一部分，投入的时间会保留。';
  if(!Number.isFinite(actual)||actual<MIN_TASK_MINUTES||actual>MAX_ACTUAL_MINUTES)return '实际用时请填写至少 10 分钟的有效数字。先看看计时记录，再回想一下吧。';
  if(Math.abs(actual-recorded)>TIME_TOLERANCE)return `这一段累计计时约 ${recorded} 分钟，和填写的用时相差超过 5 分钟。再回想一下吧；如果忘记暂停，可以如实补记，不用为了领奖改成不真实的数字。`;
  return '';
}
