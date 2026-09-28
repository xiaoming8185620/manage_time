export const TIME_ZONE = 'Asia/Shanghai';
export function dayKey(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
export function validDay(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00+08:00`)) && dayKey(Date.parse(`${day}T00:00:00+08:00`)) === day;
}
export const dayStart = day => Date.parse(`${day}T00:00:00+08:00`);
export const addDays = (day, count) => dayKey(dayStart(day) + count * 86400000);
export function weekStart(day = dayKey()) {
  const weekday = new Date(`${day}T12:00:00+08:00`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}
export function taskDay(task) { return validDay(task.day) ? task.day : dayKey(task.createdAt); }
export const statusText = { planned: '已安排', active: '进行中', paused: '已暂停', partial: '完成一部分', done: '已完成' };
