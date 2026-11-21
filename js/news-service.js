const DATA_URL = new URL('../data/news.json', import.meta.url);

export function localPath(value) {
  return typeof value === 'string' &&
    /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:html|png|jpe?g|pdf)$/.test(value);
}

function externalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function loadNews() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('News could not be loaded');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid news collection');
  const ids = new Set();
  const text = (value) => typeof value === 'string' && value.trim().length > 0;
  for (const row of rows) {
    if (!row || !/^[a-z][a-z0-9-]*$/.test(row.id) || ids.has(row.id) ||
      !text(row.title) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      Number.isNaN(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date ||
      !['article', 'external'].includes(row.type) ||
      !(row.type === 'external' ? externalUrl(row.url) :
        row.url === undefined || (localPath(row.url) && row.url.endsWith('.html')))) throw new Error('Invalid news record');
    ids.add(row.id);
    if (row.paragraphs !== undefined && (!Array.isArray(row.paragraphs) || !row.paragraphs.every(text)))
      throw new Error('Invalid paragraphs');
    if (row.images !== undefined && (!Array.isArray(row.images) || !row.images.every((img) =>
      img && localPath(img.src) && /\.(png|jpe?g)$/.test(img.src) && text(img.alt) &&
      (img.caption === undefined || text(img.caption))))) throw new Error('Invalid images');
    if (row.attachments !== undefined && (!Array.isArray(row.attachments) || !row.attachments.every((item) =>
      item && localPath(item.url) && item.url.endsWith('.pdf') && text(item.label))))
      throw new Error('Invalid attachments');
  }
  return rows.map((row) => ({
    ...row,
    url: row.url || `news-detail.html?id=${encodeURIComponent(row.id)}`,
  })).sort((a, b) => b.date.localeCompare(a.date));
}
