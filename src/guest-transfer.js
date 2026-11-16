import { createAuthorizedTransfer } from './authorized-transfer.js';

export function createGuestTransfer({ onBack, onHome = onBack, onTransfers = onBack }) {
  let direction='russia';
  const screen = createAuthorizedTransfer({
    cards: [], guest: true, transferKind: 'russia', onBack:()=>direction==='abroad'?chooseDirection('russia'):onBack(), onHome, onTransfers,
  });
  screen.classList.add('guest-transfer');
  screen.querySelector('h1').classList.add('guest-transfer-title');
  screen.querySelector('h1').innerHTML='<span>По карте <button type="button" class="guest-direction-trigger" aria-haspopup="dialog" aria-expanded="false"><span class="guest-direction-label">в Россию</span><span class="guest-direction-icon" aria-hidden="true"><img src="./assets/images/guest-direction-chevron.svg" alt=""></span></button></span>';
  const sheet=document.createElement('dialog');
  sheet.className='guest-direction-sheet';
  sheet.setAttribute('aria-labelledby','guest-direction-sheet-title');
  sheet.innerHTML='<img class="direction-sheet-handle" src="./assets/images/direction-sheet-handle.svg" alt=""><h2 id="guest-direction-sheet-title" class="direction-sheet-title">Направление перевода</h2><button type="button" data-direction="russia" class="direction-choice is-selected" aria-pressed="true"><span>В Россию</span><img class="direction-selected-mark" src="./assets/images/direction-sheet-check.svg" alt=""></button><button type="button" data-direction="abroad" class="direction-choice" aria-pressed="false"><span>За границу</span><img class="direction-selected-mark" src="./assets/images/direction-sheet-check.svg" alt="" hidden></button>';
  screen.append(sheet);
  const trigger=screen.querySelector('.guest-direction-trigger');
  const close=()=>sheet.close();
  trigger.onclick=()=>{sheet.showModal();trigger.setAttribute('aria-expanded','true');};
  function chooseDirection(value){
    if(value!==direction){
      direction=value;
      screen.setGuestDirection(value);
      screen.querySelector('.guest-direction-label').textContent=value==='abroad'?'международный':'в Россию';
      for(const option of sheet.querySelectorAll('[data-direction]')){
        const selected=option.dataset.direction===value;
        option.classList.toggle('is-selected',selected);option.setAttribute('aria-pressed',String(selected));
        option.querySelector('img').hidden=!selected;
      }
      window.scrollTo(0,0);
    }
    if(sheet.open)close();
  }
  sheet.querySelectorAll('[data-direction]').forEach(option=>option.onclick=()=>chooseDirection(option.dataset.direction));
  sheet.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus();});
  sheet.addEventListener('click',event=>{
    if(event.target!==sheet)return;
    const r=sheet.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
  });

  return screen;
}
