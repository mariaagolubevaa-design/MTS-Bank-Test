// Demonstration data; card appearances follow their Figma references.
export const demoData = {
  cards: [
    { id: 'debit', name: 'Дебетовая карта', last4: '6354', balance: 12500 },
    { id: 'second', name: 'Дебетовая карта', last4: '4845', balance: 640, currency: 'USD', appearance: 'spectrum' },
  ],
  recipients: [
    { id: 'self', name: 'Себе', subtitle: 'на Сбер', initials: '', color: '#2ba538', bank: 'Сбер', destination: 'Своя карта Сбер', logo: 'sber' },
    { id: 'mom', name: 'Мама', subtitle: 'RU •• 4820', initials: 'М', color: '#d4b6ff', destination: 'RU •• 4820' },
    { id: 'pavel', name: 'Павел', subtitle: 'UZ · •• 6204', initials: 'П', color: '#fb9338', destination: 'UZ · •• 6204' },
  ],
  transactions: [
    { id: 't1', cardId: 'debit', name: 'Татьяна Ш.', initials: 'ТШ', color: '#d4b6ff', date: 'Сегодня, 14:32', amount: -5000, status: 'Выполнен' },
    { id: 't2', cardId: 'debit', name: 'Павел Г.', initials: 'ПГ', color: '#fb9338', date: 'Вчера, 19:08', amount: -12500, status: 'Выполнен' },
    { id: 't3', cardId: 'debit', name: 'Татьяна Ш.', initials: 'ТШ', color: '#c095fd', date: '30 октября', amount: -3000, status: 'Выполнен' },
    { id: 't4', cardId: 'second', name: 'Мама', initials: 'М', color: '#d4b6ff', date: 'Сегодня, 10:15', amount: -1500, status: 'Выполнен' },
  ],
};

export function money(value, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Math.abs(value)) + (currency === 'USD' ? ' $' : ' ₽');
}
export const operationsFor = (data, cardId) => data.transactions.filter(item => item.cardId === cardId);

// Persist only demo balances and masked card metadata, never full card numbers.
const walletKey = 'c2c-demo-wallet-v1';
if (typeof window !== 'undefined') {
  try {
    const saved = JSON.parse(localStorage.getItem(walletKey) || 'null');
    if (Array.isArray(saved)) {
      for (const card of saved) {
        if (!card || typeof card.id !== 'string' || !/^\d{4}$/.test(card.last4) ||
            !['RUB', 'USD'].includes(card.currency) ||
            !(card.balance === null || Number.isFinite(card.balance) && card.balance >= 0)) continue;
        const existing = demoData.cards.find(c => c.id === card.id);
        if (existing && existing.last4 === card.last4) existing.balance = card.balance;
        else if (!existing && card.external === true) demoData.cards.push({
          id: card.id, name: 'Добавленная карта', last4: card.last4,
          balance: null, currency: card.currency, external: true,
        });
      }
    }
  } catch { /* A fresh demo wallet is used if storage is unavailable or corrupt. */ }
}

export function saveDemoWallet() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(walletKey, JSON.stringify(demoData.cards.map(c => ({
      id: c.id, last4: c.last4, balance: c.balance,
      currency: c.currency || 'RUB', external: !!c.external,
    }))));
  } catch { /* In-memory changes still work when browser storage is unavailable. */ }
  window.dispatchEvent(new Event('demo-wallet-change'));
}

if (typeof window !== 'undefined') {
  try {
    const saved = JSON.parse(localStorage.getItem('c2c-demo-transfers-v1') || 'null');
    if (saved) {
      for (const r of saved.recipients || []) if (typeof r.id === 'string' && /^\d{4}$/.test(r.last4 || '') && !demoData.recipients.some(x => x.id === r.id)) demoData.recipients.push(r);
      for (const t of (saved.transactions || []).reverse()) if (typeof t.id === 'string' && Number.isFinite(t.amount) && !demoData.transactions.some(x => x.id === t.id)) demoData.transactions.unshift(t);
    }
  } catch {}
}
export function saveDemoTransfers() {
  try {
    localStorage.setItem('c2c-demo-transfers-v1', JSON.stringify({
      recipients: demoData.recipients.filter(r => r.id.startsWith('saved-')),
      transactions: demoData.transactions.filter(t => t.id.startsWith('sent-')),
    }));
  } catch {}
  saveDemoWallet();
}

// One-time user-requested cleanup of the latest 100 ₽ demo operation.
if (typeof window !== 'undefined') {
  const cleanupKey = 'c2c-remove-last-demo-100-2026-11-03';
  try {
    if (!localStorage.getItem(cleanupKey)) {
      const index = demoData.transactions.findIndex(t => t.id.startsWith('sent-') && t.amount === -100);
      if (index !== -1) {
        const [removed] = demoData.transactions.splice(index, 1);
        saveDemoTransfers();
        const page = JSON.parse(sessionStorage.getItem('c2c-current-page') || 'null');
        if (page?.operationId === removed.id) sessionStorage.setItem('c2c-current-page', JSON.stringify({ title: 'Главная' }));
      }
      localStorage.setItem(cleanupKey, 'done');
    }
  } catch {}
}
