import {BUILD_SLOTS} from '../shared/build-layout.js';
import {reduceVisit,restoreVisitDays} from '../shared/visits.js';
import {guidePreferences} from '../shared/onboarding.js';
import {taskElapsed,completionIssue,MAX_ACTUAL_MINUTES} from '../shared/task-time.js';
export {BUILD_SLOTS, buildingPosition, availableBuildSlots} from '../shared/build-layout.js';
import { reduceAnimalRewards, restoreAnimalRewards } from '../shared/animal-rewards.js';
import { dayKey, validDay } from '../shared/calendar.js';
import { reduceCare, restoreCare } from '../shared/scene-care.js';
import { reduceStory, restoreStory } from '../shared/story.js';
import { reduceSkyRewards, restoreSkyRewards } from '../shared/sky-rewards.js';
import { reduceHabitat, restoreHabitats } from '../shared/greenhouse.js';
import {reduceWorkshopGrowth,restoreWorkshopGrowth} from '../shared/workshop-growth.js';
export const SAVE_KEY = 'miaomiao-town:v1';
export const REWARD = 10;
const SAVED_CATALOG = [
  { id: 'cat-tree', name: '小乖的猫爬架', shortName: '猫爬架', cost: 10, image: '/assets/cat-tree.png', description: '一处可以跳上去、伸懒腰、晒太阳的小天地。', reaction: '小乖轻轻一跃，找到了新的晒太阳位置。' },
  { id: 'flowerbed', name: '第一座小花圃', shortName: '小花圃', cost: 10, image: '/assets/flowerbed.png', description: '种下几朵小花，让自己的云端多一点颜色。', reaction: '小乖凑近闻了闻，尾巴轻轻晃起来。' },
];
// Retired items remain valid in historical saves, but cannot be built again.
export const CATALOG = SAVED_CATALOG.filter(item => item.id !== 'flowerbed');
export const ACHIEVEMENTS = {
  friend: { title: '云端新朋友', detail: '和小乖打了第一个招呼。' },
  plan: { title: '今天，由我安排', detail: '为自己安排了第一个小目标。' },
  adjust: { title: '计划会转弯', detail: '根据真实进展，主动调整一次安排。' },
  build: { title: '小镇的第一处改变', detail: '用自己的行动，建起一件新设施。' },
  reflect: { title: '更了解自己的节奏', detail: '回顾了一次预计与实际用时。' },
};
export function initialState() {
  return { version: 1, greeted: false, coins: 0, tasks: [], buildings: [], achievements: [], reflections: [], care: {}, storyUnlocked: [], boy: { x: 0.505, y: 0.637 }, createdAt: Date.now(), savedAt: null };
}
const earn = (state, id) => state.achievements.includes(id) ? state.achievements : [...state.achievements, id];
const settle = (task, now) => ({ ...task, elapsedMs: elapsed(task, now), startedAt: null });
export function elapsed(task, now = Date.now()) {
  return taskElapsed(task,now);
}
export function validateTask({ title, estimate, startTime, day }, legacy = false) {
  if (!title?.trim()) return '给这件事起一个具体的小名字吧。';
  if (title.trim().length > 60) return '名字请写在 60 个字以内。';
  if (!Number.isFinite(Number(estimate)) || Number(estimate) < (legacy ? 1 : 10) || Number(estimate) > 240) return '给自己留至少 10 分钟认真试试吧。预计用时可以填写 10—240 分钟，小事也可以合成一组。';
  if (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return '请填写有效的开始时间。';
  if (day !== undefined && !validDay(day)) return '请填写有效的安排日期。';
  return '';
}
export function gameReducer(state, action) {
  const now = action.now ?? Date.now();
  switch (action.type) {
    case 'VISIT_TOWN': return reduceVisit(state,now);
    case 'GUIDE_PREFERENCE': return typeof action.dismissed==='boolean'?{...state,onboarding:{introSeen:true,dismissed:action.dismissed}}:state;
    case 'GREET': return { ...state, greeted: true, onboarding:{...guidePreferences(state),introSeen:true}, achievements: earn(state, 'friend') };
    case 'MOVE': return { ...state, boy: action.position };
    case 'ADD_TASK': {
      if (validateTask(action.task) || state.tasks.some(t => t.id === action.task.id)) return state;
      const task = { ...action.task, day: validDay(action.task.day) ? action.task.day : dayKey(now), title: action.task.title.trim(), estimate: Number(action.task.estimate), status: 'planned', elapsedMs: 0, startedAt: null, rewardClaimed: false, note: '', createdAt: now };
      return { ...state, tasks: [...state.tasks, task], achievements: earn(state, 'plan') };
    }
    case 'EDIT_TASK': {
      if (validateTask(action.task)) return state;
      const existing = state.tasks.find(t => t.id === action.id);
      if (!existing || existing.status === 'done') return state;
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...settle(t, now), title: action.task.title.trim(), category: action.task.category, estimate: Number(action.task.estimate), startTime: action.task.startTime, day: validDay(action.task.day) ? action.task.day : t.day, status: t.status === 'planned' ? 'planned' : 'paused' } : t), achievements: earn(state, 'adjust') };
    }
    case 'START_TASK': {
      const task = state.tasks.find(t => t.id === action.id);
      if (!task || task.status === 'done' || task.status === 'active') return state;
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, status: 'active', startedAt: now,firstStartedAt:t.firstStartedAt??now,reviewAt:null } : t.status === 'active' ? { ...settle(t, now), status: 'paused' } : t) };
    }
    case 'REVIEW_TASK': return {...state,tasks:state.tasks.map(t=>t.id===action.id&&t.status!=='done'&&t.status!=='planned'?{...settle(t,now),status:'paused',reviewAt:t.reviewAt??now}:t)};
    case 'RESET_TASK_TIMER': {
      const task=state.tasks.find(t=>t.id===action.id);
      if(!task||task.status==='done'||elapsed(task,now)<=0||!action.note?.trim())return state;
      return {...state,tasks:state.tasks.map(t=>t.id===action.id?{...t,status:'partial',elapsedMs:0,startedAt:null,firstStartedAt:null,reviewAt:null,note:action.note.slice(0,240),timingCorrections:[...(t.timingCorrections||[]),{at:now,elapsedMs:elapsed(t,now),note:action.note.slice(0,240)}]}:t)};
    }
    case 'PAUSE_TASK': return { ...state, tasks: state.tasks.map(t => t.id === action.id && t.status === 'active' ? { ...settle(t, now), status: 'paused' } : t) };
    case 'RECORD_TASK': {
      const task = state.tasks.find(t => t.id === action.id);
      if (!task || task.status === 'done' || !['done', 'partial'].includes(action.status)) return state;
      const actualMinutes = Number(action.actualMinutes);
      if (action.status === 'done' && completionIssue(task,actualMinutes,now)) return state;
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...settle(t, now), status: action.status, actualMinutes: action.status === 'done' ? actualMinutes : null, note: (action.note || '').slice(0, 240), finishedAt: action.status === 'done' ? now : null } : t) };
    }
    case 'CLAIM_REWARD': {
      const task = state.tasks.find(t => t.id === action.id);
      if (!task || task.status !== 'done' || task.rewardClaimed) return state;
      return { ...state, coins: state.coins + REWARD, tasks: state.tasks.map(t => t.id === action.id ? { ...t, rewardClaimed: true } : t) };
    }
    case 'BUILD': {
      const item = CATALOG.find(i => i.id === action.itemId);
      if (!item || state.coins < item.cost || !BUILD_SLOTS.some(s => s.id === action.slot && (!s.itemId || s.itemId === action.itemId)) || state.buildings.some(b => CATALOG.some(i => i.id === b.itemId) && (b.slot === action.slot || b.itemId === action.itemId))) return state;
      return { ...state, coins: state.coins - item.cost, buildings: [...state.buildings, { itemId: item.id, slot: action.slot, builtAt: now }], achievements: earn(state, 'build') };
    }
    case 'UPGRADE_WORKSHOP':
    case 'INTERACT_WORKSHOP': return reduceWorkshopGrowth(state,action,now);
    case 'CARE_SCENE': return reduceCare(state, action, now);
    case 'ANIMAL_DROP':
    case 'PICKUP_ANIMAL_COIN': return reduceAnimalRewards(state, action);
    case 'BUILD_HABITAT': return reduceHabitat(state, action);
    case 'COLLECT_CRYSTAL':
    case 'PICKUP_SKY_COIN': return reduceSkyRewards(state, action);
    case 'UNLOCK_STORY': return reduceStory(state, action);
    case 'REFLECT': {
      if (!['faster', 'similar', 'longer'].includes(action.answer)) return state;
      const task = state.tasks.find(t => t.id === action.id);
      if (!task || task.status !== 'done' || state.reflections.some(r => r.taskId === action.id)) return state;
      return { ...state, reflections: [...state.reflections, { taskId: action.id, answer: action.answer, at: now }], achievements: earn(state, 'reflect') };
    }
    case 'RESET': return initialState();
    default: return state;
  }
}
export function serializeState(state) { return JSON.stringify({ ...state, savedAt: Date.now() }); }
const savedStamp = value => Number.isFinite(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());
function validSavedTask(task) {
  if (!task || typeof task.id !== 'string' || !task.id || task.id.length > 80 || typeof task.title !== 'string' || validateTask(task,true)) return false;
  if (!['planned','active','paused','partial','done'].includes(task.status) || !Number.isFinite(task.estimate) || !Number.isFinite(task.elapsedMs) || task.elapsedMs < 0 || !savedStamp(task.createdAt)) return false;
  if (typeof task.rewardClaimed !== 'boolean' || (task.rewardClaimed && task.status !== 'done')) return false;
  if (task.category !== undefined && !['学习','运动','社交','生活','休息'].includes(task.category)) return false;
  if (task.note !== undefined && typeof task.note !== 'string') return false;
  if (task.startTime !== undefined && typeof task.startTime !== 'string') return false;
  if (task.status === 'active' && !savedStamp(task.startedAt)) return false;
  if (task.status === 'done' && (!savedStamp(task.finishedAt) || !Number.isFinite(task.actualMinutes) || task.actualMinutes < 1 || task.actualMinutes > MAX_ACTUAL_MINUTES)) return false;
  if (task.firstStartedAt!=null&&!savedStamp(task.firstStartedAt) || task.reviewAt!=null&&!savedStamp(task.reviewAt)) return false;
  if(task.timingCorrections!==undefined&&(!Array.isArray(task.timingCorrections)||task.timingCorrections.some(r=>!r||!savedStamp(r.at)||!Number.isFinite(r.elapsedMs)||r.elapsedMs<0||typeof r.note!=='string')))return false;
  return true;
}
export function restoreState(raw) {
  if (!raw) return { state: initialState(), corrupt: false };
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || typeof data.greeted !== 'boolean' || !Number.isFinite(data.coins) || data.coins < 0 || !Array.isArray(data.tasks) || !Array.isArray(data.buildings) || !Array.isArray(data.achievements)) throw new Error('Invalid save');
    if (data.createdAt !== undefined && !savedStamp(data.createdAt)) throw new Error('Invalid town date');
    if (data.tasks.some(t => !validSavedTask(t))) throw new Error('Invalid tasks');
    if (new Set(data.tasks.map(t => t.id)).size !== data.tasks.length) throw new Error('Duplicate tasks');
    if (data.buildings.some(b => !b || !SAVED_CATALOG.some(i => i.id === b.itemId) || !BUILD_SLOTS.some(s => s.id === b.slot && (!s.itemId || s.itemId === b.itemId)) || !savedStamp(b.builtAt)) || new Set(data.buildings.map(b => b.itemId)).size !== data.buildings.length) throw new Error('Invalid buildings');
    if (data.reflections !== undefined && (!Array.isArray(data.reflections) || data.reflections.some(r => !r || typeof r.taskId !== 'string' || !['faster','similar','longer'].includes(r.answer) || (r.at !== undefined && !savedStamp(r.at))))) throw new Error('Invalid reflections');
    return { state: { ...initialState(), ...data, visitDays:restoreVisitDays(data.visitDays),onboarding:guidePreferences(data),workshopGrowth:restoreWorkshopGrowth(data.workshopGrowth,restoreHabitats(data.habitats)), skyRewards: restoreSkyRewards(data.skyRewards), animalRewards: restoreAnimalRewards(data.animalRewards), habitats: restoreHabitats(data.habitats), storyUnlocked: restoreStory(data.storyUnlocked), care: restoreCare(data.care || {}, data.buildings, Date.now(), restoreHabitats(data.habitats)), reflections: Array.isArray(data.reflections) ? data.reflections : [], boy: data.boy && Number.isFinite(data.boy.x) && Number.isFinite(data.boy.y) ? data.boy : initialState().boy }, corrupt: false };
  } catch { return { state: initialState(), corrupt: true }; }
}
export function loadGame(storage) {
  try { return restoreState(storage.getItem(SAVE_KEY)); }
  catch { return { state: initialState(), corrupt: false, unavailable: true }; }
}
export function localDay(now = new Date()) {
  return dayKey(now);
}
export function formatElapsed(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
const WALK_AREA = [[.32,.515],[.57,.432],[.75,.463],[.827,.558],[.725,.694],[.515,.713],[.315,.678],[.26,.594]];
export function canWalk(x, y) {
  let inside = false;
  for (let i = 0, j = WALK_AREA.length - 1; i < WALK_AREA.length; j = i++) {
    const [xi, yi] = WALK_AREA[i], [xj, yj] = WALK_AREA[j];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
