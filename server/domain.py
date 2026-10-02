"""Pure domain functions. Timestamps are milliseconds; calendar dates use UTC+8."""
import json
from pathlib import Path
import copy
import math
import re
from datetime import datetime, timedelta, timezone
from .scene_care import reduce_care
from .story import unlock_story
from .sky_rewards import reduce_sky_rewards
from .greenhouse import build_habitat
from .animal_rewards import reduce_animal_rewards
from .workshop_growth import reduce_growth

TZ = timezone(timedelta(hours=8))
CATEGORIES = ('学习', '运动', '社交', '生活', '休息')
STATUSES = {'planned': '已安排', 'active': '进行中', 'paused': '已暂停', 'partial': '完成一部分', 'done': '已完成'}
BUILD_LAYOUT = json.loads((Path(__file__).resolve().parent.parent / 'shared/build-layout.json').read_text(encoding='utf-8'))
SLOTS = tuple(s['id'] for s in BUILD_LAYOUT['slots'])
ITEMS = ('cat-tree', 'flowerbed')


def valid_build_slot(item, slot):
    return any(s['id'] == slot and s.get('itemId', item) == item for s in BUILD_LAYOUT['slots'])


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


def restore_visit_days(value, now):
    if not isinstance(value, list) or len(value) > 36600:
        raise ValueError('Invalid visit receipts')
    for day in value:
        try:
            day_start(day)
        except Problem as error:
            raise ValueError('Invalid visit date') from error
        if day > day_key(now):
            raise ValueError('Future visit receipt')
    if len(set(value)) != len(value):
        raise ValueError('Duplicate visit receipt')
    return sorted(value)


def guide_preferences(state):
    value = state.get('onboarding')
    if 'onboarding' not in state:
        return dict(introSeen=bool(state.get('greeted') or state.get('tasks')), dismissed=any(t.get('rewardClaimed') for t in state.get('tasks', [])))
    if not isinstance(value, dict) or type(value.get('introSeen')) is not bool or type(value.get('dismissed')) is not bool:
        raise ValueError('Invalid guide preferences')
    return dict(introSeen=value['introSeen'], dismissed=value['dismissed'])


def minutes(value, maximum=240, minimum=1):
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not minimum <= value <= maximum:
        raise Problem(f'给自己留一点认真投入的时间吧。用时请填写 {minimum}—{maximum} 分钟。')
    return value


def task_input(value, now, legacy=False):
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
    return dict(title=title.strip(), estimate=minutes(value.get('estimate'), minimum=1 if legacy else 10), startTime=clock, category=category, day=day)


def elapsed(task, now):
    return max(0, task.get('elapsedMs', 0)) + (max(0, now - task['startedAt']) if task['status'] == 'active' and task.get('startedAt') is not None else 0)


def settle(task, now):
    task.update(elapsedMs=elapsed(task, now), startedAt=None)


def completion_issue(task, actual, now):
    ms = elapsed(task, now)
    recorded = math.floor(ms / 60000 + .5)
    if ms < 600000:
        return '这一段计时还不到 10 分钟。给自己一点时间认真试试吧；也可以先记下做了一部分，投入的时间会保留。'
    if isinstance(actual, bool) or not isinstance(actual, (int, float)) or not math.isfinite(actual) or not 10 <= actual <= 525600:
        return '实际用时请填写至少 10 分钟的有效数字。先看看计时记录，再回想一下吧。'
    if abs(actual - recorded) > 5:
        return f'这一段累计计时约 {recorded} 分钟，和填写的用时相差超过 5 分钟。再回想一下吧；如果忘记暂停，可以如实补记，不用为了领奖改成不真实的数字。'
    return ''


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

    if kind == 'VISIT_TOWN':
        day, days = day_key(now), state.get('visitDays', [])
        if not any(d >= day for d in days):
            state['visitDays'] = [*days, day]
            state['coins'] += 10
    elif kind == 'GUIDE_PREFERENCE':
        if type(action.get('dismissed')) is not bool:
            raise Problem('引导设置格式不正确。')
        state['onboarding'] = dict(introSeen=True, dismissed=action['dismissed'])
    elif kind == 'GREET':
        state['onboarding'] = {**guide_preferences(state), 'introSeen': True}
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
            task.update(status='active', startedAt=now, firstStartedAt=task.get('firstStartedAt') if task.get('firstStartedAt') is not None else now, reviewAt=None)
    elif kind == 'REVIEW_TASK':
        if task and task['status'] not in ('done', 'planned'):
            settle(task, now)
            task.update(status='paused', reviewAt=task.get('reviewAt') if task.get('reviewAt') is not None else now)
    elif kind == 'RESET_TASK_TIMER':
        if task and task['status'] != 'done' and elapsed(task, now) > 0:
            note = action.get('note')
            if not isinstance(note, str) or not note.strip():
                raise Problem('写一句真实的情况吧，比如中间去吃饭，忘记暂停了。')
            corrections = task.get('timingCorrections', []) + [dict(at=now, elapsedMs=elapsed(task, now), note=note[:240])]
            task.update(status='partial', elapsedMs=0, startedAt=None, firstStartedAt=None, reviewAt=None, note=note[:240], timingCorrections=corrections)
    elif kind == 'PAUSE_TASK':
        if task and task['status'] == 'active':
            settle(task, now)
            task['status'] = 'paused'
    elif kind == 'RECORD_TASK':
        status = action.get('status')
        if status not in ('partial', 'done'):
            raise Problem('进展状态不正确。')
        if task and task['status'] != 'done':
            actual = action.get('actualMinutes') if status == 'done' else None
            if status == 'done':
                issue = completion_issue(task, actual, now)
                if issue:
                    raise Problem(issue, 422)
            note = action.get('note') or ''
            if not isinstance(note, str):
                raise Problem('备注格式不正确。')
            settle(task, now)
            # reviewAt stops the effort clock; finishedAt is the confirmation
            # receipt so a next-day submission appears in that day's journal.
            task.update(status=status, actualMinutes=actual, note=note[:240], finishedAt=now if status == 'done' else None)
    elif kind == 'CLAIM_REWARD':
        if task and task['status'] == 'done' and not task['rewardClaimed']:
            task['rewardClaimed'] = True
            state['coins'] += 10
    elif kind == 'BUILD':
        item, slot = action.get('itemId'), action.get('slot')
        if item == 'cat-tree' and valid_build_slot(item, slot) and state['coins'] >= 10 and not any(b['itemId'] == 'cat-tree' for b in state['buildings']):
            state['coins'] -= 10
            state['buildings'].append(dict(itemId=item, slot=slot, builtAt=now))
            earn('build')
    elif kind in ('UPGRADE_WORKSHOP','INTERACT_WORKSHOP'):
        try: state=reduce_growth(state,action,now)
        except ValueError as error: raise Problem(str(error))
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
    elif kind in ('ANIMAL_DROP', 'PICKUP_ANIMAL_COIN'):
        state = reduce_animal_rewards(state, action)
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
