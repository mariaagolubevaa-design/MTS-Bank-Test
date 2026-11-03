/** A one-shot decorative celebration, with no animation for reduced motion. */
export function celebrate(container) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'success-confetti';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#b2a0db', '#d8cff3', '#b9dfc3', '#e8b5ad', '#f2cb91'];
  const animations = [];
  for (let i = 0; i < 42; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.background = colors[i % colors.length];
    piece.style.borderRadius = i % 3 === 0 ? '50%' : '2px';
    piece.style.width = (i % 3 === 0 ? 7 : 5) + 'px';
    piece.style.height = (i % 3 === 0 ? 7 : 11) + 'px';
    layer.append(piece);
    const fromLeft = i % 2 === 0;
    const start = fromLeft ? 12 : 88;
    const end = 5 + Math.random() * 90;
    const rotation = Math.random() * 720 - 360;
    const duration = 2200 + Math.random() * 700;
    animations.push(piece.animate([
      { left:start+'%', top:'105px', opacity:0, transform:'rotate(0deg) scale(.6)' },
      { left:(fromLeft ? 28 : 72)+'%', top:(10+Math.random()*65)+'px', opacity:1, transform:'rotate('+rotation*.3+'deg) scale(1)', offset:.23 },
      { left:end+'%', top:(320+Math.random()*180)+'px', opacity:0, transform:'rotate('+rotation+'deg) scale(.85)' },
    ], { duration, delay:Math.random()*180, easing:'cubic-bezier(.2,.65,.4,1)', fill:'forwards' }).finished.catch(()=>{}));
  }
  container.append(layer);
  Promise.all(animations).then(()=>layer.remove());
}
