// Replace fetchCollection with an API adapter later; renderers only consume this model.
const DATA_ROOT = new URL('../data/', import.meta.url);
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
