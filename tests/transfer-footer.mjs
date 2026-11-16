import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');await page.evaluate(()=>{sessionStorage.setItem('c2c-auth','true');sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Начать перевод',transferKind:'russia'}));});await page.reload();await page.evaluate(()=>document.fonts.ready);
 const next=page.locator('.recipient-next button');
 assert.deepEqual(await next.boundingBox(),{x:16,y:751,width:370,height:56});
 await page.locator('#transfer-amount').focus();assert.equal((await next.boundingBox()).y,751,'Desktop focus alone must not imply a keyboard');
 await mkdir('screenshots',{recursive:true});await page.screenshot({path:'screenshots/transfer-empty-footer-402x874.png'});
 // Model mobile browsers where the keyboard resizes only visualViewport.
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:608});window.visualViewport.dispatchEvent(new Event('resize'));});
 await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--transfer-viewport-height')==='608px');
 const keyboard=await next.boundingBox(),field=await page.locator('.amount-field').boundingBox();assert.equal(keyboard.y,544);assert.ok(keyboard.y>=field.y+field.height);assert.ok(keyboard.y+keyboard.height<=608);
 await page.screenshot({path:'screenshots/transfer-footer-keyboard-simulation.png'});
 await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));});
 await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--transfer-viewport-height')==='874px');assert.equal((await next.boundingBox()).y,751);
 await page.locator('.scan-card').click();const okay=page.locator('.scan-info button');assert.ok(await okay.isVisible());
 const style=await okay.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,height:e.getBoundingClientRect().height,radius:getComputedStyle(e).borderRadius}));
 assert.deepEqual(style,{background:'rgb(20, 20, 20)',color:'rgb(255, 255, 255)',height:56,radius:'20px'});
 await page.locator('.scan-info').screenshot({path:'screenshots/scan-notice-cta.png'});
 await okay.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('.scan-info').isHidden());
 for(const [width,height]of [[320,640],[375,812],[402,874],[430,932]]) {
 await page.setViewportSize({width,height});
 const button=await next.boundingBox(),amount=await page.locator('.amount-field').boundingBox();assert.ok(button.y>=amount.y+amount.height+52);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 if(height>=812)assert.equal(Math.round(button.y+button.height),height-67);
 if(height===640){await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));const last=await next.boundingBox();assert.ok(last.y+last.height<=height-32);await page.evaluate(()=>window.scrollTo(0,0));}
 }
 assert.deepEqual(errors,[]);console.log('PASS: bottom CTA without keyboard, desktop focus, visualViewport keyboard open/close, no field overlap, scan notice CTA and four sizes.');
} finally {await browser.close();}
