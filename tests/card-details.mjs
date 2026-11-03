import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?screen=guest');
 assert.equal(await page.locator('.guest-source .card-details-row input').count(),2);
 assert.equal(await page.locator('.guest-destination .card-details-row').count(),0);
 await page.locator('.guest-source .card-details-row').hover();
 assert.equal(await page.locator('[data-expiry]').inputValue(),'12/30');
 assert.equal(await page.locator('[data-cvc]').inputValue(),'123');
 await page.screenshot({path:'screenshots/guest-card-details.png'});
 await page.evaluate(async()=>{
  const {createAuthorizedTransfer}=await import('/src/authorized-transfer.js');
  document.body.replaceChildren(createAuthorizedTransfer({cards:[{id:'test',name:'Карта',last4:'1234',balance:5000}],onBack:()=>{}}));
 });
 assert.equal(await page.locator('.source-section .card-details-row').isVisible(),false);
 await page.locator('.source-trigger').click();
 await page.locator('[data-add-card]').click();
 await page.locator('#new-card-number').fill('4111111111111111');
 await page.locator('.add-card-dialog .card-details-row').hover();
 assert.equal(await page.locator('.add-card-dialog [data-cvc]').getAttribute('type'),'password');
 await page.screenshot({path:'screenshots/authorized-card-details.png'});
 await page.locator('.add-card-dialog[open] .authorized-continue').click();
 assert.equal(await page.locator('.source-section .card-details-row').isVisible(),true);
 assert.equal(await page.locator('.source-section [data-expiry]').inputValue(),'12/30');
 const stored=await page.evaluate(()=>JSON.stringify({...localStorage}));
 assert.ok(!stored.includes('12/30')&&!stored.includes('4111111111111111')&&!stored.includes('cvc'));
 assert.deepEqual(errors,[]);
 console.log('PASS: guest and authorized card details, hover fill, masking, no credential persistence');
} finally {await browser.close();}
