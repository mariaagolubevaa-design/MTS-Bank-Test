import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:402,height:874}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://localhost:5173');
 await page.evaluate(()=>{sessionStorage.setItem('c2c-auth','true');sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Главная'}));});
 await page.reload();await page.evaluate(()=>document.fonts.ready);
 await mkdir('screenshots',{recursive:true});
 const states=[['Главная','home'],['Переводы','transfers'],['Поддержка','support']];
 const glyphs={home:{active:[16.5,16.5,2.75,2.75],inactive:[17.5,17.6334,2.25,2.1166]},transfers:{active:[16.8712,19.8948,2.5644,1.0526],inactive:[16.8712,19.8948,2.5644,1.0526]},support:{active:[18.5133,18.5133,1.5174,1.9696],inactive:[18.5133,18.5133,1.5174,1.9696]}};
 const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<.05,`${message}: ${actual} != ${expected}`);
 for(const [selected,selectedIcon]of states) {
 await page.locator(`[data-tab="${selected}"]`).click();await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.tabbar [aria-current=page]').count(),1);
 const nav=await page.locator('.tabbar').boundingBox();assert.deepEqual(nav,{x:0,y:790,width:402,height:52});
 for(const [index,[label,icon]]of states.entries()) {
 const metrics=await page.locator(`[data-tab="${label}"]`).evaluate(button=>{
 const rect=el=>el.getBoundingClientRect().toJSON();
 const images=[...button.querySelectorAll('img')];
 const visible=images.filter(img=>getComputedStyle(img).display!=='none');
 const style=getComputedStyle(button),text=button.querySelector('.tab-label');
 return {button:rect(button),slot:rect(button.querySelector('.tab-icon')),text:rect(text),visible:visible.length,image:rect(visible[0]),src:visible[0].getAttribute('src'),loaded:images.every(img=>img.complete&&img.naturalWidth),color:style.color,font:style.fontFamily,size:style.fontSize,line:style.lineHeight,gap:style.gap,bg:style.backgroundColor,radius:style.borderRadius};
 });
 const active=label===selected;
 const [w,h,x,y]=glyphs[icon][active?'active':'inactive'];
 close(metrics.button.x,index*134,'tab x');close(metrics.button.width,134,'equal thirds');close(metrics.button.height,52,'tab height');
 close(metrics.slot.width,22,'icon slot');close(metrics.slot.height,22,'icon slot');close(metrics.slot.y,795.5,'icon slot top');
 close(metrics.image.width,w,'SVG width');close(metrics.image.height,h,'SVG height');close(metrics.image.x-metrics.slot.x,x,'SVG offset x');close(metrics.image.y-metrics.slot.y,y,'SVG offset y');
 close(metrics.text.y,820.5,'caption top');close(metrics.text.height,16,'caption height');
 assert.equal(metrics.visible,1);assert.ok(metrics.loaded);assert.equal(metrics.src,`./assets/images/nav-${icon}-${active?'active':'inactive'}.svg`);
 assert.equal(metrics.color,active?'rgb(102, 65, 251)':'rgb(20, 20, 20)');assert.ok(metrics.font.includes('Inter Tight'));assert.equal(metrics.size,'11px');assert.equal(metrics.line,'16px');assert.equal(metrics.gap,'3px');assert.equal(metrics.bg,'rgba(0, 0, 0, 0)');assert.equal(metrics.radius,'26px');
 }
 await page.locator('.tabbar').screenshot({path:`screenshots/tabbar-${selectedIcon}-402x52.png`});
 }
 await page.reload();assert.equal(await page.locator('.tabbar [aria-current=page]').getAttribute('data-tab'),'Поддержка');
 for(const width of [320,360,375,402,430,1280]) {
 await page.setViewportSize({width,height:874});
 for(const [label]of states) {
 await page.locator(`[data-tab="${label}"]`).click();
 const bounds=await page.locator('.tabbar').boundingBox();close(bounds.width,Math.min(width,402),'responsive width');close(bounds.y,790,'fixed bottom');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 }
 }
 await page.locator('[data-tab="Главная"]').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#home-screen').isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS: exact Figma tabbar geometry, six original SVGs and offsets, all three states, colors, typography, reload, keyboard and six widths.');
} finally {await browser.close();}
