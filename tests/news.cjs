const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const screenshotDir = process.env.CED_SCREENSHOT_DIR || os.tmpdir();
(async () => {
  const base = process.env.CED_TEST_BASE || 'http://localhost:8000/';
  const response = await fetch(base + 'news.html');
  assert(response.ok, 'Start the local website server before running this test.');
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
  let page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.context().route(/https:\/\//, (route) => route.abort());
  async function open(file) {
    await page.goto(base + file);
    await page.waitForFunction(() => document.querySelector('footer #y')?.textContent.length === 4);
    await page.waitForFunction(() => !document.querySelector('[data-news-list], [data-news-detail]')?.textContent.includes('消息載入中'));
  }
  const newsPages = [
    ['news-detail.html?id=national-project-2026', '2026-05-15', '第二名'],
    ['news-detail.html?id=project-exhibition-2025', '2025-12-19', '商品化特別獎'],
    ['https://irdnew.nkust.edu.tw/p/412-1010-9117.php', '2023-06-27', '榮譽特聘教授'],
    ['https://excellentteacher.moe.edu.tw/2021/teacher3_69.htm', '2021-07-20', '師鐸獎'],
  ];
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await open('news.html');
    assert.deepEqual(await page.locator('.news-list a').evaluateAll((links) => links.map((a) => a.getAttribute('href'))), newsPages.map((row) => row[0]));
    assert(!(await page.locator('main').textContent()).includes('研究生徵才'));
    assert(await page.locator('.news-list a').evaluateAll((links) => links.every((a) => a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer'))));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const [file, date, award] of newsPages.filter(([url]) => !url.startsWith('https:'))) {
      await open('news.html');
      const listingPage = page;
      const popupPromise = listingPage.waitForEvent('popup');
      await listingPage.locator(`.news-list a[href="${file}"]`).click();
      page = await popupPromise;
      await page.setViewportSize({ width, height: 1000 });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.waitForURL(new URL(file, base).href);
      assert.equal(listingPage.url(), new URL('news.html', base).href);
      await page.waitForFunction(() => document.querySelector('footer #y')?.textContent.length === 4);
      await page.waitForSelector('article h1');
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.locator('.news-heading time').getAttribute('datetime'), date);
      const articleText = await page.locator('article').textContent();
      assert(articleText.includes(award));
      for (const text of ['沿用', '舊實驗室', '原實驗室', '模板', '原始紀錄']) assert(!articleText.includes(text));
      assert.equal(await page.locator('article a[href^="areas/"], article a[href="pi.html"]').count(), 0);
      assert.equal(await page.locator('head link[rel="icon"]').getAttribute('href'), 'image/CEDicon.ico?v=symbol');
      assert(await page.locator('article a').evaluateAll((links) => links.every((a) => a.target === '_blank' && a.rel.includes('noopener'))));
      for (const href of await page.locator('main a').evaluateAll((links) => links.filter((a) => a.origin === location.origin).map((a) => a.href)))
        assert.equal((await page.request.get(href)).status(), 200, href);
      if (file.includes('2025') || file.includes('2026')) {
        await page.waitForFunction(() => document.querySelector('article img')?.naturalWidth > 0);
        assert(await page.locator('article img').evaluate((img) => Math.abs(img.width / img.height - img.naturalWidth / img.naturalHeight) < 0.01));
      }
      if (file.includes('2026')) {
        assert.equal(await page.locator('article figure img').getAttribute('src'), 'image/news/202605national2place.png');
        assert.equal(await page.locator('article figure a').getAttribute('href'), 'image/news/202605national2place.png');
        assert.equal(await page.locator('article a[href="image/news/202605national2place.pdf"]').count(), 1);
        if ([1440, 390].includes(width))
          await page.screenshot({ path: path.join(screenshotDir, `ced-award-${width}.png`), fullPage: true });
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 390 && file.includes('2026')) {
        await page.locator('label[for="navcheck"]').click();
        assert(await page.locator('#navcheck').isChecked());
        await page.locator('label[for="navcheck"]').click();
        assert(!(await page.locator('#navcheck').isChecked()));
      }
      if ([1440, 390].includes(width) && file.includes('2025'))
        await page.screenshot({ path: path.join(screenshotDir, `ced-news-${width}.png`), fullPage: true });
      await page.locator('main a[href="news.html"]').click();
      await page.waitForURL(new URL('news.html', base).href);
      await page.close();
      page = listingPage;
    }
  }
  await open('index.html');
  assert.deepEqual(await page.locator('.home-news .news-list a').evaluateAll((links) => links.map((a) => a.getAttribute('href'))), newsPages.map((row) => row[0]));
  const data = require('../data/news.json');
  const sample = { id: 'test-news', date: '2027-01-01', title: '<img src=x onerror=alert(1)>', type: 'article', paragraphs: ['<script>alert(1)</script>'] };
  await page.context().route('**/data/news.json', (route) => route.fulfill({ json: [...data, sample] }));
  await open('news.html');
  assert.equal(await page.locator('.news-list a').first().getAttribute('href'), 'news-detail.html?id=test-news');
  const newPagePromise = page.waitForEvent('popup');
  await page.locator('.news-list a').first().click();
  page = await newPagePromise;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.waitForSelector('article h1');
  assert.equal(await page.locator('article h1').textContent(), sample.title);
  assert.equal(await page.locator('article p').textContent(), sample.paragraphs[0]);
  assert.equal(await page.locator('article img, article script, article section').count(), 0);
  for (const query of ['id=unknown', 'id=../x', 'id=test-news&id=other']) {
    await open('news-detail.html?' + query);
    assert((await page.locator('[data-news-detail]').textContent()).includes('找不到這則消息'));
  }
  await page.context().unroute('**/data/news.json');
  for (const bad of [
    { ...sample, images: [{ src: 'https://evil.example/x.png', alt: 'x' }] },
    { ...sample, type: 'external', url: 'javascript:alert(1)' },
    { ...sample, attachments: [{ url: '../secret.pdf', label: 'x' }] },
    { ...sample, date: '2026-02-30' },
  ]) {
    await page.context().route('**/data/news.json', (route) => route.fulfill({ json: [bad] }));
    await open('news.html');
    assert((await page.locator('[data-news-list]').textContent()).includes('消息暫時無法載入'));
    assert.equal(await page.locator('[data-news-list] a').count(), 0);
    await page.context().unroute('**/data/news.json');
  }
  await page.getByRole('button', { name: '重新載入' }).click();
  await page.waitForSelector('.news-list a');
  assert.equal(await page.locator('.news-list a').count(), 4);
  assert.deepEqual(errors, []);
  console.log('PASS: two news articles and two direct external announcements, homepage/list links, attachments, dates, official source links, shared header/footer, mobile menu, image proportions, 5 viewport sizes, no horizontal overflow. Base: ' + base);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
