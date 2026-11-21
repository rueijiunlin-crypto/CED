import { loadNews } from './news-service.js';

function node(tag, text) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
}

function link(url, label) {
  const anchor = node('a', label);
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}

function renderList(target, rows) {
  const items = rows.map((row) => {
    const item = node('li');
    const time = node('time', row.date.replaceAll('-', '/'));
    time.dateTime = row.date;
    item.append(time, link(row.url, row.title));
    return item;
  });
  target.replaceChildren(...items);
  if (!items.length) target.append(node('li', '目前尚無最新消息。'));
}

function renderArticle(target, row) {
  const article = node('article');
  const heading = node('div');
  heading.className = 'news-heading';
  const date = node('time', row.date.replaceAll('-', '/'));
  date.dateTime = row.date;
  heading.append(date, node('h1', row.title));
  article.append(heading);
  for (const paragraph of row.paragraphs || []) article.append(node('p', paragraph));
  if (row.images?.length || row.attachments?.length) {
    const section = node('section');
    section.append(node('h2', '得獎資料'));
    for (const image of row.images || []) {
      const figure = node('figure');
      const anchor = link(image.src);
      const img = node('img');
      img.alt = image.alt;
      img.src = image.src;
      img.addEventListener('error', () => figure.remove(), { once: true });
      anchor.append(img);
      figure.append(anchor);
      if (image.caption) figure.append(node('figcaption', image.caption));
      section.append(figure);
    }
    for (const attachment of row.attachments || []) {
      const paragraph = node('p');
      paragraph.append(link(attachment.url, attachment.label));
      section.append(paragraph);
    }
    article.append(section);
  }
  document.title = `${row.title} | CED Lab`;
  target.replaceChildren(article);
}

const lists = document.querySelectorAll('[data-news-list]');
const detail = document.querySelector('[data-news-detail]');
try {
  const rows = await loadNews();
  for (const list of lists) renderList(list, rows);
  if (detail) {
    const params = new URLSearchParams(location.search);
    const id = detail.dataset.newsDetail || params.get('id');
    const row = /^[a-z][a-z0-9-]*$/.test(id || '') && params.getAll('id').length <= 1 &&
      rows.find((item) => item.id === id && item.type === 'article');
    if (row) renderArticle(detail, row);
    else detail.textContent = '找不到這則消息，請返回最新消息列表。';
  }
} catch {
  for (const target of [...lists, ...(detail ? [detail] : [])]) {
    const message = node(lists.length ? 'li' : 'p', '消息暫時無法載入，請稍後再試。');
    const retry = node('button', '重新載入');
    retry.type = 'button';
    retry.addEventListener('click', () => location.reload());
    message.append(' ', retry);
    target.replaceChildren(message);
  }
}
