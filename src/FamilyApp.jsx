import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PawPrint, ArrowRight, ArrowLeft, Notebook, CalendarDots, Envelope, SignOut, DownloadSimple, UserCircle, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { App } from './App';
import { api, uniqueId } from './family-api';
import { mergeFamilySnapshot } from './family-sync';
import { dayKey, addDays, weekStart, validDay, statusText } from '../shared/calendar';
import './family.css';

const stamp = ms => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const mailText = { pending: '等待发送', unconfigured: '邮件待配置', sending: '正在发送', sent: '已发送', failed: '发送失败', unknown: '发送结果待确认', disabled: '邮件已关闭' };
const actionText = { UPGRADE_WORKSHOP:'机械港永久升级', INTERACT_WORKSHOP:'和机械伙伴互动', ADD_TASK: '安排了任务', EDIT_TASK: '调整了计划', START_TASK: '开始或继续', PAUSE_TASK: '暂停计时', RECORD_TASK: '记下了进展', CLAIM_REWARD: '领取星球币', GREET: '认识了小乖', BUILD: '建设了小镇', REFLECT: '回顾了用时', IMPORT: '导入旧存档', CARE_SCENE: '照料了小镇', UNLOCK_STORY: '解锁了奥莱手稿', PICKUP_SKY_COIN: '拾起了星球币', PICKUP_ANIMAL_COIN: '拾起动物留下的星球币', BUILD_HABITAT: '添置了伙伴设施' };

export function FamilyApp() {
  const [session, setSession] = useState(null), [error, setError] = useState('');
  const load = useCallback(() => { setError(''); api('session').then(setSession).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  async function logout() { try { await api('logout', {}); setSession(value => ({ ...value, user: null })); } catch (e) { if (e.status === 401) setSession(value => ({ ...value, user: null })); else setError(e.message); } }
  if (!session) return <FamilyCard><PawPrint size={36} /><h1>小乖在等你</h1><p>{error || '正在连接你的小镇…'}</p>{error && <button className="primary-button" onClick={load}>重新连接</button>}</FamilyCard>;
  if (!session.user) return <Login initialized={session.initialized} canSetup={session.canSetup} onLogin={load} />;
  return <TownSession key={session.user.id} session={session} onLogout={logout} sessionError={error} />;
}

function FamilyCard({ children, wide = false }) { return <main className="family-screen auth-screen"><section className={`family-card ${wide ? 'wide' : ''}`}>{children}</section></main>; }

function Login({ initialized, canSetup, onLogin }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const setup = !initialized;
  async function enter(payload) {
    setBusy(true); setError('');
    try { await api(setup ? 'setup' : 'login', payload); onLogin(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await enter({ name: values.name.trim() });
  }
  return <FamilyCard><img className="auth-cat" src="/assets/xiaoguai.png" alt="小乖在等你回到小镇" /><p className="family-eyebrow">星球悬浮小镇 · 家庭版</p><h1>{setup ? '小乖该怎么称呼你？' : '欢迎回到云端'}</h1><p>{setup ? '留下你的名字，和小乖一起开始。昵称就好。' : '输入你的名字，继续和小乖一起建设小镇。'}</p>
    {setup && !canSetup ? <div className="family-note">请先在运行服务的 Mac 上打开 <strong>http://localhost:4180</strong>，输入名字让小镇安家。之后就能在这台设备继续。</div> : <form className="family-form" onSubmit={submit}>
      <label htmlFor="resident-name">你的名字</label><input id="resident-name" name="name" required maxLength={20} autoComplete="nickname" placeholder="例如 小宇" disabled={busy} /><small>下次在 iPad 或电脑上，输入同一个名字就能继续。</small>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-width" disabled={busy}>{busy ? '正在打开小镇…' : '进入小镇'}<ArrowRight size={18} /></button>
      {!setup && <button className="text-button" type="button" disabled={busy} onClick={() => enter({ role: 'parent' })}>家长看记录</button>}
    </form>}<p className="family-caption">每天留下一点真实的成长。每周日 20:00，收到一份温柔的回顾。</p></FamilyCard>;
}

function TownSession({ session, onLogout, sessionError }) {
  const [snapshot, setSnapshot] = useState(null), [screen, setScreen] = useState(session.user.role === 'parent' ? 'journal' : 'town');
  const [problem, setProblem] = useState(null), [busy, setBusy] = useState(false), [offline, setOffline] = useState(false);
  const pending = useRef(null), sending = useRef(false), current = useRef(null), tab = useRef(uniqueId());
  const apply = useCallback(value => {
    const next = mergeFamilySnapshot(current.current, value);
    current.current = next; setSnapshot(next);
  }, []);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      if (pending.current || document.hidden) return;
      try { const data = await api('state'); if (alive && !pending.current) { apply(data); setOffline(false); setProblem(null); } }
      catch (e) { if (alive) { setOffline(true); if (e.status === 401 || !current.current) setProblem(e); } }
    }
    refresh(); const timer = setInterval(refresh, 5000); document.addEventListener('visibilitychange', refresh);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [apply]);
  useEffect(() => {
    if (session.user.role !== 'child') return;
    const beat = () => api('usage', { tab: tab.current, active: !document.hidden }, { keepalive: true }).catch(() => {});
    const leave = () => api('usage', { tab: tab.current, active: false }, { keepalive: true }).catch(() => {});
    beat(); const timer = setInterval(beat, 15000); document.addEventListener('visibilitychange', beat); window.addEventListener('pagehide', leave);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', beat); window.removeEventListener('pagehide', leave); leave(); };
  }, [session.user.role]);
  useEffect(() => {
    function unload(event) { if (pending.current) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload);
  }, []);
  async function sendPending() {
    if (!pending.current || sending.current) return;
    sending.current = true;
    setBusy(true); setProblem(null);
    try { const data = await api('actions', pending.current); apply(data); pending.current = null; setOffline(false); }
    catch (e) { if (e.current) { apply(e.current); pending.current.revision = e.current.revision; } setProblem(e); }
    finally { sending.current = false; setBusy(false); }
  }
  function dispatch(action) {
    if (pending.current || !current.current) return;
    pending.current = { action, operationId: uniqueId(), revision: current.current.revision };
    sendPending();
  }
  // Movement is local-only; action responses and polling preserve the on-screen position.
  function moveAwareDispatch(action) {
    if (action.type === 'MOVE') {
      current.current = { ...current.current, state: { ...current.current.state, boy: action.position } }; setSnapshot(current.current);
    } else dispatch(action);
  }
  if (!snapshot) return <FamilyCard><h1>正在打开小镇</h1><p role={problem ? 'alert' : undefined}>{problem?.message || '读取保存在家里的进度…'}</p>{problem && <button className="secondary-button" onClick={onLogout}>返回入口</button>}</FamilyCard>;
  return <><div inert={busy || !!problem || undefined}>
    {screen === 'town' ? <App cloud={{ ...snapshot, dispatch: moveAwareDispatch, paused: busy || !!problem }} onJournal={() => setScreen('journal')} /> : <Journal session={session} onBack={session.user.role === 'child' ? () => setScreen('town') : null} onLogout={onLogout} onImport={apply} revision={snapshot.revision} />}
    {(offline || sessionError) && <div className="family-connection" role="status">{sessionError || '暂时未连接到 Mac；保存时会提示重试。'}</div>}
  </div>{busy && <div className="family-saving" role="status"><ArrowsClockwise size={22} />正在保存到家里的小镇…</div>}
  {problem && <div className="family-blocker"><section className="family-card" role="alertdialog" aria-label="保存需要重试"><h2>这一小步还需要确认</h2><p>{problem.message}</p><p>当前操作尚未确认保存。重试会核对同一条操作，不会重复领币或重复建造。</p>{pending.current && ![401,403].includes(problem.status) && <button className="primary-button" onClick={sendPending}>重试保存</button>}{[400,409].includes(problem.status) && <button className="text-button" onClick={() => { pending.current = null; setProblem(null); }}>返回小镇，重新调整</button>}{[401,403].includes(problem.status) && <button className="secondary-button" onClick={() => { pending.current = null; location.reload(); }}>重新进入</button>}</section></div>}</>;
}

function Journal({ session, onBack, onLogout, onImport, revision }) {
  const [tab, setTab] = useState('day'), [date, setDate] = useState(dayKey()), [report, setReport] = useState(null), [history, setHistory] = useState([]), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!['day', 'week'].includes(tab) || !validDay(date)) { setReport(null); return; }
    let alive = true; setReport(null); setError('');
    Promise.all([api(`report?mode=${tab}&day=${date}`), api('reports')]).then(([data, list]) => { if (alive) { setReport(data); setHistory(list.reports); } }).catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, [tab, date, refresh, revision]);
  const parent = session.user.role === 'parent';
  return <main className="family-screen journal-screen"><div className="journal-wrap"><header className="journal-header"><div><p className="family-eyebrow"><PawPrint size={18} weight="duotone" />星球悬浮小镇</p><h1>{session.child.name}的成长手记</h1><p>把真实的一天记下来，慢慢认识自己的节奏。</p></div><div className="journal-header-actions">{onBack && <button className="secondary-button" onClick={onBack}><ArrowLeft size={18} />回小镇</button>}<button className="text-button" onClick={onLogout}><SignOut size={18} />返回入口</button></div></header>
    <nav className="journal-tabs" aria-label="成长记录">{[['day','每日手记',Notebook],['week','周任务清单',CalendarDots],['account',parent ? '邮件与存档' : '名字与存档',parent ? Envelope : UserCircle]].map(([value,label,Icon]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}><Icon size={21} />{label}</button>)}</nav>
    {tab === 'account' ? <AccountSettings parent={parent} user={session.user} onImport={onImport} revision={revision} /> : <section className="journal-paper"><div className="journal-date"><button className="icon-button" aria-label={tab === 'week' ? '上一周' : '前一天'} disabled={!validDay(date)} onClick={() => setDate(addDays(date, tab === 'week' ? -7 : -1))}><ArrowLeft size={20} /></button><label htmlFor="record-date">{tab === 'week' ? '选择一周' : '选择日期'}</label><input id="record-date" type="date" value={date} onChange={e => setDate(e.target.value)} /><button className="icon-button" aria-label={tab === 'week' ? '下一周' : '后一天'} onClick={() => setDate(addDays(date, tab === 'week' ? 7 : 1))} disabled={!validDay(date)}><ArrowRight size={20} /></button><button className="text-button" onClick={() => { setDate(dayKey()); setRefresh(n => n + 1); }}>回到{tab === 'week' ? '本周' : '今天'}</button></div>
      {error && <p role="alert" className="form-error">{error}<button className="text-button" onClick={() => setRefresh(n => n + 1)}>重新读取</button></p>}
      {!report && !error && <p className="soft-copy">{validDay(date) ? '正在翻开这页手记…' : '请选择一个日期。'}</p>}
      {report && validDay(date) && <><div className="report-heading"><h2>{tab === 'week' ? `${report.fromDay} — ${report.toDay}` : report.fromDay}</h2><span>北京时间 · 截止 {stamp(report.cutoff)}</span></div><div className="report-stats"><Stat value={report.plannedCount} label="安排的小目标" unit="项" /><Stat value={report.completedCount} label="这段时间完成" unit="项" /><Stat value={report.actualMinutes} label="完成任务自报用时" unit="分钟" /><Stat value={Math.round(report.usageMs / 6000) / 10} label="小镇前台打开时长" unit="分钟" /></div>
      <p className="family-note">前台打开时长只记录页面可见时段，多设备重叠时间不重复计算。任务计时和自报用时分别保留，都不等同于实际专注时长。</p>
      <h3 className="section-heading">{tab === 'week' ? '这一周的任务清单' : '当天安排和有进展的任务'}<span>{report.tasks.length} 项</span></h3>
      {!report.tasks.length ? <div className="journal-empty"><img src="/assets/xiaoguai.png" alt="小乖安静地陪伴你" /><h3>这一页，还留着空白</h3><p>没有任务记录也没关系，休息也是生活的一部分。</p></div> : <div className="journal-tasks">{report.tasks.map(task => <article key={task.id} className="journal-task"><div className="task-row-top"><span className="task-category">{task.category}</span><span className={`status-label ${task.status}`}>{statusText[task.status]}</span></div><h3>{task.title}</h3><p>安排于 {task.day} {task.startTime} · 预计 {task.estimate} 分钟{task.actualMinutes != null && ` · 自报实际 ${task.actualMinutes} 分钟`}</p>{task.recordedLaterAt && <p>这条安排补记于 {stamp(task.recordedLaterAt)}</p>}{task.note && <blockquote>{task.note}</blockquote>}</article>)}</div>}
      <h3 className="section-heading">时间花在哪里</h3><div className="category-summary">{report.categories.map(c => <div key={c.name}><strong>{c.name}</strong><span>计划 {c.plannedMinutes} 分钟</span><span>完成自报 {c.actualMinutes} 分钟</span></div>)}</div>{report.completedCount > 0 && <p className="family-note">这段时间完成的任务，自报总用时比它们的预计{report.estimateDifference === 0 ? '相同' : `${report.estimateDifference > 0 ? '多' : '少'} ${Math.abs(report.estimateDifference)} 分钟`}。下次可以参考这次经验调整估时。</p>}
      {tab === 'day' && <><h3 className="section-heading">留下的小脚印</h3><ol className="activity-list">{report.activities.map((event,index) => <li key={index}><time>{stamp(event.at)}</time><div><strong>{actionText[event.kind] || event.kind}</strong>{event.task && <span>{event.task.title} · {statusText[event.task.status]}</span>}{['UPGRADE_WORKSHOP','INTERACT_WORKSHOP','CARE_SCENE', 'UNLOCK_STORY', 'PICKUP_SKY_COIN','PICKUP_ANIMAL_COIN', 'BUILD_HABITAT'].includes(event.kind) && <p>{event.detail}</p>}{event.kind === 'RECORD_TASK' && event.task?.note && <p>{event.task.note}</p>}</div></li>)}</ol>{!report.activities.length && <p className="soft-copy left">这天没有操作记录。</p>}</>}
      {report.imported && <p className="family-note">包含旧版存档。旧任务的日期和完成情况已保留，但无法还原导入前的每次操作和页面使用时长。</p>}
      {tab === 'week' && <><h3 className="section-heading">周末投递</h3><p className="soft-copy left">每周日 20:00 自动生成站内周报并发送家长邮件。邮件是生成时快照；站内清单会继续收录周日后续的记录。</p>{history.filter(r => r.week === weekStart(date)).map(row => <div className="delivery-row" key={row.id}><CheckCircle size={22} /><div><strong>站内周报已生成</strong><p>{stamp(row.generatedAt)} · {mailText[row.mailStatus]}{row.sentAt ? ` · ${stamp(row.sentAt)}` : ''}</p></div>{parent && ['unknown','failed','disabled','unconfigured'].includes(row.mailStatus) && <button className="text-button" onClick={() => setTab('account')}>查看设置</button>}</div>)}{!history.some(r => r.week === weekStart(date)) && <p className="family-note">这是实时清单；周日 20:00 后会生成本周的投递记录。服务器停机时，恢复后会补生成。</p>}</>}
      </>}
    </section>}
    <footer className="journal-footer">这里记录成长，不给孩子排名。没完成的任务可以继续，也可以调整。</footer>
  </div></main>;
}
function Stat({ value, label, unit }) { return <div><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>; }

function AccountSettings({ parent, user, onImport, revision }) {
  const [settings, setSettings] = useState(null), [history, setHistory] = useState([]), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy,setBusy] = useState(false), [confirmId,setConfirmId] = useState(null);
  useEffect(() => { if (parent) Promise.all([api('settings'), api('reports')]).then(([s,h]) => { setSettings(s); setHistory(h.reports); }).catch(e => setError(e.message)); }, [parent]);
  async function save(event) { event.preventDefault(); setError(''); setBusy(true); try { await api('settings', { mailEnabled: !!settings.mailEnabled }); setMessage('邮件偏好已保存。周报发送时间为每周日 20:00。'); } catch(e) { setError(e.message); } finally { setBusy(false); } }
  async function importFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError('');
    try { if (file.size > 2 * 1024 * 1024) throw new Error('存档文件不能超过 2 MB。'); const data = await api('import', JSON.parse(await file.text())); onImport(data); setMessage('旧小镇已搬过来，可以回小镇继续。'); }
    catch(e) { setError(e instanceof SyntaxError ? '这不是可读取的小镇 JSON 存档。' : e.message); } finally { setBusy(false); event.target.value = ''; }
  }
  async function retry(row) { setBusy(true);setError(''); try { await api(`reports/${row.id}/retry`, { confirmPossibleDuplicate: row.mailStatus === 'unknown' }); setConfirmId(null); setMessage('已加入发送队列，将在一分钟内检查发信配置。'); setHistory((await api('reports')).reports); } catch(e) {setError(e.message);} finally {setBusy(false);} }
  return <section className="journal-paper account-paper"><h2>{parent ? '家长邮件与存档' : '我的名字与存档'}</h2><p className="soft-copy left">{user.name} · {parent ? '家长查看' : '小镇居民'}。进度保存在运行服务的 Mac 上。</p>
    {parent && !settings && !error && <p>正在读取邮件设置…</p>}{settings && <form className="family-form" onSubmit={save}><div><strong>固定收件邮箱</strong><p style={{overflowWrap:'anywhere'}}>{settings.recipient || '等待配置收件地址'}</p><small>周报统一发送到这个地址，无需在页面填写。</small></div><label className="family-checkbox"><input type="checkbox" checked={!!settings.mailEnabled} onChange={e=>setSettings({...settings,mailEnabled:e.target.checked})} />每周日 20:00 接收任务总结邮件</label><p className="family-note">{settings.smtpConfigured ? '发信服务已配置；发送结果会显示在周报投递记录里。' : '邮件待配置，配置完成后会自动发送。站内记录和周报仍可使用。'}</p><button className="primary-button" disabled={busy}>保存邮件偏好</button></form>}
    {parent && history.length > 0 && <><h3 className="section-heading">邮件投递记录</h3>{history.map(row => <div className="delivery-row" key={row.id}><div><strong>{row.week} 这一周</strong><p>{mailText[row.mailStatus]}{row.recipient ? ` · ${row.recipient}` : ''}</p>{row.mailStatus === 'unknown' && <p>请先检查收件箱；再次发送可能收到重复邮件。</p>}</div>{['failed','unknown','disabled','unconfigured'].includes(row.mailStatus) && <button className="secondary-button" disabled={busy} onClick={()=>row.mailStatus==='unknown' && confirmId!==row.id ? setConfirmId(row.id) : retry(row)}>{confirmId===row.id ? '确认重新发送' : '重新尝试'}</button>}</div>)}</>}
    <h3 className="section-heading">小镇存档</h3><a className="secondary-button download-save" href="/api/export" download><DownloadSimple size={20} />导出当前小镇</a><p className="soft-copy left">服务器每天保留一份数据库备份，最近 14 份保存在 data/family/backups。建议另外复制到其他磁盘。</p>
    {!parent && revision === 0 && <div className="import-save"><h3>把原来的小镇搬过来</h3><p>在旧原型的“玩法与存档说明”中导出存档，再选择这个 JSON 文件。导入后不会覆盖原浏览器的数据。</p><label htmlFor="import-save">选择原型存档</label><input id="import-save" type="file" accept="application/json,.json" onChange={importFile} disabled={busy} /></div>}
    {message && <p className="family-note" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
