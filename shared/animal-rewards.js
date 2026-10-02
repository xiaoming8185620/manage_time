import catalogue from './animal-rewards.json' with {type:'json'};
export const ANIMALS = catalogue.animals;
export const ANIMAL_SPOTS = catalogue.spots;
export const emptyAnimalRewards = () => ({attempts:Object.fromEntries(ANIMALS.map(a=>[a.id,0])),earned:0,pending:[]});
export const animalResumeTime = (id, attempts) => {const a=ANIMALS.find(a=>a.id===id);return attempts ? a.end+(attempts-1)*a.period+1 : 0;};
export const animalTrialDue = (id,time,attempts) => {const a=ANIMALS.find(a=>a.id===id);return time>=a.end+attempts*a.period;};
export function restoreAnimalRewards(value=emptyAnimalRewards()) {
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  if(!value || !value.attempts || ANIMALS.some(a=>!integer(value.attempts[a.id])) || !integer(value.earned) || !Array.isArray(value.pending))throw new Error('Invalid animal rewards');
  const attempts=Object.fromEntries(ANIMALS.map(a=>[a.id,value.attempts[a.id]]));
  const pending=value.pending.map(c=>{
    if(!c || !ANIMALS.some(a=>a.id===c.animal) || !integer(c.attempt) || c.attempt<1 || c.attempt>attempts[c.animal] || c.id!==`${c.animal}:${c.attempt}` || !integer(c.spot) || c.spot>=ANIMAL_SPOTS.length)throw new Error('Invalid animal coin');
    return {id:c.id,animal:c.animal,attempt:c.attempt,spot:c.spot};
  });
  if(new Set(pending.map(c=>c.id)).size!==pending.length || value.earned+pending.length>Object.values(attempts).reduce((a,b)=>a+b,0))throw new Error('Invalid animal balance');
  return {attempts,earned:value.earned,pending};
}
export function reduceAnimalRewards(state,action) {
  const rewards=state.animalRewards || emptyAnimalRewards();
  if(action.type==='ANIMAL_DROP'){
    if(!ANIMALS.some(a=>a.id===action.animal) || action.attempt!==rewards.attempts[action.animal]+1 || !Number.isFinite(action.roll) || action.roll<0 || action.roll>=1 || !Number.isFinite(action.spotRoll) || action.spotRoll<0 || action.spotRoll>=1)return state;
    const coin={id:`${action.animal}:${action.attempt}`,animal:action.animal,attempt:action.attempt,spot:Math.floor(action.spotRoll*ANIMAL_SPOTS.length)};
    return {...state,animalRewards:{...rewards,attempts:{...rewards.attempts,[action.animal]:action.attempt},pending:action.roll<catalogue.chance?[...rewards.pending,coin]:rewards.pending}};
  }
  if(action.type==='PICKUP_ANIMAL_COIN' && rewards.pending.some(c=>c.id===action.id))return {...state,coins:state.coins+1,animalRewards:{...rewards,earned:rewards.earned+1,pending:rewards.pending.filter(c=>c.id!==action.id)}};
  return state;
}
