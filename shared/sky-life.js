// Time is active scene time: panels, hidden tabs and motion preferences freeze it.
export const SKY_CYCLE_MS = 168_000;
const flights = [
  { kind: 'courier', start: 2, duration: 24, route: [[0,.52,-.08],[.25,.65,.075],[.7,.9,.14],[1,1.13,.12]] },
  { kind: 'collector', start: 13, duration: 31, route: [[0,1.1,.30],[.25,.79,.21],[.7,.77,.20],[1,1.12,.08]], activity: [.25,.7,'collecting'] },
  { kind: 'carpet', start: 28, duration: 26, approach: 0 },
  { kind: 'inspector', start: 46, duration: 32, route: [[0,1.1,.75],[.23,.88,.73],[.5,.87,.73],[.65,.60,.79],[.8,.60,.79],[1,-.14,.82]], activity: [.23,.8,'inspecting'] },
  { kind: 'meteor', start: 82, duration: 2.5, route: [[0,.58,.015],[1,.94,.24]] },
  { kind: 'courier', start: 90, duration: 22, route: [[0,.52,-.08],[.3,.68,.06],[1,1.14,.1]] },
  { kind: 'carpet', start: 115, duration: 26, approach: 1 },
  { kind: 'collector', start: 137, duration: 28, route: [[0,1.12,.30],[.25,.79,.19],[.72,.77,.18],[1,1.12,.03]], activity: [.25,.72,'collecting'] },
  { kind: 'meteor', start: 148, duration: 2.5, route: [[0,.63,.005],[1,.99,.19]] },
];
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => value * value * (3 - 2 * value);
const bezier = (points, t) => [0, 1].map(axis => (1-t)**3*points[0][axis] + 3*(1-t)**2*t*points[1][axis] + 3*(1-t)*t*t*points[2][axis] + t**3*points[3][axis]);
function carpetVisit(t, seconds, approach) {
  const anchor = [.28, .946];
  const arriving = t < .34, greeting = t >= .34 && t < .53;
  const arrival = ease(clamp(t / .34)), departure = ease(clamp((t - .53) / .47));
  const entrances = [
    [[-.10,.97],[.04,.88],[.17,1.02],anchor],
    [[.14,1.09],[.05,.94],[.25,.875],anchor],
  ];
  const exits = [
    [anchor,[.41,.89],[.17,1.03],[-.10,1.04]],
    [anchor,[.37,.99],[.14,.96],[.09,1.10]],
  ];
  const [x,y] = arriving ? bezier(entrances[approach],arrival) : greeting ? anchor : bezier(exits[approach],departure);
  const hello = clamp((t-.34)/.19);
  // One slow bow, then a gentle yaw toward the clouds. All motion shares the pause clock.
  return { x,y,phase:arriving ? 'arriving' : greeting ? 'greeting' : 'departing',
    bob: Math.sin(seconds*1.2)*1.2 + (greeting ? Math.sin(hello*Math.PI*2)*2 : 0),
    roll: greeting ? Math.sin(hello*Math.PI*2)*7 : arriving ? -5*Math.sin(arrival*Math.PI) : 11*Math.sin(departure*Math.PI),
    yaw: arriving || greeting ? 0 : 180*ease(clamp((t-.53)/.13)),
    scale: arriving ? .72+.28*arrival : 1-.32*departure,
    opacity: arriving ? clamp(t/.13) : 1-clamp((t-.76)/.19),
    mist: arriving ? .45*(1-arrival) : .65*departure,
    helloOpacity: greeting ? Math.min(clamp(hello/.18),clamp((1-hello)/.18)) : 0,
  };
}
export function skyVisitorsAt(elapsedMs) {
  const seconds = ((Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) % SKY_CYCLE_MS) / 1000);
  return flights.flatMap((flight, index) => {
    const t = (seconds - flight.start) / flight.duration;
    if (t < 0 || t >= 1) return [];
    const id = `${Math.floor(Math.max(0, elapsedMs) / SKY_CYCLE_MS)}-${index}`;
    if (flight.kind === 'carpet') return [{ id, kind: flight.kind, depth:'cloud', ...carpetVisit(t,seconds,flight.approach) }];
    const segment = flight.route.findIndex((point, i) => i > 0 && t <= point[0]);
    const a = flight.route[segment - 1], b = flight.route[segment];
    const raw = (t - a[0]) / (b[0] - a[0]);
    const u = flight.activity ? raw * raw * (3 - 2 * raw) : raw;
    const phase = flight.activity && t >= flight.activity[0] && t <= flight.activity[1] ? flight.activity[2] : 'cruising';
    return [{
      id, kind: flight.kind, phase, depth: flight.kind === 'inspector' ? 'near' : 'far',
      x: a[1] + (b[1] - a[1]) * u,
      y: a[2] + (b[2] - a[2]) * u,
      bob: flight.kind === 'meteor' ? 0 : Math.sin(seconds * 1.65 + index) * (flight.activity ? 3 : 1.5),
      roll: flight.kind === 'meteor' ? 29 : Math.sin(seconds * .8) * 1.3,
      opacity: Math.min(clamp(t / .08), clamp((1 - t) / .08)),
    }];
  });
}

// A long frame or suspended browser must never skip forward through a visit.
export function advanceSkyClock(elapsed, delta, paused) {
  return paused || !Number.isFinite(delta) ? elapsed : (elapsed + Math.max(0, Math.min(delta, 100))) % SKY_CYCLE_MS;
}
