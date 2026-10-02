import React from 'react';
import {Notebook,Footprints,Leaf,CheckCircle,ArrowRight} from '@phosphor-icons/react';
import {nextGuideStep} from '../shared/onboarding';
import './town-guide.css';

export const PLAN_EXAMPLES=[
  {title:'读 10 页书',estimate:15,category:'学习'},
  {title:'完成数学前 6 题',estimate:20,category:'学习'},
  {title:'出门活动 20 分钟',estimate:20,category:'运动'},
  {title:'和朋友聊一会儿',estimate:15,category:'社交'},
];
export function WelcomeGuide({received,onStart,onSkip}){
  return <div className="welcome-guide">
    <div className="guide-friend"><img src="/assets/xiaoguai.png" alt="伙伴小乖，白底黑灰色块的英短猫"/><p>我是小乖。<strong>把现实中的一小步，变成小镇的成长。</strong></p></div>
    <ol className="guide-loop">
      <li><Notebook size={23}/><div><strong>写一个小计划</strong><span>想做什么？估计多久？什么时候开始？</span></div></li>
      <li><Footprints size={23}/><div><strong>离开屏幕，去行动</strong><span>学习、运动、见朋友都可以。准备好再开始计时。</span></div></li>
      <li><Leaf size={23}/><div><strong>回来记录，让小镇成长</strong><span>如实记录进展；完成后领 10 币，用来建设和照料。</span></div></li>
    </ol>
    <div className="guide-gift"><img src="/assets/miaomiao-coin.png" alt=""/><div><strong>{received?'今天的到访礼物 · 10 星球币已到账':'每天首次到访，自动收到 10 星球币'}</strong><span>不用连续打卡。不来的日子，也不会失去成长。</span></div></div>
    <p className="guide-reassurance">做了一部分、需要暂停或调整，都可以告诉小镇。这里没有倒计时惩罚。</p>
    <button className="primary-button full-width" onClick={onStart}>认识小乖，带我开始<ArrowRight size={18}/></button>
    <button className="text-button center" onClick={onSkip}>我想先自由逛逛</button>
  </div>;
}
export function NextStepGuide({state,today,onAction,onDismiss}){
  const step=nextGuideStep(state,today);
  const checkpoints=[['认识伙伴',state.greeted],['写下计划',state.tasks.length>0],['如实记录',state.tasks.some(t=>['done','partial'].includes(t.status))],['回顾用时',state.reflections.length>0]];
  return <div className="next-step-guide">
    <ol className="guide-checkpoints">{checkpoints.map(([text,done],index)=><li key={text} className={done?'done':''}>{done?<CheckCircle size={18} weight="fill"/>:<span>{index+1}</span>}{text}</li>)}</ol>
    <div className="guide-next"><span className="eyebrow">小乖陪你走下一步</span><h3>{step.title}</h3><p>{step.copy}</p><button className="primary-button full-width" onClick={()=>onAction(step)}>{step.action}<ArrowRight size={18}/></button></div>
    <p className="guide-reassurance">点击木平台移动，点伙伴或物件互动。三幕入口随时可进；完成任务不是探索的门槛。</p>
    <button className="text-button center" onClick={onDismiss}>收起新手提示，我自己试试</button><p className="guide-footnote">需要时，从右上角「？」重新打开新手指引。</p>
  </div>;
}
