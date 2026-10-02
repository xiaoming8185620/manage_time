// One-way cloud cargo route. No wheel/rail contact or reversing at the dock.
export const SUPPLY_PERIOD_MS = 70000;
export const SUPPLY_SPOTS = {
  dock: { x: .112, y: .585, width: .175 },
  arm: { x: .214, y: .565, width: .095 },
  lift: { x: .265, y: .790, width: .145 },
};
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
export function supplyAt(ms, liftLevel = 0) {
  const t = Math.max(0, Number.isFinite(ms) ? ms : 0) % SUPPLY_PERIOD_MS / 1000;
  const landingY = liftLevel >= 3 ? .675 : .729;
  let phase = 'rest', x = .13, y = .35, scale = .58, opacity = 0;
  if (t >= 4 && t < 12) {
    const u = ease((t - 4) / 8);
    phase = 'arriving'; x = mix(.13, .105, u); y = mix(.35, .537, u); scale = mix(.58, .96, u); opacity = clamp((t - 4) / 1.5);
  } else if (t >= 12 && t < 30) {
    phase = t < 16 ? 'docking' : t < 20 ? 'scanning' : t < 26 ? 'unloading' : 'ready';
    x = .105; y = .537; scale = .96; opacity = 1;
  } else if (t >= 30 && t < 41) {
    const u = ease((t - 30) / 11);
    phase = 'departing'; x = mix(.105, -.22, u); y = mix(.537, .715, u); scale = mix(.96, 1.06, u); opacity = 1 - clamp((t - 37) / 4);
  }
  const bob = opacity ? Math.sin((t - 4) * Math.PI / 2) * .0016 : 0;
  const cargo = { x: .145, y: .55, opacity: 0, lift: 0 };
  if (t >= 20 && t < 26) {
    const u = ease((t - 20) / 6);
    cargo.x = mix(.145, .205, u); cargo.y = mix(.55, .54, u) - Math.sin(u * Math.PI) * .045; cargo.opacity = clamp((t - 20) / 1.2);
  } else if (t >= 26 && t < 36) {
    const u = ease((t - 26) / 10);
    cargo.x = mix(.205, .265, u); cargo.y = mix(.54, landingY, u) - Math.sin(u * Math.PI) * .035; cargo.opacity = 1;
  } else if (t >= 36 && t < 47) {
    cargo.x = .265; cargo.y = landingY; cargo.opacity = 1 - clamp((t - 44) / 3); cargo.lift = Math.sin(clamp((t - 36) / 8) * Math.PI) * .016;
    cargo.y -= cargo.lift;
  }
  return { t, phase, x, y: y + bob, scale, opacity, cargo,
    gate: t >= 2 && t < 13 ? Math.sin(clamp((t - 2) / 11) * Math.PI) : 0,
    scan: phase === 'scanning' ? Math.sin((t - 16) / 4 * Math.PI) : 0,
    arm: phase === 'unloading' ? Math.sin((t - 20) / 6 * Math.PI) : 0,
    drone: t >= 16 && t < 20 ? { x: .175 + Math.sin(t * 1.2) * .018, y: .44 } : t >= 26 && t < 36 ? { x: cargo.x, y: cargo.y - .065 } : null,
  };
}
export const SUPPLY_PHASE_LABELS = { rest:'等待下一次补给', arriving:'补给舱正在靠近', docking:'定位接驳', scanning:'星梭检查货物', unloading:'机械臂接收货箱', ready:'货物转运 · 准备出发', departing:'下一站，云海补给站' };
