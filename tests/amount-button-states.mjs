import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
let releaseLookup;
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addLocatorHandler(page.locator('.save-recipient-sheet[open]'),()=>page.locator('.skip-recipient').click());
 let block=true;const gate=new Promise(resolve=>releaseLookup=resolve);let lookupStarted;const started=new Promise(resolve=>lookupStarted=resolve);
 await page.route('**/api/bank/*',async route=>{lookupStarted();if(block)await gate;await route.fulfill({json:{name:'Другой банк',country:'RU'}});});
 await page.goto('http://localhost:5173');
 await page.evaluate(()=>{sessionStorage.setItem('c2c-auth','true');sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Начать перевод',transferKind:'russia'}));});await page.reload();await page.evaluate(()=>document.fonts.ready);
 await mkdir('screenshots',{recursive:true});
 const field=page.locator('.amount-field'),button=page.locator('.recipient-next button'),select=page.locator('.currency-select'),input=page.locator('#transfer-amount');
 const close=(a,b)=>assert.ok(Math.abs(a-b)<.1,`${a} != ${b}`);
 const fieldStyle=()=>field.evaluate(el=>({border:getComputedStyle(el).borderColor,label:getComputedStyle(el.querySelector('label')).color,input:getComputedStyle(el.querySelector('input')).color,unit:el.querySelector('.amount-unit').textContent}));
 const buttonStyle=()=>button.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,font:getComputedStyle(el).fontSize,line:getComputedStyle(el).lineHeight,radius:getComputedStyle(el).borderRadius}));
 const f=await field.boundingBox(),c=await select.boundingBox();
 assert.deepEqual(f,{x:16,y:420,width:370,height:72});assert.equal(c.width,36);assert.equal(c.height,44);close(c.y-f.y,24);const arrow=await page.locator('.currency-picker>img').boundingBox();assert.equal(arrow.width,16);assert.equal(arrow.height,16);close(arrow.x-f.x,50);close(arrow.y-f.y,38);
 assert.equal((await fieldStyle()).border,'rgb(213, 213, 218)');
 assert.equal(await select.evaluate(el=>getComputedStyle(el).color),'rgb(20, 20, 20)');assert.equal(await select.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 assert.deepEqual(await buttonStyle(),{background:'rgb(235, 235, 238)',color:'rgb(213, 213, 218)',font:'15px',line:'18px',radius:'20px'});
 await field.screenshot({path:'screenshots/amount-default.png'});await button.screenshot({path:'screenshots/continue-inactive.png'});
 await field.hover();await page.screenshot({path:'screenshots/amount-hover.png',clip:await field.boundingBox()});
 await input.fill('0');await page.locator('.card-transfer>h1').click();
 assert.equal((await fieldStyle()).border,'rgb(184, 61, 69)');assert.equal((await fieldStyle()).input,'rgb(184, 61, 69)');assert.equal((await fieldStyle()).label,'rgb(20, 20, 20)');assert.ok(await button.isDisabled());
 const crop=await field.boundingBox(),error=await page.locator('#amount-error').boundingBox();
 await page.screenshot({path:'screenshots/amount-error.png',clip:{x:crop.x,y:crop.y,width:crop.width,height:error.y+error.height-crop.y}});
 await page.locator('.source-trigger').click();await page.locator('[data-source="debit"]').click();await input.fill('100');await page.locator('#destination-number').fill('5555555555554444');
 await started;
 assert.equal(await button.getAttribute('aria-busy'),'true');assert.ok(await button.isDisabled());assert.ok(await button.locator('.continue-label').isHidden());assert.ok(await button.locator('.continue-spinner').isVisible());
 assert.equal((await buttonStyle()).background,'rgb(20, 20, 20)');
 await page.waitForFunction(()=>document.querySelector('.continue-spinner').complete&&document.querySelector('.continue-spinner').naturalWidth>0);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await button.locator('.continue-spinner').evaluate(el=>getComputedStyle(el).animationName),'none');await button.screenshot({path:'screenshots/continue-loading.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 block=false;releaseLookup();await page.waitForFunction(()=>!document.querySelector('.recipient-next button').disabled);
 assert.equal(await button.getAttribute('aria-busy'),'false');assert.equal((await buttonStyle()).color,'rgb(255, 255, 255)');assert.equal(await page.locator('[data-total]').innerText(),'150 ₽');
 await page.locator('.card-transfer>h1').click();assert.equal((await fieldStyle()).label,'rgb(213, 213, 218)');assert.ok(await page.locator('.clear-amount').isVisible());await field.screenshot({path:'screenshots/amount-filled.png'});await button.screenshot({path:'screenshots/continue-default.png'});
 await select.selectOption('EUR');assert.equal((await fieldStyle()).unit,'€');assert.equal(await select.inputValue(),'EUR');assert.equal(await page.locator('[data-total]').innerText(),'9 234,47 ₽');
 await input.fill('150');assert.ok(await button.isDisabled());assert.match(await page.locator('#amount-error').innerText(),/Недостаточно/);
 await select.selectOption('RUB');await input.fill('100');await page.locator('.clear-amount').click();assert.equal(await input.inputValue(),'');assert.ok(await button.isDisabled());
 for(const width of [320,375,402,430]) {
 await page.setViewportSize({width,height:874});const bounds=await field.boundingBox(),currency=await select.boundingBox();close(currency.y+22,bounds.y+46);assert.ok(currency.x+currency.width<bounds.x+bounds.width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: amount default/filled/hover/error, inline currency chevron, inactive/default/loading CTA, real pending calculation, reduced motion, conversion and narrow screens.');
} finally {releaseLookup?.();await browser.close();}
