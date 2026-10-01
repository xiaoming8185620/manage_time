// One trial at the end of each cloud-crystal collection, using active scene time.
export const COLLECTION_ENDS = [34700, 157160];
export const DROP_CHANCE = .3;
export const DROP_SPOTS = [{x:.57,y:.63},{x:.48,y:.66},{x:.62,y:.59}];
export const emptySkyRewards = () => ({ attempts:0, earned:0, pending:[] });
export function restoreSkyRewards(value = emptySkyRewards()) {
  if (!value || !Number.isSafeInteger(value.attempts) || value.attempts < 0 || !Number.isSafeInteger(value.earned) || value.earned < 0 || !Array.isArray(value.pending) || value.pending.some(id => !Number.isSafeInteger(id) || id < 1 || id > value.attempts) || new Set(value.pending).size !== value.pending.length || value.earned + value.pending.length > value.attempts) throw new Error('Invalid sky rewards');
  return {attempts:value.attempts,earned:value.earned,pending:[...value.pending]};
}
export function skyResumeTime(attempts) { return attempts ? COLLECTION_ENDS[(attempts - 1) % 2] + 1 : 0; }
export function reconcileSkyClock(time, completed, saved) {
  // Called after a save pause: cancelled/rejected trials must use the server's
  // sequence again, while a successful save must not rewind the current visit.
  return saved !== completed ? {time:skyResumeTime(saved),completed:saved} : {time,completed};
}
export function crossedCollection(before, after, attempts) {
  const end = COLLECTION_ENDS[attempts % 2];
  return after < before ? end > before || end <= after : before < end && after >= end;
}
export function dropSpot(id) { return DROP_SPOTS[(id - 1) % DROP_SPOTS.length]; }
export function reduceSkyRewards(state, action) {
  const sky = state.skyRewards || emptySkyRewards();
  if (action.type === 'COLLECT_CRYSTAL') {
    if (action.attempt !== sky.attempts + 1 || !Number.isFinite(action.roll) || action.roll < 0 || action.roll >= 1) return state;
    return {...state,skyRewards:{...sky,attempts:action.attempt,pending:action.roll < DROP_CHANCE ? [...sky.pending,action.attempt] : sky.pending}};
  }
  if (action.type === 'PICKUP_SKY_COIN' && sky.pending.includes(action.id)) {
    return {...state,coins:state.coins+1,skyRewards:{...sky,earned:sky.earned+1,pending:sky.pending.filter(id=>id!==action.id)}};
  }
  return state;
}
