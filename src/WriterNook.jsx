import React, { useEffect, useState } from 'react';
import { BookOpen, LockSimple, Check, ArrowRight, Feather, Coins } from '@phosphor-icons/react';
import { manuscript, storyReason } from '../shared/story';
import './writer-nook.css';

export function WriterNook({ onOpen, paused, disabled }) {
  return <button className={`writer-nook${paused ? ' life-paused' : ''}`} onClick={onOpen} disabled={disabled} aria-label="拜访沈石溪，打开云端书屋">
    <img src="/assets/writer-nook-v1.png" alt="沈石溪的虚构游戏形象坐在藏书架旁构思" draggable="false" />
    <span className="writer-nook-label"><BookOpen weight="duotone"/><span><strong>沈石溪 · 云端书屋</strong><small>点开《奥莱》的手稿</small></span></span>
  </button>;
}
const bookNotes = [
  '阅读小问题：当期待落在一个生命身上时，爱与愿望之间会不会出现距离？',
  '阅读小问题：人的判断和动物的处境之间，有时会有哪些误会？',
  '阅读小问题：一个动物的记忆，会通过哪些行动被我们看见？',
  '阅读小问题：读到困境中的生命，你会留意它们怎样作出选择？',
];
export function StoryReader({ state, dispatch, busy }) {
  const [selected, setSelected] = useState(0), [confirm, setConfirm] = useState(false), [book, setBook] = useState(null);
  const chapter = manuscript.chapters[selected];
  const owned = !chapter.cost || (state.storyUnlocked || []).includes(chapter.id);
  const reason = owned ? '' : storyReason(state, chapter.id);
  const unlockedCount = 1 + (state.storyUnlocked || []).length;
  useEffect(() => { if (owned) setConfirm(false); }, [owned]);
  function select(index) { setSelected(index); setConfirm(false); }
  return <div className="story-reader">
    <p className="story-fiction-note">{manuscript.notice}</p>
    <section className="writer-shelf" aria-label="沈石溪代表作藏书架">
      <div className="writer-shelf-title"><BookOpen size={18}/><strong>藏书架 · 真实代表作</strong><span>点书名看看</span></div>
      <div className="writer-books">{manuscript.books.map((title,i) => <button key={title} aria-pressed={book === i} onClick={() => setBook(book === i ? null : i)}><BookOpen size={18} weight="duotone"/>《{title}》</button>)}</div>
      {book !== null && <div className="writer-book-note"><strong>《{manuscript.books[book]}》 · 沈石溪 著</strong><p>{bookNotes[book]}</p><small>书架展示书目信息与游戏阅读提问，不提供原书正文。<a href={manuscript.source} target="_blank" rel="noreferrer">书目来源：中国作家网</a></small></div>}
    </section>
    <div className="story-intro"><img src="/assets/aolai-cover-v1.png" alt="原创外星动物奥莱守护幼兽，身后是云海与浮岛"/><div><span className="story-overline">构思桌上的未完手稿</span><h3>{manuscript.title}</h3><p>虚构的书屋场景里，沈石溪 NPC 正在整理一份动物冒险手稿。那些空白页，等待你慢慢发现。</p><div className="story-tags"><span>正直</span><span>勇敢</span><span>懂得倾听</span></div><p className="story-progress">已展开 {unlockedCount} / {manuscript.chapters.length} 章 · 永久保留</p></div></div>
    <nav className="story-chapters" aria-label="奥莱手稿章节">{manuscript.chapters.map((c,i) => {
      const open = !c.cost || (state.storyUnlocked || []).includes(c.id);
      return <button key={c.id} aria-current={selected === i ? 'page' : undefined} onClick={() => select(i)} aria-label={`${c.title}，${open ? '可阅读' : `未解锁，${c.cost} 星球币`}`}><span>{i === 0 ? '序' : i === 6 ? '终' : `0${i}`}</span>{open ? <BookOpen size={15}/> : <LockSimple size={15}/>}<small>{c.theme}</small></button>;
    })}</nav>
    <article className={`manuscript-page${owned ? '' : ' manuscript-locked'}`} aria-label={chapter.title}>
      <div className="manuscript-meta"><Feather size={18}/><span>手稿 {String(selected+1).padStart(2,'0')} / 07</span><span>{owned ? chapter.cost ? '已解锁 · 可反复阅读' : '免费序章' : '尚未展开'}</span></div>
      <h4>{chapter.title}</h4><p className="chapter-teaser">{chapter.teaser}</p>
      {owned ? <><div className="manuscript-prose">{chapter.paragraphs.map((p,i) => <p key={i}>{p}</p>)}</div><aside className="story-field-note"><strong>观察笔记</strong><p>{chapter.fieldNote}</p></aside><div className="story-question"><Feather size={18}/><p>{chapter.question}</p></div><p className="story-reading-note">想一想就好，不必提交答案；也可以先合上书，去做自己的事。</p><div className="story-page-actions">{selected > 0 && <button className="text-button" onClick={() => select(selected-1)}>上一章</button>}{selected < manuscript.chapters.length-1 ? <button className="secondary-button" onClick={() => select(selected+1)}>翻到下一页<ArrowRight size={17}/></button> : <span><Check size={17}/>全部手稿已展开，随时欢迎回来重读。</span>}</div></> : <>
        <div className="manuscript-blank"><LockSimple size={28} weight="duotone"/><p>{chapter.blank}</p><span>这里留着几行空白，后面的故事尚未展开。</span><div className="manuscript-lines" aria-hidden="true"/></div>
        <div className="story-unlock"><div className="story-wallet"><Coins size={20} weight="duotone"/><span>我的星球币 <strong>{state.coins}</strong></span><span>本章 <strong>{chapter.cost}</strong> 币</span></div>
          {confirm && !reason ? <div className="story-confirm" role="group" aria-label="确认解锁手稿"><p>花费 <strong>{chapter.cost} 星球币</strong>展开这一章，之后可以一直重读。确认后余额为 {state.coins-chapter.cost} 币。</p><div><button className="secondary-button" disabled={busy} onClick={() => setConfirm(false)}>先不解锁</button><button className="primary-button" disabled={busy} onClick={() => dispatch({type:'UNLOCK_STORY',chapterId:chapter.id})}>{busy ? '正在保存…' : `确认解锁 · ${chapter.cost} 星球币`}</button></div></div> : <button className="primary-button" disabled={!!reason || busy} onClick={() => setConfirm(true)}><LockSimple size={17}/>解锁本章 · {chapter.cost} 星球币</button>}
          {reason && <p className="story-unlock-reason" role="status">{reason}</p>}<p className="story-reading-note">按顺序展开，每章只扣一次。没有限时，可以慢慢读。</p>
        </div>
      </>}
    </article>
  </div>;
}
