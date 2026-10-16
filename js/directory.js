import { loadDirectory } from './data-service.js';
import { memberCard, groupCard, researchCard, fillGrid, renderAlumni } from './directory-render.js';

const main = document.querySelector('[data-directory]');
const status = document.getElementById('directory-status');
function revealHash() {
  if (!location.hash) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target || !main.contains(target)) {
    status.textContent = '找不到指定項目，資料可能已更新，請瀏覽以下列表。';
    return;
  }
  const details = target.closest('details');
  if (details) details.open = true;
  // Wait for shared header/footer so sticky header height and document layout are ready.
  requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}
try {
  const model = await loadDirectory();
  const section = name => main.querySelector(`[data-section="${name}"]`);
  if (main.dataset.directory === 'members') {
    fillGrid(section('masters'), model.members.filter(m => m.status === 'current' && m.degree === 'master'), m => memberCard(m, model), 'member-grid');
    fillGrid(section('groups'), model.groups.filter(g => g.status === 'current'), g => groupCard(g, model));
    renderAlumni(section('alumni'), model);
  } else {
    for (const category of ['masters', 'undergraduate', 'historical']) {
      fillGrid(section(category), model.research.filter(r => r.category === category), r => researchCard(r, model));
    }
  }
  status.textContent = model.missing ? '部分研究關聯資料待補，其他資料仍可正常瀏覽。' : '';
  await window.includesReady;
  revealHash();
  window.addEventListener('hashchange', revealHash);
} catch (error) {
  console.error('Directory loading failed', error);
  status.textContent = '資料暫時無法載入。請確認透過 HTTP Server 開啟網站，並稍後重試。';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn ghost';
  retry.textContent = '重新載入';
  retry.addEventListener('click', () => location.reload());
  status.append(' ', retry);
}
