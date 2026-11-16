import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');
 await page.evaluate(()=>{sessionStorage.setItem('c2c-auth','true');sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Начать перевод',transferKind:'russia'}));});await page.reload();await page.evaluate(()=>document.fonts.ready);
 await mkdir('screenshots',{recursive:true});
 const trigger=page.locator('.source-trigger'),options=page.locator('.source-options');
 const close=(a,b)=>assert.ok(Math.abs(a-b)<.1,`${a} != ${b}`);
 const measure=()=>trigger.evaluate(e=>{const r=e.getBoundingClientRect(),arrow=e.querySelector('.source-chevron').getBoundingClientRect(),label=e.querySelector('.field-caption'),value=e.querySelector('.source-value');return {height:r.height,border:getComputedStyle(e).borderColor,label:getComputedStyle(label).color,value:getComputedStyle(value).color,x:value.getBoundingClientRect().x-r.x,y:value.getBoundingClientRect().y-r.y,arrowX:arrow.x-r.x,arrowY:arrow.y-r.y};});
 let m=await measure();assert.equal(m.height,72);assert.equal(m.border,'rgb(213, 213, 218)');assert.equal(m.label,'rgb(20, 20, 20)');assert.equal(m.value,'rgb(213, 213, 218)');close(m.x,16);close(m.y,32);close(m.arrowX,328.5);close(m.arrowY,34);
 await trigger.screenshot({path:'screenshots/source-default.png'});
 await trigger.focus();await page.keyboard.press('ArrowDown');assert.ok(await options.isVisible());assert.equal(await page.locator('[data-source="debit"]').evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-source="second"]').evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Escape');assert.ok(await options.isHidden());assert.ok(await page.locator('.card-transfer').isVisible());assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
 await trigger.click();await page.locator('[data-source="debit"]').click();
 m=await measure();assert.equal(m.height,72);assert.equal(m.label,'rgb(213, 213, 218)');assert.equal(m.value,'rgb(20, 20, 20)');assert.equal(await page.locator('.source-value').innerText(),'•• 6354   МТС Банк');
 await trigger.screenshot({path:'screenshots/source-active.png'});
 await trigger.click();m=await measure();assert.equal(m.height,72);close(m.arrowY,32.5);
 const field=await trigger.boundingBox(),list=await options.boundingBox();close(list.y-field.y,80);assert.equal(list.height,240);assert.equal(list.width,370);
 const row=await page.locator('[data-source="debit"]').boundingBox();close(row.x-list.x,8);close(row.y-list.y,8);assert.equal(row.height,72);assert.equal(row.width,354);
 assert.equal(await page.locator('[data-source="debit"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-source="debit"]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(229, 226, 246)');
 assert.ok(await options.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth)));
 await page.screenshot({path:'screenshots/source-expanded.png',clip:{x:field.x,y:field.y,width:field.width,height:list.y+list.height-field.y}});
 await page.locator('.card-transfer>h1').click();assert.ok(await options.isHidden());
 await page.locator('.currency-select').selectOption('USD');await page.locator('#transfer-amount').fill('100');
 await trigger.click();await page.locator('[data-source="debit"]').click();assert.equal(await page.locator('.currency-select').inputValue(),'USD');
 await page.locator('.currency-select').selectOption('RUB');await trigger.click();await page.locator('[data-source="second"]').click();assert.equal(await page.locator('.currency-select').inputValue(),'USD');assert.equal(await page.locator('#transfer-amount').inputValue(),'');
 await trigger.click();await page.locator('[data-add-card]').click();assert.ok(await page.locator('.add-card-dialog[open]').isVisible());
 await page.locator('#new-card-number').fill('4111111111111111');await page.locator('.add-card-dialog .card-details-row').hover();await page.locator('.add-card-dialog[open] .authorized-continue').click();
 assert.ok(await page.locator('.source-section .card-details-row').isVisible());assert.equal(await page.locator('.currency-select').inputValue(),'RUB');
 await trigger.click();const added=options.locator('[data-source^="added-"]');assert.equal(await added.getAttribute('aria-pressed'),'true');assert.match(await added.innerText(),/Баланс недоступен/);
 await page.keyboard.press('Escape');assert.ok(await options.isHidden());assert.ok(await page.locator('.card-transfer').isVisible());
 const storage=await page.evaluate(()=>JSON.stringify({...localStorage}));assert.ok(!storage.includes('4111111111111111'));
 for(const width of [320,375,402,430]){
 await page.setViewportSize({width,height:874});await trigger.click();const a=await trigger.boundingBox(),o=await options.boundingBox(),arrow=await page.locator('.source-chevron').boundingBox();assert.equal(a.height,72);close(o.y-a.y,80);assert.ok(arrow.x+arrow.width<a.x+a.width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));await trigger.click();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: source Default/Active/Expanded geometry, icons, selected row, keyboard/Escape, outside close, currency defaults, added-card unknown balance and four widths.');
} finally {await browser.close();}
