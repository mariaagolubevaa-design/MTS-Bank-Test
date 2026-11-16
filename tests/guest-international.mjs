import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const p=await browser.newPage({viewport:{width:402,height:874}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5173');await p.locator('.welcome-guest').click();
 const choose=async kind=>{await p.locator('.guest-direction-trigger').click();await p.locator(`.guest-direction-sheet [data-direction=${kind}]`).click();};
 await choose('abroad');assert.equal(await p.locator('.guest-direction-label').textContent(),'международный');
 for(const [selector,y] of [['.guest-sender-field',204],['.destination-section .destination-field',425],['.amount-field',582.5],['.recipient-next button',754]])assert.equal((await p.locator(selector).boundingBox()).y,y);
 await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:'screenshots/guest-international-empty.png'});
 await p.locator('#guest-source').focus();await p.getByRole('button',{name:'Заполнить демо-карту отправителя',exact:true}).click();
 await p.locator('.source-section [data-expiry]').focus();await p.locator('.source-section [data-cvc]').focus();
 await p.locator('#destination-number').focus();await p.getByRole('button',{name:'Заполнить демо-карту получателя',exact:true}).click();
 assert.equal(await p.locator('#destination-number').inputValue(),'8600 4821 7359 6026');
 await p.locator('#transfer-amount').fill('100');await p.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);
 assert.match(await p.locator('[data-receive]').textContent(),/15.000 UZS/);
 await p.locator('.authorized-back').click();assert.equal(await p.locator('.guest-direction-label').textContent(),'в Россию');await p.waitForFunction(()=>document.querySelector('#destination-number').getAttribute('aria-invalid')==='true');
 assert.equal(await p.locator('#transfer-amount').inputValue(),'100');assert.ok(await p.locator('.recipient-next button').isDisabled());
 await choose('abroad');await p.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);
 for(const width of [320,375,430]){await p.setViewportSize({width,height:874});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.setViewportSize({width:402,height:874});await p.locator('.recipient-next button').click();assert.match(await p.locator('.review-receive').last().textContent(),/UZS/);
 await p.locator('.transfer-review button').click();await p.locator('.transfer-success').waitFor({timeout:8000});assert.match(await p.locator('.success-receive').textContent(),/15.000 UZS/);
 const data=await p.evaluate(()=>JSON.parse(localStorage.getItem('c2c-demo-transfers-v1')));assert.equal(data.transactions[0].transferKind,'abroad');assert.equal(data.transactions[0].receiveCurrency,'UZS');
 assert.deepEqual(errors,[]);console.log('PASS: international Figma geometry, switching with preserved data, recipient direction validation, conversion, success and four widths');
}finally{await browser.close();}
