import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch();
try {
 const p=await b.newPage({viewport:{width:402,height:874}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5173');await p.locator('.welcome-guest').click();await p.locator('#guest-source').focus();
 assert.equal(await p.locator('.source-section .demo-card-suggestion button').count(),2);
 await p.screenshot({path:'screenshots/guest-foreign-card-options.png'});
 await p.getByRole('button',{name:'Заполнить иностранную демо-карту отправителя',exact:true}).click();
 assert.equal(await p.locator('#guest-source').inputValue(),'4916 8273 5049 1289');assert.equal(await p.locator('.currency-select').inputValue(),'USD');
 await p.locator('#destination-number').focus();await p.getByRole('button',{name:'Заполнить демо-карту получателя',exact:true}).click();
 await p.locator('.source-section [data-expiry]').focus();await p.locator('.source-section [data-cvc]').focus();await p.locator('#transfer-amount').fill('500');
 await p.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);
 assert.equal(await p.locator('[data-fee]').textContent(),'7,5 $');assert.equal(await p.locator('[data-total]').textContent(),'507,5 $');
 assert.ok(await p.locator('.amount-conversion').isHidden());
 await p.locator('.inline-quote').screenshot({path:'screenshots/guest-usd-quote.png'});
 await p.locator('.recipient-next button').click();assert.match(await p.locator('.review-total').textContent(),/507,5 \$/);
 await p.locator('.transfer-review button').click();await p.locator('.transfer-success').waitFor({timeout:8000});assert.equal(await p.locator('.success-amount').textContent(),'500 $');
 const op=await p.evaluate(()=>JSON.parse(localStorage.getItem('c2c-demo-transfers-v1')||'null'));
 assert.equal(op.transactions[0].currency,'USD');assert.equal(op.transactions[0].amount,-500);assert.equal(op.transactions[0].fee,7.5);
 assert.deepEqual(errors,[]);console.log('PASS: two sender examples, USD default, dollar fee/total, confirmation and successful foreign demo transfer');
}finally{await b.close();}
