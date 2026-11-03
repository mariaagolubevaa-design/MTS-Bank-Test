import { createDemoCardDetails } from './card-details.js';
import { demoCardAvailability } from './card-availability.js';
import { validCard, createAuthorizedTransfer } from './authorized-transfer.js';

export function createGuestTransfer({ onBack, onHome = onBack, onTransfers = onBack }) {
  const screen=document.createElement('main');
  screen.className='authorized-transfer guest-transfer';
  screen.innerHTML=`<button class="authorized-back" aria-label="Назад"><img src="./assets/images/back-chevron.svg" alt=""></button><h1>По карте в Россию</h1><form novalidate>
  <section class="guest-source"><h2>Откуда списать</h2><div class="destination-field"><label for="guest-source">Номер карты</label><input id="guest-source" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="guest-source-error"><button type="button" class="scan-card" aria-label="Сканировать карту отправителя"><img src="./assets/images/scan-card.svg" alt=""></button></div><p id="guest-source-error" class="field-error" role="alert"></p></section>
  <section class="guest-destination"><div class="destination-field"><label for="guest-destination">Номер карты получателя</label><input id="guest-destination" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="guest-destination-error"><button type="button" class="scan-card" aria-label="Сканировать карту получателя"><img src="./assets/images/scan-card.svg" alt=""></button></div><p id="guest-destination-error" class="field-error" role="alert"></p></section>
  <div class="guest-next"><p>Сумму укажете на следующем шаге</p><button class="authorized-continue" disabled>Продолжить</button></div></form>
  <dialog class="scan-info"><h2>Сканирование карты</h2><p>В прототипе введите номер вручную</p><button type="button">Понятно</button></dialog>`;
  const fields=[...screen.querySelectorAll('input')];
  const next=screen.querySelector('.authorized-continue');
  const details=createDemoCardDetails(()=>update());
  screen.querySelector('.guest-source').append(details);
  const update=()=>{
    fields.forEach(n=>{const error=screen.querySelector('#'+n.id+'-error');const unavailable=validCard(n.value)&&!demoCardAvailability(n.value).available;error.textContent=unavailable?demoCardAvailability(n.value).message:'';n.setAttribute('aria-invalid',String(unavailable));});
    next.disabled=!details.demoComplete()||!fields.every(n=>validCard(n.value)&&demoCardAvailability(n.value).available)||fields[0].value===fields[1].value;
  };
  fields.forEach(n=>{
    n.oninput=()=>{n.value=n.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();screen.querySelector('#'+n.id+'-error').textContent='';n.setAttribute('aria-invalid','false');update();};
    n.onblur=()=>{const error=screen.querySelector('#'+n.id+'-error');if(n.value&&!validCard(n.value)){error.textContent='Проверьте номер карты';n.setAttribute('aria-invalid','true');}else if(fields[0].value&&fields[0].value===fields[1].value){error.textContent='Карты отправителя и получателя должны отличаться';n.setAttribute('aria-invalid','true');}};
  });
  const dialog=screen.querySelector('dialog');
  screen.querySelectorAll('.scan-card').forEach(b=>b.onclick=()=>dialog.showModal());
  dialog.querySelector('button').onclick=()=>dialog.close();
  screen.querySelector('.authorized-back').onclick=onBack;
  screen.querySelector('form').onsubmit=e=>{
    e.preventDefault();if(next.disabled)return;
    const guestCard={id:'guest-'+crypto.randomUUID(),name:'Карта отправителя',last4:fields[0].value.replace(/\D/g,'').slice(-4),balance:null,currency:'RUB',external:true};
    const shared=createAuthorizedTransfer({
      cards:[guestCard],card:guestCard,guest:true,sourceNumber:fields[0].value,initialNumber:fields[1].value,transferKind:'russia',
      onBack:()=>{shared.remove();screen.querySelector('form').hidden=false;screen.querySelector('h1').hidden=false;screen.querySelector('.authorized-back').hidden=false;window.scrollTo(0,0);},
      onHome:()=>{shared.remove();screen.remove();onHome();},onTransfers:()=>{shared.remove();screen.remove();onTransfers();}
    });
    screen.querySelector('form').hidden=true;screen.querySelector('h1').hidden=true;screen.querySelector('.authorized-back').hidden=true;
    // Keep the shared screen as a sibling to avoid duplicate nested page chrome.
    screen.after(shared);
    shared.dataset.guestFlow='true';
    window.scrollTo(0,0);

  };
  return screen;
}
