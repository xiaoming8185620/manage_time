export const MOTION_KEY = 'planet-town:motion';
export function readMotionPreference(storage) {
  try {
    const value = storage.getItem(MOTION_KEY);
    return value === 'on' || value === 'off' ? value : 'system';
  } catch { return 'system'; }
}
export function motionEnabled(preference, reduced) {
  return preference === 'on' || (preference !== 'off' && !reduced);
}
