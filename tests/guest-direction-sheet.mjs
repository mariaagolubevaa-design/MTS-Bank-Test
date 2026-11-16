import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:402,height:874}});await page.goto('http://localhost:5173');await page.locator('.welcome-guest').click();
 await page.locator('#guest-source').fill('9112381015213812');
 const trigger=page.locator('.guest-direction-trigger'),sheet=page.locator('.guest-direction-sheet');
 const y=(await page.locator('.guest-sender-field').boundingBox()).y;assert.equal(y,205);
 await trigger.click();assert.ok(await sheet.isVisible());assert.equal(await trigger.getAttribute('aria-expanded'),'true');assert.equal(await sheet.locator('.direction-choice:enabled').count(),2);
 assert.equal(await sheet.evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter),'blur(10px)');
 assert.equal(await sheet.evaluate(el=>getComputedStyle(el,'::backdrop').backgroundColor),'rgba(20, 20, 20, 0.2)');
 assert.equal(await sheet.locator('.direction-sheet-title').textContent(),'Направление перевода');
 const r=await sheet.boundingBox(),choice=await sheet.locator('.is-selected').boundingBox();assert.equal(r.height,253);assert.equal(choice.y-r.y,85);assert.equal(choice.height,56);assert.equal(choice.width,370);
 assert.equal(await sheet.locator('.is-selected').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(240, 236, 255)');
 assert.ok(await sheet.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));

 await page.screenshot({path:'screenshots/guest-direction-sheet.png'});
 await page.keyboard.press('Escape');assert.ok(await sheet.isHidden());assert.equal(await page.locator('#guest-source').inputValue(),'9112 3810 1521 3812');assert.ok(await trigger.evaluate(el=>el===document.activeElement));
 await trigger.click();await sheet.locator('.is-selected').click();assert.ok(await sheet.isHidden());
 await trigger.click();await page.mouse.click(10,100);assert.ok(await sheet.isHidden());
 for(const width of [320,375,430]){await page.setViewportSize({width,height:874});await trigger.click();const r=await sheet.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);await page.keyboard.press('Escape');}
 await browser.close();console.log('PASS: direction sheet blur, escape/backdrop/current choice, focus return, preserved input and four widths');
}finally{await browser.close();}
