import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');
 await page.evaluate(async()=>{
  const {createProcessingScreen}=await import('/src/processing-screen.js');
  document.body.classList.remove('is-welcome');
  document.querySelector('#screen-outlet').replaceChildren();
  const screen=document.createElement('main');screen.className='authorized-transfer is-processing';
  screen.append(createProcessingScreen());document.querySelector('#screen-outlet').append(screen);
 });
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>[...document.querySelectorAll('.transfer-processing img')].every(e=>e.complete&&e.naturalWidth));
 // Step real CSS animations deterministically, then freeze the design's initial frame.
 const motion=await page.evaluate(()=>{
  const globe=document.querySelector('.loading-globe');
  const progress=document.querySelector('.processing-track img');
  const animations=[...globe.getAnimations(),...progress.getAnimations()];
  animations.forEach(a=>{a.pause();a.currentTime=0;});
  const start=[getComputedStyle(globe).transform,getComputedStyle(progress).transform];
  animations.forEach(a=>a.currentTime=1250);
  const middle=[getComputedStyle(globe).transform,getComputedStyle(progress).transform];
  animations.forEach(a=>a.currentTime=0);
  return {count:animations.length,start,middle};
 });
 assert.equal(motion.count,2);
 assert.notEqual(motion.start[0],motion.middle[0]);
 assert.notEqual(motion.start[1],motion.middle[1]);
 for(const [selector,x,y,width,height] of [
 ['.loading-globe',4,218,394,394],['.processing-track',19,620,362,8],['.transfer-processing p',16,640,370,18]
 ]) {
 const bounds=await page.locator(selector).boundingBox();
 for(const[key,value]of Object.entries({x,y,width,height}))assert.ok(Math.abs(bounds[key]-value)<1,`${selector} ${key}: ${bounds[key]}`);
 }
 assert.equal(await page.locator('.transfer-processing').innerText(),'Обрабатываем перевод');
 assert.equal(await page.locator('.processing-track').getAttribute('aria-valuenow'),null);
 await mkdir('screenshots',{recursive:true});
 await page.screenshot({path:'screenshots/loading-figma-402x874.png'});
 for(const [width,height] of [[320,640],[360,800],[375,812],[402,874],[430,932],[1280,900]]) {
 await page.setViewportSize({width,height});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),`overflow ${width}`);
 const globe=await page.locator('.loading-globe').boundingBox();
 const bar=await page.locator('.processing-track').boundingBox();
 assert.ok(globe.x>=0&&globe.x+globe.width<=width&&globe.y+globe.height<=bar.y,`globe fits ${width}`);
 const text=await page.locator('.transfer-processing p').boundingBox();
 assert.ok(text.y+text.height<height-32,`text fits ${height}`);
 if(width===320)await page.screenshot({path:'screenshots/loading-figma-320x640.png'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.loading-globe').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await page.locator('.processing-track img').evaluate(e=>getComputedStyle(e).animationName),'loading-soft-pulse');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:402,height:874});
 await page.evaluate(()=>{
  sessionStorage.setItem('c2c-auth','true');
  sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Главная'}));
  sessionStorage.setItem('c2c-pending-transfer',JSON.stringify({readyAt:Date.now()+3000,total:150,operation:{id:'sent-loading-test',cardId:'debit',name:'Получатель •• 4444',initials:'П',color:'#e3e3e8',date:'Только что',amount:-100,fee:50,status:'Выполнен',last4:'4444',transferKind:'russia'}}));
 });
 await page.reload();
 assert.ok(await page.locator('.loading-globe').isVisible());
 assert.equal(await page.locator('.transfer-processing').innerText(),'Обрабатываем перевод');
 await page.locator('.detail-screen').waitFor({state:'visible',timeout:8000});
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('c2c-pending-transfer')),null);
 const checkWallet=()=>page.evaluate(async()=>{const {demoData}=await import('/src/data.js');return {balance:demoData.cards[0].balance,count:demoData.transactions.filter(t=>t.id==='sent-loading-test').length};});
 assert.deepEqual(await checkWallet(),{balance:12350,count:1});
 await page.reload();assert.deepEqual(await checkWallet(),{balance:12350,count:1});
 assert.deepEqual(errors,[]);
 console.log('PASS: loading geometry, assets, six viewport sizes, accessible status and pending-transfer restoration without duplicate debit.');
} finally {await browser.close();}
