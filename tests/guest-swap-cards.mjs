import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch();
try{
 const p=await b.newPage({viewport:{width:402,height:874}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:5173');await p.locator('.welcome-guest').click();await p.evaluate(()=>document.fonts.ready);
 const swap=p.locator('.guest-swap-cards');
 for(const [s,y] of [['.guest-sender-field',204],['.source-section [data-expiry]',307],['.source-section [data-cvc]',307],['.destination-section>h2',403],['.destination-section .destination-field',437],['.amount-field',598],['.recipient-next button',754],['.guest-swap-cards',372]])assert.equal((await p.locator(s).boundingBox()).y,y,s);
 for(const selector of ['.guest-sender-field label','.destination-section .destination-field label','.amount-field label'])assert.equal((await p.locator(selector).boundingBox()).x,32,selector);
 for(const selector of ['.guest-source-scan','.destination-section .scan-card'])assert.equal((await p.locator(selector).boundingBox()).x,338,selector);
 assert.equal(await p.locator('.guest-sender-field').evaluate(el=>getComputedStyle(el).boxShadow),'rgb(213, 213, 218) 0px 0px 0px 0.5px inset');
 assert.equal(await p.locator('.source-section [data-expiry]').evaluate(el=>getComputedStyle(el).boxShadow),'rgb(213, 213, 218) 0px 0px 0px 0.8px inset');
 assert.ok(await swap.isDisabled());assert.equal((await swap.boundingBox()).width,48);assert.equal((await swap.boundingBox()).x,338);
 await swap.locator('img').evaluate(el=>el.decode());await p.screenshot({path:'screenshots/guest-swap-empty.png'});
 await p.locator('#guest-source').focus();await p.getByRole('button',{name:'Заполнить демо-карту отправителя',exact:true}).click();await p.locator('#destination-number').focus();await p.getByRole('button',{name:'Заполнить демо-карту получателя',exact:true}).click();await p.locator('.source-section [data-expiry]').focus();await p.locator('.source-section [data-cvc]').focus();await p.locator('#transfer-amount').fill('5000');await p.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);await p.locator('#transfer-amount').evaluate(el=>el.blur());
 for(const [s,y] of [['.guest-sender-field',197],['.source-section [data-expiry]',304],['.destination-section>h2',400],['.destination-section .destination-field',426],['.amount-field',582],['.inline-quote',678],['.recipient-next button',754],['.guest-swap-cards',369]])assert.equal((await p.locator(s).boundingBox()).y,y,s);
 await p.screenshot({path:'screenshots/guest-swap-filled.png'});
 await swap.click();assert.equal(await p.locator('#guest-source').inputValue(),'2200 7893 3254 1984');assert.equal(await p.locator('#destination-number').inputValue(),'9112 3810 1521 3812');assert.equal(await p.locator('.source-section [data-expiry]').inputValue(),'');assert.equal(await p.locator('.source-section [data-cvc]').inputValue(),'');assert.ok(await p.locator('.recipient-next button').isDisabled());assert.equal((await p.locator('#transfer-amount').inputValue()).replace(/\s/g,''),'5000');
 await p.locator('.source-section [data-expiry]').focus();await p.locator('.source-section [data-cvc]').focus();await p.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);
 await p.locator('#guest-source').fill('4916827350491289');await p.locator('#destination-number').fill('2200789332541984');await p.locator('#transfer-amount').fill('100');assert.equal(await p.locator('.currency-select').inputValue(),'USD');await swap.click();assert.equal(await p.locator('.currency-select').inputValue(),'RUB');assert.equal(await p.locator('#transfer-amount').inputValue(),'');
 await p.locator('.guest-direction-trigger').click();await p.locator('[data-direction=abroad]').click();assert.ok(await swap.isHidden());
 await p.locator('.guest-direction-trigger').click();await p.locator('[data-direction=russia]').click();assert.ok(await swap.isVisible());
 for(const width of [320,375,430]){await p.setViewportSize({width,height:874});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS: guest empty/filled Figma positions, swap, cleared credentials, preserved amount, direction visibility and four widths');
}finally{await b.close();}
