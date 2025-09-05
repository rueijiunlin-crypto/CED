// HTML include loader + smart link resolver
document.addEventListener('DOMContentLoaded', async () => {
  const includes = document.querySelectorAll('[data-include]');
  for (const el of includes) {
    const path = el.getAttribute('data-include');
    try {
      const res = await fetch(path);
      const html = await res.text();
      el.outerHTML = html;
    } catch (e) {
      el.innerHTML = `<!-- include failed: ${path} -->`;
    }
  }

  // After header/footer are injected, resolve nav links
  const isInSubdir = /\/areas\//.test(location.pathname);
  const ROOT_PREFIX = window.ROOT_PREFIX || (isInSubdir ? '../' : '');

  // Convert data-link -> href with correct prefix
  document.querySelectorAll('a[data-link]').forEach(a => {
    const target = a.getAttribute('data-link');
    a.setAttribute('href', ROOT_PREFIX + target);
  });
});
