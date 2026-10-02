"""Isolated manual QA server: disposable progress, no outgoing mail worker."""
import sys
import tempfile
import time
import uuid
from pathlib import Path
from unittest.mock import patch
from werkzeug.serving import run_simple

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from server.web import create_app
from server.domain import day_key

folder = Path(tempfile.mkdtemp(prefix='town-system-audit-'))
now = int(time.time() * 1000)
app = create_app(folder, ROOT / 'dist/family', folder / 'no-mail.json')
store = app.extensions['town_store']
store.setup(dict(id='p',username='parent',name='验收家长',role='parent',password=''),
            dict(id='c',username='child',name='系统验收',role='child',password=''), '', now-14*86400000)

def act(action, at=now):
    return store.command('c',dict(action=action,operationId=str(uuid.uuid4()),revision=store.state('c')['revision']),at)

for day in range(12, 0, -1):
    store.visit('c', now-day*86400000)
for identifier, title, minutes in [('short','阅读十页书',3), ('normal','整理数学错题',20)]:
    start = now-minutes*60000
    act(dict(type='ADD_TASK',task=dict(id=identifier,title=title,estimate=15,category='学习',day=day_key(now),startTime='17:00')),start)
    act(dict(type='START_TASK',id=identifier),start)
    act(dict(type='REVIEW_TASK',id=identifier))
with patch('server.sky_rewards.secrets.randbelow',return_value=0):
    act(dict(type='COLLECT_CRYSTAL',attempt=1))
print(f'临时验收数据：{folder}\n登录昵称：系统验收',flush=True)
run_simple('127.0.0.1',4186,app,threaded=True)
