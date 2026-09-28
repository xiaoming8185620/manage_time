export function weatherView(data, now = Date.now()) {
  const w = data?.weather;
  const age = w ? now - w.observedAt : Infinity;
  const available = w && age >= -300000 && age <= 10800000 && data.status !== 'unavailable';
  if (!available) return { kind: 'clear', label: '天气未连接', available: false, night: false, stale: false, wind: 0, cloud: .2 };
  const code = w.code;
  const kind = code >= 95 ? 'thunder' : [71,73,75,77,85,86].includes(code) ? 'snow' : code >= 51 ? 'rain' : [45,48].includes(code) ? 'fog' : [2,3].includes(code) ? 'cloudy' : 'clear';
  const label = { clear: code === 1 ? '晴间多云' : '晴', cloudy: code === 3 ? '阴' : '多云', rain: code >= 80 ? '阵雨' : code < 60 ? '细雨' : '雨', snow: '雪', fog: '雾', thunder: '雷雨' }[kind];
  return { kind, label, available: true, night: !w.isDay, stale: data.status === 'stale' || age > 5400000, wind: w.windSpeed, cloud: w.cloudCover / 100, temperature: Math.round(w.temperature), observedAt: w.observedAt };
}
