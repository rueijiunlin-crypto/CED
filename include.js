// Shared partial loader. Expose readiness for features that depend on the header/footer.
window.includesReady = new Promise(resolve => {
  document.addEventListener('DOMContentLoaded', async () => {
    for (const el of document.querySelectorAll('[data-include]')) {
      const path = el.getAttribute('data-include');
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        el.outerHTML = await res.text();
      } catch (error) {
        el.textContent = '共用區塊暫時無法載入，請重新整理頁面。';
        console.error(`Include failed: ${path}`, error);
      }
    }
    const isInSubdir = /\/areas\//.test(location.pathname);
    const prefix = window.ROOT_PREFIX || (isInSubdir ? '../' : '');
    document.querySelectorAll('a[data-link]').forEach(a => {
      a.setAttribute('href', prefix + a.getAttribute('data-link'));
    });
    resolve();
  });
});
