import { analyticsFor } from './analytics.js';
import { money, operationsFor, saveDemoTransfers } from './data.js';

export const image = (name, className = '') => `<img class="${className}" src="./assets/images/${name}.${['profile', 'mastercard', 'home-profile', 'mir'].includes(name) ? 'png' : 'svg'}" alt="" draggable="false">`;
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Standalone authorized home. Navigation is injected for future auth routing. */
export function createHomeScreen({ data, onNavigate }) {
  let active = 0;
  const screen = document.createElement('main');
  screen.className = 'home-screen';
  screen.id = 'home-screen';
  screen.setAttribute('aria-label', 'Главная');
  screen.innerHTML = `
    <header class="header">
      <button class="profile hit-target" aria-label="Профиль" data-action="Профиль">${image('home-profile')}</button>
      <div class="home-header-actions"><button class="search hit-target" aria-label="Поиск" data-action="Поиск">${image('search')}</button><button class="home-qr hit-target" aria-label="Оплата по QR-коду" data-action="Оплата по QR-коду">${image('home-qr')}</button></div>
    </header>
    <section class="cards-section" aria-label="Банковские карты">
      <div class="card-track" tabindex="0" aria-label="Карты. Используйте стрелки для переключения">
        ${data.cards.map(card => `<article class="bank-card ${card.appearance === 'spectrum' ? 'bank-card--spectrum' : ''}" aria-label="${escapeHTML(card.name)} ${escapeHTML(card.last4)}">
          <div class="card-top"><span>${escapeHTML(card.id === 'debit' ? 'МТС Банк' : card.name)}</span><span>•• ${escapeHTML(card.last4)}</span></div>
          <div class="card-bottom"><span class="balance ${card.balance === null ? 'balance-unknown' : ''}">${card.balance === null ? 'Баланс недоступен' : money(card.balance, card.currency)}</span>${card.id === 'debit' ? image('mir', 'card-payment-mir') : image('mastercard')}</div>
        </article>`).join('')}
      </div>
      <div class="pagination" ${data.cards.length <= 1 ? 'hidden' : ''}>
        <button class="next-card" aria-label="Карта 1 из ${data.cards.length}. Следующая карта" data-next-card>
          ${data.cards.map((card, index) => `<span data-dot="${index}" class="${index === 0 ? 'selected' : ''}"></span>`).join('')}
        </button>
      </div>
    </section>
    <div class="quick-actions">
      <button data-action="Оплатить">${image('home-wallet')}<span>Оплатить</span></button>
      <button data-action="Пополнить карту">${image('plus')}<span>Пополнить</span></button>
      <button data-action="Перевести">${image('arrow', 'transfer-arrow')}<span>Перевести</span></button>
    </div>
    <section hidden class="favorites" aria-labelledby="favorites-title">
      <h2 id="favorites-title">Кому перевести</h2>
      <div class="recipients">
        ${data.recipients.map(recipient => `<button class="recipient" data-recipient="${escapeHTML(recipient.id)}" aria-label="Перевести: ${escapeHTML(recipient.name)} ${escapeHTML(recipient.subtitle)}">
          <span class="avatar" style="--avatar:${recipient.color}">${recipient.logo ? image(recipient.logo) : escapeHTML(recipient.initials)}</span>
          <span class="recipient-name">${escapeHTML(recipient.name)}</span><span class="recipient-subtitle">${escapeHTML(recipient.subtitle)}</span>
        </button>`).join('')}
        <button class="recipient" data-action="Добавить получателя"><span class="avatar add">+</span><span class="recipient-name">Добавить</span></button>
      </div>
    </section>
    <section class="history" aria-labelledby="history-title">
      <div class="history-heading"><button class="history-collapse" aria-expanded="true"><h2 id="history-title">История</h2>${image('home-chevron')}</button><button class="all-history" data-action="Все операции">Все${image('home-all-chevron')}</button></div>
      <div class="operations"></div>
    </section>
    <section class="home-analytics" aria-labelledby="analytics-title">
      <div class="history-heading"><button class="analytics-collapse" aria-expanded="true"><h2 id="analytics-title">Аналитика</h2>${image('home-chevron')}</button><button class="all-history" data-action="Аналитика">Все${image('home-all-chevron')}</button></div>
      <div class="analytics-grid"><div class="analytics-tile"><img class="analytics-ring" src="./assets/images/analytics-ring-filled.svg" alt=""><div><p data-analytics-expense-label>Расходы в ноябре</p><span data-analytics-expenses></span></div></div><div class="analytics-tile"><div class="analytics-bars" aria-hidden="true"><i></i><i></i><i></i></div><div><p data-analytics-income-label>Доходы в ноябре</p><span data-analytics-income></span></div></div></div>
    </section>`;

  const track = screen.querySelector('.card-track');
  const list = screen.querySelector('.operations');
  function renderAnalytics() {
    const totals=analyticsFor(data,data.cards[active].id);
    const island=screen.querySelector('.home-analytics');
    island.dataset.state=totals.empty?'empty':'filled';
    island.querySelector('.analytics-ring').src='./assets/images/analytics-ring-'+(totals.empty?'empty':'filled')+'.svg';
    island.querySelector('[data-analytics-expense-label]').textContent='Расходы в '+totals.month;
    island.querySelector('[data-analytics-income-label]').textContent='Доходы в '+totals.month;
    island.querySelector('[data-analytics-expenses]').textContent=money(totals.expenses,totals.currency);
    island.querySelector('[data-analytics-income]').textContent=money(totals.income,totals.currency);
  }
  function renderOperations() {
    screen.dataset.activeCard=data.cards[active].id;
    renderAnalytics();
    list.innerHTML = operationsFor(data, data.cards[active].id).slice(0, 3).map(item => `
      <button class="operation" data-operation="${escapeHTML(item.id)}">
        <span class="avatar" style="--avatar:${item.color}">${escapeHTML(item.initials)}</span>
        <span class="operation-copy"><span class="operation-name">${escapeHTML(item.name)}</span><span class="operation-date">${escapeHTML(item.date)}</span></span>
        <span class="operation-amount ${item.amount > 0 ? 'operation-amount--incoming' : ''}">${item.amount < 0 ? '−' : '+ '}${money(item.amount, item.currency)}</span>
        <span class="divider" aria-hidden="true"></span>
      </button>`).join('') || '<p class="empty-history">Пока нет операций</p>';
  }
  function syncCard(index) {
    active = Math.max(0, Math.min(data.cards.length - 1, index));
    screen.querySelectorAll('[data-dot]').forEach((dot, i) => dot.classList.toggle('selected', i === active));
    screen.querySelector('.next-card').setAttribute('aria-label', `Карта ${active + 1} из ${data.cards.length}. Следующая карта`);
    renderOperations();
  }
  function cardStep() {
    const cards = track.querySelectorAll('.bank-card');
    return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
  }
  function selectCard(index) {
    syncCard(index);
    track.scrollTo({ left: active * cardStep(), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  track.addEventListener('scroll', () => {
    if (!track.clientWidth) return;
    const index = Math.round(track.scrollLeft / cardStep());
    if (index !== active) syncCard(index);
  }, { passive: true });
  track.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      selectCard(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  function fitBalances() {
    screen.querySelectorAll('.balance').forEach(balance => {
      balance.style.fontSize = '';
      const available = balance.parentElement.clientWidth - 52;
      const range = document.createRange();
      range.selectNodeContents(balance);
      const width = range.getBoundingClientRect().width;
      if (width > available) balance.style.fontSize = `${parseFloat(getComputedStyle(balance).fontSize) * available / width}px`;
    });
  }
  new ResizeObserver(() => {
    if (!track.clientWidth) return;
    track.scrollTo({ left: active * cardStep(), behavior: 'instant' });
    fitBalances();
  }).observe(track);
  document.fonts.ready.then(fitBalances);
  const topup=document.createElement('dialog');
  topup.className='add-card-dialog home-topup-dialog';
  topup.innerHTML='<form><div class="add-card-heading"><h2>Пополнить карту</h2><button type="button" class="close-topup" aria-label="Закрыть">×</button></div><p class="topup-card"></p><label for="home-topup-amount">Сумма пополнения</label><input id="home-topup-amount" inputmode="decimal" autocomplete="off" required><p class="topup-error" role="alert"></p><p class="quote-note">Демонстрационное пополнение</p><button class="authorized-continue">Пополнить</button></form>';
  screen.append(topup);
  let topupCard=null;
  topup.querySelector('.close-topup').onclick=()=>topup.close();
  topup.querySelector('form').onsubmit=event=>{
    event.preventDefault();
    const raw=topup.querySelector('input').value.replace(/\s/g,'').replace(',','.');
    const amount=Number(raw),cents=Math.round(amount*100);
    if(!/^\d+(\.\d{1,2})?$/.test(raw)||!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(cents)||!Number.isSafeInteger(Math.round(topupCard.balance*100)+cents)){
      topup.querySelector('.topup-error').textContent='Введите сумму больше нуля, не более двух знаков после запятой';return;
    }
    topupCard.balance=(Math.round(topupCard.balance*100)+cents)/100;
    data.transactions.unshift({id:'topup-'+crypto.randomUUID(),cardId:topupCard.id,name:'Пополнение карты',initials:'+',color:'#e3e3e8',date:'Только что',createdAt:new Date().toISOString(),amount:cents/100,currency:topupCard.currency||'RUB',status:'Выполнен',kind:'topup'});
    saveDemoTransfers();topup.close();
  };
  screen.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-next-card')) selectCard((active + 1) % data.cards.length);
    if (target.dataset.recipient) onNavigate({ title: 'Начать перевод', recipient: data.recipients.find(item => item.id === target.dataset.recipient), card: data.cards[active] });
    if (target.dataset.operation) onNavigate({ title: 'Детали перевода', operation: data.transactions.find(item => item.id === target.dataset.operation), card: data.cards[active] });
    if(target.dataset.action==='Пополнить карту'&&Number.isFinite(data.cards[active].balance)){
      topupCard=data.cards[active];
      topup.querySelector('.topup-card').textContent='Карта •• '+topupCard.last4+' · '+(topupCard.currency||'RUB');
      topup.querySelector('input').value='';topup.querySelector('.topup-error').textContent='';topup.showModal();return;
    }
    if (target.dataset.action) onNavigate({ title: target.dataset.action, card: data.cards[active] });
    if (target.classList.contains('analytics-collapse')) {
      const grid = screen.querySelector('.analytics-grid');
      grid.hidden = !grid.hidden;
      target.setAttribute('aria-expanded', String(!grid.hidden));
    }
    if (target.classList.contains('history-collapse')) {
      list.hidden = !list.hidden;
      screen.querySelector('.history').classList.toggle('is-collapsed', list.hidden);
      target.setAttribute('aria-expanded', String(!list.hidden));
    }
  });
  window.addEventListener('demo-wallet-change', () => {
    const activeId = data.cards[active]?.id;
    const recipients=screen.querySelector('.recipients');
    const addButton=recipients.querySelector('[data-action="Добавить получателя"]');
    data.recipients.forEach(r=>{
      if(recipients.querySelector('[data-recipient="'+r.id+'"]'))return;
      const b=document.createElement('button');b.className='recipient';b.dataset.recipient=r.id;
      b.innerHTML='<span class="avatar" style="--avatar:'+r.color+'">'+escapeHTML(r.initials)+'</span><span class="recipient-name">'+escapeHTML(r.name)+'</span><span class="recipient-subtitle">'+escapeHTML(r.subtitle)+'</span>';
      recipients.insertBefore(b,addButton);
    });
    track.innerHTML = data.cards.map(card => `<article class="bank-card ${card.appearance === 'spectrum' ? 'bank-card--spectrum' : ''}" aria-label="${escapeHTML(card.name)} ${escapeHTML(card.last4)}"><div class="card-top"><span>${escapeHTML(card.id === 'debit' ? 'МТС Банк' : card.name)}</span><span>•• ${escapeHTML(card.last4)}</span></div><div class="card-bottom"><span class="balance ${card.balance === null ? 'balance-unknown' : ''}">${card.balance === null ? 'Баланс недоступен' : money(card.balance, card.currency)}</span>${card.id === 'debit' ? image('mir', 'card-payment-mir') : image('mastercard')}</div></article>`).join('');
    screen.querySelector('.next-card').innerHTML = data.cards.map((card, i) => `<span data-dot="${i}"></span>`).join('');
    screen.querySelector('.pagination').hidden = data.cards.length <= 1;
    active = Math.max(0, data.cards.findIndex(c => c.id === activeId));
    syncCard(active);
    track.scrollTo({ left: active * cardStep(), behavior: 'instant' });
    requestAnimationFrame(fitBalances);
  });
  renderOperations();
  return screen;
}
