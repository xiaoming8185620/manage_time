import {WorkshopGrowthPanel,WorkshopGrowthDirectory} from './WorkshopGrowth';
import {growthItem} from '../shared/workshop-growth';
import React, { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { PawPrint, Leaf, Notebook, Hammer, Backpack, X, ArrowRight, ArrowLeft, Plus, Play, Pause, Check, CheckCircle, Clock, PencilSimple, MapPin, Wind, Sparkle, Question, CaretRight, ArrowCounterClockwise, Sun, Flag, Trophy, FloppyDisk, Footprints } from '@phosphor-icons/react';
import { ACHIEVEMENTS, BUILD_SLOTS, CATALOG, REWARD, SAVE_KEY, canWalk, elapsed, formatElapsed, gameReducer, loadGame, localDay, serializeState, validateTask } from './game';
import { CatCompanion, TownAtmosphere } from './TownLife';
import { SkyLife } from './SkyLife';
import { ANIMAL_SPOTS } from '../shared/animal-rewards';
import { SkyCoins, AnimalCoins } from './SkyCoins';
import { GreenhouseScene, HabitatShop } from './GreenhouseScene';
import { canWalkGreenhouse, HABITATS, ALL_HABITATS } from '../shared/greenhouse';
import { WorkshopScene, WorkshopShop, WorkshopBrief } from './WorkshopScene';
import { canWalkWorkshop, workshopDepth, workshopAdvice, WORKSHOP_HABITATS } from '../shared/workshop';
import { dropSpot } from '../shared/sky-rewards';
import { WriterNook, StoryReader } from './WriterNook';
import { PlayerCharacter } from './PlayerCharacter';
import { ScenePlanEntrance } from './ScenePlanEntrance';
import { SceneMusic } from './SceneMusic';
import { SceneCareLayer, CareActions, CareDirectory, sceneTarget } from './SceneCare';
import { careTarget, careRecord, careReason, CARE_LEVELS } from '../shared/scene-care';
import { uniqueId, exportLocalSave } from './family-api';
import { taskDay } from '../shared/calendar';
import './town-life.css';
import { useTownWeather, WeatherChip, WeatherDetails, WeatherAtmosphere } from './TownWeather';
import { weatherView } from '../shared/weather';
import './journey.css';
import './scene-scale.css';
import { MOTION_KEY, readMotionPreference, motionEnabled as resolveMotion } from '../shared/motion';

const A = '/assets/';
function Coin({ className = '' }) { return <img className={`coin-image ${className}`} src={`${A}miaomiao-coin.png`} alt="" />; }
const taskStatus = { planned: '已安排', active: '进行中', paused: '已暂停', partial: '已有进展', done: '已完成' };
const freshTime = () => { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
function Dialog({ title, eyebrow, children, onClose, className = '', icon: Icon = Notebook }) {
  const box = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const el = box.current;
    const first = el?.querySelector('input:not([type=hidden]), button, textarea, select');
    first?.focus({ preventScroll: true });
    function trap(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll('button:not(:disabled), input:not(:disabled), select, textarea, a[href], [tabindex="0"]')].filter(n => n.offsetParent !== null);
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
    }
    el?.addEventListener('keydown', trap);
    return () => { el?.removeEventListener('keydown', trap); previous?.focus?.({ preventScroll: true }); };
  }, []);
  return <div className="dialog-scrim" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={box}>
      <header className="dialog-header"><div className="dialog-icon"><Icon size={29} weight="duotone" /></div><div><div className="eyebrow">{eyebrow || '星球悬浮小镇'}</div><h2>{title}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="关闭面板"><X size={22} /></button></header>
      <div className="dialog-content">{children}</div>
    </section>
  </div>;
}

export function App({ cloud, onJournal }) {
  const [boot] = useState(() => cloud ? { state: cloud.state, corrupt: false } : loadGame(window.localStorage));
  const [localState, localDispatch] = useReducer(gameReducer, boot.state);
  const state = cloud?.state || localState, dispatch = cloud?.dispatch || localDispatch;
  const [panel, setPanel] = useState(null);
  const [scene, setScene] = useState('town');
  const [roomPositions, setRoomPositions] = useState({greenhouse:{x:.38,y:.60},workshop:{x:.49,y:.67}});
  const boyPosition = scene === 'town' ? state.boy : roomPositions[scene];
  const sceneTitle = {town:'星球悬浮小镇',greenhouse:'云顶温室',workshop:'星核机械港'}[scene];
  const careTitle = {town:'照料小镇',greenhouse:'照料温室',workshop:'维护机械港'}[scene];
  const shopType = {town:'build',greenhouse:'habitats',workshop:'workshop-build'}[scene];
  const roomHabitatItems = scene === 'workshop' ? WORKSHOP_HABITATS : HABITATS;
  function movePlayer(position) { if (scene !== 'town') setRoomPositions(all=>({...all,[scene]:position})); else dispatch({type:'MOVE',position}); }
  const [journeyExpanded, setJourneyExpanded] = useState(false);
  const weather = useTownWeather();
  const [careHints, setCareHints] = useState(false);
  const [careEffect, setCareEffect] = useState(null);
  const [careWaiting, setCareWaiting] = useState(false);
  const carePending = useRef(null);
  const [toast, setToast] = useState('');
  const [saveError, setSaveError] = useState(boot.unavailable || false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [planDay, setPlanDay] = useState(localDay());
  const today = localDay(new Date(now));
  useEffect(() => setPlanDay(today), [today]);
  const planTasks = state.tasks.filter(task => taskDay(task) === planDay);
  const carryTasks = planDay === today ? state.tasks.filter(task => taskDay(task) < today && task.status !== 'done') : [];
  const visibleTasks = [...planTasks, ...carryTasks];
  const [moving, setMoving] = useState(false);
  const [walkDuration, setWalkDuration] = useState(0);
  const [direction, setDirection] = useState('left');
  const [petSignal, setPetSignal] = useState(0);
  const [petMood, setPetMood] = useState('play');
  const catPosition = useRef({ x: .4, y: .62 });
  const [catVisit, setCatVisit] = useState(null);
  const [motionPreference, setMotionPreference] = useState(() => readMotionPreference(window.localStorage));
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [placement, setPlacement] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const [freshBuilding, setFreshBuilding] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(1200);
  const moveTimer = useRef();
  const boyMotion = useRef(null);
  const suspendedJourney = useRef(null);
  const [pickup, setPickup] = useState(null);
  const pickupRef = useRef(null);
  function selectPickup(value) {pickupRef.current=value;setPickup(value);}

  const toastTimer = useRef();
  const skyEarned = useRef((state.skyRewards?.earned || 0)+(state.animalRewards?.earned || 0));
  const animalPending = useRef(state.animalRewards?.pending.length || 0);
  const skyPending = useRef(state.skyRewards?.pending.length || 0);
  useEffect(() => {
    const earned = (state.skyRewards?.earned || 0)+(state.animalRewards?.earned || 0);
    const pending = state.skyRewards?.pending.length || 0;
    if (earned > skyEarned.current) notify('拾到星球币啦 · +1 星球币');
    else if (pending > skyPending.current) notify('云晶采集落下了一枚星球币，落稳后点它，让我去捡吧。');
    else if ((state.animalRewards?.pending.length || 0) > animalPending.current) notify('动物伙伴留下了一枚星球币，点它就能走过去拾取。');
    animalPending.current = state.animalRewards?.pending.length || 0;
    skyEarned.current = earned;
    skyPending.current = pending;
  }, [state.skyRewards, state.animalRewards]);
  useEffect(() => { if (panel || placement) setJourneyExpanded(false); }, [panel, placement]);
  const motionEnabled = resolveMotion(motionPreference, reducedMotion);
  function chooseMotion(preference) {
    setMotionPreference(preference);
    try { window.localStorage.setItem(MOTION_KEY, preference); } catch { /* Apply for this session if storage is unavailable. */ }
  }
  const motionLabel = motionEnabled ? '暂停小镇动态' : motionPreference === 'system' && reducedMotion ? '开启小镇动态（当前跟随系统减少动态）' : '开启小镇动态';
  const lifePaused = !ready || !motionEnabled || !pageVisible || !!panel || !!placement || !!cloud?.paused;
  const activeTask = state.tasks.find(t => t.status === 'active');
  const unclaimed = state.tasks.find(t => t.status === 'done' && !t.rewardClaimed);
  const unfinished = state.tasks.find(t => t.status !== 'done' && taskDay(t) <= today);
  const lastDone = [...state.tasks].reverse().find(t => t.status === 'done');
  const reflected = lastDone && state.reflections.some(r => r.taskId === lastDone.id);

  useEffect(() => {
    const files = ['town-environment-bare-v3.png', 'boy-greetings.png', 'boy-walk-forward.png', 'boy-walk-reverse.png', 'xiaoguai.png', 'cat-tree.png', 'flowerbed.png', 'miaomiao-coin.png', 'title-frame.png', 'dialogue-frame.png', 'xiaoguai-trot.png', 'cloud-drift.png', 'flowerbed-bare-v2.png', 'plant-vine-stages-v2.png', 'plant-foliage-stages-v2.png', 'plant-canopy-stages-v2.png', 'watering-can-v1.png', 'greenhouse-base-v1.png', 'greenhouse-plants-a-v1.png', 'greenhouse-plants-b-v1.png', 'greenhouse-animals-v1.png', 'greenhouse-habitats-v1.png', 'greenhouse-parrot-perched-v1.png', 'plan-terminal-v1.png', 'workshop-supply-base-v1.png', 'workshop-supply-dock-v1.png', 'workshop-supply-arm-v1.png', 'workshop-supply-pod-v1.png', 'workshop-supply-lift-v1.png', 'workshop-supply-crate-v1.png', 'workshop-dog-walk-v1.png', 'workshop-earth-v1.png', 'workshop-machines-v1.png', 'workshop-buildings-v1.png'];
    let alive = true;
    Promise.all(files.map(file => new Promise((resolve, reject) => { const im = new Image(); im.onload = resolve; im.onerror = reject; im.src = A + file; }))).then(() => alive && setReady(true)).catch(() => alive && setLoadError(true));
    return () => { alive = false; };
  }, []);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (cloud) return;
    if (boot.corrupt) return;
    try { window.localStorage.setItem(SAVE_KEY, serializeState(state)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [state, !!cloud]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => () => { clearTimeout(moveTimer.current); clearTimeout(toastTimer.current); }, []);
  useLayoutEffect(() => {
    if (!lifePaused) {
      const journey=suspendedJourney.current;
      suspendedJourney.current=null;
      if(journey)walkTo(journey.to.x,journey.to.y,false,journey.onArrive,journey.pickup);
      return;
    }
    const canResume=cloud?.paused && !panel && !placement && pageVisible && motionEnabled;
    const motion=boyMotion.current;
    if (motion) {
      suspendedJourney.current=canResume?{to:motion.to,onArrive:motion.onArrive,pickup:pickupRef.current}:null;
      movePlayer(currentBoyPosition());
    }
    if(!canResume){suspendedJourney.current=null;selectPickup(null);}
    clearTimeout(moveTimer.current);
    boyMotion.current = null;
    setWalkDuration(0);
    setMoving(false);
  }, [lifePaused, !!cloud?.paused, panel, placement, pageVisible, motionEnabled]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => setReducedMotion(media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  function notify(message) { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4200); }
  function openCare(target, position) {
    setPanel({ type: 'care', target: sceneTarget(target.id === 'ws-brain' ? {...target,reply:workshopAdvice(state,today)} : target, state, position) });
  }
  function performCare(verb, target = panel?.target) {
    if (carePending.current) return;
    const reason = careReason(state, target, verb);
    if (reason) { notify(reason); return; }
    const careId = uniqueId();
    carePending.current = { careId, target, verb, sourceState: state, sawPause: false };
    setCareWaiting(true);
    dispatch({ type: 'CARE_SCENE', targetId: target.id, verb, careId, expectedCount: careRecord(state, target.id).careCount });
  }
  useEffect(() => {
    const pending = carePending.current;
    if (!pending) return;
    if (cloud?.paused) pending.sawPause = true;
    const record = careRecord(state, pending.target.id);
    if (record.lastEvent?.id === pending.careId) {
      carePending.current = null;
      setCareWaiting(false);
      setPanel(null);
      setCareEffect({ id: pending.careId, target: pending.target.id === 'xiaoguai' ? { ...pending.target, ...catPosition.current } : pending.target, verb: pending.verb });
      if (pending.target.id === 'xiaoguai') { setPetMood(pending.verb === 'care' ? 'groom' : 'play'); setPetSignal(value => value + 1); }
      notify(pending.verb === 'water' ? `${pending.target.name}喝到水啦，叶子轻轻摇了摇。` : pending.verb === 'care' ? pending.target.kind === 'plant' ? `−${pending.target.cost} 星球币 · ${pending.target.name}长到「${CARE_LEVELS[record.careCount]}」，新花叶留下来了。` : `−${pending.target.cost} 星球币 · ${pending.target.careReply || `${pending.target.name}已经打理好啦。`}` : pending.target.reply || '小镇轻轻回应了你。');
    } else if (!cloud?.paused && (state !== pending.sourceState || pending.sawPause || !cloud)) {
      carePending.current = null;
      setCareWaiting(false);
      notify('这次操作没有新增扣币，看看最新状态再来吧。');
    }
  }, [state, cloud?.paused, careWaiting]);
  useEffect(() => {
    if (!careEffect) return;
    const timer = setTimeout(() => setCareEffect(null), 3600);
    return () => clearTimeout(timer);
  }, [careEffect]);
  function currentBoyPosition() {
    const motion = boyMotion.current;
    if (!motion) return boyPosition;
    const progress = Math.min(1, (performance.now() - motion.start) / motion.duration);
    return { x: motion.from.x + (motion.to.x - motion.from.x) * progress, y: motion.from.y + (motion.to.y - motion.from.y) * progress };
  }
  function walkTo(x, y, force = false, onArrive, intent = null) {
    if ((!(scene === 'workshop' ? canWalkWorkshop(x,y) : scene === 'greenhouse' ? canWalkGreenhouse(x,y) : canWalk(x,y)) && !force) || placement) return;
    const from = currentBoyPosition();
    const distance = Math.hypot(x - from.x, (y - from.y) * 1058 / 1487);
    clearTimeout(moveTimer.current); suspendedJourney.current=null; selectPickup(intent);
    const arrive=()=>{boyMotion.current=null;setMoving(false);onArrive?.();selectPickup(null);};
    if (distance < .001) {setWalkDuration(0);arrive();return;}
    if (Math.abs(x - from.x) > .001) setDirection(x > from.x ? 'right' : 'left');
    const duration = lifePaused ? 0 : Math.max(80, Math.round(distance / .12 * 1000));
    boyMotion.current = duration ? { from, to: { x, y }, start: performance.now(), duration, onArrive } : null;
    setWalkDuration(duration);
    movePlayer({x,y});
    setMoving(duration > 0);
    if (duration) moveTimer.current = setTimeout(arrive, duration);
    else arrive();
  }
  function pickupCoin(id, source='sky') {
    if (!ready || panel || placement || cloud?.paused || (pickupRef.current?.id===id && pickupRef.current?.source===source)) return;
    const coin=source==='animal'?state.animalRewards?.pending.find(c=>c.id===id):state.skyRewards?.pending.includes(id);
    if(!coin)return;
    const point = source==='animal'?ANIMAL_SPOTS[coin.spot]:dropSpot(id);
    walkTo(point.x, point.y, false, () => dispatch({type:source==='animal'?'PICKUP_ANIMAL_COIN':'PICKUP_SKY_COIN',id}),{source,id});
  }
  useEffect(() => {
    function keys(e) {
      if (panel || placement || !ready || (e.target.closest('input, textarea, button, select') && !e.target.closest('.player-character'))) return;
      const changes = { ArrowLeft: [-.02, 0], a: [-.02, 0], ArrowRight: [.02, 0], d: [.02, 0], ArrowUp: [0, -.014], w: [0, -.014], ArrowDown: [0, .014], s: [0, .014] };
      if (changes[e.key]) { e.preventDefault(); const [dx, dy] = changes[e.key], from = currentBoyPosition(); walkTo(from.x + dx, from.y + dy); }
    }
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [boyPosition, scene, state.greeted, panel, placement, ready, lifePaused]);
  function openPlan() {
    if (!state.greeted && scene === 'town') { greet(); return; }
    if (scene === 'town') walkTo(.535, .50, true);
    setPanel({ type: 'plan' });
  }
  function greet() {
    if (!state.greeted) {
      walkTo(.482, .624, true);
      dispatch({ type: 'GREET' });
      notify('认识了小乖 · 云端新朋友');
    } else notify(lifePaused ? '小乖安静地陪着你。它很高兴你在这里。' : petSignal % 2 ? '小乖蹭了蹭你的手。它很高兴你在这里。' : '小乖开心地蹦了一下，想陪你玩一会儿。');
    setPetSignal(value => value + 1);
  }
  function startTask(id) {
    dispatch({ type: 'START_TASK', id });
    setPanel({ type: 'focus', id });
  }
  function claim(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task || task.rewardClaimed || task.status !== 'done') return;
    dispatch({ type: 'CLAIM_REWARD', id });
    notify('收到 10 星球币，每一步都在让小镇成长。');
    setPanel({ type: shopType });
  }
  function chooseBuild(item) {
    if (state.coins < item.cost) { notify('先推进一个现实小目标，回来领取星球币吧。'); return; }
    const free = BUILD_SLOTS.find(s => !state.buildings.some(b => b.slot === s.id));
    if (!free) return;
    setPlacement(item.id); setSlotId(free.id); setPanel(null);
  }
  function build() {
    const item = CATALOG.find(i => i.id === placement);
    if (!item || state.coins < item.cost || !slotId) return;
    dispatch({ type: 'BUILD', itemId: item.id, slot: slotId });
    const slot = BUILD_SLOTS.find(s => s.id === slotId);
    setFreshBuilding(item.id); setTimeout(() => setFreshBuilding(null), 1600);
    setPlacement(null); setSlotId(null);
    setCatVisit({ ...slot, at: Date.now() });
    setPanel({ type: 'built', itemId: item.id });
  }
  function changeScene(next) {
    if (!['town','greenhouse','workshop'].includes(next) || !ready || cloud?.paused || panel || placement) return;
    movePlayer(currentBoyPosition());
    suspendedJourney.current=null; selectPickup(null);
    clearTimeout(moveTimer.current); boyMotion.current=null; setMoving(false); setWalkDuration(0);
    setCareEffect(null); setCareHints(false); setJourneyExpanded(false); setToast(''); setScene(next);
  }
  const activePanelTask = panel?.id ? state.tasks.find(t => t.id === panel.id) : null;
  const selectedItem = CATALOG.find(i => i.id === placement);

  return <main className="game-shell">
    <div ref={stageRef} className={`game-stage ${scene === 'town' ? '' : `${scene}-stage`} ${placement ? 'is-placing' : ''} ${motionPreference === 'on' ? 'motion-opt-in' : ''}`} style={{ '--unit': `${stageWidth / 1487}px` }} aria-label={scene === 'town' ? '星球悬浮小镇，悬浮平台' : `${scene === 'greenhouse' ? '第二' : '第三'}幕，${sceneTitle}`}>
      {scene === 'town' && <>
      <img className="world-background" src={`${A}town-environment-bare-v3.png`} alt="云海中的生态悬浮小镇，温暖的小屋、太阳能板和一片等待建设的平台" draggable="false" />
      <TownAtmosphere paused={lifePaused} />
      <SkyLife paused={lifePaused} attempts={state.skyRewards?.attempts || 0} onCollection={attempt => dispatch({type:'COLLECT_CRYSTAL',attempt,...(!cloud ? {roll:Math.random()} : {})})} />
      <WriterNook paused={lifePaused} disabled={!ready || !!panel || !!placement} onOpen={() => setPanel({ type: 'story' })} />
      </>}
      {scene === 'greenhouse' && <GreenhouseScene state={state} paused={lifePaused} disabled={!!panel || !!placement || !ready} onOpen={openCare} hints={careHints && !panel} effect={!panel && pageVisible ? careEffect : null} now={now} onAnimalDrop={(animal,attempt)=>dispatch({type:'ANIMAL_DROP',animal,attempt,...(!cloud?{roll:Math.random(),spotRoll:Math.random()}:{})})}/>}
      {scene === 'workshop' && <WorkshopScene state={state} paused={lifePaused} disabled={!!panel || !!placement || !ready} onOpen={openCare} hints={careHints && !panel} effect={!panel && pageVisible ? careEffect : null} now={now}/>}
      <div className="walk-surface" aria-label="点击场地移动角色，也可使用方向键" onPointerDown={e => {
        if (panel || !ready) return;
        const rect = stageRef.current.getBoundingClientRect();
        walkTo((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
      }} />

      <ScenePlanEntrance disabled={!ready || !!panel || !!placement} onOpen={openPlan} />
      {scene === 'town' && <>
      <SceneCareLayer state={state} onOpen={openCare} disabled={!!panel || !!placement || !ready} hints={careHints && !panel && !placement} paused={lifePaused} effect={!panel && !placement && pageVisible ? careEffect : null} now={now} />
      {state.buildings.map(b => { const item = CATALOG.find(i => i.id === b.itemId), slot = BUILD_SLOTS.find(s => s.id === b.slot); return <button key={b.itemId} className={`world-building ${b.itemId} ${freshBuilding === b.itemId ? 'just-built' : ''}`} style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, zIndex: Math.round(slot.y * 100) }} aria-label={`查看${item.shortName}`} onClick={() => openCare(careTarget(`built-${b.itemId}`))}><img src={item.id === 'flowerbed' ? `${A}flowerbed-bare-v2.png` : item.image} alt={item.shortName} draggable="false" /><span className="world-label">{item.shortName}</span></button>; })}
      </>}
      <PlayerCharacter position={boyPosition} depthScale={scene === 'workshop' ? workshopDepth(boyPosition.y) : 1} moving={moving} walkDuration={walkDuration} direction={direction} paused={lifePaused} ready={ready} blocked={!!panel || !!placement || !ready} greeted={state.greeted} taskActive={!!activeTask} />
      {scene === 'greenhouse' && <AnimalCoins habitats={state.habitats} pending={state.animalRewards?.pending} paused={lifePaused} disabled={!ready || !!panel || !!placement || !!cloud?.paused} selectedId={pickup?.source==='animal'?pickup.id:null} onPickup={id=>pickupCoin(id,'animal')}/>}
      {scene === 'town' && <>
      <SkyCoins pending={state.skyRewards?.pending} paused={lifePaused} disabled={!ready || !!panel || !!placement || !!cloud?.paused} selectedId={pickup?.source==='sky'?pickup.id:null} onPickup={id=>pickupCoin(id)}/>
      <CatCompanion boy={state.boy} greeted={state.greeted} paused={lifePaused} buildings={state.buildings} petSignal={petSignal} petMood={petMood} positionRef={catPosition} visitSignal={catVisit} onPet={position => state.greeted ? performCare('interact', sceneTarget(careTarget('xiaoguai'), state, position)) : greet()} onCare={position => openCare(careTarget('xiaoguai'), position)} />

      <WeatherAtmosphere view={weatherView(weather.data, now)} paused={lifePaused} />
      </>}
      {!panel && !placement && (scene === 'town' ? [{to:'greenhouse',className:'portal-to-greenhouse',label:'进入第二幕：云顶温室（免费）',text:'云顶温室'}] : scene === 'greenhouse' ? [{to:'town',className:'portal-to-town',label:'返回第一幕：星球悬浮小镇',text:'回小镇'},{to:'workshop',className:'portal-to-workshop',label:'进入第三幕：星核机械港（免费）',text:'星核机械港'}] : [{to:'greenhouse',className:'portal-workshop-return',label:'返回第二幕：云顶温室',text:'回温室'}]).map(portal=><button key={portal.to} className={`scene-portal ${portal.className}`} disabled={!ready || !!cloud?.paused} aria-label={portal.label} onClick={()=>changeScene(portal.to)}><span>{portal.text}<ArrowRight size={15}/></span></button>)}
      {!panel && !placement && <WeatherChip {...weather} now={now} onOpen={() => setPanel({ type: 'weather' })} />}
      <header className="game-hud">
        <div className="town-sign"><PawPrint size={30} weight="fill" /><div><h1>{sceneTitle}</h1><span>把每一小步，变成喜欢的生活</span></div><Leaf className="sign-leaf" size={23} weight="duotone" /></div>
        <div className="hud-right"><button className="balance" aria-label={`星球币余额 ${state.coins}，查看背包`} onClick={() => setPanel({ type: 'bag' })}><Coin /><strong>{state.coins}</strong><span>星球币</span></button><SceneMusic scene={scene} dimmed={!!panel || !!placement}/><button className="help-button motion-toggle" aria-label={motionLabel} aria-pressed={motionEnabled} title={motionLabel} onClick={() => chooseMotion(motionEnabled ? 'off' : 'on')}>{motionEnabled ? <Wind size={23} /> : <Pause size={20} />}</button><button className="help-button" aria-label="查看玩法与存档说明" onClick={() => setPanel({ type: 'help' })}><Question size={24} weight="duotone" /></button></div>
      </header>
      <div className="day-mark"><Sun weight="duotone" size={16} />{scene === 'workshop' ? '第三幕 · 星核机械港，准备下一次出发' : scene === 'greenhouse' ? '第二幕 · 在云端，万物慢慢生长' : state.buildings.length ? '云端，正慢慢长成你喜欢的样子' : localDay(new Date(state.createdAt)) === today ? '第一天 · 初到云端' : `${today.slice(5).replace('-', '月')}日 · 回到云端`}</div>

      {placement && <>
        <div className="placement-title"><MapPin size={19} />为{selectedItem.shortName}选一个位置</div>
        {BUILD_SLOTS.filter(s => !state.buildings.some(b => b.slot === s.id)).map(s => <button key={s.id} aria-label={`选择位置：${s.name}`} aria-pressed={slotId === s.id} className={`build-slot ${slotId === s.id ? 'selected' : ''}`} style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }} onClick={() => setSlotId(s.id)}>{slotId === s.id ? <img src={selectedItem.image} alt={`${selectedItem.shortName}摆放预览`} /> : <MapPin size={30} weight="duotone" />}<span>{s.name}</span></button>)}
        <div className="placement-controls paper-panel"><button className="secondary-button" onClick={() => { setPlacement(null); setPanel({ type: 'build' }); }}><ArrowLeft size={18} />再想想</button><div><strong>{selectedItem.shortName}</strong><span><Coin />{selectedItem.cost} 星球币 · 确认后建造</span></div><button className="primary-button" onClick={build}><Check size={19} weight="bold" />就放这里</button></div>
      </>}

      {!panel && !placement && <>
        {!state.greeted && scene === 'town' ? <section className="intro-dialog paper-panel"><div className="dialog-kicker"><PawPrint weight="duotone" size={18} />你的云端故事，从这里开始</div><p>小乖在等你，和它打个招呼吧。</p><button className="primary-button intro-action" onClick={greet}><PawPrint weight="fill" size={22} />认识小乖</button></section> : <>
          <button className="journey-toggle" aria-expanded={journeyExpanded} aria-controls="journey-card" onClick={() => setJourneyExpanded(value => !value)}><Flag size={18} weight="duotone" />今天的一小步{journeyExpanded ? <X size={16} /> : <CaretRight size={16} />}</button>
          {journeyExpanded && <section id="journey-card" className="journey-card paper-panel">
            <div className="eyebrow"><Flag size={14} weight="duotone" />今天的一小步</div>
            {activeTask ? <><strong>{activeTask.title}</strong><p>开始至今 <b>{formatElapsed(elapsed(activeTask, now))}</b></p><button className="text-button" onClick={() => setPanel({ type: 'focus', id: activeTask.id })}>回来记录进展<ArrowRight size={16} /></button></> : unclaimed ? <><strong>这个小目标，完成了</strong><p>领取星球币，让小镇发生一点变化。</p><button className="text-button" onClick={() => setPanel({ type: 'reward', id: unclaimed.id })}>领取 10 星球币<ArrowRight size={16} /></button></> : !state.tasks.some(t => taskDay(t) === today) && !unfinished ? <><strong>先安排一件想做的事</strong><p>一个小目标，就够让今天开始。</p><button className="text-button" onClick={openPlan}>打开今日计划<ArrowRight size={16} /></button></> : state.coins >= 10 && (scene !== 'town' ? roomHabitatItems.some(item=>!state.habitats?.includes(item.id)) : !state.buildings.length) ? <><strong>为{scene === 'workshop' ? '机械港' : scene === 'greenhouse' ? '温室' : '小镇'}添一点喜欢</strong><p>{scene === 'workshop' ? '给小巡和星梭添一处休息与检修的角落。' : scene === 'greenhouse' ? '枝桠乐园还是暖石休憩角？由你决定。' : '猫爬架还是小花圃？由你决定。'}</p><button className="text-button" onClick={() => setPanel({ type: shopType })}>去看看建设<ArrowRight size={16} /></button></> : unfinished ? <><strong>{unfinished.title}</strong><p>{unfinished.status === 'partial' ? '已经走出了一小步，按自己的节奏继续。' : `${unfinished.startTime || '今天'} · 预计 ${unfinished.estimate} 分钟`}</p><button className="text-button" onClick={openPlan}>查看这件事<ArrowRight size={16} /></button></> : <><strong>{reflected ? '今天的成长，留在这里了' : '你已经让小镇有了变化'}</strong><p>{reflected ? '可以陪小乖逛逛，也可以安心休息。' : '回想一下，今天的用时和预计一样吗？'}</p><button className="text-button" onClick={() => setPanel({ type: reflected ? 'bag' : 'reflection', id: lastDone?.id })}>{reflected ? '看看小镇手记' : '用一句话回顾'}<ArrowRight size={16} /></button></>}
          </section>}
          <nav className="bottom-nav" aria-label="小镇功能"><button onClick={openPlan}><Notebook weight="duotone" /><span>今日计划</span>{activeTask && <span className="activity-dot" />}</button><button onClick={() => setPanel({ type: shopType })}><Hammer weight="duotone" /><span>建设</span></button><button onClick={() => setPanel({ type: 'bag' })}><Backpack weight="duotone" /><span>背包</span></button></nav>
        </>}
        <div className="movement-hint"><Footprints size={14} />点击场地移动 · 点物件或伙伴互动</div>
      </>}
      {!panel && !placement && <button className="secondary-button care-launch" onClick={() => setPanel({ type: 'care-directory' })}><Leaf size={18} weight="duotone" />{careTitle}</button>}
      {careHints && !panel && !placement && <button className="care-hints-close" onClick={() => setCareHints(false)}>收起互动标记</button>}
      {onJournal && !panel && !placement && <button className="secondary-button journal-launch" onClick={onJournal}><Notebook size={18} />成长手记</button>}
      {toast && <div className="toast" role="status"><CheckCircle size={20} weight="fill" />{toast}</div>}
      {saveError && <div className="save-warning" role="alert">浏览器暂时无法保存进度，请保持当前页面打开。</div>}
      {boot.corrupt && <div className="save-warning" role="alert">原存档无法读取，已保留原数据；当前体验不会覆盖它。</div>}
      {!ready && <div className="loading-scene"><PawPrint size={40} weight="duotone" /><h2>{loadError ? '云端暂时没有连上' : '小乖正在等你'}</h2><p>{loadError ? '场景素材没有加载完整，请重新载入。' : '正在准备你的小镇…'}</p>{loadError && <button className="primary-button" onClick={() => location.reload()}>重新载入</button>}</div>}
    </div>

    {panel?.type === 'workshop-build' && <Dialog title="让机械港慢慢成长" eyebrow="星核机械港 · 共用星球币" icon={Hammer} onClose={()=>setPanel(null)}><WorkshopGrowthDirectory state={state} onOpen={id=>openCare(careTarget(id))}/></Dialog>}
    {panel?.type === 'habitats' && <Dialog title="给伙伴添一个角落" eyebrow="云顶温室 · 共用星球币" icon={Leaf} onClose={()=>setPanel(null)}><HabitatShop state={state} dispatch={dispatch} busy={!!cloud?.paused}/></Dialog>}
    {panel?.type === 'weather' && <Dialog title="杭州的天空" icon={Sun} onClose={() => setPanel(null)}><WeatherDetails {...weather} now={now} /></Dialog>}
    {panel?.type === 'story' && <Dialog title="沈石溪的云端书屋" eyebrow="坐一会儿，翻开一个关于勇气的故事" icon={Notebook} className="story-dialog" onClose={() => setPanel(null)}><StoryReader state={state} dispatch={dispatch} busy={!!cloud?.paused}/></Dialog>}
    {panel?.type === 'care-directory' && <Dialog title={careTitle} eyebrow="一点关心，一点看得见的成长" icon={Leaf} onClose={() => setPanel(null)}><CareDirectory scene={scene} state={state} now={now} onOpen={openCare} onReveal={() => { setCareHints(true); setPanel(null); }} /></Dialog>}
    {panel?.type === 'care' && <Dialog title={panel.target.name} eyebrow="留一点时间，照顾喜欢的生活" icon={panel.target.kind === 'pet' ? PawPrint : Leaf} onClose={() => !careWaiting && setPanel(null)}>{panel.target.id === 'ws-brain' && <WorkshopBrief state={state} today={today} onPlan={openPlan}/>}{growthItem(panel.target.id)?<WorkshopGrowthPanel key={panel.target.id} target={panel.target} state={state} busy={careWaiting||!!cloud?.paused} onDispatch={dispatch} onFree={performCare} onClose={()=>setPanel(null)}/>:<CareActions key={panel.target.id} target={panel.target} state={state} now={now} busy={careWaiting} onAction={performCare} onDirectory={() => setPanel({ type: 'care-directory' })} />}</Dialog>}
    {panel?.type === 'plan' && <Dialog title={planDay === today ? '今日计划' : '这一天的安排'} eyebrow="给今天留一点自己的节奏" onClose={() => setPanel(null)}>
      <label className="plan-date-picker">安排日期<input aria-label="安排日期" type="date" value={planDay} onChange={e => e.target.value && setPlanDay(e.target.value)} /></label>
      <div className="section-intro"><p>先做一件小事，也很好。</p><span>把目标写具体，再估一估用时。休息、运动和见朋友，都可以安排进来。</span></div>
      {carryTasks.length > 0 && <p className="plan-carry-note">另有 {carryTasks.length} 件之前的小事还可以继续，它们保留原来的安排日期。</p>}
      <div className="task-list">{!visibleTasks.length ? <div className="empty-state"><Notebook size={40} weight="duotone" /><h3>这一天的第一页，等你来写</h3><p>比如读十页书、数学前六题，<br />或是出门活动一会儿。</p></div> : visibleTasks.map(task => <article className={`task-row ${task.status}`} key={task.id}><div className="task-row-top"><span className="task-category">{task.category || '学习'}</span><span className={`status-label ${task.status}`}>{taskStatus[task.status]}</span></div><h3>{task.title}</h3><div className="task-meta"><Clock size={15} />{taskDay(task) !== planDay && `${taskDay(task)} · `}{task.startTime || '今天'}<span>·</span>预计 {task.estimate} 分钟{task.status === 'done' && <span>· 实际 {task.actualMinutes} 分钟</span>}</div>{task.note && <p className="task-note">{task.note}</p>}<div className="task-actions">{task.status === 'done' ? task.rewardClaimed ? <span className="reward-claimed"><Check size={16} />星球币已领取</span> : <button className="small-primary" onClick={() => setPanel({ type: 'reward', id: task.id })}><Coin />领取 10 星球币</button> : <><button className="small-primary" onClick={() => task.status === 'active' ? setPanel({ type: 'focus', id: task.id }) : startTask(task.id)}>{task.status === 'active' ? <Notebook size={16} /> : <Play size={16} weight="fill" />}{task.status === 'active' ? '记录进展' : task.status === 'planned' ? '现在开始' : '继续这一段'}</button><button className="text-button subtle" onClick={() => setPanel({ type: 'task-form', id: task.id })}><PencilSimple size={16} />调整安排</button></>}</div></article>)}</div>
      <button className="primary-button full-width" onClick={() => setPanel({ type: 'task-form' })}><Plus size={19} />安排一件事</button><div className="gentle-note"><Leaf size={17} weight="duotone" />给自己留些空白，不需要把今天填满。</div>
    </Dialog>}
    {panel?.type === 'task-form' && <TaskForm task={activePanelTask} defaultDay={planDay} onClose={() => setPanel({ type: 'plan' })} onSave={task => { const id = activePanelTask?.id || uniqueId(); dispatch(activePanelTask ? { type: 'EDIT_TASK', id, task } : { type: 'ADD_TASK', task: { ...task, id } }); setPlanDay(task.day); setPanel({ type: 'plan' }); notify(activePanelTask ? '安排已调整，照顾好自己的节奏。' : '第一步已经清楚了，按你的时间开始。'); }} />}
    {panel?.type === 'focus' && activePanelTask && <Dialog title={activePanelTask.status === 'active' ? '去做自己的小目标吧' : '休息一下，也没关系'} eyebrow="小乖和小镇会在这里等你" icon={Leaf} className="focus-dialog" onClose={() => setPanel(null)}>
      <div className="focus-cat"><img src={`${A}xiaoguai.png`} alt="小乖" /></div><h3 className="focus-task">{activePanelTask.title}</h3><p className="focus-estimate">你预计用 {activePanelTask.estimate} 分钟</p><div className="focus-clock">{formatElapsed(elapsed(activePanelTask, now))}</div><p className="clock-caption">开始至今 · 包含离开页面的时间</p><p className="focus-copy">现在可以锁屏或离开页面，<br />回来时，再告诉我们真实的进展。</p>
      <div className="focus-actions"><button className="secondary-button" onClick={() => activePanelTask.status === 'active' ? dispatch({ type: 'PAUSE_TASK', id: activePanelTask.id }) : dispatch({ type: 'START_TASK', id: activePanelTask.id })}>{activePanelTask.status === 'active' ? <Pause size={18} /> : <Play size={18} />}{activePanelTask.status === 'active' ? '先暂停' : '继续计时'}</button><button className="primary-button" onClick={() => setPanel({ type: 'record', id: activePanelTask.id })}>我回来啦<ArrowRight size={19} /></button></div><button className="text-button center" onClick={() => setPanel({ type: 'task-form', id: activePanelTask.id })}>需要改一改计划</button>
    </Dialog>}
    {panel?.type === 'record' && activePanelTask && <RecordForm task={activePanelTask} onClose={() => setPanel({ type: 'focus', id: activePanelTask.id })} onAdjust={() => setPanel({ type: 'task-form', id: activePanelTask.id })} onRecord={values => { dispatch({ type: 'RECORD_TASK', id: activePanelTask.id, ...values }); if (values.status === 'done') setPanel({ type: 'reward', id: activePanelTask.id }); else { setPanel({ type: 'plan' }); notify('这一小步已经记下了，准备好时再继续。'); } }} />}
    {panel?.type === 'reward' && activePanelTask && <Dialog title="这一小步，做到了" eyebrow="真实的行动，让小镇慢慢成长" icon={CheckCircle} className="reward-dialog" onClose={() => setPanel(null)}><Coin className="reward-coin" /><div className="reward-amount">+{REWARD}<span>星球币</span></div><p className="reward-task">{activePanelTask.title}</p><p className="soft-copy">这份收获，可以变成小乖的猫爬架，<br />也可以成为你的小花圃。</p><button className="primary-button full-width" disabled={activePanelTask.rewardClaimed} onClick={() => claim(activePanelTask.id)}>{activePanelTask.rewardClaimed ? '已经领取过啦' : '收下星球币'}<ArrowRight size={19} /></button><button className="text-button center" onClick={() => setPanel(null)}>稍后再来</button></Dialog>}
    {panel?.type === 'build' && <Dialog title="为小镇添一点喜欢" eyebrow="投入哪里，哪里就慢慢成长" icon={Hammer} onClose={() => setPanel(null)}><div className="build-balance"><span>我的星球币</span><strong><Coin />{state.coins}</strong></div><div className="catalog">{CATALOG.map(item => { const owned = state.buildings.some(b => b.itemId === item.id); return <article className="catalog-item" key={item.id}><div className="catalog-art"><img src={item.image} alt={item.shortName} /></div><div className="catalog-copy"><h3>{item.name}</h3><p>{item.description}</p><div className="catalog-bottom"><span className="price"><Coin />{item.cost}</span><button className={owned ? 'owned-label' : state.coins >= item.cost ? 'small-primary' : 'small-secondary'} onClick={() => owned ? setPanel({ type: 'built', itemId: item.id }) : chooseBuild(item)}>{owned ? <><Check size={15} />已建成</> : state.coins >= item.cost ? <>选个位置<CaretRight size={15} /></> : `还差 ${item.cost - state.coins} 星球币`}</button></div></div></article>; })}</div><div className="gentle-note"><Leaf size={18} weight="duotone" />也可以先存起来，等想好了再建。</div>{state.coins < 10 && state.buildings.length < 2 && <button className="secondary-button full-width" onClick={openPlan}>去安排一个现实小目标<ArrowRight size={18} /></button>}</Dialog>}
    {panel?.type === 'built' && (() => { const item = CATALOG.find(i => i.id === panel.itemId); return <Dialog title={item.shortName + '，在这里安家了'} eyebrow="小镇的第一处改变" icon={Sparkle} className="built-dialog" onClose={() => setPanel(null)}><img className="built-art" src={item.image} alt={item.shortName} /><p className="soft-copy">{item.reaction}</p><div className="achievement-strip"><Trophy size={24} weight="duotone" /><div><strong>小镇的第一处改变</strong><span>这是你的行动留下的样子。</span></div></div><button className="primary-button full-width" onClick={() => setPanel(null)}>回小镇看看<PawPrint size={20} weight="fill" /></button><button className="text-button center" onClick={() => openCare(careTarget(`built-${item.id}`))}>照料这处小天地<Leaf size={17} /></button>{lastDone && !reflected && <button className="text-button center" onClick={() => setPanel({ type: 'reflection', id: lastDone.id })}>再用一句话回顾今天</button>}</Dialog>; })()}
    {panel?.type === 'reflection' && activePanelTask && <Dialog title="更了解自己的节奏" eyebrow="一个问题，就够了" icon={Sun} onClose={() => setPanel(null)}><p className="reflection-question">今天这件事，<br />和你预计的用时一样吗？</p><div className="comparison"><div><span>预计</span><strong>{activePanelTask.estimate}<small>分钟</small></strong></div><ArrowRight size={24} /><div><span>实际</span><strong>{activePanelTask.actualMinutes}<small>分钟</small></strong></div></div><div className="reflection-options">{[['faster','比预计快一点'],['similar','和预计差不多'],['longer','比预计久一点']].map(([answer, title]) => <button className="secondary-button" key={answer} onClick={() => { dispatch({ type: 'REFLECT', id: activePanelTask.id, answer }); setPanel(null); notify('记住今天的经验，下次会更了解自己的节奏。'); }}>{title}<ArrowRight size={18} /></button>)}</div><p className="gentle-note">每一次估计和调整，都在帮你认识自己。</p></Dialog>}
    {panel?.type === 'bag' && <Dialog title="背包与小镇手记" eyebrow="每一小步，都在这里留下痕迹" icon={Backpack} onClose={() => setPanel(null)}><div className="wallet"><Coin /><div><span>我的星球币</span><strong>{state.coins}</strong></div><button className="text-button" onClick={() => setPanel({ type: shopType })}>去建设<ArrowRight size={16} /></button></div><h3 className="section-heading">属于你的成就<span>{state.achievements.length} / {Object.keys(ACHIEVEMENTS).length}</span></h3><div className="achievement-list">{Object.entries(ACHIEVEMENTS).map(([id, item]) => <div className={`achievement-row ${state.achievements.includes(id) ? 'earned' : ''}`} key={id}><Trophy size={26} weight="duotone" /><div><strong>{item.title}</strong><p>{item.detail}</p></div>{state.achievements.includes(id) && <CheckCircle size={20} weight="fill" />}</div>)}</div><h3 className="section-heading">小镇的变化<span>{state.buildings.length+(state.habitats?.length || 0)} 处</span></h3>{state.buildings.length ? <div className="built-list">{state.buildings.map(b => { const item = CATALOG.find(i => i.id === b.itemId); return <button key={b.itemId} onClick={() => openCare(careTarget(`built-${b.itemId}`))}><img src={item.image} alt="" /><span>{item.shortName}</span><CaretRight size={18} /></button>; })}</div> : <p className="soft-copy left">{state.habitats?.length ? '已经添置的伙伴设施：' : '第一处改变，等你亲手建造。'}</p>}{state.habitats?.length > 0 && <ul className="owned-habitats">{ALL_HABITATS.filter(item=>state.habitats.includes(item.id)).map(item=><li key={item.id}>{item.name}<small>已建成 · 永久保留</small></li>)}</ul>}</Dialog>}
    {panel?.type === 'help' && <Dialog title="欢迎来到星球悬浮小镇" eyebrow="按自己的节奏，让喜欢的事物成长" icon={Question} onClose={() => { setPanel(null); setConfirmReset(false); }}>
      <div className="motion-settings"><p>小镇动态：{motionPreference === 'system' ? reducedMotion ? '跟随系统 · 减少动态' : '跟随系统 · 已开启' : motionEnabled ? '已手动开启' : '已手动暂停'}。点击右上角风形按钮可以切换。暂停时仍可移动位置、与伙伴文字互动。</p>{motionPreference !== 'system' && <button className="text-button" onClick={() => chooseMotion('system')}>恢复跟随系统</button>}</div>
      <div className="help-steps"><p><Footprints weight="duotone" />点击木平台，或使用方向键 / WASD 移动。</p><p><PawPrint weight="duotone" />点击小乖，和它打招呼；认识后它会跟着你。</p><p><Notebook weight="duotone" />安排现实任务，离开屏幕去行动，回来诚实记录进展。</p><p><Coin />每个完成的小目标可领取一次 10 星球币，用来建设小镇。</p></div>
      <div className="save-info"><FloppyDisk size={23} weight="duotone" /><div><strong>{cloud ? '进度保存在家里的 Mac' : '进度自动保存在当前浏览器'}</strong><p>{cloud ? '使用相同账号，在 iPad 或电脑继续。每天的使用情况和任务进展可在成长手记查看。' : '重新打开还能继续。可以导出存档，再导入家庭版，让多台设备使用同一座小镇。'}</p></div></div>
      <button className="secondary-button family-entry" onClick={() => exportLocalSave(state)}><FloppyDisk size={18} />导出小镇存档</button>
      {onJournal && <button className="primary-button family-entry" onClick={onJournal}><Notebook size={18} />查看成长手记与账号</button>}
      {!cloud && <div className="reset-section">{confirmReset ? <><p>将清空当前浏览器的小镇、任务和星球币，回到第一次见到小乖的时候。</p><div className="focus-actions"><button className="secondary-button" onClick={() => setConfirmReset(false)}>保留小镇</button><button className="danger-button" onClick={() => { localStorage.removeItem(SAVE_KEY); location.reload(); }}>确认重新开始</button></div></> : <button className="text-button subtle" onClick={() => setConfirmReset(true)}><ArrowCounterClockwise size={16} />重新开始体验</button>}</div>}
    </Dialog>}
  </main>;
}

function TaskForm({ task, defaultDay, onClose, onSave }) {
  const [title, setTitle] = useState(task?.title || '');
  const [category, setCategory] = useState(task?.category || '学习');
  const [estimate, setEstimate] = useState(task?.estimate || 25);
  const [startTime, setStartTime] = useState(task?.startTime || freshTime());
  const [day, setDay] = useState(task ? taskDay(task) : defaultDay || localDay());
  const [error, setError] = useState('');
  return <Dialog title={task ? '让计划更适合现在' : '安排一件小事'} eyebrow={task ? '计划可以调整，成长不会清零' : '先做到哪一步，算完成这一段？'} icon={PencilSimple} onClose={onClose}>
    <form className="task-form" onSubmit={e => { e.preventDefault(); const value = { title, category, estimate: Number(estimate), startTime, day }; const problem = validateTask(value); if (problem) setError(problem); else onSave(value); }}>
      <label htmlFor="task-title">我先做什么？</label><input id="task-title" name="task-title" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} placeholder="比如：完成数学前六题" autoComplete="off" />
      <div className="task-examples">{['数学前六题', '读十页书', '出门活动一会儿'].map(t => <button type="button" key={t} onClick={() => { setTitle(t); setCategory(t === '出门活动一会儿' ? '运动' : '学习'); }}>{t}</button>)}</div>
      <label htmlFor="task-day">安排在哪一天？</label><input id="task-day" type="date" value={day} required onChange={e => setDay(e.target.value)} />
      <label>这是哪一类小事？</label><div className="category-options" role="group" aria-label="任务分类">{['学习', '运动', '社交', '生活', '休息'].map(c => <button key={c} type="button" aria-pressed={category === c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
      <div className="form-pair"><div><label htmlFor="task-minutes">大概需要多久？</label><div className="input-with-unit"><input id="task-minutes" type="number" min="1" max="240" inputMode="numeric" value={estimate} onChange={e => setEstimate(e.target.value)} /><span>分钟</span></div></div><div><label htmlFor="task-time">想什么时候开始？</label><input id="task-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div></div>
      <div className="form-note"><Clock size={18} weight="duotone" /><p>先估一估就好，回来后可以记录实际用时。</p></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-width" type="submit">{task ? '保存调整' : '就这样安排'}<Check size={18} weight="bold" /></button>
    </form>
  </Dialog>;
}
function RecordForm({ task, onClose, onRecord, onAdjust }) {
  const [status, setStatus] = useState('done');
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(elapsed(task) / 60000)));
  const [note, setNote] = useState(task.note || '');
  const [error, setError] = useState('');
  return <Dialog title="欢迎回来" eyebrow="告诉小镇，真实发生了什么" icon={PawPrint} onClose={onClose}><h3 className="record-task">{task.title}</h3><div className="record-options"><button className={status === 'done' ? 'selected' : ''} aria-pressed={status === 'done'} onClick={() => setStatus('done')}><CheckCircle size={24} weight="duotone" /><strong>完成了</strong><span>做到了约定的小目标</span></button><button className={status === 'partial' ? 'selected' : ''} aria-pressed={status === 'partial'} onClick={() => setStatus('partial')}><Leaf size={24} weight="duotone" /><strong>做了一部分</strong><span>先把这一小步记下来</span></button><button onClick={onAdjust}><PencilSimple size={24} weight="duotone" /><strong>需要调整</strong><span>改一改安排，再出发</span></button></div><form className="task-form" onSubmit={e => { e.preventDefault(); if (status === 'done' && (!Number.isFinite(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > 1440)) { setError('实际用时请填写 1—1440 分钟。'); return; } onRecord({ status, actualMinutes: Number(minutes), note }); }}>{status === 'done' && <><label htmlFor="actual-minutes">实际大概用了多久？</label><div className="input-with-unit"><input id="actual-minutes" type="number" min="1" max="1440" value={minutes} onChange={e => setMinutes(e.target.value)} /><span>分钟</span></div></>}<label htmlFor="task-note">{status === 'done' ? '有什么想记住的？' : '已经做到哪一步了？'}<small>选填</small></label><textarea id="task-note" value={note} onChange={e => setNote(e.target.value)} maxLength={240} rows={2} placeholder={status === 'done' ? '比如：最后两题比想象中费时间。' : '比如：完成了前四题，剩下两题饭后继续。'} />{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button full-width">{status === 'done' ? '记下这次完成' : '保存这一小步'}<Check size={18} /></button></form></Dialog>;
}
