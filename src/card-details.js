// Demo-only inputs: no real credentials are collected or persisted.
export function createDemoCardDetails(onChange = () => {}) {
  const row = document.createElement('div');
  row.className = 'card-details-row';
  row.innerHTML = '<label>Срок действия<input data-expiry aria-label="Срок действия" placeholder="ММ/ГГ" readonly autocomplete="off"></label><label>CVC/CVV<input data-cvc aria-label="CVC/CVV" type="password" placeholder="3 цифры" readonly autocomplete="off"></label>';
  const fill = () => {
    row.querySelector('[data-expiry]').value = '12/30';
    row.querySelector('[data-cvc]').value = '123';
    onChange();
  };
  row.addEventListener('pointerenter', fill);
  row.addEventListener('pointerdown', fill);
  row.addEventListener('focusin', fill);
  row.demoComplete = () => !!row.querySelector('[data-expiry]').value && !!row.querySelector('[data-cvc]').value;
  row.clearDemo = () => row.querySelectorAll('input').forEach(input => input.value = '');
  return row;
}
