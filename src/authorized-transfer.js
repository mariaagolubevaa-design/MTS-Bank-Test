import { celebrate } from './confetti.js';
import { escapeHTML } from './home-screen.js';
import { money, saveDemoWallet, saveDemoTransfers, demoData } from './data.js';

export function domesticQuote(amount, balance, sameBank = false) {
  const kopecks = Math.round(amount * 100);
  const fee = sameBank ? 0 : Math.max(5000, Math.round(kopecks * 0.015));
  return { fee: fee / 100, total: (kopecks + fee) / 100, insufficient: Number.isFinite(balance) && kopecks + fee > Math.round(balance * 100) };
}

export function internationalDemoQuote(amount, balance) {
  const total = Math.round(amount * 100) / 100;
  return { fee: 0, total, insufficient: Number.isFinite(balance) && Math.round(total * 100) > Math.round(balance * 100), receive: Math.round(total * 150 * 100) / 100, rate: 150 };
}

export function validCard(number) {
  const digits = number.replace(/\D/g, '');
  if (!/^\d{16,19}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  [...digits].reverse().forEach((digit, i) => { let n = Number(digit); if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; });
  return sum % 10 === 0;
}

export function createAuthorizedTransfer({ cards, card, recipient, transferKind, onBack, onTransfers, onHome, repeatAmount }) {
  if (recipient) {
    const country = recipient.bankInfo?.country || recipient.subtitle?.match(/^(RU|UZ)\b/)?.[1];
    if (country) transferKind = country === 'RU' ? 'russia' : 'abroad';
  }
  const screen = document.createElement('main');
  screen.className = 'authorized-transfer';
  let source = repeatAmount != null ? cards.find(c => c.id === card?.id) || null : null;
  let savedRecipient = recipient || null;
  let bank = savedRecipient?.bankInfo || null;
  let lookupVersion = 0;
  let lookupTimer;
  const international = transferKind === 'abroad';
  const title = transferKind === 'abroad' ? 'По карте за границу' : 'По карте в Россию';
  screen.innerHTML = `
    <button class="authorized-back" aria-label="Назад"><img src="./assets/images/back-chevron.svg" alt=""></button>
    <h1>${title}</h1>
    <form novalidate>
      ${international ? '<section class="international-destination"><h2>Страна и валюта получения</h2><p>Россия → Узбекистан · RUB → UZS</p><p class="quote-note">Демонстрационный расчёт</p></section>' : ''}
      <section class="source-section">
        <div class="source-dropdown"><button type="button" class="source-trigger" aria-expanded="false" aria-controls="source-options"><span class="field-caption">Откуда списать</span><span class="source-value">Выберите карту</span><span class="source-chevron">⌄</span></button>
          <div id="source-options" class="source-options" hidden>${cards.map(c=>`<button type="button" data-source="${c.id}"><span>${escapeHTML(c.name)} •• ${escapeHTML(c.last4)}</span><small>${c.external ? 'Баланс недоступен' : 'Доступно '+money(c.balance, c.currency)}</small></button>`).join('')}<button type="button" data-add-card>＋ Добавить карту</button></div>
        </div>
      </section>
      <section class="destination-section"><h2>Номер карты получателя</h2><div class="destination-field"><label for="destination-number">Номер карты</label><input id="destination-number" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="destination-error"><button type="button" class="scan-card" aria-label="Сканировать карту"><img src="./assets/images/scan-card.svg" alt=""></button></div><p id="destination-error" class="field-error" role="alert"></p><p class="recipient-bank" role="status"></p></section>
      <section class="inline-amount"><h2>Сумма</h2><div class="destination-field amount-field"><label for="transfer-amount">Сумма перевода</label><div class="amount-input-row"><input id="transfer-amount" class="transfer-amount-inline" inputmode="decimal" placeholder="0" aria-describedby="amount-error"><span class="amount-currency">₽</span></div><button type="button" class="clear-amount" aria-label="Очистить сумму" hidden>×</button></div><p id="amount-error" class="field-error" role="alert"></p><button type="button" class="add-shortfall" hidden></button><div class="inline-quote" hidden>${international ? '<dl class="quote-summary international-summary"><dt>Курс перевода</dt><dd data-rate>—</dd><dt>Получатель получит</dt><dd data-receive>—</dd></dl>' : ''}<dl class="quote-summary"><dt>Комиссия</dt><dd data-fee>—</dd><dt>Всего к списанию</dt><dd data-total>—</dd></dl><p class="quote-note"></p></div></section>
      <div class="recipient-next"><button class="authorized-continue" disabled>Продолжить</button></div>
    </form>
    <dialog class="scan-info"><h2>Сканирование карты</h2><p>В прототипе сканирование недоступно — введите номер карты вручную</p><button type="button">Понятно</button></dialog>`;
  const addDialog=document.createElement('dialog');
  addDialog.className='add-card-dialog';
  addDialog.innerHTML='<form novalidate><div class="add-card-heading"><h2>Добавить карту</h2><button type="button" class="close-add-card" aria-label="Закрыть">×</button></div><label for="new-card-number">Номер карты</label><input id="new-card-number" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="new-card-error"><p id="new-card-error" class="field-error" role="alert"></p><p class="quote-note">Демонстрационная карта — реальная привязка и проверка банком не выполняются</p><button class="authorized-continue">Добавить</button></form>';
  screen.append(addDialog);
  const addInput=addDialog.querySelector('input');
  const addError=addDialog.querySelector('[role=alert]');
  addDialog.querySelector('.close-add-card').onclick=()=>addDialog.close();
  addInput.oninput=()=>{addInput.value=addInput.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();addError.textContent='';addInput.setAttribute('aria-invalid','false');};
  addDialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    if(!validCard(addInput.value)){addError.textContent='Проверьте номер карты';addInput.setAttribute('aria-invalid','true');addInput.focus();return;}
    const last4=addInput.value.replace(/\D/g,'').slice(-4);
    const newCard={id:'added-'+Date.now(),name:'Добавленная карта',last4,balance:null,currency:'RUB',external:true};
    cards.push(newCard);
    saveDemoWallet();
    const button=document.createElement('button');button.type='button';button.dataset.source=newCard.id;
    button.innerHTML='<span>Добавленная карта •• '+last4+'</span><small>Баланс недоступен</small>';
    options.insertBefore(button,options.querySelector('[data-add-card]'));
    source=newCard;
    screen.querySelector('.source-value').textContent='Добавленная карта •• '+last4;
    addInput.value='';addError.textContent='';addDialog.close();update();
  };
  const form = screen.querySelector('form');
  const input = screen.querySelector('input');
  const trigger = screen.querySelector('.source-trigger');
  const options = screen.querySelector('.source-options');
  const next = screen.querySelector('.authorized-continue');
  const error = screen.querySelector('#destination-error');
  const bankStatus=screen.querySelector('.recipient-bank');
  function detectBank() {
    const version=++lookupVersion;clearTimeout(lookupTimer);
    bank=null;bankStatus.textContent='';
    const digits=input.value.replace(/\D/g,'');
    if(digits.length<8){bankStatus.textContent='';return;}
    bankStatus.textContent='';
    lookupTimer=setTimeout(async()=>{
      try {
        const response=await fetch('/api/bank/'+digits.slice(0,8));
        if(!response.ok)throw new Error('Lookup unavailable');
        const info=await response.json();
        if(version!==lookupVersion)return;
        if(info.name&&info.country) {
          bank={...info,sameBank:info.country==='RU'&&/mts|мтс/i.test(info.name)};
          bankStatus.textContent=bank.name+' · '+bank.country;
          if(savedRecipient?.id?.startsWith('saved-')){savedRecipient.bankInfo=bank;saveDemoTransfers();}
        } else {bankStatus.textContent='';}
      } catch {
        if(version!==lookupVersion)return;
        bankStatus.textContent='';
      }
      if(version===lookupVersion)update();
    },350);
  }
  function ready() { return !!source && (!!savedRecipient || validCard(input.value)); }
  function update() { updateQuote(); }
  trigger.onclick = () => { options.hidden = !options.hidden; trigger.setAttribute('aria-expanded', String(!options.hidden)); };
  trigger.onkeydown = e => { if(e.key === 'ArrowDown'){ e.preventDefault(); options.hidden=false;trigger.setAttribute('aria-expanded','true');options.querySelector('button').focus(); } };
  options.onkeydown = e => { if(e.key==='Escape'){options.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();} };
  options.onclick = e => {
    if(e.target.closest('[data-add-card]')) {
      options.hidden=true;trigger.setAttribute('aria-expanded','false');
      addDialog.showModal();return;
    }
    const b=e.target.closest('[data-source]'); if(!b)return;
    const previousCurrency=source?.currency || 'RUB';
    source=cards.find(c=>c.id===b.dataset.source);
    if(previousCurrency !== (source.currency || 'RUB')) amountInput.value='';
    screen.querySelector('.source-value').textContent='•• '+source.last4+' · '+(source.external?'баланс недоступен':money(source.balance,source.currency));
    options.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();update();
  };
  if(savedRecipient) { input.value=savedRecipient.subtitle; input.readOnly=true; }
  input.onfocus=()=>{if(savedRecipient && input.readOnly){ savedRecipient=null;input.readOnly=false;input.value='';detectBank();update();}};
  input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();error.textContent='';input.setAttribute('aria-invalid','false');detectBank();update();scheduleRecipientOffer();};
  input.onblur=()=>{if(input.value&&!savedRecipient&&!validCard(input.value)){error.textContent='Проверьте номер карты';input.setAttribute('aria-invalid','true');}};
  const recipientSheet=document.createElement('dialog');
  recipientSheet.className='save-recipient-sheet';
  recipientSheet.innerHTML='<form novalidate><div class="sheet-handle"></div><div class="sheet-heading"><h2>Добавить получателя?</h2><button type="button" class="close-recipient-sheet" aria-label="Закрыть">×</button></div><p class="save-card-caption"></p><label for="recipient-display-name">Имя получателя</label><input id="recipient-display-name" maxlength="40" value="Новый получатель"><p class="field-error" role="alert"></p><button class="authorized-continue">Добавить</button><button type="button" class="skip-recipient">Не сейчас</button></form>';
  screen.append(recipientSheet);
  const offeredCards=new Set();
  let offerTimer;
  let offeredNumber='';
  function scheduleRecipientOffer() {
    clearTimeout(offerTimer);
    const number=input.value.replace(/\D/g,'');
    if(!validCard(number)||savedRecipient||offeredCards.has(number))return;
    offerTimer=setTimeout(()=>{
      if(!screen.isConnected||input.value.replace(/\D/g,'')!==number||screen.querySelector('dialog[open]')||form.hidden)return;
      const last4=number.slice(-4);
      if(demoData.recipients.some(r=>r.last4===last4||r.subtitle?.endsWith(last4)))return;
      offeredCards.add(number);offeredNumber=number;
      recipientSheet.querySelector('.save-card-caption').textContent='Карта •• '+last4;
      recipientSheet.querySelector('input').value='Новый получатель';
      recipientSheet.querySelector('[role=alert]').textContent='';
      recipientSheet.showModal();
    },900);
  }
  const closeRecipient=()=>recipientSheet.close();
  recipientSheet.querySelector('.close-recipient-sheet').onclick=closeRecipient;
  recipientSheet.querySelector('.skip-recipient').onclick=closeRecipient;
  recipientSheet.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const name=recipientSheet.querySelector('input').value.trim();
    if(!name){recipientSheet.querySelector('[role=alert]').textContent='Введите имя получателя';return;}
    if(offeredNumber!==input.value.replace(/\D/g,'')){recipientSheet.close();return;}
    const last4=offeredNumber.slice(-4);
    const r={id:'saved-'+crypto.randomUUID(),name,subtitle:(international?'UZ':'RU')+' •• '+last4,destination:(international?'UZ':'RU')+' •• '+last4,last4,initials:name.slice(0,1).toUpperCase(),color:'#d4b6ff',bankInfo:bank};
    demoData.recipients.push(r);savedRecipient=r;saveDemoTransfers();recipientSheet.close();update();
  };
  const dialog=screen.querySelector('.scan-info');
  screen.querySelector('.scan-card').onclick=()=>dialog.showModal();
  dialog.querySelector('button').onclick=()=>dialog.close();
  screen.querySelector('.authorized-back').onclick=onBack;
  const amountInput=screen.querySelector('#transfer-amount');
  const amountError=screen.querySelector('#amount-error');
  const clearAmount=screen.querySelector('.clear-amount');
  clearAmount.onclick=()=>{amountInput.value='';updateQuote();amountInput.focus();};
  const quoteBox=screen.querySelector('.inline-quote');
  let currentQuote=null;
  const addShortfall=screen.querySelector('.add-shortfall');
  const topup=document.createElement('dialog');topup.className='add-card-dialog topup-dialog';
  topup.innerHTML='<div class="add-card-heading"><h2>Пополнить карту</h2><button type="button" class="close-topup" aria-label="Закрыть">×</button></div><p class="topup-card"></p><p class="topup-amount"></p><p class="quote-note">Демонстрационное пополнение — реальные деньги не списываются</p><button type="button" class="authorized-continue topup-confirm">Пополнить в прототипе</button>';
  screen.append(topup);
  topup.querySelector('.close-topup').onclick=()=>topup.close();
  let pendingTopup=null;
  addShortfall.onclick=()=>{
    if(!source||!currentQuote?.insufficient)return;
    pendingTopup={source,kopecks:Math.max(0,Math.round(currentQuote.total*100)-Math.round(source.balance*100))};
    topup.querySelector('.topup-card').textContent='На карту •• '+source.last4;
    topup.querySelector('.topup-amount').textContent=money(pendingTopup.kopecks/100);
    topup.showModal();
  };
  topup.querySelector('.topup-confirm').onclick=()=>{
    if(!pendingTopup)return;
    pendingTopup.source.balance=(Math.round(pendingTopup.source.balance*100)+pendingTopup.kopecks)/100;
    const item=options.querySelector('[data-source="'+pendingTopup.source.id+'"] small');
    if(item)item.textContent='Доступно '+money(pendingTopup.source.balance,pendingTopup.source.currency);
    screen.querySelector('.source-value').textContent='•• '+source.last4+' · '+money(source.balance,source.currency);
    saveDemoWallet();
    pendingTopup=null;topup.close();updateQuote();
  };
  function updateQuote() {
    screen.querySelector('.transfer-review')?.remove();
    const currency=source?.currency || 'RUB';
    screen.querySelector('.amount-currency').textContent=currency==='USD'?'$':'₽';
    amountInput.setAttribute('aria-label',currency==='USD'?'Сумма перевода в долларах США':'Сумма перевода в рублях');
    clearAmount.hidden=amountInput.value.length===0;
    const measure=document.createElement('canvas').getContext('2d');
    measure.font=getComputedStyle(amountInput).font;
    amountInput.style.width=Math.ceil(measure.measureText(amountInput.value || '0').width)+2+'px';
    const raw=amountInput.value.trim().replace(',','.');
    const value=Number(raw);
    const valid=/^\d+(\.\d{1,2})?$/.test(raw)&&Number.isFinite(value)&&value>0;
    const bankSupported=bank && (international ? bank.country==='UZ' : bank.country==='RU');
    const supported=source&&(!source.currency||source.currency==='RUB')&&bankSupported;
    currentQuote=valid&&supported?(international?internationalDemoQuote(value,source.balance):domesticQuote(value,source.balance,bank.sameBank)):null;
    if(international){quoteBox.querySelector('[data-rate]').textContent=currentQuote?'1 ₽ = 150 UZS':'—';quoteBox.querySelector('[data-receive]').textContent=currentQuote?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(currentQuote.receive)+' UZS':'—';}
    quoteBox.hidden=!raw;
    quoteBox.querySelector('[data-fee]').textContent=currentQuote?money(currentQuote.fee):'—';
    quoteBox.querySelector('[data-total]').textContent=currentQuote?money(currentQuote.total):'—';
    quoteBox.querySelector('.quote-note').textContent=!source?'Выберите карту списания':source.external?'Демонстрационный расчёт · баланс и комиссия банка добавленной карты не проверяются':!bank?'Комиссия пока недоступна':!bankSupported?'Страна банка не соответствует выбранному направлению':!supported?(international?'Выберите направление и получите расчёт курса и комиссии — перевод пока недоступен':'Для этого направления нужен отдельный тариф и курс конвертации'):international?'Пример: курс 1 ₽ = 150 UZS, комиссия 0 ₽ · не является текущим предложением МТС':bank.sameBank?'На карту МТС Банка · без комиссии':'В другой российский банк · 1,5%, минимум 50 ₽';
    amountError.textContent=raw&&!valid?'Введите сумму больше нуля, не более двух знаков после запятой':currentQuote?.insufficient?'Недостаточно средств с учётом комиссии · не хватает '+money(currentQuote.total-source.balance):'';
    amountInput.setAttribute('aria-invalid',String(!!amountError.textContent));
    addShortfall.hidden=!currentQuote?.insufficient;
    if(currentQuote?.insufficient) {
      const shortfall=(Math.round(currentQuote.total*100)-Math.round(source.balance*100))/100;
      addShortfall.textContent='Добавить '+money(shortfall);
    }
    next.disabled=!ready()||!currentQuote||currentQuote.insufficient;
  }
  amountInput.oninput=updateQuote;
  form.onsubmit=e=>{
    e.preventDefault();if(next.disabled||!currentQuote)return;
    screen.querySelector('.transfer-review')?.remove();
    const review=document.createElement('section');review.className='transfer-review';
    review.innerHTML='<h2>Проверьте перевод</h2><div class="review-recipient"><span>Получатель</span><strong>Карта •• '+(savedRecipient?savedRecipient.subtitle.slice(-4):input.value.replace(/\D/g,'').slice(-4))+'</strong></div><dl class="review-breakdown"><dt>Сумма перевода</dt><dd>'+money(Number(amountInput.value.replace(',','.')))+'</dd><dt>Комиссия</dt><dd>'+money(currentQuote.fee)+'</dd></dl><div class="review-total"><span>Всего к списанию</span><strong>'+money(currentQuote.total)+'</strong></div><p class="review-demo-note">В прототипе списания не выполняются</p>';
    if(international){const received=document.createElement('p');received.className='review-receive';received.textContent='Получатель получит '+new Intl.NumberFormat('ru-RU').format(currentQuote.receive)+' UZS · демонстрационный курс 1 ₽ = 150 UZS';review.append(received);}
    const send=document.createElement('button');send.type='button';send.className='authorized-continue';send.textContent='Перевести в прототипе';review.append(send);
    let sent=false;
    send.onclick=async()=>{
      if(sent)return;
      const quote=international?internationalDemoQuote(Number(amountInput.value.replace(',','.')),source.balance):domesticQuote(Number(amountInput.value.replace(',','.')),source.balance,bank.sameBank);
      if(quote.insufficient){updateQuote();return;}
      sent=true;send.disabled=true;
      const last4=savedRecipient?.last4 || (savedRecipient?.subtitle.match(/(\d{4})$/)?.[1]) || input.value.replace(/\D/g,'').slice(-4);
      const recipientName=savedRecipient?.name || 'Получатель •• '+last4;
      const operation={id:'sent-'+crypto.randomUUID(),cardId:source.id,name:recipientName,initials:savedRecipient?.initials||'П',color:'#d4b6ff',date:'Только что',amount:-Number(amountInput.value.replace(',','.')),fee:quote.fee,status:'Выполнен',last4,recipientId:savedRecipient?.id,transferKind:transferKind||'russia',receive:quote.receive,receiveCurrency:international?'UZS':undefined,bankInfo:bank};
      sessionStorage.setItem('c2c-pending-transfer',JSON.stringify({operation,total:quote.total,readyAt:Date.now()+5000}));
      form.hidden=true;
      screen.classList.add('is-processing');
      screen.querySelector('.authorized-back').disabled=true;
      const processing=document.createElement('section');
      processing.className='transfer-processing';
      processing.setAttribute('role','status');
      processing.setAttribute('aria-live','polite');
      processing.innerHTML='<img src="./assets/images/transfer-processing.png" alt=""><h2>Переводим деньги</h2><div class="processing-track" role="progressbar" aria-label="Обработка перевода"><span></span></div><p>Это может занять немного времени</p>';
      screen.append(processing);
      window.scrollTo(0,0);
      await new Promise(resolve=>setTimeout(resolve,5000));
      processing.remove();screen.classList.remove('is-processing');
      screen.querySelector('.authorized-back').disabled=false;
      if(Number.isFinite(source.balance)) source.balance=(Math.round(source.balance*100)-Math.round(quote.total*100))/100;
      demoData.transactions.unshift(operation);saveDemoTransfers();
      sessionStorage.removeItem('c2c-pending-transfer');
      sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Детали перевода',operationId:operation.id,cardId:source.id}));
      form.hidden=true;
      const success=document.createElement('section');success.className='transfer-success';
      screen.classList.add('is-success');
      success.setAttribute('role','status');
      success.innerHTML='<div class="success-summary"><div class="success-check" aria-hidden="true">✓</div><h2>Перевод выполнен</h2><p class="success-amount">'+money(-operation.amount)+'</p><p class="success-destination">На карту •• '+last4+'</p>'+(international?'<p class="success-receive">Получателю '+new Intl.NumberFormat('ru-RU').format(quote.receive)+' UZS</p>':'')+'<p class="success-demo">В прототипе списания не выполняются</p></div><div class="success-actions"><button type="button" class="success-transfers authorized-continue">К переводам</button><button type="button" class="success-home">На главную</button></div>';
      screen.append(success);
      celebrate(screen);
      success.querySelector('.success-transfers').onclick=onTransfers || onBack;
      success.querySelector('.success-home').onclick=onHome || onBack;
      window.scrollTo(0,0);
    };
    form.append(review);review.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  if(savedRecipient){bankStatus.textContent=bank?bank.name:'';}
  if(repeatAmount != null){amountInput.value=String(repeatAmount);if(source)screen.querySelector('.source-value').textContent='•• '+source.last4+' · '+(source.external?'баланс недоступен':money(source.balance,source.currency));updateQuote();}
  return screen;
}
