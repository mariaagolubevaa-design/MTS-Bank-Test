import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport:{width:402,height:874}, hasTouch:true });
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('response', r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://localhost:5173');
  await page.locator('.welcome-login').click();
  await page.locator('.auth-submit').click();
  await page.evaluate(()=>document.fonts.ready);
  for(const [selector,x,y,width,height] of [
    ['.card-track',16,126,370,212],['.quick-actions',16,374,370,90],
    ['.history',16,488,370,268],['.home-analytics',14,780,370,189],['.tabbar',0,790,402,52]
  ]) {
    const rect=await page.locator(selector).boundingBox();
    for(const [key,value] of Object.entries({x,y,width,height})) assert.ok(Math.abs(rect[key]-value)<1,`${selector} ${key}: ${rect[key]}`);
  }
  assert.ok(await page.locator('.favorites').isHidden());
  assert.ok(await page.locator('img:visible').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));
  await mkdir('screenshots',{recursive:true});
  await page.waitForFunction(()=>document.querySelectorAll('.operations .operation').length===3);
  await page.locator('.operation').first().waitFor({state:'visible'});
  await page.screenshot({path:'screenshots/home-figma-402x874.png'});
  await page.locator('.next-card').click();
  await page.waitForFunction(()=>document.querySelector('.card-track').scrollLeft>369);
  assert.equal(await page.locator('.operation').count(),2);
  assert.equal((await page.locator('.history').boundingBox()).height,198);
  assert.match(await page.locator('.operation').first().innerText(),/Марина Б\./);
  await page.locator('.history').screenshot({path:'screenshots/history-dollar.png'});
  await page.locator('.card-track').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(()=>document.querySelector('.card-track').scrollLeft<1);
  await page.locator('.history-collapse').click();
  assert.ok(await page.locator('.operations').isHidden());
  await page.locator('.history-collapse').click();
  await page.locator('.operation').first().click();
  assert.ok((await page.locator('.detail-screen').innerText()).includes('Выполнен'));
  await page.locator('.detail-back').click();
  await page.locator('[data-action="Перевести"]').click();
  assert.ok(await page.locator('.transfers-menu').isVisible());
  await page.locator('.transfers-menu [data-recipient="mom"]').click();
  assert.ok(await page.locator('.authorized-transfer').isVisible());
  await page.locator('.authorized-back').click();
  await page.locator('[data-tab="Главная"]').click();
  for(const width of [320,360,375,402,430,1280]) {
    await page.setViewportSize({width,height:874});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),`overflow ${width}`);
    const nav=await page.locator('.tabbar').boundingBox();
    assert.equal(nav.y,790);
    assert.ok(await page.locator('.quick-actions').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
    if(width===320)await page.screenshot({path:'screenshots/home-figma-320x874.png'});
  }
  await page.evaluate(async()=>{
    const {demoData,saveDemoWallet}=await import('/src/data.js');
    demoData.cards.push({id:'external-test',name:'Добавленная карта',last4:'1111',balance:null,external:true});
    saveDemoWallet();
  });
  assert.equal(await page.locator('.bank-card').last().locator('.balance').innerText(),'Баланс недоступен');
  assert.deepEqual(errors,[]);
  console.log('Home: Figma geometry, local assets, card switching, history, transfer navigation, six viewport widths and unknown balance passed.');
} finally {await browser.close();}
