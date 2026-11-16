// User-specified prototype rates, not live exchange rates or a bank offer.
export const demoAmountRates = Object.freeze({ RUB:1, USD:82.7, EUR:90.98 });
export const amountSymbols = Object.freeze({ RUB:'₽', USD:'$', EUR:'€' });
export const amountCurrencyNames = Object.freeze({ RUB:'рублях', USD:'долларах США', EUR:'евро' });
export function amountInRubles(value, currency) {
  const rate=demoAmountRates[currency];
  if(!Number.isFinite(value)||value<0||!rate)return null;
  const kopecks=Math.round(value*100);
  // Round to kopecks once after converting the entered amount.
  const result=Math.round(kopecks*Math.round(rate*100)/100)/100;
  return Number.isFinite(result)?result:null;
}
export function enteredMoney(value,currency) {
  return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(value)+' '+amountSymbols[currency];
}
export function defaultAmountCurrency(card) {
  if(!card||card.id==='debit'||card.bankInfo?.country==='RU'||card.country==='RU')return 'RUB';
  return Object.hasOwn(demoAmountRates,card.currency)?card.currency:'RUB';
}
