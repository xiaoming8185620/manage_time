"""Disposable server-clock fixtures. Never opens the household data directory."""
import sys
import tempfile
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from server.web import create_app
from server.domain import day_key
from werkzeug.serving import run_simple

folder = Path(tempfile.mkdtemp(prefix='town-task-time-'))
now = int(time.time()*1000)
app = create_app(folder, ROOT/'dist/family', folder/'no-mail.json')
store = app.extensions['town_store']
store.setup(dict(id='p',username='parent',name='QA 家长',role='parent',password=''),dict(id='c',username='child',name='计时验收小朋友',role='child',password=''),'',now-7200000)
def act(action, at):
    return store.command('c',dict(action=action,operationId=str(uuid.uuid4()),revision=store.state('c')['revision']),at)
act(dict(type='GREET'),now-7200000)
act(dict(type='GUIDE_PREFERENCE',dismissed=True),now-7200000)
for identifier,title,minutes in [('short','时间太短：读十页书',3),('normal','正常完成：整理数学错题',20),('long','超时回顾：阅读并写感受',90)]:
    start=now-minutes*60000
    act(dict(type='ADD_TASK',task=dict(id=identifier,title=title,estimate=15,category='学习',day=day_key(now),startTime='17:00')),start)
    act(dict(type='START_TASK',id=identifier),start)
    act(dict(type='REVIEW_TASK',id=identifier),now)
print(f'临时验收目录：{folder}\n昵称：计时验收小朋友',flush=True)
run_simple('127.0.0.1',4186,app,threaded=True)
