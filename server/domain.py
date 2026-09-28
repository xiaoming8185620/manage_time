"""Pure domain functions. Timestamps are milliseconds; calendar dates use UTC+8."""
import copy
import math
import re
from datetime import datetime, timedelta, timezone
from .scene_care import reduce_care
from .story import unlock_story
from .sky_rewards import reduce_sky_rewards
from .greenhouse import build_habitat

TZ = timezone(timedelta(hours=8))
CATEGORIES = ('学习', '运动', '社交', '生活', '休息')
STATUSES = {'planned': '已安排', 'active': '进行中', 'paused': '已暂停', 'partial': '完成一部分', 'done': '已完成'}
SLOTS = ('sunny', 'window', 'garden')
ITEMS = ('cat-tree', 'flowerbed')


class Problem(Exception):
    def __init__(self, message, status=400, current=None):
        super().__init__(message)
        self.status, self.current = status, current


def day_key(ms):
    return datetime.fromtimestamp(ms / 1000, TZ).date().isoformat()


def day_start(day):
    try:
        if not isinstance(day, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', day):
            raise ValueError()
        return int(datetime.fromisoformat(day).replace(tzinfo=TZ).timestamp() * 1000)
    except (ValueError, TypeError):
        raise Problem('日期不正确。')


def add_days(day, n):
    return day_key(day_start(day) + n * 86400000)


def week_start(day):
    date = datetime.fromisoformat(day)
    return add_days(day, -date.weekday())


def week_due(week):
    return day_start(add_days(week, 6)) + 20 * 3600000


def initial_state(now):
    return dict(version=1, greeted=False, coins=0, tasks=[], buildings=[], achievements=[], reflections=[], care={}, storyUnlocked=[], boy={'x': .505, 'y': .637}, createdAt=now, savedAt=None)


def minutes(value, maximum=240):
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not 1 <= value <= maximum:
        raise Problem(f'用时请填写 1—{maximum} 分钟。')
    return value


def task_input(value, now):
    if not isinstance(value, dict):
        raise Problem('任务内容不正确。')
    title = value.get('title', '')
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 60:
        raise Problem('任务名字请填写 1—60 个字。')
    clock = value.get('startTime', '')
    if not isinstance(clock, str) or (clock and not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', clock)):
        raise Problem('开始时间不正确。')
    day = value.get('day') or day_key(now)
    day_start(day)
    category = value.get('category') or '学习'
    if category not in CATEGORIES:
        raise Problem('任务分类不正确。')
    return dict(title=title.strip(), estimate=minutes(value.get('estimate')), startTime=clock, category=category, day=day)


def elapsed(task, now):
    return max(0, task.get('elapsedMs', 0)) + (max(0, now - task['startedAt']) if task['status'] == 'active' and task.get('startedAt') is not None else 0)


def settle(task, now):
    task.update(elapsedMs=elapsed(task, now), startedAt=None)


def reduce_game(original, action, now):
    if not isinstance(action, dict):
        raise Problem('操作格式不正确。')
    state = copy.deepcopy(original)
    kind = action.get('type')
    if kind in ('ADD_TASK', 'EDIT_TASK') and not isinstance(action.get('task'), dict):
        raise Problem('任务内容不正确。')
    task = next((t for t in state['tasks'] if t['id'] == action.get('id')), None)

    def earn(name):
        if name not in state['achievements']:
            state['achievements'].append(name)

    if kind == 'GREET':
        state['greeted'] = True
        earn('friend')
    elif kind == 'ADD_TASK':
        incoming = action.get('task', {})
        identifier = incoming.get('id')
        if not isinstance(identifier, str) or not 1 <= len(identifier) <= 80:
            raise Problem('任务编号不正确。')
        if any(t['id'] == identifier for t in state['tasks']):
            return state
        if len(state['tasks']) >= 20000:
            raise Problem('任务记录已达到容量上限，请先导出记录。')
        state['tasks'].append(dict(**task_input(incoming, now), id=identifier, status='planned', elapsedMs=0, startedAt=None, rewardClaimed=False, note='', createdAt=now))
        earn('plan')
    elif kind == 'EDIT_TASK':
        if task and task['status'] != 'done':
            values = task_input({**action.get('task', {}), 'day': action.get('task', {}).get('day') or task.get('day')}, now)
            settle(task, now)
            task.update(**values, status='planned' if task['status'] == 'planned' else 'paused')
            earn('adjust')
    elif kind == 'START_TASK':
        if task and task['status'] not in ('done', 'active'):
            for other in state['tasks']:
                if other['status'] == 'active':
                    settle(other, now)
                    other['status'] = 'paused'
            task.update(status='active', startedAt=now)
    elif kind == 'PAUSE_TASK':
        if task and task['status'] == 'active':
            settle(task, now)
            task['status'] = 'paused'
    elif kind == 'RECORD_TASK':
        status = action.get('status')
        if status not in ('partial', 'done'):
            raise Problem('进展状态不正确。')
        if task and task['status'] != 'done':
            actual = minutes(action.get('actualMinutes'), 1440) if status == 'done' else None
            note = action.get('note') or ''
            if not isinstance(note, str):
                raise Problem('备注格式不正确。')
            settle(task, now)
            task.update(status=status, actualMinutes=actual, note=note[:240], finishedAt=now if status == 'done' else None)
    elif kind == 'CLAIM_REWARD':
        if task and task['status'] == 'done' and not task['rewardClaimed']:
            task['rewardClaimed'] = True
            state['coins'] += 10
    elif kind == 'BUILD':
        item, slot = action.get('itemId'), action.get('slot')
        if item in ITEMS and slot in SLOTS and state['coins'] >= 10 and not any(b['slot'] == slot or b['itemId'] == item for b in state['buildings']):
            state['coins'] -= 10
            state['buildings'].append(dict(itemId=item, slot=slot, builtAt=now))
            earn('build')
    elif kind == 'CARE_SCENE':
        try:
            state = reduce_care(state, action, now, day_key)
        except ValueError as error:
            raise Problem(str(error))
    elif kind == 'UNLOCK_STORY':
        try:
            state = unlock_story(state, action)
        except ValueError as error:
            raise Problem(str(error))
    elif kind in ('COLLECT_CRYSTAL', 'PICKUP_SKY_COIN'):
        state = reduce_sky_rewards(state, action)
    elif kind == 'BUILD_HABITAT':
        try:
            state = build_habitat(state, action)
        except ValueError as error:
            raise Problem(str(error))
    elif kind == 'REFLECT':
        answer = action.get('answer')
        if task and task['status'] == 'done' and answer in ('faster', 'similar', 'longer') and not any(r['taskId'] == task['id'] for r in state['reflections']):
            state['reflections'].append(dict(taskId=task['id'], answer=answer, at=now))
            earn('reflect')
    else:
        raise Problem('不支持的操作。')
    return state


def usage_within(intervals, start, end):
    total, previous_end = 0, start
    for row in sorted(intervals, key=lambda r: r['start']):
        a, b = max(row['start'], start), min(row['end'], end)
        if b > a:
            total += max(0, b - max(a, previous_end))
            previous_end = max(previous_end, b)
    return total


def build_report(state, events, intervals, first, last, now):
    start, cutoff = day_start(first), min(now, day_start(add_days(last, 1)) - 1)
    snapshots = {t['id']: t for t in state['tasks'] if t.get('imported') and t['createdAt'] <= cutoff}
    for event in events:
        if event['at'] <= cutoff and event['task']:
            snapshots[event['task']['id']] = event['task']
    # Allow explicitly backdated plans, labeling when they were entered. Later edits
    # do not rewrite a task already recorded on that historical day.
    for event in events:
        task = event['task']
        if task and event['kind'] in ('ADD_TASK', 'EDIT_TASK') and cutoff < event['at'] <= now and first <= task['day'] <= last:
            previous = snapshots.get(task['id'])
            if not previous or not first <= previous['day'] <= last:
                snapshots[task['id']] = dict(task, recordedLaterAt=event['at'])
    activities = [e for e in events if start <= e['at'] <= cutoff]
    touched = {e['task']['id'] for e in activities if e['task']}
    tasks = [t for t in snapshots.values() if first <= t['day'] <= last or t['id'] in touched or start <= (t.get('finishedAt') or 0) <= cutoff]
    # Imported records cannot reconstruct historical status prior to their final snapshot.
    completed = [t for t in tasks if t['status'] == 'done' and start <= (t.get('finishedAt') or 0) <= cutoff]
    planned = [t for t in tasks if first <= t['day'] <= last]
    return dict(fromDay=first, toDay=last, cutoff=cutoff, tasks=tasks, activities=activities,
                plannedCount=len(planned), completedCount=len(completed), actualMinutes=sum(t.get('actualMinutes') or 0 for t in completed),
                estimateDifference=sum((t.get('actualMinutes') or 0) - t['estimate'] for t in completed),
                usageMs=usage_within(intervals, start, cutoff), imported=any(t.get('imported') for t in tasks),
                categories=[dict(name=c, plannedMinutes=sum(t['estimate'] for t in planned if t['category'] == c), actualMinutes=sum(t.get('actualMinutes') or 0 for t in completed if t['category'] == c)) for c in CATEGORIES])
