import targets from './scene-care.json' with { type: 'json' };
import { dayKey } from './calendar.js';

export const CARE_TARGETS = targets;
export const CARE_LEVELS = ['初生', '舒展', '繁茂', '盛放'];
export const careTarget = id => targets.find(target => target.id === id);
export const availableCareTargets = state => targets.filter(target => !target.itemId || state.buildings.some(b => b.itemId === target.itemId));
export const careRecord = (state, id) => ({ careCount: 0, waterCount: 0, interactionCount: 0, caredAt: null, wateredAt: null, interactedAt: null, lastEvent: null, ...state.care?.[id] });
export function careReason(state, target, verb, now = Date.now()) {
  if (!target || (target.itemId && !state.buildings.some(b => b.itemId === target.itemId))) return '先建好这处小天地，再来照料。';
  const record = careRecord(state, target.id);
  if (verb === 'care') {
    if (target.kind === 'plant' && record.careCount >= 3) return '已经长到盛放，可以继续免费浇水。';
    if (target.kind !== 'plant' && record.caredAt != null && dayKey(record.caredAt) === dayKey(now)) return '今天已经照料过了，明天再来就好。';
    if (state.coins < target.cost) return `还差 ${target.cost - state.coins} 星球币，免费互动随时都可以。`;
  }
  return '';
}
export function reduceCare(state, action, now) {
  const target = careTarget(action.targetId), verb = action.verb;
  if (!target || !['water', 'care', 'interact'].includes(verb) || (verb === 'water' && target.kind !== 'plant') || (verb === 'interact' && target.kind === 'plant') || typeof action.careId !== 'string' || action.careId.length < 10 || action.careId.length > 80 || careReason(state, target, verb, now)) return state;
  const record = careRecord(state, target.id);
  if (record.lastEvent?.id === action.careId || (verb === 'care' && action.expectedCount !== record.careCount)) return state;
  if (verb !== 'care' && record.lastEvent && now - record.lastEvent.at < 2500) return state;
  const cost = verb === 'care' ? target.cost : 0;
  const next = { ...record, lastEvent: { id: action.careId, verb, at: now, cost } };
  if (verb === 'care') { next.careCount += 1; next.caredAt = now; }
  else if (verb === 'water') { next.waterCount += 1; next.wateredAt = now; }
  else { next.interactionCount += 1; next.interactedAt = now; }
  return { ...state, coins: state.coins - cost, care: { ...state.care, [target.id]: next } };
}

// Shared save shape stays compatible with version 1 towns that have no care data.
export function restoreCare(raw = {}, buildings = [], now = Date.now()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid care records');
  const output = {};
  for (const [id, source] of Object.entries(raw)) {
    const target = careTarget(id);
    if (!target || !source || typeof source !== 'object' || (target.itemId && !buildings.some(b => b.itemId === target.itemId))) throw new Error('Invalid care target');
    const record = careRecord({ care: { [id]: source } }, id);
    for (const key of ['careCount', 'waterCount', 'interactionCount']) if (!Number.isInteger(record[key]) || record[key] < 0 || record[key] > 100000) throw new Error('Invalid care count');
    if ((target.kind === 'plant' && (record.careCount > 3 || record.interactionCount)) || (target.kind !== 'plant' && record.waterCount)) throw new Error('Invalid care kind');
    for (const [key, count] of [['caredAt','careCount'], ['wateredAt','waterCount'], ['interactedAt','interactionCount']]) {
      if ((record[count] > 0 && record[key] == null) || (record[key] != null && (!Number.isFinite(record[key]) || record[key] < 0 || record[key] > now))) throw new Error('Invalid care date');
    }
    const event = record.lastEvent;
    if (event && (typeof event.id !== 'string' || !['water','care','interact'].includes(event.verb) || !Number.isFinite(event.at) || event.at < 0 || event.at > now || event.cost !== (event.verb === 'care' ? target.cost : 0))) throw new Error('Invalid care event');
    output[id] = record;
  }
  return output;
}
export const careSpent = care => Object.entries(care || {}).reduce((sum, [id, record]) => sum + (careTarget(id)?.cost || 0) * record.careCount, 0);
