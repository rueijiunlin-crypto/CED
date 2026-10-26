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
    return url.origin === ROOT.origin &&
      url.pathname.startsWith(ROOT.pathname) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function link(text, href) {
  const a = node('a', '', text);
  a.href = href;
  return a;
}
export function researchDetailHref(topic) {
  return new URL(
    `areas/research.html?id=${encodeURIComponent(topic.id)}`,
    ROOT,
  ).href;
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
    if (topic?.example) continue;
    if (topic) li.append(link(topic.title, researchDetailHref(topic)));
    else li.textContent = '研究資料待補';
    list.append(li);
  }
  return list;
}
function peopleCard(id, title, example, image) {
  const el = card(id, title, example);
  el.classList.add('member-card');
  const content = node('div', 'member-card-content');
  content.append(...el.childNodes);
  if (image) {
    el.classList.add('member-card-with-image');
    el.append(image);
    image.addEventListener('error', () => {
      if (!image.isConnected) el.classList.remove('member-card-with-image');
    });
  }
  el.append(content);
  return { el, content };
}
function detailField(label, value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const row = node('div', 'member-field');
  row.append(node('dt', '', label), node('dd', '', value));
  return row;
}
function appendField(fields, label, value) {
  const row = detailField(label, value);
  if (row) fields.append(row);
}
export function memberCard(member, model) {
  const image = member.status === 'current' || member.photo
    ? photo(member.photo, `${member.name}的照片`, true) : null;
  const { el, content } = peopleCard(`member-${member.id}`, member.name, member.example, image);
  // Directory labels are independent of research-detail participant labels.
  let identity = memberIdentity(member);
  if (member.status === 'current') {
    identity = '研究生';
    if (Number.isInteger(member.admissionYear) && member.admissionYear > 0)
      identity += ` · ${member.admissionYear} 學年度入學`;
  } else if (member.status === 'alumni' && ['master', 'phd'].includes(member.degree)) {
    identity = `${member.degree === 'phd' ? '博士' : '碩士'}畢業生`;
  }
  if (member.status === 'current' || member.identity?.trim() || ['master', 'phd'].includes(member.degree))
    content.append(node('p', 'member-meta', identity));
  const fields = node('dl', 'member-fields');
  if (member.status === 'alumni' && member.researchFocus?.trim()) {
    const row = node('div', 'member-field');
    const value = node('dd');
    const tags = node('ul', 'technology-tags');
    for (const keyword of member.researchFocus.split('、').map((text) => text.trim()).filter(Boolean))
      tags.append(node('li', '', keyword));
    value.append(tags);
    row.append(node('dt', '', '研究方向'), value);
    fields.append(row);
  } else appendField(fields, '研究方向', member.researchFocus);
  const coAdvisors = [...new Set(model.participations
    .filter((row) => row.memberId === member.id)
    .flatMap((row) => row.thesis?.coAdvisors || [])
    .map((name) => name.trim()).filter(Boolean))];
  appendField(fields, '共同指導教授', coAdvisors.join('、'));
  if (fields.children.length) content.append(fields);
  const links = researchLinks(member, model);
  if (links.children.length)
    content.append(node('p', 'field-label', '相關研究'), links);
  return el;
}
export function groupCard(group, model) {
  const { el, content } = peopleCard(`group-${group.id}`, group.name, group.example,
    photo(group.image, `${group.name}代表圖片`));
  const fields = node('dl', 'member-fields');
  appendField(fields, '成員', (group.memberNames || []).join('、'));
  const topics = (group.researchIds || []).map((id) => model.researchById.get(id)).filter(Boolean);
  appendField(fields, '研究主題', topics.map((topic) => topic.title).join('、'));
  appendField(fields, '研究方向', topics.map((topic) => topic.summary).filter(Boolean).join(' '));
  if (fields.children.length) content.append(fields);
  const links = researchLinks(group, model);
  if (links.children.length) content.append(node('p', 'field-label', '相關研究'), links);
  return el;
}
function relatedPeople(topic, model) {
  const people = node('ul', 'people-links');
  for (const member of model.members.filter((m) =>
    !m.example && (m.researchIds || []).includes(topic.id),
  )) {
    const li = node('li');
    li.append(
      link(
        `${member.name}${member.status === 'alumni' ? '（Alumni）' : ''}`,
        new URL(`members.html#member-${member.id}`, ROOT).href,
      ),
    );
    people.append(li);
  }
  for (const group of model.groups.filter(
    (g) => g.status === 'current' && !g.example && (g.researchIds || []).includes(topic.id),
  )) {
    const li = node('li');
    li.append(
      link(group.name, new URL(`members.html#group-${group.id}`, ROOT).href),
    );
    if (group.memberNames?.length)
      li.append(node('span', 'muted', `：${group.memberNames.join('、')}`));
    people.append(li);
  }
  return people;
}
function memberIdentity(member) {
  if (member.identity?.trim()) return member.identity;
  const degree = { master: '碩士', phd: '博士' }[member.degree] || '';
  if (!degree) return member.status === 'alumni' ? '畢業成員' : '在籍研究成員';
  return `${degree}${member.status === 'alumni' ? '畢業生' : '研究生'}`;
}
function publicationUrl(path) {
  if (typeof path !== 'string' || !path.trim()) return null;
  try {
    const url = new URL(path, ROOT);
    if (url.username || url.password) return null;
    return url.protocol === 'https:' ? url.href : localUrl(path);
  } catch {
    return null;
  }
}
function researchParticipants(topic, model) {
  const sections = [];
  for (const status of ['current', 'alumni']) {
    const members = model.members.filter((member) =>
      member.status === status && !member.example && member.researchIds.includes(topic.id),
    );
    if (!members.length) continue;
    const block = node('section', 'research-detail-section');
    block.dataset.people = status;
    const people = node('ul', 'people-links research-participants');
    block.append(node('h2', '', status === 'current'
      ? '現階段研究人員' : '歷屆研究生與論文'), people);
    for (const member of members) {
      const record = model.participations.find((row) =>
        row.researchId === topic.id && row.memberId === member.id,
      );
      const person = node('li', 'research-person');
      const content = node('div');
      const heading = node('h3');
      const name = link(member.name, new URL(`members.html#member-${member.id}`, ROOT).href);
      name.dataset.memberLink = '';
      heading.append(name);
      content.append(heading);
      if (member.example) content.append(node('span', 'badge', '範例資料'));
      const labels = [memberIdentity(member)];
      if (status === 'alumni' && member.graduationYear)
        labels.push(`${member.graduationYear} 年畢業`);
      content.append(node('p', 'member-meta', labels.join(' · ')));
      if (status === 'current' && record?.focus?.trim())
        content.append(node('p', '', `研究方向：${record.focus}`));
      if (status === 'alumni' && record?.contribution?.trim())
        content.append(node('p', '', `研究貢獻：${record.contribution}`));
      if (status === 'alumni' && record?.thesis) {
        const thesis = node('p', 'research-thesis');
        const title = `《${record.thesis.title}》`;
        const url = publicationUrl(record.thesis.url);
        thesis.append(member.degree === 'master' ? '碩士論文：' : '學位論文：');
        thesis.append(url ? link(title, url) : node('span', '', title));
        content.append(thesis);
        const keywords = (record.thesis.keywords || []).filter((text) => text.trim());
        if (keywords.length) {
          const tags = node('ul', 'technology-tags thesis-keywords');
          for (const keyword of keywords) tags.append(node('li', '', keyword));
          content.append(node('p', 'field-label', '論文關鍵字'), tags);
        }
        const coAdvisors = (record.thesis.coAdvisors || []).filter((text) => text.trim());
        if (coAdvisors.length)
          content.append(node('p', 'muted', `共同指導教授：${coAdvisors.join('、')}`));
      }
      if (status === 'current' || member.photo) {
        const image = photo(member.photo, `${member.name}的照片`, true);
        person.append(image);
        person.classList.add('research-person-with-photo');
      }
      person.append(content);
      people.append(person);
    }
    sections.push(block);
  }
  const groups = relatedPeople(topic, { ...model, members: [] });
  if (groups.children.length) {
    const block = node('section', 'research-detail-section');
    block.append(node('h2', '', '相關專題團隊'), groups);
    sections.push(block);
  }
  return sections;
}
function researchMeta(topic) {
  const meta = node('div', 'research-meta');
  const category = {
    current: '進行中',
    historical: '歷屆研究',
    masters: '碩士研究',
    undergraduate: '大學部專題',
  }[topic.category];
  if (category) meta.append(node('span', 'research-status', category));
  if (topic.status?.trim() && topic.status !== category)
    meta.append(node('span', 'research-status', topic.status));
  if (topic.field?.trim()) meta.append(node('span', 'research-field', topic.field));
  if (topic.year)
    meta.append(
      node(
        'span',
        'research-year',
        `${topic.year}${topic.example ? '（範例年度）' : ''}`,
      ),
    );
  return meta;
}
function technologyTags(topic) {
  const tags = node('ul', 'technology-tags');
  for (const tech of topic.technologies || []) {
    if (tech.trim()) tags.append(node('li', '', tech));
  }
  return tags.children.length ? tags : null;
}
// Research assets must be relative paths within this deployed site.
function researchPhoto(path, alt) {
  if (typeof path !== 'string') return null;
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (
    /^\s*([/\\]|[a-z][a-z\d+.-]*:)/i.test(decoded) ||
    /[\\\u0000-\u001f\u007f]/.test(decoded) ||
    /(^|\/)\.\.(\/|$)/.test(decoded)
  )
    return null;
  return photo(path, alt);
}
function showResearchImage(source, trigger) {
  const dialog = node('dialog', 'research-image-viewer');
  dialog.setAttribute('aria-label', '研究圖片放大檢視');
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
function researchFigure(item, fallbackAlt, onError) {
  const image = researchPhoto(item.src, item.alt?.trim() || fallbackAlt);
  if (!image) return null;
  const figure = node('figure', 'research-figure');
  const button = node('button', 'research-image-button');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-label', `放大檢視：${item.caption?.trim() || image.alt}`);
  if (item.fit === 'cover') figure.classList.add('research-figure-cover');
  button.append(image);
  figure.append(button);
  if (item.caption?.trim()) figure.append(node('figcaption', '', item.caption));
  button.addEventListener('click', () => showResearchImage(image, button));
  image.addEventListener(
    'error',
    () => {
      figure.remove();
      onError?.();
    },
    { once: true },
  );
  return figure;
}
function researchGallery(images, fallbackAlt, onEmpty) {
  const gallery = node('div', 'research-gallery');
  const removeEmpty = () => {
    if (!gallery.children.length) {
      gallery.remove();
      onEmpty?.();
    }
  };
  for (const item of images || []) {
    const figure = researchFigure(item, fallbackAlt, removeEmpty);
    if (figure) gallery.append(figure);
  }
  return gallery.children.length ? gallery : null;
}
export function researchListCard(topic) {
  const el = node('article', 'card directory-card research-entry');
  el.id = `research-${topic.id}`;
  const entry = link('', researchDetailHref(topic));
  entry.className = 'research-entry-link';
  const meta = researchMeta(topic);
  if (topic.example) meta.append(node('span', 'badge', '範例資料'));
  entry.append(meta, node('h3', '', topic.title));
  if (topic.summary?.trim()) entry.append(node('p', 'muted', topic.summary));
  const image = researchPhoto(topic.image, `${topic.title}代表圖片`);
  if (image) {
    entry.classList.add('research-entry-with-image');
    image.classList.add('research-entry-image');
    image.addEventListener('error', () =>
      entry.classList.remove('research-entry-with-image'),
    );
    const content = node('div', 'research-entry-content');
    content.append(...entry.childNodes);
    entry.append(image, content);
  }
  const tags = technologyTags(topic);
  const content = entry.querySelector('.research-entry-content') || entry;
  if (tags) content.append(tags);
  content.append(node('span', 'research-read-more', '查看研究介紹 →'));
  el.append(entry);
  return el;
}
export function researchDetail(topic, model) {
  const el = topic.example
    ? card(`research-${topic.id}`, topic.title, true)
    : node('article', 'research-detail-content');
  el.id = `research-${topic.id}`;
  const meta = researchMeta(topic);
  if (meta.children.length) el.append(meta);
  // Reuse gallery metadata for a representative image, without showing it twice.
  const featured = (topic.gallery || []).find((item) => item.src === topic.image);
  const image = researchFigure(featured || { src: topic.image }, `${topic.title}代表圖片`);
  if (image) el.append(image);
  if (topic.summary?.trim())
    el.append(
      node('p', topic.example ? 'muted' : 'research-lead', topic.summary),
    );
  if (topic.introduction?.trim()) el.append(node('p', '', topic.introduction));
  for (const section of topic.sections || []) {
    const paragraphs = (section.paragraphs || []).filter((text) => text.trim());
    const items = (section.items || []).filter((text) => text.trim());
    const block = node('section', 'research-detail-section');
    const gallery = researchGallery(section.images, `${topic.title}研究圖片`, () => {
      if (!paragraphs.length && !items.length) block.remove();
    });
    if (!paragraphs.length && !items.length && !gallery) continue;
    if (section.title.trim()) block.append(node('h2', '', section.title));
    for (const paragraph of paragraphs) {
      block.append(node('p', '', paragraph));
    }
    if (items.length) {
      const list = node('ul');
      for (const item of items) list.append(node('li', '', item));
      block.append(list);
    }
    if (gallery) block.append(gallery);
    el.append(block);
  }
  const galleryBlock = node(
    'section',
    'research-detail-section research-gallery-block',
  );
  const gallery = researchGallery(
    (topic.gallery || []).filter((item) => item.src !== topic.image),
    `${topic.title}研究圖片`,
    () => galleryBlock.remove(),
  );
  if (gallery) {
    galleryBlock.append(node('h2', '', '研究圖片'), gallery);
    el.append(galleryBlock);
  }
  const tags = technologyTags(topic);
  if (tags) el.append(tags);
  // Use the same reverse lookup when confirmed people are assigned in future.
  if (model.participations.some((row) => row.researchId === topic.id) ||
      model.members.some((member) => !member.example && member.researchIds.includes(topic.id))) {
    el.append(...researchParticipants(topic, model));
  } else {
    const people = relatedPeople(topic, model);
    if (people.children.length) {
      const block = node('section', 'research-detail-section');
      block.append(node('h2', '', '相關研究人員 / 團隊'), people);
      el.append(block);
    }
  }
  if (topic.references?.length) {
    const block = node('section', 'research-detail-section');
    const list = node('ol');
    block.append(node('h2', '', '相關參考文獻'), list);
    for (const reference of topic.references) {
      const item = node('li');
      const url = publicationUrl(reference.url);
      item.append(url ? link(reference.title, url) : node('span', '', reference.title));
      list.append(item);
    }
    el.append(block);
  }
  return el;
}
export function fillGrid(container, rows, render, className = '') {
  container.replaceChildren();
  container.className = `directory-grid ${className}`;
  if (!rows.length)
    container.append(node('p', 'empty-state', '目前尚無資料。'));
  else for (const row of rows) container.append(render(row));
}
export function renderAlumni(container, model) {
  container.replaceChildren();
  const years = new Map();
  for (const member of model.members.filter((m) => m.status === 'alumni' && !m.example)) {
    const year = Number.isInteger(member.graduationYear)
      ? member.graduationYear
      : null;
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(member);
  }
  for (const year of [...years.keys()].sort((a, b) => (b ?? -1) - (a ?? -1))) {
    const details = node('details', 'alumni-year');
    details.open = true;
    details.append(
      node(
        'summary',
        '',
        `${year === null ? '年度待補' : `${year} 年畢業`} · ${years.get(year).length} 位`,
      ),
    );
    const grid = node('div');
    fillGrid(grid, years.get(year), (member) => memberCard(member, model));
    details.append(grid);
    container.append(details);
  }
  if (!years.size)
    container.append(node('p', 'empty-state', '目前尚無畢業成員資料。'));
}
