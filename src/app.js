import { createGuestTransfer } from './guest-transfer.js';
import { createAuthorizedTransfer } from './authorized-transfer.js';
import { createTransfersMenu } from './transfers-menu.js';
import { createTransferScreen } from './transfer-screen.js';
import { createWelcomeScreen } from './welcome-screen.js';
import { demoData, money, saveDemoTransfers } from './data.js';
import { createHomeScreen, image, escapeHTML } from './home-screen.js';

const root = document.querySelector('#app');
root.innerHTML = `
  <div class="status-bar" aria-hidden="true"><span class="time">9:41</span><span class="levels">${image('cellular')}${image('wifi')}${image('battery')}</span></div>
  <div id="screen-outlet"></div>
  <nav class="tabbar" aria-label="Основная навигация">
    ${[['home', 'Главная'], ['transfers', 'Переводы'], ['support', 'Поддержка']].map(([icon, label], index) => `<button ${index === 0 ? 'aria-current="page"' : ''} data-tab="${label}"><span class="tab-icon">${image(icon)}</span><span>${label}</span></button>`).join('')}
  </nav><div class="home-indicator" aria-hidden="true"><span></span></div>`;
const outlet = root.querySelector('#screen-outlet');
let savedScroll = 0;
let previousFocus;
function rememberPage(page) { try { sessionStorage.setItem('c2c-current-page',JSON.stringify(page)); } catch {} }
let authenticated=false;
const home = createHomeScreen({ data: demoData, onNavigate: openScreen });
outlet.append(home);
const detail = document.createElement('main');
detail.className = 'detail-screen';
detail.hidden = true;
outlet.append(detail);

function openScreen({ title, recipient, operation, card, transferKind, fromTransfers = false, repeatAmount }) {
  if (title === 'Детали операции') title = 'Детали перевода';
  rememberPage({title,recipientId:recipient?.id,recipient:recipient?{id:recipient.id,name:recipient.name,subtitle:recipient.subtitle,last4:recipient.last4,bankInfo:recipient.bankInfo}:null,operationId:operation?.id,cardId:card?.id,transferKind,fromTransfers,repeatAmount});
  if (!home.hidden) {
    savedScroll = window.scrollY;
    previousFocus = document.activeElement;
  }
  const openedFromTransfers = fromTransfers || !!outlet.querySelector('.transfers-menu');
  outlet.querySelector('.transfers-menu')?.remove();
  if (!recipient && ['Перевести', 'Переводы'].includes(title)) {
    home.hidden = true; detail.hidden = true;
    const menu = createTransfersMenu({
      recipientList: home.querySelector('.recipients').cloneNode(true),
      onChoose: kind => {
        if (['russia', 'abroad'].includes(kind)) {
          openScreen({ title: 'Начать перевод', card: card || demoData.cards[0], recipient: null, transferKind: kind, fromTransfers: true });
        } else openScreen({ title: kind === 'own' ? 'Между своими' : 'По реквизитам', card, fromTransfers: true });
      },
      onRecipient: id => openScreen({ title: 'Начать перевод', recipient: demoData.recipients.find(r => r.id === id), card: card || demoData.cards[0], fromTransfers: true }),
      onAction: title => openScreen({ title, card, fromTransfers: true }),
    });
    outlet.append(menu);
    root.querySelector('.tabbar').hidden = false;
    root.querySelectorAll('[data-tab]').forEach(b => b.removeAttribute('aria-current'));
    root.querySelector('[data-tab="Переводы"]').setAttribute('aria-current', 'page');
    window.scrollTo(0, 0);
    return;
  }
  if (recipient || transferKind) {
    home.hidden = true;
    detail.hidden = true;
    root.querySelector('.tabbar').hidden = true;
    const transfer = createAuthorizedTransfer({ cards: demoData.cards, card, recipient, transferKind, repeatAmount, onTransfers: () => { transfer.remove(); openScreen({ title: 'Переводы', card }); }, onHome: returnHome, onBack: () => { transfer.remove(); if (openedFromTransfers) openScreen({ title: 'Переводы', card }); else returnHome(); } });
    outlet.append(transfer);
    window.scrollTo(0, 0);
    return;
  }
  home.hidden = true;
  detail.hidden = false;
  detail.classList.toggle('transfer-details', !!operation || title === 'Детали перевода');
  let content = '<p>Этот экран появится позже.</p>';
  if (recipient) content = `<div class="avatar detail-avatar" style="--avatar:${recipient.color}">${recipient.logo ? image(recipient.logo) : escapeHTML(recipient.initials)}</div><h2>${escapeHTML(recipient.name)}</h2><p>${escapeHTML(recipient.destination)}</p><p>С карты *${escapeHTML(card.last4)}</p><p class="demo-note">Демонстрационный перевод. Списаний не будет.</p>`;
  if (operation) content = `<h2>${escapeHTML(operation.name)}</h2><p class="detail-amount">${operation.amount < 0 ? '−' : '+'}${money(operation.amount)}</p><dl><dt>Дата</dt><dd>${escapeHTML(operation.date)}</dd><dt>Статус</dt><dd>${escapeHTML(operation.status)}</dd><dt>Карта</dt><dd>*${escapeHTML(card.last4)}</dd></dl><p class="demo-note">Демонстрационная операция</p>`;
  detail.innerHTML = `<button class="back detail-back" aria-label="Назад"><img src="./assets/images/back-chevron.svg" alt=""></button><h1 tabindex="-1">${escapeHTML(title)}</h1><section class="detail-content">${content}</section>`;
  if(operation) {
    const repeat=document.createElement('button');repeat.className='authorized-continue';repeat.textContent='Повторить перевод';
    repeat.onclick=()=>{
      const known=demoData.recipients.find(r=>r.id===operation.recipientId);
      const recipient=known || (operation.last4?{name:operation.name,subtitle:'•• '+operation.last4,last4:operation.last4,bankInfo:operation.bankInfo}:null);
      openScreen({title:'Начать перевод',recipient,transferKind:operation.transferKind||'russia',card:demoData.cards.find(c=>c.id===operation.cardId),repeatAmount:Math.abs(operation.amount)});
    };
    detail.querySelector('.detail-content').append(repeat);
  }
  detail.querySelector('.back').addEventListener('click', () => { if (openedFromTransfers) openScreen({ title: 'Переводы', card }); else returnHome(); });
  root.querySelectorAll('[data-tab]').forEach(button => button.removeAttribute('aria-current'));
  const selected = [...root.querySelectorAll('[data-tab]')].find(button => button.dataset.tab === title);
  selected?.setAttribute('aria-current', 'page');
  window.scrollTo(0, 0);
  detail.querySelector('h1').focus({ preventScroll: true });
}
function returnHome() {
  rememberPage({title:'Главная'});
  outlet.querySelector('.transfer-screen')?.remove();
  outlet.querySelector('.authorized-transfer')?.remove();
  outlet.querySelector('.transfers-menu')?.remove();
  root.querySelector('.tabbar').hidden = false;
  detail.hidden = true;
  home.hidden = false;
  root.querySelectorAll('[data-tab]').forEach(button => button.removeAttribute('aria-current'));
  root.querySelector('[data-tab="Главная"]').setAttribute('aria-current', 'page');
  window.scrollTo(0, savedScroll);
  previousFocus?.focus({ preventScroll: true });
}
root.querySelector('.tabbar').addEventListener('click', event => {
  const tab = event.target.closest('button')?.dataset.tab;
  if (!tab) return;
  if (tab === 'Главная') returnHome();
  else openScreen({ title: tab });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  const transferBack = outlet.querySelector('.authorized-back');
  if (transferBack) transferBack.click();
  else if (!detail.hidden) detail.querySelector('.back')?.click();
});


const welcome = createWelcomeScreen({
  onEnter: () => {
    authenticated=true;sessionStorage.setItem('c2c-auth','true');rememberPage({title:'Главная'});
    welcome.hidden = true;
    home.hidden = false;
    detail.hidden = true;
    root.querySelector('.tabbar').hidden = false;
    document.body.classList.remove('is-welcome');
    window.scrollTo(0, 0);
  },
  onGuest: openGuestTransfer,

});
outlet.prepend(welcome);
home.hidden = true;
root.querySelector('.tabbar').hidden = true;
document.body.classList.add('is-welcome');


// Restore the current prototype page within this browser tab.
try {
  authenticated=sessionStorage.getItem('c2c-auth')==='true';
  const page=JSON.parse(sessionStorage.getItem('c2c-current-page')||'null');
  if(authenticated && page && page.title!=='Старт' && page.title!=='Гостевой перевод') {
    welcome.hidden=true;home.hidden=false;document.body.classList.remove('is-welcome');
    root.querySelector('.tabbar').hidden=false;
    if(page.title!=='Главная') openScreen({
      ...page,
      recipient:demoData.recipients.find(r=>r.id===page.recipientId)||page.recipient,
      operation:demoData.transactions.find(t=>t.id===page.operationId),
      card:demoData.cards.find(c=>c.id===page.cardId),
    });
  }
  const pending=JSON.parse(sessionStorage.getItem('c2c-pending-transfer')||'null');
  if(pending && authenticated) {
    outlet.querySelector('.authorized-transfer')?.remove();
    home.hidden=true;detail.hidden=true;root.querySelector('.tabbar').hidden=true;
    const processing=document.createElement('main');processing.className='authorized-transfer is-processing';
    processing.innerHTML='<section class="transfer-processing" role="status"><img src="./assets/images/transfer-processing.png" alt=""><h2>Переводим деньги</h2><div class="processing-track" role="progressbar" aria-label="Обработка перевода"><span></span></div><p>Это может занять немного времени</p></section>';
    outlet.append(processing);
    setTimeout(()=>{
      if(!demoData.transactions.some(t=>t.id===pending.operation.id)) {
        const source=demoData.cards.find(c=>c.id===pending.operation.cardId);
        if(source && Number.isFinite(source.balance))source.balance=Math.max(0,(Math.round(source.balance*100)-Math.round(pending.total*100))/100);
        demoData.transactions.unshift(pending.operation);saveDemoTransfers();
      }
      sessionStorage.removeItem('c2c-pending-transfer');processing.remove();
      root.querySelector('.tabbar').hidden=false;
      openScreen({title:'Детали перевода',operation:pending.operation,card:demoData.cards.find(c=>c.id===pending.operation.cardId)});
    },Math.max(0,pending.readyAt-Date.now()));
  }
} catch { /* Fall back to the welcome screen if saved navigation is invalid. */ }

// Direct visual preview without creating a transaction.
if (new URLSearchParams(location.search).get('preview') === 'success') {
  welcome.hidden=true;home.hidden=true;detail.hidden=true;
  outlet.querySelector('.authorized-transfer')?.remove();
  outlet.querySelector('.transfers-menu')?.remove();
  document.body.classList.remove('is-welcome');
  root.querySelector('.tabbar').hidden=true;
  const preview=document.createElement('main');
  preview.className='authorized-transfer is-success';
  preview.innerHTML='<button class="authorized-back" aria-label="Назад"><img src="./assets/images/back-chevron.svg" alt=""></button><section class="transfer-success"><div class="success-summary"><div class="success-check" aria-hidden="true">✓</div><h2>Перевод выполнен</h2><p class="success-amount">60 ₽</p><p class="success-destination">На карту •• 5935</p><p class="success-demo">В прототипе списания не выполняются</p></div><div class="success-actions"><button class="success-transfers authorized-continue">К переводам</button><button class="success-home">На главную</button></div></section>';
  outlet.append(preview);
  const exit=title=>{preview.remove();history.replaceState(null,'',location.pathname);sessionStorage.setItem('c2c-auth','true');if(title==='Главная')returnHome();else openScreen({title});};
  preview.querySelector('.authorized-back').onclick=()=>exit('Переводы');
  preview.querySelector('.success-transfers').onclick=()=>exit('Переводы');
  preview.querySelector('.success-home').onclick=()=>exit('Главная');
  import('./confetti.js').then(({celebrate})=>celebrate(preview));
}


function openGuestTransfer() {
  welcome.hidden=true;home.hidden=true;detail.hidden=true;
  outlet.querySelector('.guest-transfer')?.remove();
  root.querySelector('.tabbar').hidden=true;
  document.body.classList.remove('is-welcome');
  rememberPage({title:'Гостевой перевод'});
  const guest=createGuestTransfer({onBack:()=>{
    guest.remove();welcome.hidden=false;document.body.classList.add('is-welcome');
    rememberPage({title:'Старт'});window.scrollTo(0,0);
  }});
  outlet.append(guest);window.scrollTo(0,0);
}
if(new URLSearchParams(location.search).get('preview')!=='success'){
  try { if(JSON.parse(sessionStorage.getItem('c2c-current-page')||'null')?.title==='Гостевой перевод')openGuestTransfer(); } catch {}
}
