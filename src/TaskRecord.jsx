import React,{useState} from 'react';
import {PawPrint,CheckCircle,Leaf,PencilSimple,Check,Play} from '@phosphor-icons/react';
import {completionIssue,taskElapsed,MAX_ACTUAL_MINUTES} from '../shared/task-time';
const stamp=t=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
export function TaskRecord({Dialog,task,onClose,onRecord,onAdjust,onContinue,onRecover,serverError,clearError,server}){
  const [status,setStatus]=useState('done'),[minutes,setMinutes]=useState(''),[note,setNote]=useState(task.note||''),[error,setError]=useState(''),[recover,setRecover]=useState(false);
  const counted=taskElapsed(task,task.reviewAt??Date.now()),rounded=Math.round(counted/60000),short=counted<600000;
  const wall=task.firstStartedAt!=null&&task.reviewAt!=null?Math.max(0,Math.round((task.reviewAt-task.firstStartedAt)/60000)):null;
  function change(){setError('');clearError?.();}
  return <Dialog title="欢迎回来，看看时间去了哪里" eyebrow="估得不准也没关系，真实记录就是进步" icon={PawPrint} className="task-record-dialog" onClose={onClose}>
    <h3 className="record-task">{task.title}</h3>
    <div className="comparison"><div><span>你原先预计</span><strong>{task.estimate}<small>分钟</small></strong></div><div><span>{server?'服务器累计计时':'本机累计计时'}</span><strong>{rounded}<small>分钟</small></strong></div></div>
    <p className="guide-reassurance">计时已暂停，填写时不用着急。主动暂停的时间不算在内；离开页面不会自动暂停。</p>
    {wall!=null&&<p className="guide-example-note">开始 {stamp(task.firstStartedAt)} → 回来 {stamp(task.reviewAt)}，共经过 {wall} 分钟，其中主动暂停约 {Math.max(0,wall-rounded)} 分钟。</p>}
    <div className="plan-first-note">{short?'这一段还不到 10 分钟。给自己一点时间认真试试吧，也可以先保存部分进展。':rounded>task.estimate+5?`这次计时比预计多了约 ${rounded-task.estimate} 分钟。慢一点不代表做得不好。回想一下：是任务更难，还是中间忘记暂停了？`:'先回想这段时间实际做了什么，再填写用时。比预计快或慢，都不会减少任务奖励。'}</div>
    <div className="record-options"><button className={status==='done'?'selected':''} aria-pressed={status==='done'} onClick={()=>{setStatus('done');change();}}><CheckCircle size={24}/><strong>完成了</strong><span>做到了约定的小目标</span></button><button className={status==='partial'?'selected':''} aria-pressed={status==='partial'} onClick={()=>{setStatus('partial');change();}}><Leaf size={24}/><strong>做了一部分</strong><span>已投入时间会保留</span></button><button onClick={onAdjust}><PencilSimple size={24}/><strong>需要调整</strong><span>把目标拆得更合适</span></button></div>
    <form className="task-form" noValidate onSubmit={e=>{e.preventDefault();const issue=status==='done'?completionIssue(task,Number(minutes),task.reviewAt??Date.now()):'';if(issue){setError(issue);return;}onRecord({status,actualMinutes:Number(minutes),note});}}>
      {status==='done'&&<><label htmlFor="actual-minutes">回想一下，实际用了多少分钟？</label><div className="input-with-unit"><input id="actual-minutes" type="number" min="10" max={MAX_ACTUAL_MINUTES} inputMode="numeric" value={minutes} onChange={e=>{setMinutes(e.target.value);change();}} placeholder="由你来填写" aria-describedby="actual-time-help"/><span>分钟</span></div><p id="actual-time-help" className="guide-example-note">至少 10 分钟，与累计计时相差不超过 5 分钟。校验的是记录与计时，不要求实际用时等于预计用时。</p></>}
      <label htmlFor="task-note">{status==='partial'?'已经做到哪一步了？':'有什么想记住的？'}<small>选填</small></label><textarea id="task-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={240} rows={2} placeholder="比如：最后两题比想象中费时间。"/>
      {(error||serverError)&&<p className="form-error" role="alert">{error||serverError}</p>}
      <button type="submit" className="primary-button full-width">{status==='done'?'核对用时，记下完成':'保存这一小步'}<Check size={18}/></button>
    </form>
    <button className="secondary-button full-width" onClick={onContinue}><Play size={18}/>再投入一会儿，继续计时</button>
    {counted>0&&<><button className="text-button center" onClick={()=>setRecover(!recover)}>中间忘记暂停了</button>{recover&&<div className="plan-first-note"><p>忘记暂停很常见，不需要填一个不真实的数字。写下中间发生的事，保存这次情况。旧计时会留在手记里；这次先不领奖，下一次从 0 开始计时，认真投入至少 10 分钟再完成。</p><button className="secondary-button" onClick={()=>{if(!note.trim()){setError('先在上面的备注里写一句真实情况吧。');return;}onRecover(note);}}>保存说明，重新准备计时</button></div>}</>}
  </Dialog>;
}
