import { createAuthorizedTransfer } from './authorized-transfer.js';

export function createGuestTransfer({ onBack, onHome = onBack, onTransfers = onBack }) {
  const screen = createAuthorizedTransfer({
    cards: [], guest: true, transferKind: 'russia', onBack, onHome, onTransfers,
  });
  screen.classList.add('guest-transfer');
  screen.querySelector('h1').classList.add('guest-transfer-title');
  screen.querySelector('h1').innerHTML='<span>По карте <button type="button" class="guest-direction-trigger" aria-haspopup="dialog" aria-expanded="false"><span class="guest-direction-label">в Россию</span><span class="guest-direction-icon" aria-hidden="true"><img src="./assets/images/guest-direction-chevron.svg" alt=""></span></button></span>';
  const sheet=document.createElement('dialog');
  sheet.className='guest-direction-sheet';
  sheet.setAttribute('aria-label','Направление перевода');
  sheet.innerHTML='<div class="sheet-handle" aria-hidden="true"></div><div class="direction-sheet-heading"><h2>Куда перевести</h2><button type="button" class="close-direction-sheet" aria-label="Закрыть выбор направления">×</button></div><button type="button" class="direction-choice is-selected" aria-pressed="true"><span>В Россию</span><span class="direction-selected-mark" aria-hidden="true">✓</span></button><button type="button" class="direction-choice" disabled><span>За границу</span><span class="direction-soon">Скоро</span></button>';
  screen.append(sheet);
  const trigger=screen.querySelector('.guest-direction-trigger');
  const close=()=>sheet.close();
  trigger.onclick=()=>{sheet.showModal();trigger.setAttribute('aria-expanded','true');};
  sheet.querySelector('.close-direction-sheet').onclick=close;
  sheet.querySelector('.is-selected').onclick=close;
  sheet.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus();});
  sheet.addEventListener('click',event=>{
    if(event.target!==sheet)return;
    const r=sheet.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
  });

  return screen;
}
