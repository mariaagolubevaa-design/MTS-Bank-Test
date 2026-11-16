import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');await page.locator('.welcome-guest').click();
 const sender=page.locator('#guest-source'),recipient=page.locator('#destination-number');
 assert.equal(await sender.inputValue(),'');assert.equal(await recipient.inputValue(),'');
 await sender.focus();assert.equal(await sender.inputValue(),'');
 await page.locator('.source-section').screenshot({path:'screenshots/guest-demo-sender.png'});
 await page.getByRole('button',{name:'Заполнить демо-карту отправителя',exact:true}).click();
 assert.equal(await sender.inputValue(),'9112 3810 1521 3812');assert.equal(await sender.getAttribute('aria-invalid'),'false');
 await recipient.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 assert.equal(await recipient.inputValue(),'2200 7893 3254 1984');
 await page.locator('.source-section [data-expiry]').focus();await page.locator('.source-section [data-cvc]').focus();
 await page.locator('#transfer-amount').fill('5000');await page.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);
 await page.locator('.recipient-next button').click();assert.ok(await page.locator('.transfer-review').isVisible());
 await page.locator('.recipient-card-clear').click();await recipient.fill('123');await page.locator('.guest-transfer h1').click();assert.equal(await recipient.getAttribute('aria-invalid'),'true');
 await recipient.focus();assert.equal(await recipient.inputValue(),'123');assert.ok(await page.getByRole('button',{name:'Заполнить демо-карту получателя',exact:true}).isHidden());
 await page.locator('.recipient-card-clear').click();await recipient.fill('5555555555554444');assert.equal(await recipient.inputValue(),'5555 5555 5555 4444');
 assert.deepEqual(errors,[]);console.log('PASS: optional Figma cards, keyboard selection, manual entry, validation and confirmation');
}finally{await browser.close();}
