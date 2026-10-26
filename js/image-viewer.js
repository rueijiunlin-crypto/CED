function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function showImage(source, trigger, label = '研究圖片放大檢視') {
  const dialog = node('dialog', 'research-image-viewer');
  dialog.setAttribute('aria-label', label);
  const close = node('button', 'research-image-close', '關閉圖片');
  close.type = 'button';
  close.autofocus = true;
  const figure = node('figure');
  const image = node('img');
  image.alt = source.alt;
  image.addEventListener(
    'error',
    () => image.replaceWith(node('p', '', '圖片暫時無法載入。')),
    { once: true },
  );
  image.src = source.src;
  figure.append(image);
  const caption = trigger.closest('figure').querySelector('figcaption');
  if (caption) figure.append(node('figcaption', '', caption.textContent));
  dialog.append(close, figure);
  close.addEventListener('click', () => dialog.close());
  // The close button is the viewer's only focusable control.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      close.focus();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener(
    'close',
    () => {
      document.documentElement.classList.remove('research-image-open');
      dialog.remove();
      if (trigger.isConnected) trigger.focus();
    },
    { once: true },
  );
  document.body.append(dialog);
  document.documentElement.classList.add('research-image-open');
  dialog.showModal();
}
