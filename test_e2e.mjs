import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

// Login
await page.goto('https://test.tecknet.dev/login', { waitUntil: 'networkidle', timeout: 30000 });
const inputs = page.locator('input');
await inputs.nth(0).fill('jeevan');
await inputs.nth(1).fill('password');
await page.locator('button[type="submit"]').click();
await page.waitForURL('https://test.tecknet.dev/', { timeout: 20000 });
await page.waitForTimeout(5000);

// Home page
const hero = await page.evaluate(() => !!document.querySelector('h1'));
const rows = await page.evaluate(() => {
  const sections = document.querySelectorAll('section');
  return Array.from(sections).map(s => s.querySelector('h2')?.textContent).filter(Boolean);
});
console.log('Hero:', hero ? 'yes' : 'no');
console.log('Rows:', rows.join(', '));

// Card actions
const cardActions = await page.evaluate(() => {
  const spans = document.querySelectorAll('span');
  return Array.from(spans).filter(s => ['Play','Request','Queued','Processing','Declined','Partially available','Approved'].includes(s.textContent || '')).slice(0, 15).map(s => s.textContent);
});
console.log('Card actions:', JSON.stringify(cardActions));

// Click first "Request" card action to test it
let requestClicked = false;
try {
  const requestBtn = page.locator('span', { hasText: 'Request' }).first();
  if (await requestBtn.isVisible({ timeout: 2000 })) {
    await requestBtn.click();
    requestClicked = true;
    await page.waitForTimeout(2000);
  }
} catch {}
console.log('Request clicked:', requestClicked);

// Detail page (click a card)
const cardLink = page.locator('button >> nth=3');
if (await cardLink.isVisible({ timeout: 2000 })) {
  await cardLink.click();
  await page.waitForTimeout(3000);
  const detail = await page.evaluate(() => ({
    title: document.querySelector('h1')?.textContent?.slice(0, 40),
    playBtn: document.body.textContent?.includes('Play') ? 'yes' : 'no',
    requestBtn: document.body.textContent?.includes('Request') ? 'yes' : 'no',
  }));
  console.log('Detail page:', JSON.stringify(detail));
}

// Play page for Inception
await page.goto('https://test.tecknet.dev/play/movie:27205', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(5000);
const player = await page.evaluate(() => ({
  video: document.querySelector('video') ? 'yes' : 'no',
  src: document.querySelector('video')?.getAttribute('src')?.slice(0, 60),
  errorText: document.body.textContent?.includes('not available') || document.body.textContent?.includes('Failed') ? document.body.textContent?.slice(0, 200) : 'none',
}));
console.log('Player:', JSON.stringify(player));
console.log('All errors:', errors);

await browser.close();
