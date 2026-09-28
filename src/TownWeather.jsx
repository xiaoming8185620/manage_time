import React, { useEffect, useState } from 'react';
import { Sun, Moon, CloudSun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, Drop, Snowflake, ArrowClockwise, Wind } from '@phosphor-icons/react';
import { weatherView } from '../shared/weather';
import './weather.css';

export function useTownWeather() {
  const [data, setData] = useState(null), [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true, controller;
    async function update() {
      if (document.hidden) return;
      controller?.abort(); const requestController = new AbortController(); controller = requestController;
      if (alive) setLoading(true);
      const timeout = setTimeout(() => requestController.abort(), 12000);
      try {
        const response = await fetch('/api/weather', { signal: requestController.signal });
        if (!response.ok) throw new Error('weather unavailable');
        const next = await response.json();
        if (!['live','stale','unavailable'].includes(next.status)) throw new Error('invalid weather');
        if (alive && controller === requestController) setData(next);
      } catch { if (alive && controller === requestController) setData(previous => previous ? { ...previous, status: previous.weather ? 'stale' : 'unavailable' } : { status: 'unavailable' }); }
      finally { clearTimeout(timeout); if (alive && controller === requestController) setLoading(false); }
    }
    update(); const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { alive = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [revision]);
  return { data, loading, refresh: () => setRevision(value => value + 1) };
}

export function WeatherIcon({ view, ...props }) {
  const Icon = view.kind === 'clear' ? view.night ? Moon : Sun : view.kind === 'cloudy' ? view.cloud < .7 && !view.night ? CloudSun : Cloud : { rain: CloudRain, snow: CloudSnow, fog: CloudFog, thunder: CloudLightning }[view.kind] || Cloud;
  return <Icon {...props} />;
}
export function WeatherChip({ data, loading, now, onOpen }) {
  const view = weatherView(data, now);
  return <button className="weather-chip" onClick={onOpen} aria-label="查看杭州天气"><WeatherIcon view={view} size={19} weight="duotone" /><span>杭州 · {view.available ? `${view.label} ${view.temperature}°` : loading ? '同步天气…' : '天气待更新'}</span>{view.stale && <small>上次</small>}</button>;
}
const clock = at => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai', hour12: false }).format(at);
export function WeatherDetails({ data, loading, refresh, now }) {
  const view = weatherView(data, now);
  return <div className="weather-details">
    <div className="weather-summary"><WeatherIcon view={view} size={66} weight="duotone" /><div><strong>{view.available ? `${view.temperature}°` : '—'}</strong><span>{view.available ? `${view.label} · ${view.night ? '夜晚' : '白天'}` : '暂时没有连上天气'}</span></div></div>
    <p>浙江省杭州市 · 跟随这座城市的天空</p>
    {view.available ? <><div className="weather-metrics"><span><Wind size={18} />风速 {data.weather.windSpeed} km/h</span><span><Drop size={18} />降水 {data.weather.precipitation} mm</span></div><p className="weather-status">{view.stale ? '同步暂未更新，正在展示上次天气。' : '小镇正在跟随当前天气。'}<br />天气时间：{clock(view.observedAt)}<br />最近同步：{clock(data.fetchedAt)}</p></> : <p className="weather-status">暂用柔和晴景，天气恢复后自动同步。不会影响任务、星球币或植物成长。</p>}
    <p className="weather-gentle">晴雨只改变小镇氛围。花草的成长，仍来自你亲手照料。暂停小镇动态，也会暂停雨雪和云雾。</p>
    <button className="secondary-button full-width" disabled={loading} onClick={refresh}><ArrowClockwise size={19} />{loading ? '正在同步…' : '重新同步天气'}</button>
    <small className="weather-source">数据来自 <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · 气象模型当前值，每 10 分钟同步。固定杭州，无需设备定位。</small>
  </div>;
}
export function WeatherAtmosphere({ view, paused }) {
  const falling = ['rain','thunder','snow'].includes(view.kind);
  return <div className={`weather-atmosphere ${view.kind} ${view.night ? 'night' : ''} ${paused ? 'weather-paused' : ''}`} aria-hidden="true" style={{ '--weather-wind': `${Math.min(view.wind, 35) * .7 + 5}px`, '--weather-cloud': view.cloud, '--weather-shade': view.night ? .51 : view.kind === 'thunder' ? .30 : view.kind === 'rain' ? .18 : view.kind === 'cloudy' ? .09 : view.kind === 'fog' ? .12 : 0 }}>
    <div className="weather-veil" />
    {['cloudy','rain','thunder','fog','snow'].includes(view.kind) && <div className="weather-clouds"><img src="/assets/cloud-drift.png" alt="" /><img src="/assets/cloud-drift.png" alt="" /></div>}
    {falling && <div className="weather-precipitation">{Array.from({ length: view.kind === 'snow' ? 26 : 42 }, (_, i) => { const Icon = view.kind === 'snow' ? Snowflake : Drop; return <Icon key={i} weight="fill" className="weather-particle" style={{ left: `${(i * 37.71) % 100}%`, '--delay': `${-i * .47}s`, '--fall-speed': `${view.kind === 'snow' ? 7 + i % 5 : 1.1 + (i % 7) * .13}s`, '--particle-size': `${view.kind === 'snow' ? 5 + i % 6 : 4 + i % 4}px` }} />; })}</div>}
  </div>;
}
