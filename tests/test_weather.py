import tempfile
import unittest
from pathlib import Path
from server.weather import WeatherService, normalize, TTL, MAX_AGE
from server.web import create_app

NOW = 1790305200000
def sample(at=NOW, code=0):
    return {'current':dict(time=at/1000,temperature_2m=26.5,weather_code=code,is_day=1,cloud_cover=20,wind_speed_10m=9,precipitation=0)}

class WeatherTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.now=NOW; self.calls=0; self.fail=False
    def tearDown(self):
        self.temp.cleanup()
    def fetch(self):
        self.calls+=1
        if self.fail: raise OSError('offline')
        return sample(self.now)
    def service(self):
        return WeatherService(self.temp.name,lambda:self.now,self.fetch)
    def test_cache_deduplicates_and_survives_restart(self):
        service=self.service()
        self.assertEqual(service.get()['status'],'live')
        service.get(); self.service().get()
        self.assertEqual(self.calls,1)
        self.now+=TTL
        service.get(); self.assertEqual(self.calls,2)
    def test_offline_stale_expiry_and_recovery(self):
        service=self.service(); service.get(); self.fail=True; self.now+=TTL
        self.assertEqual(service.get()['status'],'stale')
        service.get(); self.assertEqual(self.calls,2)
        self.now=NOW+MAX_AGE+1
        self.assertEqual(service.get()['status'],'unavailable')
        self.assertIsNone(service.get()['weather'])
        self.fail=False; self.now+=60000
        self.assertEqual(service.get()['status'],'live')
    def test_first_failure_has_no_invented_weather(self):
        self.fail=True
        result=self.service().get()
        self.assertIsNone(result['weather']); self.assertEqual(result['status'],'unavailable')
    def test_invalid_and_expired_provider_data_rejected(self):
        for key,value in [('time',(NOW+300001)/1000),('time',(NOW-MAX_AGE-1)/1000),('temperature_2m',float('nan')),('weather_code',4),('is_day',True),('wind_speed_10m',-1)]:
            with self.subTest(key=key,value=value):
                data=sample();data['current'][key]=value
                with self.assertRaises(ValueError):normalize(data,NOW)
    def test_malformed_response_is_unavailable(self):
        for raw in [[], None, {'current': []}, {'current': None}]:
            with self.subTest(raw=raw):
                with self.assertRaises(ValueError): normalize(raw, NOW)

    def test_endpoint_is_fixed_city_and_does_not_create_game_state(self):
        app=create_app(self.temp.name,Path(__file__).resolve().parents[1]/'dist/family',Path(self.temp.name)/'mail.json',clock=lambda:self.now,weather_fetcher=self.fetch)
        client=app.test_client(); store=app.extensions['town_store']
        try:
            result=client.get('/api/weather?latitude=0&longitude=0')
            self.assertEqual(result.status_code,200)
            self.assertEqual(result.json['city'],'浙江 · 杭州')
            self.assertEqual(result.json['weather']['temperature'],26.5)
            self.assertEqual(self.calls,1)
            self.assertEqual(client.get('/api/session').json['initialized'],False)
        finally:store.close()
