"""Fixed-city current weather with bounded requests and honest stale states."""
import json
import math
import threading
from pathlib import Path
from urllib.request import Request, urlopen

URL = ('https://api.open-meteo.com/v1/forecast?latitude=30.2741&longitude=120.1551'
       '&current=temperature_2m,weather_code,is_day,cloud_cover,wind_speed_10m,precipitation'
       '&timezone=Asia%2FShanghai&timeformat=unixtime&forecast_days=1')
CODES = {0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99}
TTL = 10 * 60000
FRESH_AGE = 90 * 60000
MAX_AGE = 3 * 3600000


def fetch_current():
    with urlopen(Request(URL, headers={'User-Agent': 'FloatingPlanetTown/1.0'}), timeout=8) as response:
        return json.loads(response.read(65537))


def normalize(raw, now):
    if not isinstance(raw, dict) or not isinstance(raw.get('current'), dict):
        raise ValueError('Invalid weather response')
    current = raw['current']
    specs = {'time': (0, now / 1000 + 300), 'temperature_2m': (-70, 65),
             'weather_code': (0, 99), 'cloud_cover': (0, 100),
             'wind_speed_10m': (0, 500), 'precipitation': (0, 1000), 'is_day': (0, 1)}
    for key, (low, high) in specs.items():
        value = current.get(key)
        if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError('Invalid weather value')
    if current['weather_code'] not in CODES or current['is_day'] not in (0, 1):
        raise ValueError('Unsupported weather code')
    if now - current['time'] * 1000 > MAX_AGE:
        raise ValueError('Weather observation is too old')
    return dict(observedAt=int(current['time'] * 1000), temperature=current['temperature_2m'],
                code=int(current['weather_code']), isDay=bool(current['is_day']),
                cloudCover=current['cloud_cover'], windSpeed=current['wind_speed_10m'],
                precipitation=current['precipitation'])


class WeatherService:
    def __init__(self, data_dir, clock, fetcher=fetch_current):
        self.clock, self.fetcher = clock, fetcher
        self.path = Path(data_dir) / 'weather-cache.json'
        self.lock = threading.Lock()
        self.sample, self.fetched_at, self.next_attempt, self.failed = None, None, 0, False
        try:
            saved = json.loads(self.path.read_text())
            # Persist the provider shape and revalidate it on every restart.
            self.sample = normalize(saved['raw'], clock())
            stamp = saved['fetchedAt']
            if type(stamp) not in (int, float) or not math.isfinite(stamp) or not 0 <= stamp <= clock():
                raise ValueError('Invalid cache timestamp')
            self.fetched_at = stamp
            self.next_attempt = min(stamp + TTL, clock() + TTL)
        except (OSError, ValueError, KeyError, TypeError):
            self.sample, self.fetched_at = None, None

    def get(self):
        with self.lock:
            now = self.clock()
            if now >= self.next_attempt:
                self.next_attempt = now + 60000
                try:
                    raw = self.fetcher()
                    sample = normalize(raw, self.clock())
                    self.sample, self.fetched_at, self.failed = sample, self.clock(), False
                    self.next_attempt = self.fetched_at + TTL
                    try:
                        temporary = self.path.with_suffix('.tmp')
                        temporary.write_text(json.dumps(dict(raw=raw, fetchedAt=self.fetched_at)))
                        temporary.replace(self.path)
                    except OSError:
                        pass  # A cache write failure does not invalidate fresh provider data.
                except (OSError, ValueError, KeyError, TypeError):
                    self.failed = True
            now = self.clock()
            age = now - self.sample['observedAt'] if self.sample else MAX_AGE + 1
            sample = self.sample if -300000 <= age <= MAX_AGE else None
            status = 'unavailable' if sample is None else 'stale' if self.failed or age > FRESH_AGE else 'live'
            return dict(city='浙江 · 杭州', status=status, weather=sample, fetchedAt=self.fetched_at,
                        nextUpdateAt=self.next_attempt, source='Open-Meteo',
                        sourceUrl='https://open-meteo.com/', sourceNote='当前天气为气象模型估算，每 10 分钟同步一次。')
