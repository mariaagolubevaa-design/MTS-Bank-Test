export function createTransfersMenu({ recipientList, onChoose, onRecipient, onAction }) {
  const screen = document.createElement('main');
  screen.className = 'transfers-menu';
  screen.innerHTML = `
    <header class="transfers-menu-header"><h1>Переводы</h1><button aria-label="Сканировать код" data-extra="Сканировать код"><img src="./assets/images/barcode.svg" alt=""></button></header>
    <section class="transfer-options" aria-label="Способы перевода">
      <button class="option-russia" data-option="russia"><span>по карте<br>в Россию</span><img src="./assets/images/transfer-russia.png" alt=""></button>
      <button class="option-abroad" data-option="abroad"><span>по карте<br>за границу</span><img src="./assets/images/transfer-abroad.png" alt=""></button>
      <button class="option-own" data-option="own"><span>между своими</span><img src="./assets/images/transfer-own.png" alt=""></button>
      <button class="option-details" data-option="details"><span>по реквизитам</span><img src="./assets/images/transfer-details.png" alt=""></button>
    </section>
    <div class="payment-options"><button data-extra="На оплату"><img src="./assets/images/receipt.svg" alt="">на оплату</button><button data-extra="Регулярные"><img src="./assets/images/recurring.svg" alt="">регулярные</button></div>
    <section class="menu-favorites"><h2>Избранное</h2></section>`;
  screen.querySelector('.menu-favorites').append(recipientList);
  screen.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.option) onChoose(button.dataset.option);
    if (button.dataset.recipient) onRecipient(button.dataset.recipient);
    if (button.dataset.action || button.dataset.extra) onAction(button.dataset.extra || button.dataset.action);
  });
  return screen;
}
