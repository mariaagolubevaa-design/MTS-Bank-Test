import { demoAmountRates, amountSymbols, amountCurrencyNames, amountInRubles, enteredMoney, defaultAmountCurrency } from './amount-currency.js';
import { createProcessingScreen } from './processing-screen.js';
import { createDemoCardDetails } from './card-details.js';
import { demoCardAvailability } from './card-availability.js';
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

export function createAuthorizedTransfer({ cards, card, recipient, transferKind, onBack, onTransfers, onHome, repeatAmount, guest = false, initialNumber, sourceNumber }) {
  if (recipient) {
    const country = recipient.bankInfo?.country || recipient.subtitle?.match(/^(RU|UZ)\b/)?.[1];
    if (country) transferKind = country === 'RU' ? 'russia' : 'abroad';
  }
  const foreignDemoNumber='4916827350491289';
  const figmaDemoCards={foreign:foreignDemoNumber,sender:'9112381015213812',recipient:'2200789332541984',internationalRecipient:'8600482173596026'};
  const isFigmaDemoCard=number=>guest&&Object.values(figmaDemoCards).includes(number.replace(/\D/g,''));
  const validTransferCard=number=>validCard(number)||isFigmaDemoCard(number);
  const transferCardAvailability=(number,options={})=>demoCardAvailability(number,{...options,saved:options.saved||isFigmaDemoCard(number)});
  const screen = document.createElement('main');
  screen.className = 'authorized-transfer card-transfer';
  const lockedGuestSource = guest && !!sourceNumber;
  const guestSourceNumbers = new Map();
  const inlineGuestSource = guest && !lockedGuestSource;
  const guestInlineId = inlineGuestSource ? 'guest-'+crypto.randomUUID() : null;
  let source = guest ? cards[0] : repeatAmount != null ? cards.find(c => c.id === card?.id) || null : null;
  let amountCurrency=defaultAmountCurrency(source);
  let savedRecipient = recipient || null;
  let bank = savedRecipient?.bankInfo || null;
  let lookupVersion = 0;
  let lookupTimer;
  let bankLookupPending=false;
  let availability = savedRecipient ? transferCardAvailability('', { saved: true }) : null;
  let international = transferKind === 'abroad';
  const refreshDemoSuggestions=[];
  if(!international)screen.classList.add('card-transfer--russia');
  const sourceName = c => c.id === 'debit' ? 'МТС Банк' : c.currency === 'USD' ? 'International' : c.name;
  const sourceOption = c => `<button type="button" data-source="${escapeHTML(c.id)}" aria-pressed="${source?.id === c.id}" title="${c.balance == null ? 'Баланс недоступен' : 'Доступно '+money(c.balance,c.currency)}"><span class="source-bank-icon ${c.id === 'debit' ? '' : 'is-international'}"><img src="./assets/images/${c.id === 'debit' ? 'card-bank-mts.png' : 'card-bank-international.svg'}" alt=""></span><span class="source-option-copy"><span>${escapeHTML(sourceName(c))} •• ${escapeHTML(c.last4)}</span><small>${c.external ? 'Баланс недоступен' : c.id === 'debit' ? 'МИР' : 'Mastercard'}</small></span><img class="source-radio" src="./assets/images/${source?.id === c.id ? 'card-radio-selected.svg' : 'card-radio-empty.svg'}" alt=""></button>`;
  const title = transferKind === 'abroad' ? 'По карте за границу' : 'По карте в Россию';
  screen.innerHTML = `
    <button class="authorized-back" aria-label="Назад"><img src="./assets/images/back-chevron.svg" alt=""></button>
    <h1>${title}</h1>
    <form novalidate>
      ${international ? '<section class="international-destination"><h2>Страна и валюта получения</h2><p>Россия → Узбекистан · RUB → UZS</p><p class="quote-note">Демонстрационный расчёт</p></section>' : ''}
      <section class="source-section">
        <div class="source-dropdown"><button type="button" class="source-trigger" aria-expanded="false" aria-controls="source-options"><span class="field-caption">Откуда списать</span><span class="source-value">Выберите карту</span><img class="source-chevron" src="./assets/images/source-field-chevron.svg" alt=""></button>
          <div id="source-options" class="source-options" hidden>${cards.map(sourceOption).join('')}<button type="button" data-add-card><img class="source-add-icon" src="./assets/images/card-add.svg" alt=""><span class="source-option-copy"><span>Добавить новую</span><small>Visa, Mastercard</small></span><img class="source-radio" src="./assets/images/card-radio-empty.svg" alt=""></button></div>
        </div>
      </section>
      <section class="destination-section"><div class="destination-field recipient-card-field"><label for="destination-number">Номер карты получателя</label><input id="destination-number" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="destination-error"><button type="button" class="scan-card" aria-label="Сканировать карту"><img src="./assets/images/${international ? 'card-scan.svg' : 'recipient-scan.svg'}" alt=""></button></div><p id="destination-error" class="field-error" role="alert"></p><p id="recipient-bank-status" class="recipient-bank" role="status"></p><p id="recipient-card-status" class="card-availability quote-note" role="status" aria-live="polite"></p></section>
      <section class="inline-amount"><h2>Сумма</h2><div class="destination-field amount-field"><label for="transfer-amount">Сумма перевода</label><div class="amount-input-row"><input id="transfer-amount" class="transfer-amount-inline" inputmode="decimal" placeholder="0" aria-describedby="amount-error"><span class="currency-picker"><select class="amount-currency currency-select" aria-label="Валюта перевода"><option value="RUB" aria-label="Российский рубль">₽</option><option value="USD" aria-label="Доллар США">$</option><option value="EUR" aria-label="Евро">€</option></select><img src="./assets/images/${international ? 'card-source-chevron.svg' : 'amount-currency-chevron.svg'}" alt="" aria-hidden="true"></span><span class="amount-unit" aria-hidden="true">₽</span></div><button type="button" class="clear-amount" aria-label="Очистить сумму" hidden>×</button></div><p id="amount-error" class="field-error" role="alert"></p><button type="button" class="add-shortfall" hidden></button></section><div class="transfer-footer"><div class="inline-quote" hidden>${international||guest ? '<dl class="quote-summary international-summary"'+(!international?' hidden':'')+'><dt>Курс перевода</dt><dd data-rate>—</dd><dt>Получатель получит</dt><dd data-receive>—</dd></dl>' : ''}<dl class="amount-conversion" hidden><dt>Демо-курс</dt><dd data-amount-rate></dd><dt>Сумма в рублях</dt><dd data-amount-rubles></dd></dl><dl class="quote-summary"><dt>Комиссия</dt><dd data-fee>—</dd><dt>Всего к списанию</dt><dd data-total>—</dd></dl></div>
      <div class="recipient-next"><button class="authorized-continue" disabled aria-label="Продолжить" aria-busy="false"><span class="continue-label">Продолжить</span><img class="continue-spinner" src="./assets/images/continue-spinner.svg" alt="" hidden></button></div>
      </div>
    <details class="quote-disclosure" hidden><summary>Тариф и условия · демо</summary><p class="quote-note"></p></details>
    </form>
    <dialog class="scan-info"><h2>Сканирование карты</h2><p>В прототипе сканирование недоступно — введите номер карты вручную</p><button type="button">Понятно</button></dialog>`;
  const addDialog=document.createElement('dialog');
  addDialog.className='add-card-dialog';
  addDialog.innerHTML='<form novalidate><div class="add-card-heading"><h2>Добавить карту</h2><button type="button" class="close-add-card" aria-label="Закрыть">×</button></div><label for="new-card-number">Номер карты</label><input id="new-card-number" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="new-card-error"><p id="new-card-error" class="field-error" role="alert"></p><p class="quote-note">Демонстрационная карта — реальная привязка и проверка банком не выполняются</p><button class="authorized-continue">Добавить</button></form>';
  screen.append(addDialog);
  const addDetails=createDemoCardDetails();
  addDialog.querySelector('#new-card-number').after(addDetails);
  const addInput=addDialog.querySelector('input');
  const addError=addDialog.querySelector('[role=alert]');
  addDialog.querySelector('.close-add-card').onclick=()=>addDialog.close();
  addInput.oninput=()=>{addInput.value=addInput.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();addError.textContent='';addInput.setAttribute('aria-invalid','false');};
  addDialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    if(validTransferCard(addInput.value)&&!transferCardAvailability(addInput.value).available){addError.textContent=transferCardAvailability(addInput.value).message;addInput.setAttribute('aria-invalid','true');return;}
    if(!validTransferCard(addInput.value)){addError.textContent='Проверьте номер карты';addInput.setAttribute('aria-invalid','true');addInput.focus();return;}
    if(!addDetails.demoComplete()){addError.textContent='Укажите срок действия и CVC/CVV';addDetails.querySelector('input').focus();return;}
    const last4=addInput.value.replace(/\D/g,'').slice(-4);
    const newCard={id:'added-'+Date.now(),name:'Добавленная карта',last4,balance:null,currency:'RUB',external:true};
    cards.push(newCard);
    if (guest) guestSourceNumbers.set(newCard.id, addInput.value.replace(/\D/g, ''));
    saveDemoWallet();
    const button=document.createElement('button');button.type='button';button.dataset.source=newCard.id;
    button.innerHTML=sourceOption(newCard).replace(/^<button[^>]*>|<\/button>$/g,'');
    options.insertBefore(button,options.querySelector('[data-add-card]'));
    source=newCard;
    if(amountCurrency!=='RUB')amountInput.value='';
    amountCurrency='RUB';
    sourceDetails.copyDemoFrom(addDetails);

    addInput.value='';addDetails.clearDemo();addError.textContent='';addDialog.close();update();
  };
  const form = screen.querySelector('form');
  const input = screen.querySelector('#destination-number');
  const trigger = screen.querySelector('.source-trigger');
  const options = screen.querySelector('.source-options');
  const next = screen.querySelector('.authorized-continue');
  const error = screen.querySelector('#destination-error');
  const sourceDetails=createDemoCardDetails(()=>update());
  sourceDetails.hidden=true;
  screen.querySelector('.source-section').append(sourceDetails);
  if(inlineGuestSource) {
    screen.classList.add('guest-inline-source');
    screen.querySelector('.source-dropdown').hidden=true;
    const sourceSection=screen.querySelector('.source-section');
    sourceSection.insertAdjacentHTML('afterbegin', '<h2>Откуда списать</h2><div class="destination-field recipient-card-field guest-sender-field"><label for="guest-source">Номер карты отправителя</label><input id="guest-source" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="guest-source-error"><button type="button" class="scan-card guest-source-scan" aria-label="Сканировать карту отправителя"><img src="./assets/images/recipient-scan.svg" alt=""></button></div><p id="guest-source-error" class="field-error" role="alert"></p>');
    const sender=sourceSection.querySelector('#guest-source');
    const senderError=sourceSection.querySelector('#guest-source-error');
    const senderField=sender.closest('.destination-field');
    senderField.insertAdjacentHTML('beforeend','<button type="button" class="sender-card-clear" aria-label="Очистить номер карты отправителя" hidden><img src="./assets/images/sender-card-clear.svg" alt=""></button>');
    const senderClear=senderField.querySelector('.sender-card-clear');
    const syncSenderState=()=>{
      senderField.classList.toggle('is-filled',!!sender.value);
      senderClear.hidden=!sender.value;
      senderField.querySelector('.scan-card').hidden=!!sender.value;
    };
    senderClear.onclick=()=>{sender.value='';sender.oninput();sender.focus();};

    sourceDetails.querySelectorAll('input').forEach(el=>el.placeholder='');
    sender.oninput=()=>{
      sender.value=sender.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();
      sourceNumber=sender.value;
      const available=validTransferCard(sender.value)&&transferCardAvailability(sender.value).available;
      const foreign=sender.value.replace(/\D/g,'')===foreignDemoNumber;
      source=available?{id:guestInlineId,name:foreign?'Иностранная демо-карта':'Карта отправителя',last4:sender.value.replace(/\D/g,'').slice(-4),balance:null,currency:foreign?'USD':'RUB',country:foreign?'US':'RU',external:true}:null;
      if(source&&source.currency!==amountCurrency){amountCurrency=source.currency;amountInput.value='';}
      senderField.querySelector('label').textContent='Номер карты отправителя'+(foreign?' · USD':'');
      senderError.textContent=validTransferCard(sender.value)&&!available?transferCardAvailability(sender.value).message:'';
      sender.setAttribute('aria-invalid',String(!!senderError.textContent));
      syncSenderState();detectBank();update();
    };
    sender.onblur=()=>{if(sender.value&&!validTransferCard(sender.value)){senderError.textContent='Неверный номер карты';sender.setAttribute('aria-invalid','true');}syncSenderState();};
    screen.querySelector('.destination-section').insertAdjacentHTML('afterbegin','<h2>Куда перевести</h2>');
    for(const [field,kind] of [[sender,'sender'],[input,'recipient']]) {
      const suggestion=document.createElement('div');suggestion.className='demo-card-suggestion';suggestion.hidden=true;
      const getChoices=()=>kind==='sender'?[{number:figmaDemoCards.sender,label:'Пример для демо / Россия, RUB',name:'Заполнить демо-карту отправителя'},{number:foreignDemoNumber,label:'Пример для демо / Иностранная карта, USD',name:'Заполнить иностранную демо-карту отправителя'}]:[{number:international?figmaDemoCards.internationalRecipient:figmaDemoCards.recipient,label:international?'Пример для демо / Узбекистан, UZS':'Пример для демо',name:'Заполнить демо-карту получателя'}];
      field.closest('.destination-field').after(suggestion);
      const syncSuggestion=()=>{suggestion.hidden=!!field.value||!(document.activeElement===field||suggestion.contains(document.activeElement));};
      const renderChoices=()=>{suggestion.replaceChildren();for(const choice of getChoices()){
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',choice.name);
        button.innerHTML='<span>'+choice.label+'</span><strong>'+choice.number.replace(/(.{4})(?=.)/g,'$1 ')+'</strong>';
        suggestion.append(button);
        button.onpointerdown=event=>event.preventDefault();
        button.onclick=()=>{field.value=choice.number;field.oninput();field.focus();syncSuggestion();};
      }};renderChoices();refreshDemoSuggestions.push(renderChoices);
      field.addEventListener('focus',syncSuggestion);field.addEventListener('input',syncSuggestion);
      field.addEventListener('blur',()=>setTimeout(syncSuggestion,0));
      suggestion.addEventListener('focusin',syncSuggestion);suggestion.addEventListener('focusout',()=>setTimeout(syncSuggestion,0));
      suggestion.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();field.focus();suggestion.hidden=true;return;}
        if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
        event.preventDefault();
        const buttons=[...suggestion.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
        buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();
      });

      field.addEventListener('keydown',event=>{
        if(event.key==='Escape'){suggestion.hidden=true;event.stopPropagation();}
        if(event.key==='ArrowDown'&&!suggestion.hidden){event.preventDefault();suggestion.querySelector('button').focus();}
      });
    }


  }

  input.closest('.destination-field').insertAdjacentHTML('beforeend','<button type="button" class="recipient-card-clear" aria-label="Очистить номер карты получателя" hidden><img src="./assets/images/sender-card-clear.svg" alt=""></button>');
  const clearRecipient=screen.querySelector('.recipient-card-clear');
  clearRecipient.onclick=()=>{savedRecipient=null;input.readOnly=false;input.value='';input.oninput();input.focus();};

  const bankStatus=screen.querySelector('.recipient-bank');
  const availabilityStatus=screen.querySelector('.card-availability');
  function detectBank() {
    const version=++lookupVersion;clearTimeout(lookupTimer);
    bank=null;bankStatus.textContent='';
    availability=null;availabilityStatus.textContent='';bankLookupPending=false;
    input.setAttribute('aria-invalid','false');
    const digits=input.value.replace(/\D/g,'');
    if(!validTransferCard(digits)){update();return;}
    bankLookupPending=true;
    availabilityStatus.textContent='Проверяем возможность перевода · демо';
    update();
    bankStatus.textContent='';
    lookupTimer=setTimeout(async()=>{
      availability=guest&&digits===sourceNumber?.replace(/\D/g,'')?{available:false,message:'Карты отправителя и получателя должны отличаться'}:transferCardAvailability(digits);
      availabilityStatus.textContent=availability.available?'':availability.message;
      input.setAttribute('aria-invalid',String(!availability.available));
      update();
      if(isFigmaDemoCard(digits)){bank={name:'Демо-карта',country:digits===figmaDemoCards.internationalRecipient?'UZ':digits===foreignDemoNumber?'US':'RU',sameBank:false};bankLookupPending=false;update();return;}
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
      if(version===lookupVersion){bankLookupPending=false;update();}
    },350);
  }
  function ready() { return !!source && availability?.available === true && (!!savedRecipient || validTransferCard(input.value)) && (!guest || input.value.replace(/\D/g, '') !== (guestSourceNumbers.get(source.id) || sourceNumber?.replace(/\D/g, ''))); }
  function update() { updateQuote(); }
  trigger.onclick = () => { options.hidden = !options.hidden; trigger.setAttribute('aria-expanded', String(!options.hidden)); };
  trigger.onkeydown = e => { if(e.key === 'ArrowDown'){ e.preventDefault(); options.hidden=false;trigger.setAttribute('aria-expanded','true');options.querySelector('button').focus(); } };
  const closeSourceOptions=()=>{options.hidden=true;trigger.setAttribute('aria-expanded','false');};
  for(const eventName of ['click','focusin'])screen.addEventListener(eventName,event=>{if(!event.target.closest('.source-dropdown'))closeSourceOptions();});
  screen.addEventListener('keydown',event=>{if(event.key==='Escape'&&!options.hidden){event.stopPropagation();closeSourceOptions();trigger.focus();}});
  options.onkeydown = e => {
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSourceOptions();trigger.focus();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();
    const choices=[...options.querySelectorAll('button')];
    const active=choices.indexOf(document.activeElement);
    const index=e.key==='Home'?0:e.key==='End'?choices.length-1:(active+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;
    choices[index]?.focus();
  };
  options.onclick = e => {
    if(e.target.closest('[data-add-card]')) {
      options.hidden=true;trigger.setAttribute('aria-expanded','false');
      addDialog.showModal();return;
    }
    const b=e.target.closest('[data-source]'); if(!b)return;
    const previousId=source?.id;
    source=cards.find(c=>c.id===b.dataset.source);
    if(previousId!==source.id){
      const preferred=defaultAmountCurrency(source);
      if(amountCurrency!==preferred)amountInput.value='';
      amountCurrency=preferred;
    }

    options.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();update();
  };
  if(savedRecipient) { input.value=savedRecipient.subtitle; input.readOnly=true; }
  input.onfocus=()=>{if(savedRecipient && input.readOnly){ savedRecipient=null;input.readOnly=false;input.value='';detectBank();update();}};
  input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();error.textContent='';input.setAttribute('aria-invalid','false');detectBank();update();scheduleRecipientOffer();};
  input.onblur=()=>{if(input.value&&!savedRecipient&&!validTransferCard(input.value)){error.textContent=international?'Проверьте номер карты':'Неверный номер карты';input.setAttribute('aria-invalid','true');}};
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
    if(guest||!validTransferCard(number)||savedRecipient||offeredCards.has(number))return;
    offerTimer=setTimeout(()=>{
      if(!availability?.available||!screen.isConnected||input.value.replace(/\D/g,'')!==number||screen.querySelector('dialog[open]')||form.hidden||!options.hidden)return;
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
  screen.querySelectorAll('.scan-card').forEach(button=>button.onclick=()=>dialog.showModal());
  dialog.querySelector('button').onclick=()=>dialog.close();
  screen.querySelector('.authorized-back').onclick=onBack;
  const amountInput=screen.querySelector('#transfer-amount');
  const currencySelect=screen.querySelector('.currency-select');
  currencySelect.onchange=()=>{amountCurrency=currencySelect.value;updateQuote();};
  const normalizedAmount=()=>amountInput.value.replace(/\s/g,'').replace(',','.');
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
    if(item)item.closest('button').title='Доступно '+money(pendingTopup.source.balance,pendingTopup.source.currency);

    saveDemoWallet();
    pendingTopup=null;topup.close();updateQuote();
  };
  const debitMoney=value=>money(value,guest&&source?.currency==='USD'?'USD':'RUB');
  function quoteForSource(rubles,sameBank=false){
    const quote=international?internationalDemoQuote(rubles,source.balance):domesticQuote(rubles,source.balance,sameBank);
    if(guest&&source.currency==='USD'){
      const debitAmount=Math.round(rubles/demoAmountRates.USD*100)/100;
      const fee=Math.round(quote.fee/demoAmountRates.USD*100)/100;
      return {...quote,fee,total:Math.round((debitAmount+fee)*100)/100,debitAmount,debitCurrency:'USD'};
    }
    return {...quote,debitAmount:rubles,debitCurrency:'RUB'};
  }
  function updateQuote() {
    sourceDetails.hidden=inlineGuestSource ? false : !source?.external || guest;
    trigger.classList.toggle('has-source',!!source);
    if(!lockedGuestSource)screen.querySelector('.source-value').textContent=source?'•• '+source.last4+'   '+sourceName(source):'Выберите карту';
    options.querySelectorAll('[data-source]').forEach(button=>{
      const selected=button.dataset.source===source?.id;
      button.setAttribute('aria-pressed',String(selected));
      button.querySelector('.source-radio').src='./assets/images/'+(selected?'card-radio-selected.svg':'card-radio-empty.svg');
    });
    input.closest('.destination-field').classList.toggle('is-filled',!!input.value);
    clearRecipient.hidden=!input.value;
    input.closest('.destination-field').querySelector('.scan-card').hidden=!!input.value;

    amountInput.closest('.destination-field').classList.toggle('is-filled',!!amountInput.value);
    screen.querySelector('.transfer-review')?.remove();
    currencySelect.value=amountCurrency;
    screen.querySelector('.amount-unit').textContent=amountSymbols[amountCurrency];
    currencySelect.title='Валюта перевода: '+amountCurrency;
    amountInput.setAttribute('aria-label','Сумма перевода в '+amountCurrencyNames[amountCurrency]);
    clearAmount.hidden=amountInput.value.length===0;
    const measure=document.createElement('canvas').getContext('2d');
    measure.font=getComputedStyle(amountInput).font;
    amountInput.style.width=Math.ceil(measure.measureText(amountInput.value || '0').width)+2+'px';
    const raw=normalizedAmount();
    const value=Number(raw);
    const valid=/^\d+(\.\d{1,2})?$/.test(raw)&&Number.isFinite(value)&&value>0;
    const effectiveBank=bank || {country:international?'UZ':'RU',sameBank:false};
    const bankSupported=international ? effectiveBank.country==='UZ' : effectiveBank.country==='RU';
    if(inlineGuestSource&&availability?.available&&!bankLookupPending){
      input.setAttribute('aria-invalid',String(!bankSupported));
      availabilityStatus.textContent=bankSupported?'':international?'Для международного перевода укажите карту Узбекистана':'Для перевода в Россию укажите российскую карту';
    }

    const supported=source&&(!source.currency||source.currency==='RUB'||guest&&source.currency==='USD')&&bankSupported;
    const rubles=valid?amountInRubles(value,amountCurrency):null;
    currentQuote=valid&&rubles>0&&supported&&availability?.available&&!bankLookupPending?{
      ...quoteForSource(rubles,effectiveBank.sameBank),
      rubles,enteredAmount:value,enteredCurrency:amountCurrency,amountRate:demoAmountRates[amountCurrency],
    }:null;
    const conversion=quoteBox.querySelector('.amount-conversion');
    conversion.hidden=amountCurrency==='RUB'||guest&&source?.currency===amountCurrency;
    conversion.querySelector('[data-amount-rate]').textContent='1 '+amountSymbols[amountCurrency]+' = '+money(demoAmountRates[amountCurrency]);
    conversion.querySelector('[data-amount-rubles]').textContent=currentQuote?money(currentQuote.rubles):!raw?'0 ₽':'—';
    const internationalSummary=quoteBox.querySelector('.international-summary');
    if(internationalSummary)internationalSummary.hidden=!international;
    if(international){quoteBox.querySelector('[data-rate]').textContent=currentQuote?'1 ₽ = 150 UZS':'—';quoteBox.querySelector('[data-receive]').textContent=currentQuote?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(currentQuote.receive)+' UZS':'—';}
    const showQuote=ready() && !!supported && !bankLookupPending;
    quoteBox.hidden=!showQuote;
    screen.classList.toggle('has-quote',showQuote);
    screen.querySelector('.quote-disclosure').hidden=!showQuote;
    quoteBox.querySelector('[data-fee]').textContent=currentQuote?debitMoney(currentQuote.fee):!raw?debitMoney(0):'—';
    quoteBox.querySelector('[data-total]').textContent=currentQuote?debitMoney(currentQuote.total):!raw?debitMoney(0):'—';
    screen.querySelector('.quote-disclosure .quote-note').textContent=!source?'Выберите карту списания':source.external?'Демонстрационный расчёт · баланс и комиссия банка добавленной карты не проверяются':!bank?'Демонстрационный расчёт: 1,5%, минимум 50 ₽ · банк не определён':!bankSupported?'Страна банка не соответствует выбранному направлению':!supported?(international?'Выберите направление и получите расчёт курса и комиссии — перевод пока недоступен':'Для этого направления нужен отдельный тариф и курс конвертации'):international?'Пример: курс 1 ₽ = 150 UZS, комиссия 0 ₽ · не является текущим предложением МТС':bank.sameBank?'На карту МТС Банка · без комиссии':'В другой российский банк · 1,5%, минимум 50 ₽';
    amountError.textContent=raw&&!valid?'Введите сумму больше нуля, не более двух знаков после запятой':!inlineGuestSource&&ready()&&!bankSupported?'Страна банка не соответствует выбранному направлению':!inlineGuestSource&&ready()&&!supported?'Для карты в этой валюте перевод по выбранному направлению недоступен':currentQuote?.insufficient?'Недостаточно средств с учётом комиссии · не хватает '+money(currentQuote.total-source.balance):'';
    amountInput.setAttribute('aria-invalid',String(!!amountError.textContent));
    addShortfall.hidden=!currentQuote?.insufficient;
    if(currentQuote?.insufficient) {
      const shortfall=(Math.round(currentQuote.total*100)-Math.round(source.balance*100))/100;
      addShortfall.textContent='Добавить '+money(shortfall);
    }
    const calculating=!!source&&valid&&bankLookupPending&&availability?.available!==false;
    next.setAttribute('aria-busy',String(calculating));
    next.setAttribute('aria-label',calculating?'Рассчитываем перевод':'Продолжить');
    next.querySelector('.continue-label').hidden=calculating;
    next.querySelector('.continue-spinner').hidden=!calculating;
    next.disabled=(inlineGuestSource&&!sourceDetails.demoComplete())||!ready()||!currentQuote||currentQuote.insufficient||(!guest&&source?.external&&!sourceDetails.demoComplete());
  }
  amountInput.oninput=updateQuote;
  amountInput.onblur=()=>{
    const raw=normalizedAmount();
    if(/^\d+(\.\d{1,2})?$/.test(raw)&&Number.isFinite(Number(raw))) {
      amountInput.value=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(raw));
      updateQuote();
    }
  };
  form.onsubmit=e=>{
    e.preventDefault();if(next.disabled||!currentQuote)return;
    screen.querySelector('.transfer-review')?.remove();
    const review=document.createElement('section');review.className='transfer-review';
    review.innerHTML='<h2>Проверьте перевод</h2><div class="review-recipient"><span>Получатель</span><strong>Карта •• '+(savedRecipient?savedRecipient.subtitle.slice(-4):input.value.replace(/\D/g,'').slice(-4))+'</strong></div><dl class="review-breakdown"><dt>Сумма перевода</dt><dd>'+enteredMoney(currentQuote.enteredAmount,currentQuote.enteredCurrency)+'</dd><dt>Комиссия</dt><dd>'+debitMoney(currentQuote.fee)+'</dd></dl><div class="review-total"><span>Всего к списанию</span><strong>'+debitMoney(currentQuote.total)+'</strong></div><p class="review-demo-note">В прототипе списания не выполняются</p>';
    if(amountCurrency!=='RUB'&&!(guest&&source?.currency===amountCurrency)){const converted=document.createElement('p');converted.className='review-receive';converted.textContent='Сумма в рублях: '+money(currentQuote.rubles)+' · демо-курс 1 '+amountSymbols[amountCurrency]+' = '+money(currentQuote.amountRate);review.append(converted);}
    if(international){const received=document.createElement('p');received.className='review-receive';received.textContent='Получатель получит '+new Intl.NumberFormat('ru-RU').format(currentQuote.receive)+' UZS · демонстрационный курс 1 ₽ = 150 UZS';review.append(received);}
    const send=document.createElement('button');send.type='button';send.className='authorized-continue';send.textContent='Перевести в прототипе';review.append(send);
    let sent=false;
    send.onclick=async()=>{
      if(sent)return;
      const rubles=amountInRubles(Number(normalizedAmount()),amountCurrency);
      if(!ready()||rubles===null||rubles<=0)return;
      const quote=quoteForSource(rubles,bank?.sameBank || false);
      if(quote.insufficient){updateQuote();return;}
      sent=true;send.disabled=true;
      const last4=savedRecipient?.last4 || (savedRecipient?.subtitle.match(/(\d{4})$/)?.[1]) || input.value.replace(/\D/g,'').slice(-4);
      const recipientName=savedRecipient?.name || 'Получатель •• '+last4;
      const operation={id:'sent-'+crypto.randomUUID(),cardId:source.id,name:recipientName,initials:savedRecipient?.initials||'П',color:'#d4b6ff',date:'Только что',amount:-quote.debitAmount,currency:quote.debitCurrency,rubleAmount:rubles,enteredAmount:Number(normalizedAmount()),enteredCurrency:amountCurrency,amountRate:demoAmountRates[amountCurrency],fee:quote.fee,status:'Выполнен',last4,recipientId:savedRecipient?.id,transferKind:transferKind||'russia',receive:quote.receive,receiveCurrency:international?'UZS':undefined,bankInfo:bank};
      sessionStorage.setItem('c2c-pending-transfer',JSON.stringify({operation,total:quote.total,readyAt:Date.now()+5000}));
      form.hidden=true;
      screen.classList.add('is-processing');
      screen.querySelector('.authorized-back').disabled=true;
      const processing=createProcessingScreen();
      screen.append(processing);
      window.scrollTo(0,0);
      await new Promise(resolve=>setTimeout(resolve,5000));
      processing.remove();screen.classList.remove('is-processing');
      screen.querySelector('.authorized-back').disabled=false;
      if(guest && !demoData.cards.some(c=>c.id===source.id))demoData.cards.push(source);
      if(Number.isFinite(source.balance)) source.balance=(Math.round(source.balance*100)-Math.round(quote.total*100))/100;
      demoData.transactions.unshift(operation);saveDemoTransfers();
      sessionStorage.removeItem('c2c-pending-transfer');
      sessionStorage.setItem('c2c-current-page',JSON.stringify({title:'Детали перевода',operationId:operation.id,cardId:source.id}));
      form.hidden=true;
      const success=document.createElement('section');success.className='transfer-success';
      screen.classList.add('is-success');
      success.setAttribute('role','status');
      success.innerHTML='<div class="success-summary"><div class="success-check" aria-hidden="true">✓</div><h2>Перевод выполнен</h2><p class="success-amount">'+money(-operation.amount,operation.currency)+'</p><p class="success-destination">На карту •• '+last4+'</p>'+(international?'<p class="success-receive">Получателю '+new Intl.NumberFormat('ru-RU').format(quote.receive)+' UZS</p>':'')+'<p class="success-demo">В прототипе списания не выполняются</p></div><div class="success-actions"><button type="button" class="success-transfers authorized-continue">К переводам</button><button type="button" class="success-home">На главную</button></div>';
      screen.append(success);
      celebrate(screen);
      success.querySelector('.success-transfers').onclick=onTransfers || onBack;
      success.querySelector('.success-home').onclick=onHome || onBack;
      window.scrollTo(0,0);
    };
    form.append(review);review.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  if(guest)screen.classList.add('guest-shared-transfer');
  if(lockedGuestSource){
    screen.querySelector('.source-trigger').disabled=true;
    screen.querySelector('.source-chevron').hidden=true;
    screen.querySelector('.source-value').textContent='Карта •• '+source.last4;
    input.value=initialNumber || '';
    detectBank();
  }
  if(savedRecipient){bankStatus.textContent=bank?bank.name:'';availabilityStatus.textContent=availability.available?'':availability.message;}
  if(repeatAmount != null){amountInput.value=String(repeatAmount);if(source)screen.querySelector('.source-value').textContent='•• '+source.last4+' · '+(source.external?'баланс недоступен':money(source.balance,source.currency));updateQuote();}
  screen.setGuestDirection=kind=>{
    if(!inlineGuestSource)return;
    transferKind=kind;international=kind==='abroad';
    screen.classList.toggle('guest-international-transfer',international);
    screen.dataset.direction=kind;
    refreshDemoSuggestions.forEach(refresh=>refresh());
    detectBank();updateQuote();
  };
  updateQuote();
  return screen;
}
