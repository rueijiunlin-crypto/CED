import { showImage } from './image-viewer.js';

const trigger = document.querySelector('.campus-map a');
if (trigger) {
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-label', '放大檢視第一校區校園地圖');
  trigger.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    showImage(trigger.querySelector('img'), trigger, '校園地圖放大檢視', { zoom: true });
  });
}
