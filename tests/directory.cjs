const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const screenshotDir = process.env.CED_SCREENSHOT_DIR || os.tmpdir();
const detailFile = (topic) => `areas/research.html?id=${encodeURIComponent(topic.id)}`;
const root = path.resolve(__dirname, '..');
const read = (n) =>
  JSON.parse(fs.readFileSync(path.join(root, `data/${n}.json`)));
const members = read('members'),
  groups = read('groups'),
  research = read('research');
for (const rows of [members, groups, research])
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
for (const row of [...members, ...groups])
  for (const id of row.researchIds || [])
    assert(research.some((r) => r.id === id));
for (const topic of research)
  if (topic.detailUrl) assert(fs.existsSync(path.join(root, topic.detailUrl)));
for (const member of members) {
  assert(member.example);
  assert(member.name.includes('範例'));
}
for (const group of groups) {
  assert(group.name.includes('範例'));
  assert(group.memberNames.every((n) => n.includes('範例')));
}
const currentResearch = research.filter(
  (topic) => topic.category === 'current',
);
assert.deepEqual(
  currentResearch.map((topic) => topic.title),
  ['疏苗除草機器人', '垃圾收集海漂船', '割草機器人'],
);
for (const topic of research) {
  if (topic.category === 'current') {
    assert.equal(topic.example, false);
    assert(topic.sections.length >= 3);
    // Sample people must not be presented as participants in real projects.
    assert(
      ![...members, ...groups].some((row) =>
        (row.researchIds || []).includes(topic.id),
      ),
    );
  } else {
    assert(topic.example);
    assert(topic.title.includes('範例'));
  }
  assert(!topic.image);
}
(async () => {
  const base = process.env.CED_TEST_BASE || 'http://127.0.0.1:8000/';
  try {
    const response = await fetch(base + 'areas/research.html', {
      signal: AbortSignal.timeout(5000),
    });
    assert(
      response.ok &&
        (await response.text()).includes('data-directory="research-detail"'),
    );
  } catch (error) {
    throw new Error(`測試環境未就緒：請先啟動 ${base} 的 CED 網站伺服器。${error.message}`);
  }
  console.log(`SERVER READY: ${base}`);
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // External decorative assets are irrelevant to local functional verification.
  await page.route(/https:\/\//, (route) => route.abort());
  async function open(file) {
    await page.goto(base + file);
    await page.waitForFunction(
      () => document.querySelector('footer #y')?.textContent.length === 4,
    );
    if (await page.locator('[data-directory]').count())
      await page.waitForFunction(
        () => document.querySelector('#directory-status')?.textContent === '',
      );
  }
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const file of ['members.html', 'areas.html']) {
      await open(file);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${file} overflows at ${width}`,
      );
      assert.equal(await page.locator('header').count(), 1);
      assert.equal(await page.locator('footer').count(), 1);
      assert.equal(
        await page
          .locator('header a[data-link="areas.html"]')
          .getAttribute('href'),
        'areas.html',
      );
      if (file === 'members.html') {
        assert.equal(await page.locator('#masters article').count(), 5);
        const cols = await page
          .locator('[data-section="masters"]')
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
          );
        assert.equal(cols, width > 800 ? 3 : width > 540 ? 2 : 1);
      }
      if (file === 'areas.html') {
        assert.deepEqual(
          await page.locator('main > section > h2').allTextContents(),
          ['進行中的研究', '歷屆研究'],
        );
        assert.equal(await page.locator('#current article').count(), 3);
        assert.equal(
          await page.locator('#historical article').count(),
          research.filter((topic) => topic.category === 'historical').length,
        );
        assert.equal(
          await page.locator('#current .badge, main > .sample-notice').count(),
          0,
        );
        assert.equal(await page.locator('#current .people-links').count(), 0);
        assert.equal(
          await page
            .locator('.research-list')
            .first()
            .evaluate(
              (el) =>
                getComputedStyle(el).gridTemplateColumns.split(' ').length,
            ),
          1,
        );
      }
      if (width === 390)
        await page.screenshot({
          path: path.join(screenshotDir, `ced-${file}-mobile.png`),
          fullPage: true,
        });
      if (width === 1440)
        await page.screenshot({
          path: path.join(screenshotDir, `ced-${file}-desktop.png`),
          fullPage: true,
        });
    }
  }
  // Resolve every generated cross-page link and verify its actual destination card.
  for (const file of ['members.html', 'areas.html']) {
    await open(file);
    const links = await page
      .locator('main a[href*=".html#"]')
      .evaluateAll((as) => [...new Set(as.map((a) => a.href))]);
    for (const url of links) {
      await page.goto(url);
      const id = new URL(url).hash.slice(1);
      await page.waitForFunction((id) => document.getElementById(id), id);
      await page.waitForTimeout(60);
      assert(await page.locator(`[id="${id}"]`).isVisible(), url);
      assert(
        await page
          .locator(`[id="${id}"]`)
          .evaluate((el) => el.getBoundingClientRect().top >= 60),
        `anchor hidden under header: ${url}`,
      );
    }
  }
  await open('members.html');
  assert.deepEqual(
    await page.locator('.alumni-year summary').allTextContents(),
    ['2025 · 1 位', '2024 · 2 位'],
  );
  assert.equal(
    await page
      .locator(
        '#member-alumni-demo-3 img, #member-alumni-demo-3 .research-links',
      )
      .count(),
    0,
  );
  await page.locator('.alumni-year summary').last().click();
  await page.evaluate(() => (location.hash = 'member-alumni-demo-2'));
  await page.waitForFunction(
    () => document.querySelectorAll('.alumni-year')[1].open,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('label[for="navcheck"]').click();
  assert(await page.locator('.menu').isVisible());
  await page.locator('label[for="navcheck"]').click();
  assert(!(await page.locator('.menu').isVisible()));
  for (const file of [
    'index.html',
    'pi.html',
    'pubs.html',
    'news.html',
    'contact.html',
    'location.html',
    ...research.filter((r) => r.detailUrl).map((r) => r.detailUrl),
  ]) {
    await open(file);
    const href = await page
      .locator('header a[data-link="members.html"]')
      .getAttribute('href');
    assert.equal(
      href,
      file.startsWith('areas/') ? '../members.html' : 'members.html',
    );
    const topic = research.find((r) => r.detailUrl === file);
    if (topic) {
      await page.waitForFunction(
        (id) => document.getElementById(`research-${id}`),
        topic.id,
      );
      if (topic.category === 'current') {
        assert.equal(await page.locator('main h1').textContent(), topic.title);
        assert.equal(await page.title(), `${topic.title} | CED Lab`);
        assert.equal(await page.locator('.research-detail-section').count(), 3);
        assert.equal(
          await page.locator('.sample-notice, .badge, .people-links').count(),
          0,
        );
      } else {
        assert.equal(await page.locator('main h3').textContent(), topic.title);
      }
      assert.equal(await page.locator('main img').count(), 0);
      assert.equal(
        await page
          .locator(
            'main a[href="../areas.html#' +
              (['lgp', 'robot'].includes(topic.id)
                ? 'current'
                : 'research-' + topic.id) +
              '"]',
          )
          .count(),
        1,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
  }
  // Every collection record uses the shared template; legacy pages resolve to it.
  for (const topic of research) {
    await open(detailFile(topic));
    assert.equal(await page.locator('main h1').textContent(), topic.title);
    assert.equal(await page.title(), `${topic.title} | CED Lab`);
    assert.equal(await page.locator('main .badge').count(), topic.example ? 1 : 0);
    const paragraphs = (topic.sections || []).flatMap(
      (section) => section.paragraphs || [],
    );
    const items = (topic.sections || []).flatMap((section) => section.items || []);
    const content = await page.locator('[data-section="detail"]').textContent();
    for (const text of [
      topic.summary,
      topic.introduction,
      ...paragraphs,
      ...items,
      ...(topic.technologies || []),
    ].filter(Boolean))
      assert(content.includes(text), `${topic.id}: ${text}`);
    const expectedPeople = [
      ...members
        .filter((m) => (m.researchIds || []).includes(topic.id))
        .map((m) => `member-${m.id}`),
      ...groups
        .filter((g) =>
          g.status === 'current' && (g.researchIds || []).includes(topic.id),
        )
        .map((g) => `group-${g.id}`),
    ];
    const people = await page.locator('.people-links a').evaluateAll(
      (as) => as.map((a) => a.href),
    );
    assert.equal(people.length, expectedPeople.length);
    for (const id of expectedPeople)
      assert(people.some((url) => new URL(url).hash === '#' + id));
    for (const url of people) {
      await page.goto(url);
      const id = new URL(url).hash.slice(1);
      await page.waitForFunction((id) => document.getElementById(id), id);
      assert(await page.locator(`[id="${id}"]`).isVisible());
    }
    if (topic.detailUrl) {
      await open(topic.detailUrl);
      assert.equal(page.url(), new URL(detailFile(topic), base).href);
    }
  }
  await open('members.html');
  const references = await page.locator('.research-links a').evaluateAll(
    (as) => as.map((a) => a.href),
  );
  assert(references.length > 0);
  for (const href of references) {
    const url = new URL(href);
    assert.equal(url.pathname, new URL('areas/research.html', base).pathname);
    assert(research.some((topic) => topic.id === url.searchParams.get('id')));
  }
  // Query parameters cannot select arbitrary pages or inject markup.
  for (const query of [
    '',
    '?id=',
    '?id=unknown',
    '?id=../lgp',
    '?id=%3Cscript%3E',
    '?id=lgp&id=robot',
    '?id=%ZZ',
    '?id=javascript:alert(1)',
  ]) {
    await page.goto(base + 'areas/research.html' + query);
    await page.waitForFunction(() =>
      document.querySelector('#directory-status').textContent.includes('找不到這項研究'),
    );
    assert.equal(await page.locator('[data-section="detail"] article').count(), 0);
    assert.equal(
      await page.locator('main a[data-research-back]').getAttribute('href'),
      '../areas.html',
    );
  }
  // A new record needs JSON only, including optional fields and reverse relations.
  const newTopic = {
    id: 'template-test',
    title: '模板測試範例 <img src=x onerror=alert(1)>',
    category: 'current',
    status: '測試狀態',
    example: true,
    summary: '測試簡介',
    field: '測試應用',
    introduction: '測試介紹',
    image: 'image/member-placeholder.svg',
    technologies: ['測試技術', '<script>test</script>'],
    sections: [
      { title: '研究目的', paragraphs: ['測試目的'] },
      { title: '研究內容', items: ['測試內容'] },
      { title: '空段落', paragraphs: [' '] },
    ],
  };
  await page.route('**/data/research.json', (route) =>
    route.fulfill({ json: [...research, newTopic] }),
  );
  await page.route('**/data/members.json', (route) => {
    const rows = structuredClone(members);
    rows[0].researchIds.push(newTopic.id);
    return route.fulfill({ json: rows });
  });
  await page.route('**/data/groups.json', (route) => {
    const rows = structuredClone(groups);
    rows[0].researchIds.push(newTopic.id);
    return route.fulfill({ json: rows });
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const topic of [...currentResearch, newTopic]) {
      await open(detailFile(topic));
      assert.equal(await page.locator('main h1').textContent(), topic.title);
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        topic.id + ' at ' + width,
      );
    }
  }
  const text = await page.locator('[data-section="detail"]').textContent();
  for (const value of [
    '測試狀態', '測試應用', '測試簡介', '測試介紹',
    '測試目的', '測試內容', '測試技術', '<script>test</script>',
  ]) assert(text.includes(value));
  assert(!text.includes('空段落'));
  assert.equal(await page.locator('main h1 img, main script').count(), 0);
  assert.equal(await page.locator('.technology-tags li').count(), 2);
  assert.equal(await page.locator('.people-links a').count(), 2);
  await page.locator('main img').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const img = document.querySelector('main img');
    return img?.complete && img.naturalWidth > 0;
  });
  await open('areas.html');
  await page.locator('#research-template-test a').click();
  await page.waitForURL(new URL(detailFile(newTopic), base).href);
  await open('members.html');
  assert.equal(
    await page.locator(
      `.research-links a[href="${new URL(detailFile(newTopic), base).href}"]`,
    ).count(),
    2,
  );
  await page.unroute('**/data/members.json');
  await page.unroute('**/data/groups.json');
  // Neither an arbitrary detailUrl nor an unsafe image may control navigation.
  await page.route('**/data/research.json', (route) =>
    route.fulfill({ json: [
      ...research,
      { ...newTopic, detailUrl: 'https://example.invalid/', image: 'javascript:alert(1)' },
    ] }),
  );
  await open('areas.html');
  await page.locator('#research-template-test a').click();
  await page.waitForURL(new URL(detailFile(newTopic), base).href);
  await page.waitForFunction(() => document.querySelector('#research-template-test'));
  assert.equal(await page.locator('main img').count(), 0);
  // Empty optional data produces no blank sections, image, tags, or people blocks.
  await page.route('**/data/research.json', (route) =>
    route.fulfill({ json: [
      ...research,
      { id: 'sparse-test', title: '精簡測試', category: 'current' },
    ] }),
  );
  await open('areas/research.html?id=sparse-test');
  assert.equal(
    await page.locator(
      '.research-detail-section, main img, .technology-tags, .people-links',
    ).count(),
    0,
  );
  await page.unroute('**/data/research.json');
  // Research-only image fixtures never modify the production JSON or image files.
  const diagram = 'image/content-diagram.svg';
  const photograph = 'image/content-photo.svg';
  await page.route('**/image/content-diagram.svg', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="600"><rect width="2400" height="600" fill="#eff6ff"/><rect x="100" y="100" width="2200" height="400" fill="#0284c7"/></svg>',
  }));
  await page.route('**/image/content-photo.svg', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#e2e8f0"/><circle cx="300" cy="450" r="200" fill="#0284c7"/></svg>',
  }));
  const imageTopic = {
    id: 'gallery-test', title: '圖片展示範例', category: 'current', example: true,
    summary: '僅用於自動化測試的圖片展示。',
    image: diagram, technologies: ['測試技術'],
    sections: [
      { title: '研究目的', paragraphs: ['驗證圖片與文字閱讀順序。'] },
      { title: '系統架構', paragraphs: ['此為測試用圖形。'], images: [
        { src: diagram, alt: '系統架構測試圖', caption: '架構圖說明 <b>安全文字</b>' },
      ] },
      { title: '實驗照片', images: [
        { src: photograph, alt: '測試照片', caption: '測試照片說明', fit: 'cover' },
      ] },
      { title: '研究方法', items: ['測試條列內容'] },
    ],
    gallery: [
      { src: diagram, alt: '補充架構圖', caption: '第一張補充圖' },
      { src: photograph, caption: '第二張補充圖', fit: 'cover' },
    ],
  };
  const mockResearch = (topic) => page.route('**/data/research.json', (route) =>
    route.fulfill({ json: [...research, topic] }),
  );
  await mockResearch(imageTopic);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('areas.html');
    assert.deepEqual(
      await page.locator('#current article').evaluateAll((cards) => cards.map((card) => card.id)),
      [...currentResearch, imageTopic].map((topic) => `research-${topic.id}`),
    );
    const entry = page.locator('#research-gallery-test');
    assert.equal(await entry.locator('img').count(), 1);
    assert.equal(await entry.locator('.technology-tags').textContent(), '測試技術');
    assert.equal(await page.locator('#research-thinning-weeding-robot img').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await entry.locator('a').click();
    await page.waitForFunction(() => document.querySelector('#research-gallery-test'));
    await page.locator('main img').evaluateAll((images) => images.forEach((image) => image.loading = 'eager'));
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator('main .research-figure').count(), 5);
    assert.deepEqual(await page.locator('.research-detail-section h2').allTextContents(),
      ['研究目的', '系統架構', '實驗照片', '研究方法', '研究圖片']);
    assert.deepEqual(await page.locator('main figcaption').allTextContents(),
      ['架構圖說明 <b>安全文字</b>', '測試照片說明', '第一張補充圖', '第二張補充圖']);
    assert.equal(await page.locator('main figcaption b').count(), 0);
    const architecture = page.getByAltText('系統架構測試圖', { exact: true });
    assert.equal(await architecture.evaluate((image) => getComputedStyle(image).objectFit), 'contain');
    const bounds = await architecture.boundingBox();
    assert(Math.abs(bounds.width / bounds.height - 4) < 0.02, 'architecture must retain its full aspect ratio');
    assert.equal(await page.getByAltText('測試照片', { exact: true }).evaluate((image) => getComputedStyle(image).objectFit), 'cover');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const trigger = page.locator('.research-image-button').nth(1);
    await trigger.focus();
    await page.keyboard.press('Enter');
    const viewer = page.getByRole('dialog', { name: '研究圖片放大檢視' });
    await viewer.waitFor({ state: 'visible' });
    assert.equal(await viewer.locator('figcaption').textContent(), '架構圖說明 <b>安全文字</b>');
    assert.equal(await viewer.locator('img').evaluate((image) => getComputedStyle(image).objectFit), 'contain');
    await page.keyboard.press('Tab');
    assert(await viewer.evaluate((dialog) => dialog.contains(document.activeElement)));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'detached' });
    assert(await trigger.evaluate((button) => button === document.activeElement));
    await trigger.click();
    await page.getByRole('button', { name: '關閉圖片', exact: true }).click();
    await viewer.waitFor({ state: 'detached' });
    await page.locator('.research-image-button').nth(2).click();
    await viewer.waitFor({ state: 'visible' });
    assert.equal(await viewer.locator('img').evaluate((image) => getComputedStyle(image).objectFit), 'contain');
    assert((await viewer.locator('img').getAttribute('src')).endsWith(photograph));
    await page.mouse.click(0, 0);
    await viewer.waitFor({ state: 'detached' });
    assert.equal(await page.locator('html.research-image-open').count(), 0);
    if ([1440, 390].includes(width)) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: path.join(screenshotDir, `ced-gallery-${width}.png`), fullPage: true });
    }
  }
  // Verify touch activation in an actual mobile browser context.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (error) => errors.push(error.message));
  await mobilePage.route(/https:\/\//, (route) => route.abort());
  await mobilePage.route('**/data/research.json', (route) => route.fulfill({ json: [...research, {
    ...imageTopic, image: 'image/member-placeholder.svg', sections: [], gallery: [],
  }] }));
  await mobilePage.goto(base + detailFile(imageTopic));
  await mobilePage.locator('.research-image-button').tap();
  await mobilePage.getByRole('dialog').waitFor({ state: 'visible' });
  await mobilePage.getByRole('button', { name: '關閉圖片', exact: true }).tap();
  await mobilePage.getByRole('dialog').waitFor({ state: 'detached' });
  await mobile.close();
  // Failed figures remove their captions and empty image-only sections.
  await mockResearch({ ...imageTopic, image: 'image/missing.png', gallery: [
    { src: 'image/missing.png', caption: '失敗圖說不應留下' },
  ], sections: [
    { title: '圖片失敗段落', images: [{ src: 'image/missing.png' }] },
    { title: '保留文字', paragraphs: ['圖片失敗仍保留文字。'], images: [{ src: 'image/missing.png' }] },
    { title: '空白圖片', images: [] },
  ] });
  await open(detailFile(imageTopic));
  await page.locator('main img').evaluateAll((images) => images.forEach((image) => image.loading = 'eager'));
  await page.waitForFunction(() => !document.querySelector('main img'));
  assert.equal(await page.locator('.research-gallery, .research-figure, figcaption').count(), 0);
  assert.deepEqual(await page.locator('.research-detail-section h2').allTextContents(), ['保留文字']);
  await open('areas.html');
  await page.locator('#research-gallery-test').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('#research-gallery-test img'));
  assert.equal(await page.locator('#research-gallery-test .research-entry-with-image').count(), 0);
  // Unsafe URLs are ignored without requesting them; no filename becomes a caption.
  const unsafePaths = ['https://example.invalid/x.svg', '//example.invalid/x.svg',
    'javascript:alert(1)', 'data:image/svg+xml,test', '/image/content-diagram.svg',
    '../outside.svg', 'image\\outside.svg'];
  await mockResearch({ ...imageTopic, image: undefined, sections: [], gallery: [
    ...unsafePaths.map((src) => ({ src, caption: '不可顯示' })),
    { src: diagram },
  ] });
  await open(detailFile(imageTopic));
  assert.equal(await page.locator('main .research-figure').count(), 1);
  assert.equal(await page.locator('main figcaption').count(), 0);
  assert(!(await page.locator('.research-image-button').getAttribute('aria-label')).includes('.svg'));
  assert((await page.locator('main img').getAttribute('src')).endsWith(diagram));
  // New schema fields reject malformed objects and types, while old fields remain optional.
  for (const patch of [
    { gallery: {} }, { gallery: [null] }, { gallery: [{ src: 42 }] },
    { gallery: [{ src: diagram, caption: 42 }] }, { gallery: [{ src: diagram, alt: [] }] },
    { gallery: [{ src: diagram, fit: 'stretch' }] },
    { sections: [{ title: '錯誤圖片', images: 'not-an-array' }] },
    { sections: [{ title: '錯誤圖片', images: [{ src: diagram, caption: false }] }] },
  ]) {
    await mockResearch({ ...imageTopic, ...patch });
    await page.goto(base + detailFile(imageTopic));
    await page.waitForFunction(() => document.querySelector('#directory-status button'));
    assert.equal(await page.locator('[data-section="detail"] article').count(), 0);
  }
  await page.unroute('**/data/research.json');
  await page.unroute('**/image/content-diagram.svg');
  await page.unroute('**/image/content-photo.svg');
  // Missing portrait, optional image, and a dangling research reference.
  await page.route('**/data/members.json', (route) => {
    const rows = structuredClone(members);
    rows[0].photo = 'image/missing.png';
    rows[0].researchIds.push('missing');
    return route.fulfill({ json: rows });
  });
  await page.route('**/data/research.json', (route) => {
    const rows = structuredClone(research);
    rows[0].image = 'image/missing.png';
    return route.fulfill({ json: rows });
  });
  await page.goto(base + 'members.html');
  await page.waitForFunction(() =>
    document.querySelector('#directory-status').textContent.includes('部分'),
  );
  await page.waitForFunction(() =>
    document
      .querySelector('#member-master-1 img')
      .src.endsWith('member-placeholder.svg'),
  );
  assert(
    (await page.locator('#member-master-1').textContent()).includes(
      '研究資料待補',
    ),
  );
  await page.goto(base + currentResearch[0].detailUrl);
  await page.waitForFunction(() =>
    document.querySelector('.research-detail-content'),
  );
  await page.locator('.research-detail-content').scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => !document.querySelector('.research-detail-content img'),
  );
  await page.unroute('**/data/members.json');
  await page.unroute('**/data/research.json');
  for (const body of [
    '{bad json',
    '{}',
    JSON.stringify([
      { id: 'duplicate', name: 'A' },
      { id: 'duplicate', name: 'B' },
    ]),
  ]) {
    await page.route('**/data/members.json', (route) =>
      route.fulfill({ body, contentType: 'application/json' }),
    );
    await page.goto(base + 'members.html');
    await page.waitForFunction(() =>
      document.querySelector('#directory-status button'),
    );
    await page.unroute('**/data/members.json');
  }
  await page.route('**/data/groups.json', (route) =>
    route.fulfill({ status: 404, body: 'Not found' }),
  );
  await page.goto(base + 'areas.html');
  await page.waitForFunction(() =>
    document.querySelector('#directory-status button'),
  );
  await page.unroute('**/data/groups.json');
  await page.locator('#directory-status button').click();
  await page.waitForFunction(() =>
    document.querySelector('#research-thinning-weeding-robot'),
  );
  // Click every current project card, read its detail sections, and return to the exact card.
  for (const topic of currentResearch) {
    await open('areas.html');
    await page.locator(`#research-${topic.id} a`).click();
    await page.waitForFunction(
      (title) => document.querySelector('main h1')?.textContent === title,
      topic.title,
    );
    assert.equal(page.url(), new URL(detailFile(topic), base).href);
    assert.equal(await page.locator('.research-detail-section h2').count(), 3);
    await page.locator('main a').filter({ hasText: '返回研究領域' }).click();
    await page.waitForFunction(
      (id) => document.getElementById(`research-${id}`),
      topic.id,
    );
    assert(await page.locator(`#research-${topic.id}`).isVisible());
  }
  // Legacy sample topics remain reachable without adding a third overview section.
  for (const topic of research.filter((r) =>
    ['masters', 'undergraduate'].includes(r.category),
  )) {
    const file = detailFile(topic);
    await open(file);
    assert.equal(await page.locator('main h3').textContent(), topic.title);
  }
  await page.goto(base + 'areas.html#research-diagnostics');
  await page.waitForURL('**/areas/research.html?id=diagnostics');
  await page.waitForFunction(() =>
    document.querySelector('#research-diagnostics'),
  );
  await page.goto(base + 'areas.html#masters');
  await page.waitForFunction(() => document.querySelector('#current article'));
  await page.goto(base + 'areas/research.html?id=unknown');
  await page.waitForFunction(() =>
    document
      .querySelector('#directory-status')
      .textContent.includes('找不到這項研究'),
  );
  assert.equal(
    await page.locator('[data-section="detail"] article').count(),
    0,
  );
  await page.route('**/data/research.json', (route) => {
    const rows = structuredClone(research);
    rows[0].sections = [{ title: 'Invalid', paragraphs: 'not-an-array' }];
    return route.fulfill({ json: rows });
  });
  await page.goto(base + currentResearch[0].detailUrl);
  await page.waitForFunction(() =>
    document.querySelector('#directory-status button'),
  );
  await page.unroute('**/data/research.json');
  // All-empty datasets show usable empty states.
  await page.route('**/data/*.json', (route) => route.fulfill({ json: [] }));
  for (const file of ['members.html', 'areas.html']) {
    await open(file);
    assert.equal(
      await page.locator('.empty-state').count(),
      file === 'members.html' ? 3 : 2,
    );
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    'PASS: data relations, 5 viewport sizes, all bidirectional anchors, shared partials, existing pages, 3 current projects and detail navigation, historical research, all shared details and legacy redirects, query validation, JSON-only research, safe text, optional fields, relations, research galleries/captions/section order, image validation/failures, keyboard/touch image viewer, alumni, image fallback, missing references, empty/error/retry states.',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
