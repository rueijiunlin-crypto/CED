function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function showImage(source, trigger, label = '研究圖片放大檢視', { zoom = false } = {}) {
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
  let resizeObserver;
  if (zoom) {
    const controls = node('div', 'image-zoom-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', '圖片縮放');
    const zoomOut = node('button', '', '縮小');
    const zoomIn = node('button', '', '放大');
    const reset = node('button', '', '還原');
    const level = node('span', 'image-zoom-level', '100%');
    level.setAttribute('role', 'status');
    for (const button of [zoomOut, zoomIn, reset]) button.type = 'button';
    controls.append(zoomOut, level, zoomIn, reset);
    const viewport = node('div', 'image-zoom-viewport');
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', '地圖檢視區，放大後可捲動查看細節');
    const stage = node('div', 'image-zoom-stage');
    image.classList.add('image-zoom-image');
    image.draggable = false;
    stage.append(image);
    viewport.append(stage);
    figure.append(controls, node('p', 'image-zoom-hint', '放大後可捲動或滑動查看細節。'), viewport);
    let scale = 1;
    const update = () => {
      const ready = image.naturalWidth > 0;
      zoomOut.disabled = !ready || scale === 1;
      zoomIn.disabled = !ready || scale === 4;
      reset.disabled = !ready || scale === 1;
      level.textContent = `${Math.round(scale * 100)}%`;
      if (!ready) return;
      const ratio = image.naturalWidth / image.naturalHeight;
      const width = Math.min(viewport.clientWidth, viewport.clientHeight * ratio) * scale;
      const height = width / ratio;
      image.style.width = `${width}px`;
      image.style.height = `${height}px`;
      stage.style.width = `${Math.max(viewport.clientWidth, width)}px`;
      stage.style.height = `${Math.max(viewport.clientHeight, height)}px`;
    };
    zoomOut.addEventListener('click', () => { scale = Math.max(1, scale - 0.5); update(); });
    zoomIn.addEventListener('click', () => { scale = Math.min(4, scale + 0.5); update(); });
    reset.addEventListener('click', () => {
      scale = 1;
      update();
      viewport.scrollTo(0, 0);
    });
    image.addEventListener('load', update);
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(viewport);
    update();
  } else figure.append(image);
  const caption = trigger.closest('figure').querySelector('figcaption');
  if (caption) figure.append(node('figcaption', '', caption.textContent));
  dialog.append(close, figure);
  close.addEventListener('click', () => dialog.close());
  // Keep keyboard focus inside the modal, including optional zoom controls.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
      const index = focusable.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      focusable[next].focus();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener(
    'close',
    () => {
      document.documentElement.classList.remove('research-image-open');
      resizeObserver?.disconnect();
      dialog.remove();
      if (trigger.isConnected) trigger.focus();
    },
    { once: true },
  );
  document.body.append(dialog);
  document.documentElement.classList.add('research-image-open');
  dialog.showModal();
}
