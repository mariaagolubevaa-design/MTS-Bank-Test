import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');
 await page.evaluate(()=>{sessionStorage.setItem('c2c-auth','true');sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Переводы'}));});
 await page.reload();
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('.transfers-menu').waitFor();
 for(const [selector,x,y,width,height] of [
 ['.transfers-menu-header',16,78,370,32],['.transfer-options',16,126,370,262],
 ['.option-russia',16,126,181,164],['.option-own',205,126,181,90],
 ['.option-details',16,298,181,90],['.option-abroad',205,224,181,164],
 ['.payment-options',16,412,373,78],['.menu-favorites',16,514,370,168],['.menu-currency',14,698,370,198],['.tabbar',0,790,402,52]
 ]) {
 const bounds=await page.locator(selector).boundingBox();
 for(const [key,value]of Object.entries({x,y,width,height}))assert.ok(Math.abs(bounds[key]-value)<1,`${selector} ${key}: ${bounds[key]}`);
 }
 assert.ok(await page.locator('.transfers-menu img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));
 assert.equal(await page.locator('.menu-favorites .recipient').first().getAttribute('data-action'),'Добавить получателя');
 await mkdir('screenshots',{recursive:true});
 await page.screenshot({path:'screenshots/transfers-figma-402x874.png'});
 for(const option of ['russia','abroad']) {
 await page.locator(`[data-option="${option}"]`).click();
 assert.ok(await page.locator('.authorized-transfer').isVisible());
 await page.locator('.authorized-back').click();
 assert.ok(await page.locator('.transfers-menu').isVisible());
 }
 for(const id of ['mom','pavel','marina']) {
 await page.locator(`.transfers-menu [data-recipient="${id}"]`).click();
 assert.ok(await page.locator('.authorized-transfer').isVisible());
 await page.locator('.authorized-back').click();
 }
 for(const option of ['own','details']) {
 await page.locator(`[data-option="${option}"]`).click();
 assert.ok(await page.locator('.detail-screen').isVisible());
 await page.locator('.detail-back').click();
 }
 await page.locator('[data-extra="Избранное"]').click();
 assert.ok(await page.locator('.menu-favorites [data-recipient]').first().evaluate(e=>e===document.activeElement));
 for(const width of [320,360,375,402,430,1280]) {
 await page.setViewportSize({width,height:874});
 await page.evaluate(()=>window.scrollTo(0,0));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),`overflow at ${width}`);
 assert.equal((await page.locator('.tabbar').boundingBox()).y,790);
 if(width===320)await page.screenshot({path:'screenshots/transfers-figma-320x874.png'});
 }
 await page.reload();assert.ok(await page.locator('.transfers-menu').isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS: transfers Figma geometry, assets, domestic/international/recipient routes, back navigation, favorites, reload and six viewport widths');
} finally {await browser.close();}
