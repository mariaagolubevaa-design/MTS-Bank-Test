/** Shared loading view for an active transfer and restored pending transfers. */
export function createProcessingScreen() {
  const section = document.createElement('section');
  section.className = 'transfer-processing';
  section.setAttribute('role', 'status');
  section.setAttribute('aria-live', 'polite');
  section.innerHTML = `<img class="loading-globe" src="./assets/images/loading-globe.png" alt="">
    <div class="processing-track" role="progressbar" aria-label="Обработка перевода"><img src="./assets/images/loading-progress.svg" alt=""></div>
    <p>Обрабатываем перевод</p>`;
  return section;
}
