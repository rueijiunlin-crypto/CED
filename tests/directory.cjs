const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = n => JSON.parse(fs.readFileSync(path.join(root, `data/${n}.json`)));
const members = read('members'), groups = read('groups'), research = read('research');
for (const rows of [members, groups, research]) assert.equal(new Set(rows.map(r => r.id)).size, rows.length);
for (const row of [...members, ...groups]) for (const id of row.researchIds || []) assert(research.some(r => r.id === id));
for (const topic of research) if (topic.detailUrl) assert(fs.existsSync(path.join(root, topic.detailUrl)));
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
 const page = await browser.newPage();
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 // External decorative assets are irrelevant to local functional verification.
 await page.route(/https:\/\//, route => route.abort());
 const base = 'http://127.0.0.1:8000/';
 async function open(file) {
  await page.goto(base + file);
  await page.waitForFunction(() => document.querySelector('footer #y')?.textContent.length === 4);
  if (/^(members|areas)\.html/.test(file)) await page.waitForFunction(() => document.querySelector('#directory-status')?.textContent === '');
 }
 for (const width of [1440,1024,768,390,320]) {
  await page.setViewportSize({width,height:900});
  for (const file of ['members.html','areas.html']) {
   await open(file);
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${file} overflows at ${width}`);
   assert.equal(await page.locator('header').count(), 1);
   assert.equal(await page.locator('footer').count(), 1);
   assert.equal(await page.locator('header a[data-link="areas.html"]').getAttribute('href'), 'areas.html');
   if(file === 'members.html') {
    assert.equal(await page.locator('#masters article').count(),5);
    const cols=await page.locator('[data-section="masters"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(cols,width > 800 ? 3 : width > 540 ? 2 : 1);
   }
   if(width===390) await page.screenshot({path:`/tmp/ced-${file}-mobile.png`,fullPage:true});
   if(width===1440) await page.screenshot({path:`/tmp/ced-${file}-desktop.png`,fullPage:true});
  }
 }
 // Resolve every generated cross-page link and verify its actual destination card.
 for (const file of ['members.html','areas.html']) {
  await open(file);
  const links = await page.locator('main a[href*=".html#"]').evaluateAll(as => [...new Set(as.map(a => a.href))]);
  for (const url of links) {
   await page.goto(url);
   const id = new URL(url).hash.slice(1);
   await page.waitForFunction(id => document.getElementById(id),id);
   await page.waitForTimeout(60);
   assert(await page.locator(`[id="${id}"]`).isVisible(), url);
   assert(await page.locator(`[id="${id}"]`).evaluate(el => el.getBoundingClientRect().top >= 60),`anchor hidden under header: ${url}`);
  }
 }
 await open('members.html');
 assert.deepEqual(await page.locator('.alumni-year summary').allTextContents(),['2025 · 1 位','2024 · 2 位']);
 assert.equal(await page.locator('#member-alumni-demo-3 img, #member-alumni-demo-3 .research-links').count(),0);
 await page.locator('.alumni-year summary').last().click();
 await page.evaluate(()=>location.hash='member-alumni-demo-2');
 await page.waitForFunction(()=>document.querySelectorAll('.alumni-year')[1].open);
 await page.setViewportSize({width:390,height:844});
 await page.locator('label[for="navcheck"]').click();
 assert(await page.locator('.menu').isVisible());
 for(const file of ['index.html','pi.html','pubs.html','news.html','contact.html','location.html',...research.filter(r=>r.detailUrl).map(r=>r.detailUrl)]) {
  await open(file);
  const href = await page.locator('header a[data-link="members.html"]').getAttribute('href');
  assert.equal(href,file.startsWith('areas/') ? '../members.html' : 'members.html');
 }
 // Missing portrait, optional image, and a dangling research reference.
 await page.route('**/data/members.json', route => {
  const rows=structuredClone(members); rows[0].photo='image/missing.png'; rows[0].researchIds.push('missing');
  return route.fulfill({json:rows});
 });
 await page.route('**/data/research.json', route => {
  const rows=structuredClone(research); rows[0].image='image/missing.png'; return route.fulfill({json:rows});
 });
 await page.goto(base+'members.html');
 await page.waitForFunction(()=>document.querySelector('#directory-status').textContent.includes('部分'));
 await page.waitForFunction(()=>document.querySelector('#member-master-1 img').src.endsWith('member-placeholder.svg'));
 assert((await page.locator('#member-master-1').textContent()).includes('研究資料待補'));
 await page.goto(base+'areas.html');
 await page.waitForFunction(()=>document.querySelector('#research-concurrent'));
 await page.locator('#research-concurrent').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>!document.querySelector('#research-concurrent img'));
 await page.unroute('**/data/members.json');
 await page.unroute('**/data/research.json');
 for(const body of ['{bad json','{}',JSON.stringify([{id:'duplicate',name:'A'},{id:'duplicate',name:'B'}])]) {
  await page.route('**/data/members.json',route=>route.fulfill({body,contentType:'application/json'}));
  await page.goto(base+'members.html');
  await page.waitForFunction(()=>document.querySelector('#directory-status button'));
  await page.unroute('**/data/members.json');
 }
 await page.route('**/data/groups.json',route=>route.fulfill({status:404,body:'Not found'}));
 await page.goto(base+'areas.html');
 await page.waitForFunction(()=>document.querySelector('#directory-status button'));
 await page.unroute('**/data/groups.json');
 await page.locator('#directory-status button').click();
 await page.waitForFunction(()=>document.querySelector('#research-lgp'));
 // All-empty datasets show usable empty states.
 await page.route('**/data/*.json',route=>route.fulfill({json:[]}));
 for(const file of ['members.html','areas.html']) { await open(file); assert.equal(await page.locator('.empty-state').count(),3); }
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('PASS: data relations, 5 viewport sizes, all bidirectional anchors, shared partials, 12 existing pages, alumni, image fallback, missing references, empty/error/retry states.');
})().catch(e=>{console.error(e);process.exit(1)});
