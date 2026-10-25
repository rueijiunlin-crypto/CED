// Replace fetchCollection with an API adapter later; renderers only consume this model.
const DATA_ROOT = new URL('../data/', import.meta.url);
function validImages(images) {
  return (
    images === undefined ||
    (Array.isArray(images) &&
      images.every((image) =>
        image &&
        typeof image === 'object' &&
        !Array.isArray(image) &&
        typeof image.src === 'string' &&
        image.src.trim() &&
        ['alt', 'caption'].every((field) =>
          image[field] === undefined || typeof image[field] === 'string',
        ) &&
        (image.fit === undefined || ['contain', 'cover'].includes(image.fit)),
      ))
  );
}
async function fetchCollection(name) {
  const response = await fetch(new URL(`${name}.json`, DATA_ROOT));
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${name}: expected an array`);
  const ids = new Set();
  for (const row of rows) {
    if (
      !row ||
      typeof row.id !== 'string' ||
      !/^[a-z][a-z0-9-]*$/.test(row.id) ||
      ids.has(row.id)
    ) {
      throw new Error(`${name}: invalid or duplicate ID`);
    }
    ids.add(row.id);
    if (
      row.researchIds !== undefined &&
      (!Array.isArray(row.researchIds) ||
        row.researchIds.some((id) => typeof id !== 'string'))
    ) {
      throw new Error(`${name}: invalid researchIds`);
    }
    if (
      name === 'groups' &&
      (!Array.isArray(row.memberNames) ||
        row.memberNames.some((n) => typeof n !== 'string'))
    ) {
      throw new Error('groups: invalid memberNames');
    }
    if (typeof row[name === 'research' ? 'title' : 'name'] !== 'string')
      throw new Error(`${name}: missing title/name`);
    if (name === 'research') {
      if (!validImages(row.gallery)) throw new Error('research: invalid gallery');
      for (const field of ['summary', 'introduction', 'field', 'status', 'image']) {
        if (row[field] !== undefined && typeof row[field] !== 'string')
          throw new Error(`research: invalid ${field}`);
      }
      if (
        row.technologies !== undefined &&
        (!Array.isArray(row.technologies) ||
          row.technologies.some((value) => typeof value !== 'string'))
      ) {
        throw new Error('research: invalid technologies');
      }
    }
    if (name === 'research' && row.sections !== undefined) {
      const textList = (values) =>
        values === undefined ||
        (Array.isArray(values) &&
          values.every((value) => typeof value === 'string'));
      if (
        !Array.isArray(row.sections) ||
        row.sections.some(
          (section) =>
            !section ||
            typeof section.title !== 'string' ||
            !validImages(section.images) ||
            !textList(section.paragraphs) ||
            !textList(section.items),
        )
      ) {
        throw new Error('research: invalid detail sections');
      }
    }
  }
  return rows;
}
export async function loadDirectory() {
  const [members, groups, research] = await Promise.all(
    ['members', 'groups', 'research'].map(fetchCollection),
  );
  const researchById = new Map(research.map((row) => [row.id, row]));
  const missing = [...members, ...groups].some((row) =>
    (row.researchIds || []).some((id) => !researchById.has(id)),
  );
  return { members, groups, research, researchById, missing };
}
