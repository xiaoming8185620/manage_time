"""Story unlock prices and order come from the same catalogue as the client."""
import json
from pathlib import Path

MANUSCRIPT = json.loads((Path(__file__).resolve().parents[1] / 'shared' / 'aolai.json').read_text())
CHAPTERS = [c for c in MANUSCRIPT['chapters'] if c['cost'] > 0]


def restore_story(value):
    if not isinstance(value, list) or len(value) > len(CHAPTERS) or any(identifier != CHAPTERS[i]['id'] for i, identifier in enumerate(value)):
        raise ValueError('手稿记录不完整。')
    return value.copy()


def story_spent(value):
    return sum(c['cost'] for c in CHAPTERS if c['id'] in value)


def unlock_story(state, action):
    chapter = next((c for c in CHAPTERS if c['id'] == action.get('chapterId')), None)
    if not chapter:
        raise ValueError('这页手稿不能解锁。')
    unlocked = state.get('storyUnlocked', [])
    if chapter['id'] in unlocked:
        return state
    if len(unlocked) >= len(CHAPTERS) or CHAPTERS[len(unlocked)]['id'] != chapter['id']:
        raise ValueError('先读完前面的手稿，再继续这一页。')
    if state['coins'] < chapter['cost']:
        raise ValueError('星球币不足，序章和已解锁章节可以继续阅读。')
    state['coins'] -= chapter['cost']
    state['storyUnlocked'] = [*unlocked, chapter['id']]
    return state


def story_detail(action):
    chapter = next(c for c in CHAPTERS if c['id'] == action['chapterId'])
    return f"《奥莱》{chapter['title']} · 消耗 {chapter['cost']} 星球币 · 永久解锁"
