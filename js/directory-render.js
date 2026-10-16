const ROOT = new URL('../', import.meta.url);
const PLACEHOLDER = new URL('image/member-placeholder.svg', ROOT).href;
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
// Only local site files are accepted from data. Text always uses textContent.
function localUrl(path) {
  if (typeof path !== 'string' || !path.trim()) return null;
  try {
    const url = new URL(path, ROOT);
    return url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function link(text, href) {
  const a = node('a', '', text);
  a.href = href;
  return a;
}
function photo(path, alt, portrait = false) {
  const src = localUrl(path);
  if (!portrait && !src) return null;
  const img = node('img', portrait ? 'member-photo' : 'research-photo');
  img.src = src || PLACEHOLDER;
  img.alt = src ? alt : '個人照片尚未提供（預設圖）';
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    if (portrait && img.src !== PLACEHOLDER) {
      img.src = PLACEHOLDER;
      img.alt = '個人照片尚未提供（預設圖）';
    } else img.remove();
  });
  return img;
}
function card(id, title, example) {
  const el = node('article', 'card directory-card');
  el.id = id;
  if (example) el.append(node('span', 'badge', '範例資料'));
  el.append(node('h3', '', title));
  return el;
}
function researchLinks(row, model) {
  const list = node('ul', 'research-links');
  for (const id of row.researchIds || []) {
    const li = node('li');
    const topic = model.researchById.get(id);
    if (topic) li.append(link(topic.title, new URL(`areas.html#research-${id}`, ROOT).href));
    else li.textContent = '研究資料待補';
    list.append(li);
  }
  return list;
}
function appendImage(card, img) { if (img) card.prepend(img); }
export function memberCard(member, model) {
  const el = card(`member-${member.id}`, member.name, member.example);
  if (member.status === 'current' || member.photo) appendImage(el, photo(member.photo, `${member.name}的照片`, true));
  const degree = { master: '碩士', phd: '博士' }[member.degree];
  const label = [degree, member.grade].filter(Boolean).join(' · ');
  if (label) el.append(node('p', 'member-meta', label));
  const links = researchLinks(member, model);
  if (links.children.length) el.append(node('p', 'field-label', '研究方向 · 點選查看研究介紹'), links);
  return el;
}
export function groupCard(group, model) {
  const el = card(`group-${group.id}`, group.name, group.example);
  appendImage(el, photo(group.image, `${group.name}代表照片`));
  el.append(node('p', 'muted', `組員：${group.memberNames.join('、') || '待補'}`));
  el.append(researchLinks(group, model));
  // Description belongs to the research record, never duplicated in groups.json.
  for (const id of group.researchIds || []) {
    const topic = model.researchById.get(id);
    if (topic?.summary) el.append(node('p', 'muted', topic.summary));
  }
  return el;
}
export function researchCard(topic, model) {
  const el = card(`research-${topic.id}`, topic.title, topic.example);
  appendImage(el, photo(topic.image, `${topic.title}代表圖片`));
  if (topic.year) el.append(node('p', 'member-meta', `${topic.year}${topic.example ? '（範例年度）' : ''}`));
  if (topic.summary) el.append(node('p', 'muted', topic.summary));
  if (topic.technologies?.length) {
    const tags = node('ul', 'technology-tags');
    for (const tech of topic.technologies) tags.append(node('li', '', tech));
    el.append(tags);
  }
  const people = node('ul', 'people-links');
  for (const member of model.members.filter(m => (m.researchIds || []).includes(topic.id))) {
    const li = node('li');
    li.append(link(`${member.name}${member.status === 'alumni' ? '（Alumni）' : ''}`, new URL(`members.html#member-${member.id}`, ROOT).href));
    people.append(li);
  }
  for (const group of model.groups.filter(g => g.status === 'current' && (g.researchIds || []).includes(topic.id))) {
    const li = node('li');
    li.append(link(group.name, new URL(`members.html#group-${group.id}`, ROOT).href));
    li.append(node('span', 'muted', `：${group.memberNames.join('、')}`));
    people.append(li);
  }
  if (people.children.length) el.append(node('p', 'field-label', '相關研究人員 / 團隊'), people);
  const detail = localUrl(topic.detailUrl);
  if (detail) el.append(link('查看原有研究詳細介紹 →', detail));
  return el;
}
export function fillGrid(container, rows, render, className = '') {
  container.replaceChildren();
  container.className = `directory-grid ${className}`;
  if (!rows.length) container.append(node('p', 'empty-state', '目前尚無資料。'));
  else for (const row of rows) container.append(render(row));
}
export function renderAlumni(container, model) {
  container.replaceChildren();
  const years = new Map();
  for (const member of model.members.filter(m => m.status === 'alumni')) {
    const year = Number.isInteger(member.graduationYear) ? member.graduationYear : null;
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(member);
  }
  for (const year of [...years.keys()].sort((a, b) => (b ?? -1) - (a ?? -1))) {
    const details = node('details', 'alumni-year');
    details.open = true;
    details.append(node('summary', '', `${year ?? '年度待補'} · ${years.get(year).length} 位`));
    const grid = node('div');
    fillGrid(grid, years.get(year), member => memberCard(member, model));
    details.append(grid);
    container.append(details);
  }
  if (!years.size) container.append(node('p', 'empty-state', '目前尚無畢業成員資料。'));
}
