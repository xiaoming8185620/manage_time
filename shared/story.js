import manuscript from './aolai.json' with { type: 'json' };
export { manuscript };
export const paidChapters = manuscript.chapters.filter(c => c.cost > 0);
export function restoreStory(value = []) {
  if (!Array.isArray(value) || value.length > paidChapters.length || value.some((id, i) => id !== paidChapters[i].id)) throw new Error('Invalid story progress');
  return [...value];
}
export function storyReason(state, id) {
  const chapter = paidChapters.find(c => c.id === id);
  if (!chapter) return '这页手稿不能解锁。';
  const unlocked = state.storyUnlocked || [];
  if (unlocked.includes(id)) return '这页已经解锁，可以随时重读。';
  if (paidChapters[unlocked.length]?.id !== id) return '先读完前面的手稿，再继续这一页。';
  if (state.coins < chapter.cost) return `还差 ${chapter.cost - state.coins} 星球币；序章和已解锁章节可以继续阅读。`;
  return '';
}
export function reduceStory(state, action) {
  if (storyReason(state, action.chapterId)) return state;
  const chapter = paidChapters.find(c => c.id === action.chapterId);
  return { ...state, coins: state.coins - chapter.cost, storyUnlocked: [...(state.storyUnlocked || []), chapter.id] };
}
