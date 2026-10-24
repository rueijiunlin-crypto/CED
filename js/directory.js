import { loadDirectory } from './data-service.js';
import {
  memberCard,
  groupCard,
  researchListCard,
  researchDetail,
  researchDetailHref,
  fillGrid,
  renderAlumni,
} from './directory-render.js';

const main = document.querySelector('[data-directory]');
const status = document.getElementById('directory-status');
function revealHash(model) {
  if (!location.hash) return;
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (main.dataset.directory === 'areas') {
    // Earlier student-level sections now point to the lab-wide current section.
    if (['masters', 'undergraduate'].includes(id)) id = 'current';
    const topic = model.researchById.get(id.replace(/^research-/, ''));
    if (topic && !['current', 'historical'].includes(topic.category)) {
      location.replace(researchDetailHref(topic));
      return;
    }
  }
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
  let pageMessage = '';
  const section = (name) => main.querySelector(`[data-section="${name}"]`);
  if (main.dataset.directory === 'members') {
    fillGrid(
      section('masters'),
      model.members.filter(
        (m) => m.status === 'current' && m.degree === 'master',
      ),
      (m) => memberCard(m, model),
      'member-grid',
    );
    fillGrid(
      section('groups'),
      model.groups.filter((g) => g.status === 'current'),
      (g) => groupCard(g, model),
    );
    renderAlumni(section('alumni'), model);
  } else if (main.dataset.directory === 'research-detail') {
    const id =
      main.dataset.researchId || new URLSearchParams(location.search).get('id');
    const topic = model.researchById.get(id);
    const container = section('detail');
    container.replaceChildren();
    if (topic) {
      container.append(researchDetail(topic, model));
      const heading = main.querySelector('[data-research-title]');
      if (heading) heading.textContent = topic.title;
      document.title = `${topic.title} | CED Lab`;
    } else {
      pageMessage = '找不到這項研究，請返回研究領域瀏覽其他主題。';
    }
  } else {
    for (const category of ['current', 'historical']) {
      fillGrid(
        section(category),
        model.research.filter((r) => r.category === category),
        (r) => researchListCard(r),
        'research-list',
      );
    }
  }
  status.textContent =
    pageMessage ||
    (model.missing ? '部分研究關聯資料待補，其他資料仍可正常瀏覽。' : '');
  await window.includesReady;
  revealHash(model);
  window.addEventListener('hashchange', () => revealHash(model));
} catch (error) {
  console.error('Directory loading failed', error);
  status.textContent =
    '資料暫時無法載入。請確認透過 HTTP Server 開啟網站，並稍後重試。';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn ghost';
  retry.textContent = '重新載入';
  retry.addEventListener('click', () => location.reload());
  status.append(' ', retry);
}
