import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 await page.goto('http://localhost:5173');await page.locator('.welcome-guest').click();
 const field=page.locator('.guest-sender-field'),input=page.locator('#guest-source'),scan=field.locator('.scan-card'),clear=field.locator('.sender-card-clear');
 const color=(locator,prop)=>locator.evaluate((el,p)=>getComputedStyle(el)[p],prop);
 await page.mouse.move(0,0);assert.equal(await color(scan,'backgroundColor'),'rgba(0, 0, 0, 0)');await field.screenshot({path:'screenshots/sender-default.png'});
 await field.hover();assert.equal(await color(scan,'backgroundColor'),'rgb(229, 226, 246)');await field.screenshot({path:'screenshots/sender-hover.png'});
 await input.fill('4111111111111111');await page.locator('.guest-transfer h1').click();assert.ok(await clear.isVisible());assert.ok(await scan.isHidden());assert.equal(await color(field.locator('label'),'color'),'rgb(213, 213, 218)');await field.screenshot({path:'screenshots/sender-filled.png'});
 assert.ok(await clear.locator('img').evaluate(el=>el.complete&&el.naturalWidth===24));
 await clear.click();assert.equal(await input.inputValue(),'');assert.ok(await scan.isVisible());assert.ok(await page.locator('.recipient-next button').isDisabled());
 await input.fill('123');await page.locator('.guest-transfer h1').click();assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(await color(field,'borderTopColor'),'rgb(255, 21, 36)');assert.equal(await color(input,'color'),'rgb(255, 21, 36)');assert.ok(await scan.isVisible());assert.ok(await clear.isHidden());assert.equal(await page.locator('#guest-source-error').textContent(),'Неверный номер карты');await page.locator('.source-section').screenshot({path:'screenshots/sender-error.png'});
 await input.fill('4111111111111111');assert.equal(await input.getAttribute('aria-invalid'),'false');assert.ok(await clear.isVisible());assert.equal(await page.locator('#guest-source-error').textContent(),'');
 console.log('PASS: sender default, hover, filled, clear, error and correction');
}finally{await browser.close();}
