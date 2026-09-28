import React, { useState } from 'react';
import { Leaf, Drop, Sparkle, PawPrint, Wrench, Check, ArrowRight, Eye, Heart } from '@phosphor-icons/react';
import { availableCareTargets, careRecord, careReason, CARE_LEVELS, careSpent } from '../shared/scene-care.js';
import { dayKey } from '../shared/calendar.js';
import { BUILD_SLOTS } from './game.js';
import './scene-care.css';
import { PlantGrowth, PlantPreview } from './PlantSprites';
import { plantHitbox } from '../shared/plant-render';

export function sceneTarget(target, state, position) {
  if (position) return { ...target, ...position };
  if (!target.itemId) return target;
  const building = state.buildings.find(b => b.itemId === target.itemId);
  const slot = BUILD_SLOTS.find(s => s.id === building?.slot);
  return { ...target, x: slot?.x ?? .5, y: (slot?.y ?? .5) - .045, floorY: slot?.y ?? .5 };
}
const IconFor = ({ target, ...props }) => target.kind === 'plant' ? <Leaf {...props} /> : target.kind === 'pet' ? <PawPrint {...props} /> : <Wrench {...props} />;
export function SceneCareLayer({ state, onOpen, disabled, hints, paused, effect, now }) {
  return <>
    {availableCareTargets(state).map(raw => {
      const target = sceneTarget(raw, state), record = careRecord(state, target.id);
      const hit = target.kind === 'plant' ? plantHitbox(target, record.careCount) : target;
      return <React.Fragment key={target.id}>
        {target.kind === 'plant' && <PlantGrowth target={target} count={record.careCount} watered={record.wateredAt != null && now - record.wateredAt < 5000} paused={paused} />}
        {(!target.itemId || target.kind === 'plant') && target.kind !== 'pet' && <button className={`scene-care-hotspot ${hints ? 'show-care-hint' : ''}`} disabled={disabled} style={{ left: `${hit.x * 100}%`, top: `${hit.y * 100}%`, width: `${hit.w * 100}%`, height: `${hit.h * 100}%`, zIndex: Math.min(47, Math.round(target.y * 100)) }} aria-label={`照料${target.name}`} onClick={() => onOpen(target)}>
          <span className="care-marker" aria-hidden="true"><IconFor target={target} size={15} weight="duotone" /></span><span className="care-hotspot-label">{target.name}{target.kind === 'plant' && record.careCount > 0 ? ` · ${CARE_LEVELS[record.careCount]}` : ''}</span>
        </button>}
      </React.Fragment>;
    })}
    {effect && <div key={effect.id} className={`scene-care-effect ${effect.verb} ${effect.target.kind} ${paused ? 'effect-static' : ''}`} style={{ left: `${effect.target.x * 100}%`, top: `${effect.target.y * 100}%` }} aria-hidden="true">
      {effect.verb === 'water' ? <><img className="watering-can" src="/assets/watering-can-v1.png" alt="" />{Array.from({ length: 12 }, (_, i) => <Drop key={i} className="water-particle" weight="fill" style={{ '--i': i, '--dx': `${(i % 4 - 1.5) * 9}px`, '--delay': `${i * .11}s` }} />)}<Leaf className="care-leaf-response" weight="duotone" /></> : Array.from({ length: 7 }, (_, i) => effect.target.kind === 'pet' ? <Heart key={i} weight="fill" className="care-spark" style={{ '--i': i }} /> : <Sparkle key={i} weight="fill" className="care-spark" style={{ '--i': i }} />)}
    </div>}
  </>;
}

function CarePreview({ target, level }) {
  if (target.kind === 'plant') return <div className="care-preview plant-stage-preview"><PlantPreview target={target} level={level} /><span className="care-stage-label"><Leaf size={15} />{CARE_LEVELS[level]}</span></div>;
  const separate = target.kind === 'pet' ? '/assets/xiaoguai.png' : target.itemId ? `/assets/${target.itemId}.png` : null;
  return <div className={`care-preview ${separate ? 'single-asset' : ''}`}><img className="care-preview-source" src={separate || '/assets/town-environment-bare-v2.png'} alt={target.name} style={separate ? undefined : { transform: `translate(-${target.x * 100}%, -${target.y * 100}%)` }} /></div>;
}

export function CareActions({ target, state, busy, now, onAction, onDirectory }) {
  const [confirm, setConfirm] = useState(false);
  const record = careRecord(state, target.id), level = Math.min(record.careCount, 3);
  const plant = target.kind === 'plant', reason = careReason(state, target, 'care', now);
  const cooled = !record.lastEvent || now - record.lastEvent.at >= 2500;
  return <div className="care-actions-content">
    <CarePreview target={target} level={level} />
    <p className="care-description">{plant ? '浇一点水，听叶子轻轻响。花费星球币施肥、修剪，会长出更多枝叶和花朵。' : target.kind === 'pet' ? '陪伴一直免费。也可以帮小乖梳梳毛，让它舒服地伸个懒腰。' : '小镇里熟悉的物件，也值得被认真打理。点一点互动，或花一点星球币照料它。'}</p>
    {plant && <ol className="growth-steps" aria-label={`成长阶段：${CARE_LEVELS[level]}`}>{CARE_LEVELS.map((name, index) => <li key={name} className={index <= level ? 'reached' : ''} aria-current={index === level ? 'step' : undefined}><Leaf size={16} weight={index <= level ? 'fill' : 'regular'} /><span>{name}</span></li>)}</ol>}
    <div className="care-wallet"><span>我的星球币</span><strong><img src="/assets/miaomiao-coin.png" alt="" />{state.coins}</strong></div>
    {confirm ? <section className="care-confirm" aria-label="确认照料费用"><h3>{plant ? `让花草长到「${CARE_LEVELS[Math.min(3, level + 1)]}」` : target.paidLabel}</h3><p>使用 <strong>{target.cost} 星球币</strong>，余额将变为 <strong>{Math.max(0, state.coins - target.cost)}</strong>。</p>{plant && <p>新增花叶会一直保留，换设备也能看到。</p>}<div className="care-confirm-buttons"><button className="secondary-button" disabled={busy} onClick={() => setConfirm(false)}>先不花币</button><button className="primary-button" disabled={busy || !!reason} onClick={() => onAction('care')}>{busy ? '正在照料…' : `确认照料 · ${target.cost} 星球币`}</button></div>{reason && <p className="care-status" role="status">{reason}</p>}</section> : <>
      <button className="care-action-option free" disabled={busy || !cooled} onClick={() => onAction(plant ? 'water' : 'interact')}><span className="care-action-icon">{plant ? <Drop size={25} weight="duotone" /> : <IconFor target={target} size={25} weight="duotone" />}</span><span><strong>{plant ? '浇水' : target.freeLabel}</strong><small>{!cooled ? '等这一小会儿结束，再来互动' : plant ? '水滴落下，叶子轻轻摇' : '听见小镇的一点回应'}</small></span><b>免费</b></button>
      <button className="care-action-option paid" disabled={busy || !!reason} onClick={() => setConfirm(true)}><span className="care-action-icon"><Sparkle size={25} weight="duotone" /></span><span><strong>{plant ? '照料 · 施肥修剪' : target.paidLabel}</strong><small>{plant ? level < 3 ? `长到「${CARE_LEVELS[level + 1]}」，更多花叶留下来` : '已经盛放，无需再花币' : '同一对象，每天只需照料一次'}</small></span><b>{target.cost} 币</b></button>
      {reason && <p className="care-status">{reason}</p>}
    </>}
    <p className="care-gentle">{record.caredAt != null ? `已经照料 ${record.careCount} 次 · 最近一次 ${dayKey(record.caredAt)}` : '按自己的心情照料，不用每天打卡。'}<br />{plant ? '没来照料也不会枯萎，成长不会倒退。' : '今天不打理，也不会影响小镇正常生活。'}</p>
    <button className="text-button center" disabled={busy} onClick={onDirectory}>看看小镇其他地方<ArrowRight size={16} /></button>
  </div>;
}

export function CareDirectory({ state, onOpen, onReveal, now }) {
  const [group, setGroup] = useState('plant');
  const targets = availableCareTargets(state), groups = [['plant','花草',Leaf],['pet','小乖',PawPrint],['facility','设施',Wrench]];
  return <>
    <p className="care-description">投入哪里，哪里就慢慢成长。也可以直接点场景里的花草和物件。</p>
    <div className="care-wallet"><span>我的星球币<small>累计用于照料 {careSpent(state.care)} 币</small></span><strong><img src="/assets/miaomiao-coin.png" alt="" />{state.coins}</strong></div>
    <div className="care-category-tabs" role="group" aria-label="照料分类">{groups.map(([value,label,Icon]) => <button key={value} aria-pressed={group === value} onClick={() => setGroup(value)}><Icon size={18} />{label}</button>)}</div>
    <div className="care-target-list">{targets.filter(t => t.kind === group).map(raw => {
      const target = sceneTarget(raw, state), record = careRecord(state, target.id), done = target.kind === 'plant' ? record.careCount >= 3 : record.caredAt != null && dayKey(record.caredAt) === dayKey(now);
      return <button key={target.id} onClick={() => onOpen(target)}><IconFor target={target} size={22} weight="duotone" /><span><strong>{target.name}</strong><small>{target.kind === 'plant' ? `${CARE_LEVELS[Math.min(record.careCount,3)]} · 浇水免费` : `${target.freeLabel} · 免费`}</small></span><b>{done ? <Check size={19} /> : `${target.cost} 币`}</b><ArrowRight size={16} /></button>;
    })}</div>
    <button className="secondary-button full-width" onClick={onReveal}><Eye size={19} />在场景中标出互动位置</button>
  </>;
}
