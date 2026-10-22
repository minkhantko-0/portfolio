/**
 * Things that lean toward the hand. Any [data-tilt] element turns a few
 * degrees in 3D toward the pointer (the number is the maximum, in degrees)
 * and lifts while hovered; CSS does the easing from the --rx / --ry / --lift
 * variables set here. Pointer only: on touch screens a tap toggles the
 * hovered look instead, so the underline and the lift are reachable there.
 */
export function initTilt() {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.tilt || '6');
    el.style.setProperty('--lift', `${el.dataset.lift ?? 6}px`);
    if (!fine) {
      el.addEventListener('click', (e) => {
        // a tap on a link inside still follows the link
        if ((e.target as HTMLElement).closest('a, button')) return;
        el.classList.toggle('is-hover');
      });
      return;
    }
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
    };
    el.addEventListener('pointerenter', () => el.classList.add('is-hover'));
    el.addEventListener('pointermove', (e) => {
      if (reduced) return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', () => {
      px = py = 0;
      el.classList.remove('is-hover');
      if (!raf) raf = requestAnimationFrame(apply);
    });
  });
}
