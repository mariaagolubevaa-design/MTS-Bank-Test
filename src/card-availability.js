// Prototype responses only. A production integration must use the transfer
// provider's eligibility endpoint; neither Luhn nor BIN lookup proves eligibility.
export function demoCardAvailability(number, { saved = false } = {}) {
  const digits = number.replace(/\D/g, '');
  if (digits === '4000000000000002') {
    return { available: false, message: 'На эту карту перевод недоступен · демонстрационный отказ. Укажите другую карту' };
  }
  const supported = saved || /^(4|5[1-5]|2[2-7]|8600|9860)/.test(digits);
  return supported
    ? { available: true, message: 'Перевод доступен в демосценарии · реальная доступность карты не проверяется' }
    : { available: false, message: 'Платёжная система не поддерживается в демосценарии. Укажите другую карту' };
}
