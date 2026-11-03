export function createWelcomeScreen({ onEnter, onGuest }) {
  const screen = document.createElement('main');
  screen.className = 'welcome-screen';
  screen.innerHTML = `
    <header class="welcome-header"><span>international</span><select aria-label="Язык"><option>RU</option><option>EN</option></select></header>
    <div class="welcome-art" aria-hidden="true">
      <div class="welcome-hand left"><img src="./assets/images/welcome-hands.png" alt=""></div>
      <div class="welcome-hand right"><img src="./assets/images/welcome-hands.png" alt=""></div>
      <div class="bank-card bank-card--spectrum welcome-card"><div class="card-top"><span>Дебетовая карта</span><span>*4845</span></div><div class="card-bottom"><span class="balance">640 $</span><img src="./assets/images/mastercard.png" alt=""></div></div>
      <div class="welcome-fingers"><img src="./assets/images/welcome-fingers.png" alt=""></div>
    </div>
    <h1 class="welcome-message">Ближе, чем<br>кажется</h1>
    <div class="welcome-actions"><button class="welcome-login">Войти</button><button class="welcome-guest">Перевести с карты на карту</button></div>
    <dialog class="auth-dialog"><form><button class="auth-close" type="button" aria-label="Закрыть">×</button><h2>Вход по номеру телефона</h2><p>В полной версии здесь будет авторизация по телефону и подтверждение кодом из SMS<br><br>Сейчас это демонстрационный вход</p><div class="phone-field"><select aria-label="Код страны"><option value="995" selected>Грузия +995</option><option value="7">Россия +7</option><option value="998">Узбекистан +998</option><option value="374">Армения +374</option></select><input id="phone" aria-label="Номер телефона" type="tel" inputmode="tel" autocomplete="tel-national" value="555 12 34 56" required aria-describedby="phone-error"></div><p id="phone-error" role="status"></p><button class="auth-submit">Продолжить</button></form></dialog>`;
  const dialog = screen.querySelector('dialog');
  screen.querySelector('.welcome-login').onclick = () => dialog.showModal();
  screen.querySelector('.auth-close').onclick = () => dialog.close();
  const form = screen.querySelector('form');
  const country = form.querySelector('select');
  const phone = form.querySelector('input');
  country.onchange = () => { phone.value = country.value === '995' ? '555 12 34 56' : country.value === '7' ? '912 345-67-89' : country.value === '998' ? '90 123 45 67' : '91 123456'; };
  form.onsubmit = event => {
    event.preventDefault();
    const length = country.value === '7' ? 10 : ['998', '995'].includes(country.value) ? 9 : 8;
    if (phone.value.replace(/\D/g, '').length !== length) { form.querySelector('[role=status]').textContent = 'Проверьте номер телефона'; return; }
    dialog.close(); onEnter();
  };
  screen.querySelector('.welcome-guest').onclick = onGuest;
  const message = screen.querySelector('.welcome-message');
  const messages = ['Ближе, чем<br>кажется', 'Поддерживайте<br>близких, где бы<br>вы ни были'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let messageIndex = 0;
  let switching = false;
  setInterval(async () => {
    if (screen.hidden || dialog.open || document.hidden || switching) return;
    switching = true;
    const duration = reducedMotion.matches ? 0 : 280;
    await message.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: 'forwards' }).finished;
    messageIndex = (messageIndex + 1) % messages.length;
    message.innerHTML = messages[messageIndex];
    await message.animate([{ opacity: 0 }, { opacity: 1 }], { duration, fill: 'forwards' }).finished;
    switching = false;
  }, 5000);
  return screen;
}
