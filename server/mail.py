import json
import re
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from .domain import TZ, STATUSES


def read_config(path):
    try:
        value = json.loads(Path(path).read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def recipient_from(config):
    value = config.get('recipient', '')
    if not isinstance(value, str):
        return ''
    value = value.strip()
    # Accept one bare mailbox only, never a list, display name or header value.
    if len(value) <= 254 and re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}", value):
        return value
    return ''


def mail_config(path):
    value = read_config(path)
    try:
        if recipient_from(value) and all(isinstance(value.get(k), str) and value[k].strip() for k in ('host', 'username', 'password', 'from')) and int(value.get('port', 465)) in (465, 587):
            return {**value, 'recipient': recipient_from(value)}
    except (ValueError, TypeError):
        pass
    return None


def message_for(report, child_name, recipient, sender):
    data = json.loads(report['data'])
    cutoff = datetime.fromtimestamp(data['cutoff'] / 1000, TZ).strftime('%m月%d日 %H:%M')
    lines = [f'{child_name}的星球悬浮小镇周任务清单', f"{data['fromDay']} — {data['toDay']}", f'记录截止：{cutoff}（北京时间）', '',
             f"本周安排 {data['plannedCount']} 项，本周完成 {data['completedCount']} 项。", f"完成任务的自报用时：{data['actualMinutes']:g} 分钟。", f"小镇前台打开时长：约 {round(data['usageMs'] / 60000, 1)} 分钟（不代表学习或专注时长）。", '', '任务清单：']
    for task in data['tasks']:
        lines.append(f"- [{STATUSES[task['status']]}] {task['title']} / {task['category']} / 安排于 {task['day']} / 预计 {task['estimate']:g} 分钟" + (f" / 自报实际 {task['actualMinutes']:g} 分钟" if task.get('actualMinutes') else ''))
        if task.get('note'):
            lines.append('  备注：' + task['note'])
    if not data['tasks']:
        lines.append('- 这周还没有记录任务。留白也没关系。')
    lines += ['', '分类用时（计划 / 本周完成任务的自报实际）：'] + [f"- {r['name']}：{r['plannedMinutes']:g} / {r['actualMinutes']:g} 分钟" for r in data['categories']]
    lines += ['', '可以一起聊聊：哪件事比预计更费时间？下周想留出什么休息时间？', '这是一份记录，不是评分。没有完成的事情可以继续或调整。', '邮件是生成时的快照；周日晚些时候补充的记录，可在站内周报查看。']
    message = EmailMessage()
    message['Subject'] = f"星球悬浮小镇 · {data['fromDay']} 周任务总结"
    message['From'], message['To'] = sender, recipient
    message['Message-ID'] = f"<week-{report['id']}@miaomiao.local>"
    message.set_content('\n'.join(lines))
    return message


def send_message(config, message):
    port, context = int(config.get('port', 465)), ssl.create_default_context()
    if port == 465:
        smtp = smtplib.SMTP_SSL(config['host'], port, timeout=20, context=context)
    else:
        smtp = smtplib.SMTP(config['host'], port, timeout=20)
    with smtp:
        if port == 587:
            smtp.starttls(context=context)
        smtp.login(config['username'], config['password'])
        rejected = smtp.send_message(message)
        if rejected:
            raise smtplib.SMTPRecipientsRefused(rejected)


def run_jobs(store, now, config_path, sender=send_message):
    store.generate_due_reports(now)
    settings = store.settings()
    if not settings:
        return
    store.backup(now)
    store.write('DELETE FROM sessions WHERE expires<?', (now,))
    store.write('DELETE FROM usage_cursor WHERE last_at<?', (now - 86400000,))
    if not settings['mailEnabled']:
        return
    config = mail_config(config_path)
    for report in store.all("SELECT * FROM reports WHERE mail_status IN ('pending','unconfigured','failed') AND attempts<3 ORDER BY week"):
        if not config:
            store.write("UPDATE reports SET mail_status='unconfigured' WHERE id=?", (report['id'],))
            continue
        if report['attempted_at'] and now - report['attempted_at'] < 15 * 60000:
            continue
        # Claim durably before contacting SMTP; an interrupted send becomes 'unknown'.
        claimed = store.write("UPDATE reports SET mail_status='sending',attempts=attempts+1,attempted_at=?,recipient=? WHERE id=? AND mail_status IN ('pending','unconfigured','failed')", (now, config['recipient'], report['id']))
        if not claimed.rowcount:
            continue
        try:
            sender(config, message_for(report, store.child()['name'], config['recipient'], config['from']))
            store.write("UPDATE reports SET mail_status='sent',sent_at=? WHERE id=?", (now, report['id']))
        except (smtplib.SMTPAuthenticationError, smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused, smtplib.SMTPNotSupportedError):
            store.write("UPDATE reports SET mail_status='failed' WHERE id=?", (report['id'],))
        except Exception:
            # A timeout/disconnect may occur after acceptance. Do not risk duplicates.
            store.write("UPDATE reports SET mail_status='unknown' WHERE id=?", (report['id'],))
