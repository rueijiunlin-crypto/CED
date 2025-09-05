// 全站共用腳本
document.addEventListener('DOMContentLoaded', () => {
  // 版權年份
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  // 語言切換（示例）
  const langBtn = document.getElementById('langBtn');
  let lang = 'zh';
  if (langBtn) {
    langBtn.addEventListener('click', (e) => {
      e.preventDefault();
      lang = (lang === 'zh') ? 'en' : 'zh';
      document.querySelectorAll('[data-i18n-zh]').forEach((el) => {
        el.textContent = el.getAttribute(`data-i18n-${lang}`) || el.textContent;
      });
    });
  }
});
