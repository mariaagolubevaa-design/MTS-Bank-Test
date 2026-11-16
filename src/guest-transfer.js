import { createAuthorizedTransfer } from './authorized-transfer.js';

export function createGuestTransfer({ onBack, onHome = onBack, onTransfers = onBack }) {
  const screen = createAuthorizedTransfer({
    cards: [], guest: true, transferKind: 'russia', onBack, onHome, onTransfers,
  });
  screen.classList.add('guest-transfer');
  screen.querySelector('h1').classList.add('guest-transfer-title');
  screen.querySelector('h1').innerHTML='<span>По карте <span class="guest-direction-label">в Россию</span></span><span class="guest-direction-icon" aria-hidden="true"><img src="./assets/images/guest-direction-chevron.svg" alt=""></span>';
  return screen;
}
