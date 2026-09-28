export function uniqueId() {
  // randomUUID is unavailable on plain HTTP LAN origins; getRandomValues works there.
  if (crypto.randomUUID) return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
}
export async function api(path, data, options = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`/api/${path}`, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: controller.signal, ...options });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || '暂时无法完成操作。'), { status: response.status, current: result.current });
    return result;
  } catch (error) {
    if (error.status) throw error;
    throw new Error('暂时连不上小镇服务器，请检查 Mac 和家庭 Wi-Fi。');
  } finally { clearTimeout(timer); }
}
export function exportLocalSave(state) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'miaomiao-save.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
