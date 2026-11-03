import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
const box = selector => page.locator(selector).boundingBox();
try {
  await page.goto('http://localhost:5173');
  check('Welcome appears before home', await page.locator('.welcome-screen').isVisible());
  await page.locator('.welcome-login').click();
  check('Phone is prefilled', await page.locator('#phone').inputValue() === '555 12 34 56');
  await page.locator('.auth-submit').click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('#home-screen .balance').clientWidth > 0);
  for (const [selector, x, y, width, height] of [
    ['.card-track', 16, 126, 370, 212], ['.quick-actions', 16, 382, 370, 68],
    ['.recipients', 16, 514, 370, 132], ['.history', 16, 678, 370, 268], ['.tabbar', 16, 762, 370, 64],
  ]) {
    const bounds = await box(selector);
    check(`Figma geometry: ${selector}`, Object.entries({ x, y, width, height }).every(([key, value]) => Math.abs(bounds[key] - value) < 1));
  }
  check('All local assets loaded', await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0 && !img.src.includes('figma.com'))));
  check('All exact font families loaded', await page.evaluate(() => document.fonts.check('500 15px "Inter Tight"') && document.fonts.check('700 42px "Actay Wide"') && document.fonts.check('500 11px Inter')));
  await page.screenshot({ path: 'screenshots/home-402x874.png' });
  const assets = await page.locator('img').evaluateAll(images => images.map(img => {
    const rect = img.getBoundingClientRect();
    return { file: img.getAttribute('src'), slot: img.parentElement.className, width: rect.width, height: rect.height, x: rect.x, y: rect.y, loaded: img.complete && img.naturalWidth > 0 };
  }));
  await writeFile('screenshots/asset-audit.json', JSON.stringify(assets, null, 2));

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = await box('.operation:last-child');
  const nav = await box('.tabbar');
  check('Last operation fully above fixed tab bar', last.y >= 0 && last.y + last.height < nav.y);
  check('Tab bar stays at the same viewport position', nav.y === 762);
  await page.screenshot({ path: 'screenshots/home-scrolled-402x874.png' });
  await page.locator('.operation:last-child').click();
  check('Operation details show name, amount, date, status and card', (await page.locator('.detail-screen').innerText()).includes('−3 000 ₽') && (await page.locator('.detail-screen').innerText()).includes('Выполнен'));
  await page.getByRole('button', { name: '← Назад' }).click();
  check('Back restores the home scroll position', await page.evaluate(() => window.scrollY > 0));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-recipient="mom"]').click();
  check('Favorite opens transfer with recipient and source card', (await page.locator('.detail-screen').innerText()).includes('RU •• 4820') && (await page.locator('.detail-screen').innerText()).includes('*6354'));
  await page.getByRole('button', { name: '← Назад' }).click();
  await page.locator('.next-card').click();
  await page.waitForFunction(() => document.querySelector('.card-track').scrollLeft > 369);
  check('Card selection updates pagination and history', await page.locator('[data-dot="1"]').getAttribute('class') === 'selected' && await page.locator('.operation').count() === 1 && (await page.locator('.operations').innerText()).includes('Мама'));
  await page.screenshot({ path: 'screenshots/second-card-402x874.png' });
  await page.locator('[data-recipient="mom"]').click();
  check('Transfer uses the second active card', (await page.locator('.detail-screen').innerText()).includes('*4845'));
  await page.getByRole('button', { name: '← Назад' }).click();
  await page.waitForFunction(() => document.querySelector('.card-track').scrollLeft > 369);
  check('Back preserves the second active card', await page.locator('.operation').count() === 1);
  // Real touchscreen swipe back, exercising horizontal scroll + snap events.
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 80, y: 225 }] });
  for (const x of [120, 180, 250, 330, 380]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 225 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => document.querySelector('.card-track').scrollLeft < 1);
  check('Touch swipe updates active dot and associated operations', await page.locator('[data-dot="0"]').getAttribute('class') === 'selected' && await page.locator('.operation').count() === 3);
  await page.locator('.card-track').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.card-track').scrollLeft > 369);
  check('Keyboard card switching works', await page.locator('.operation').count() === 1);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('.card-track').scrollLeft < 1);
  await page.locator('.history-collapse').click();
  check('History can collapse and expand', await page.locator('.operations').isHidden());
  await page.locator('.history-collapse').click();
  for (const label of ['Профиль', 'Поиск', 'Пополнить карту', 'Перевести или оплатить', 'Добавить получателя', 'Все операции']) {
    await page.locator(`[data-action="${label}"]`).click();
    check(`Placeholder opens: ${label}`, await page.locator('.detail-screen h1').innerText() === label);
    await page.getByRole('button', { name: '← Назад' }).click();
  }
  for (const tab of ['Переводы', 'Поддержка']) {
    await page.locator(`[data-tab="${tab}"]`).click();
    check(`Tab placeholder + back: ${tab}`, await page.locator('.detail-screen h1').innerText() === tab);
    await page.getByRole('button', { name: '← Назад' }).click();
  }
  for (const width of [320, 360, 375, 402, 430]) {
    await page.setViewportSize({ width, height: 874 });
    await page.evaluate(() => window.scrollTo(0, 0));
    check(`No horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    check(`Card and actions remain within ${width}px viewport`, await page.locator('.quick-actions').evaluate(el => el.getBoundingClientRect().right <= innerWidth));
    if (width === 320) await page.screenshot({ path: 'screenshots/home-320x874.png' });
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(async () => {
    const { createHomeScreen } = await import('/src/home-screen.js');
    const { demoData } = await import('/src/data.js');
    const data = structuredClone(demoData);
    data.cards = [{ ...data.cards[0], balance: 123456789.99 }];
    data.recipients[1].name = 'Александра Константинопольская';
    data.transactions[0].name = 'Александра Константинопольская';
    data.transactions[0].amount = -123456789.99;
    const screen = createHomeScreen({ data, onNavigate: () => {} });
    document.querySelector('#home-screen').replaceWith(screen);
    await document.fonts.ready;
  });
  await page.waitForFunction(() => document.querySelector('#home-screen .balance').getBoundingClientRect().width > 0);
  check('Single card hides pagination', await page.locator('.pagination').isHidden());
  check('Long recipient name truncates within its slot', await page.locator('[data-recipient="mom"] .recipient-name').evaluate(el => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === 'ellipsis'));
  check('Large balance fits next to Mastercard', await page.locator('#home-screen .balance').evaluate(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    return range.getBoundingClientRect().right <= el.nextElementSibling.getBoundingClientRect().left - 10;
  }));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.history').offsetTop - 20));
  check('Large amount and long name do not overflow operation', await page.locator('.operation').first().evaluate(el => el.scrollWidth === el.clientWidth));
  check('Stress case has no page overflow', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  await page.screenshot({ path: 'screenshots/stress-320x640.png' });
  check('No browser errors or failed requests', errors.length === 0);
  await writeFile('screenshots/checks.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(`${checks.length} UI checks passed. Screenshots: screenshots/`);
} finally { await browser.close(); }
