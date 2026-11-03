import { escapeHTML } from './home-screen.js';

export function createTransferScreen({ card, recipient, onBack, recipients, transferKind }) {
  const screen = document.createElement('main');
  screen.className = 'transfer-screen';
  let country = recipient ? (recipient.id === 'pavel' ? 'Узбекистан' : 'Россия') : transferKind === 'russia' ? 'Россия' : 'Грузия';
  let selected = recipient || null;
  const countries = ['Грузия', 'Узбекистан', 'Армения', 'Россия'];
  screen.innerHTML = `
    <button class="back transfer-back">← Назад</button>
    <div class="transfer-step">Шаг 1 из 3 · Получатель</div>
    <h1>Кому перевести?</h1>
    <div class="transfer-directions" role="group" aria-label="Направление перевода"><button data-direction="domestic">По России</button><button data-direction="international">За границу</button></div>
    <form class="recipient-form">
      <label class="transfer-label">Страна получения<button type="button" class="country-trigger"><span></span><span>⌄</span></button></label>
      <label class="transfer-label">Номер карты получателя<input class="recipient-card" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" aria-describedby="recipient-hint recipient-error"></label>
      <p id="recipient-hint">Введите номер карты или выберите сохранённого получателя</p>
      <p id="recipient-error" role="alert"></p>
      <section class="saved-recipients"><h2>Сохранённые получатели</h2>${recipients.map(r=>`<button type="button" class="saved-recipient" data-id="${r.id}"><span class="avatar" style="--avatar:${r.color}">${escapeHTML(r.initials || 'С')}</span><span>${escapeHTML(r.name)}<small>${escapeHTML(r.subtitle)}</small></span><span class="selection-mark"></span></button>`).join('')}</section>
      <p class="source-card">С карты •• ${escapeHTML(card.last4)}</p>
      <p class="transfer-note">Курс, комиссию и сумму получения покажем на следующем шаге</p>
      <button class="transfer-continue">Продолжить</button>
    </form>
    <dialog class="country-sheet"><div class="sheet-handle"></div><div class="sheet-heading"><h2>Страна получения</h2><button type="button" class="close-sheet" aria-label="Закрыть">×</button></div><div class="country-options"></div></dialog>`;
  const sheet = screen.querySelector('dialog');
  const input = screen.querySelector('input');
  const error = screen.querySelector('#recipient-error');
  const setError = text => { error.textContent = text; input.setAttribute('aria-invalid', String(!!text)); };
  function update() {
    screen.querySelector('.country-trigger span').textContent = country;
    screen.querySelectorAll('[data-direction]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.direction === 'domestic') === (country === 'Россия'))));
    screen.querySelectorAll('[data-id]').forEach(b => { const active = selected?.id === b.dataset.id; b.setAttribute('aria-pressed', String(active)); b.querySelector('.selection-mark').textContent = active ? '✓' : ''; });
    input.value = selected ? selected.id === 'self' ? 'Сохранённая карта Сбер' : selected.subtitle : '';
    input.readOnly = !!selected;
    screen.querySelector('#recipient-hint').textContent = selected ? 'Получатель: ' + selected.name + ' · для другой карты начните ввод заново' : 'Введите номер карты или выберите сохранённого получателя';
    setError('');
  }
  screen.querySelector('.transfer-back').onclick = onBack;
  screen.querySelector('.country-trigger').onclick = () => {
    const available = country === 'Россия' ? ['Россия'] : countries.filter(c=>c!=='Россия');
    screen.querySelector('.country-options').innerHTML = available.map(c=>`<button type="button" data-country="${c}">${c}<span>${c === country ? '✓' : ''}</span></button>`).join('');
    sheet.showModal();
  };
  screen.querySelector('.country-options').onclick = e => { const c = e.target.closest('[data-country]'); if(!c)return;country=c.dataset.country;selected=null;update();sheet.close(); };
  screen.querySelector('.close-sheet').onclick = () => sheet.close();
  sheet.addEventListener('click', e => { if(e.target === sheet && (e.clientY < sheet.getBoundingClientRect().top || e.clientX < sheet.getBoundingClientRect().left || e.clientX > sheet.getBoundingClientRect().right))sheet.close(); });
  screen.querySelectorAll('[data-direction]').forEach(b=> b.onclick=()=>{country=b.dataset.direction==='domestic'?'Россия':'Грузия';selected=null;update();});
  screen.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{selected=recipients.find(r=>r.id===b.dataset.id);country=selected.id==='pavel'?'Узбекистан':'Россия';update();});
  input.addEventListener('focus',()=>{if(selected){selected=null;input.readOnly=false;input.value='';update();}});
  input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();setError('');});
  screen.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const digits=input.value.replace(/\D/g,'');
    if(!selected && !/^\d{16,19}$/.test(digits)){setError('Введите от 16 до 19 цифр номера карты');input.focus();return;}
    // This prototype only demonstrates the recipient step; never send bank details.
    screen.querySelector('.transfer-note').textContent='Получатель выбран · следующий экран — сумма перевода (пока в разработке)';
    screen.querySelector('.transfer-note').setAttribute('role','status');
  };
  update();
  return screen;
}
