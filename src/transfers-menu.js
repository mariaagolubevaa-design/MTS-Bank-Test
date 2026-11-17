export function createTransfersMenu({ recipientList, onChoose, onRecipient, onAction }) {
  const screen = document.createElement('main');
  screen.className = 'transfers-menu';
  screen.innerHTML = `
    <header class="transfers-menu-header"><h1>Переводы</h1><div class="menu-header-actions"><button class="hit-target" aria-label="Поиск" data-extra="Поиск"><img src="./assets/images/search.svg" alt=""></button><button class="menu-qr hit-target" aria-label="Сканировать код" data-extra="Сканировать код"><img src="./assets/images/home-qr.svg" alt=""></button></div></header>
    <section class="transfer-options" aria-label="Способы перевода">
      <button class="option-russia" data-option="russia"><span>по карте в Россию</span><img src="./assets/images/menu-russia.png" alt=""></button>
      <button class="option-abroad" data-option="abroad"><span>международный<br>по карте</span><img src="./assets/images/menu-abroad.png" alt=""></button>
      <button class="option-own" data-option="own"><span>между своими</span><img src="./assets/images/menu-own.png" alt=""></button>
      <button class="option-details" data-option="details"><span>по реквизитам</span><img src="./assets/images/menu-details.png" alt=""></button>
    </section>
    <div class="payment-options"><button data-extra="На оплату"><img src="./assets/images/menu-receipt.svg" alt=""><span>на оплату</span></button><button data-extra="Регулярные"><img src="./assets/images/menu-recurring.svg" alt=""><span>регулярные</span></button><button data-extra="Избранное"><img src="./assets/images/menu-favourite.svg" alt=""><span>избранное</span></button></div>
    <section class="menu-favorites" aria-labelledby="frequent-title"><h2 id="frequent-title">Частые операции</h2></section>
    <section class="menu-currency" aria-label="Валюта. Демонстрационные значения из макета, не действующие курсы" title="Демонстрационные значения из макета">
      <div class="currency-heading"><h2>Валюта</h2><span>Продать</span><span>Купить</span></div>
      <p class="currency-subtitle">к грузинскому лари</p>
      <div class="currency-rows">${[['RUB','2,4 ₽','3,4 ₽'],['USD','2,6 ₽','2,72 ₽'],['EUR','2,81 ₽','2,89 ₽']].map(([code,sell,buy]) => `<div class="currency-row"><span><img src="./assets/images/currency-${code.toLowerCase()}.png" alt="">${code}</span><span>${sell}</span><span>${buy}</span></div>`).join('')}</div>
      <button type="button" class="currency-continue">Рассчитать</button>
    </section>`;
  // Reuse the existing recipient buttons and their routing metadata.
  const add = recipientList.querySelector('[data-action="Добавить получателя"]');
  if (add) recipientList.prepend(add);
  const selfAvatar = recipientList.querySelector('[data-recipient="self"] .avatar');
  if (selfAvatar) selfAvatar.innerHTML = '<img src="./assets/images/menu-self-bank.svg" alt="">';
  const pavelName = recipientList.querySelector('[data-recipient="pavel"] .recipient-name');
  if (pavelName?.textContent === 'Павел') pavelName.textContent = 'Павел Г.';
  const pavelSubtitle = recipientList.querySelector('[data-recipient="pavel"] .recipient-subtitle');
  if (pavelSubtitle) pavelSubtitle.textContent = pavelSubtitle.textContent.replace('UZ ·', 'UZ');
  screen.querySelector('.menu-favorites').append(recipientList);
  screen.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.option) onChoose(button.dataset.option);
    if (button.dataset.recipient) onRecipient(button.dataset.recipient);
    if (button.dataset.extra === 'Избранное') {
      screen.querySelector('.menu-favorites').scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      recipientList.querySelector('[data-recipient]')?.focus({ preventScroll:true });
      return;
    }
    if (button.dataset.action || button.dataset.extra) onAction(button.dataset.extra || button.dataset.action);
  });
  return screen;
}
