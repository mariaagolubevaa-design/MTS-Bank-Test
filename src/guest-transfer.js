import { createAuthorizedTransfer } from './authorized-transfer.js';

export function createGuestTransfer({ onBack, onHome = onBack, onTransfers = onBack }) {
  const screen = createAuthorizedTransfer({
    cards: [], guest: true, transferKind: 'russia', onBack, onHome, onTransfers,
  });
  screen.classList.add('guest-transfer');
  return screen;
}
