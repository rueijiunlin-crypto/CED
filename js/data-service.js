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
      row.memberNames !== undefined &&
      (!Array.isArray(row.memberNames) ||
        row.memberNames.some((n) => typeof n !== 'string'))
    ) {
      throw new Error('groups: invalid memberNames');
    }
    if (name !== 'participations' &&
        typeof row[name === 'research' ? 'title' : 'name'] !== 'string')
      throw new Error(`${name}: missing title/name`);
    if (name === 'members' && row.introduction !== undefined &&
        typeof row.introduction !== 'string')
      throw new Error('members: invalid introduction');
    if (name === 'members') {
      for (const field of ['researchTopic', 'researchFocus']) {
        if (row[field] !== undefined && typeof row[field] !== 'string')
          throw new Error(`members: invalid ${field}`);
      }
    }
    if (name === 'participations') {
      if (['researchId', 'memberId', 'role'].some((field) =>
        typeof row[field] !== 'string' || !row[field].trim(),
      )) throw new Error('participations: missing relation or role');
      for (const field of ['focus', 'contribution']) {
        if (row[field] !== undefined && typeof row[field] !== 'string')
          throw new Error(`participations: invalid ${field}`);
      }
      if (row.researchYear !== undefined && !Number.isInteger(row.researchYear))
        throw new Error('participations: invalid researchYear');
      if (row.thesis !== undefined && (
        !row.thesis || typeof row.thesis.title !== 'string' ||
        !row.thesis.title.trim() ||
        ['advisor', 'url'].some((field) =>
          row.thesis[field] !== undefined && typeof row.thesis[field] !== 'string',
        ) ||
        ['keywords', 'coAdvisors'].some((field) =>
          row.thesis[field] !== undefined && (
            !Array.isArray(row.thesis[field]) ||
            row.thesis[field].some((value) => typeof value !== 'string')
          ),
        )
      )) throw new Error('participations: invalid thesis');
    }
    if (name === 'research') {
      if (!validImages(row.gallery)) throw new Error('research: invalid gallery');
      if (row.references !== undefined && (
        !Array.isArray(row.references) || row.references.some((reference) =>
          !reference || typeof reference.title !== 'string' || !reference.title.trim() ||
          (reference.url !== undefined && typeof reference.url !== 'string'),
        )
      )) throw new Error('research: invalid references');
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
  const [sourceMembers, groups, research, participations] = await Promise.all(
    ['members', 'groups', 'research', 'participations'].map(fetchCollection),
  );
  const researchById = new Map(research.map((row) => [row.id, row]));
  const memberIds = new Set(sourceMembers.map((row) => row.id));
  const pairs = new Set();
  for (const row of participations) {
    const pair = `${row.researchId}:${row.memberId}`;
    if (!researchById.has(row.researchId) || !memberIds.has(row.memberId) || pairs.has(pair))
      throw new Error('participations: unknown reference or duplicate pair');
    pairs.add(pair);
  }
  // New associations have one source; legacy researchIds remain compatible.
  const members = sourceMembers.map((member) => ({
    ...member,
    researchIds: [...new Set([
      ...(member.researchIds || []),
      ...participations.filter((row) => row.memberId === member.id)
        .map((row) => row.researchId),
    ])],
  }));
  const missing = [...members, ...groups].some((row) =>
    (row.researchIds || []).some((id) => !researchById.has(id)),
  );
  return { members, groups, research, participations, researchById, missing };
}
