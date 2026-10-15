// Public, read-only quota display for this batch. It never submits a wish.
(() => {
  let label = null;
  const token = new URLSearchParams(location.hash.slice(1)).get('w02w03play');
  function attach() {
    const panel = document.querySelector('.forge-preview');
    if (!panel) return;
    if (!label) {
      label = document.createElement('p');
      label.id = 'w02w03-budget-status';
      label.setAttribute('role', 'status');
      label.style.cssText = 'font:13px/1.45 sans-serif;color:#ffcf81;background:#261c21;padding:8px;border-radius:8px';
    }
    if (label.parentElement !== panel) panel.prepend(label);
  }
  async function refresh() {
    attach();
    if (!label) return;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      label.textContent = '需要本批私人试玩链接；不会自动生成愿望。';
      return;
    }
    try {
      const configResponse = await fetch('./runtime-config.json', { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('CONFIG');
      const config = await configResponse.json();
      const response = await fetch(new URL('/status', config.apiBase), {
        method: 'GET', cache: 'no-store', credentials: 'omit',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('STATUS');
      const state = await response.json();
      if (state.kind !== 'DF_W02_W03_REAL_MOBILE') throw new Error('BATCH');
      label.textContent = `本批已用 ${state.callsUsed}/4 次；` +
        (state.newWishEnabled ? `可手动补验 ${state.conditionalRemainingCalls} 次（W02/W03 各最多一次）。` :
          '现有外观补验尚未开放。') + ' 已生成愿望可零调用回放。';
    } catch { label.textContent = '本批状态暂不可读取；不会自动生成愿望。'; }
  }
  const timer = setInterval(() => { attach(); void refresh(); }, 5000);
  void timer;
  window.addEventListener('DOMContentLoaded', () => { attach(); void refresh(); });
})();
