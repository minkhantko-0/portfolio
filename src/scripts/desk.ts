/**
 * The desk (Desk.astro). The lamp lights where the pointer is: the pool of
 * light on the desk follows it, the lamp's head turns toward it, and every
 * object's shade falls away from it. The flip clock on the desk shows
 * Bangkok's time to the second, each digit turning over as it changes.
 * The pointer's light is desktop only; touch screens keep the lamp where
 * it stands.
 */
import { Flap } from './flap';

export function initDesk() {
  const desk = document.querySelector<HTMLElement>('[data-desk]');
  if (!desk) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const objects = Array.from(desk.querySelectorAll<HTMLElement>('[data-cast]'));
  const lampHead = desk.querySelector<HTMLElement>('[data-lamp-head]');
  const lamp = desk.querySelector<HTMLElement>('[data-lamp]');

  // ---------- the light ----------
  // where the lamp's bulb is, as a fraction of the desk; the pointer moves it
  const REST = { x: 0.86, y: 0.12 };
  let light = { ...REST };
  let raf = 0;
  const paint = () => {
    raf = 0;
    const d = desk.getBoundingClientRect();
    // the pool and the shade are huge circles moved by their own transform,
    // so the light's place is given in pixels of the desk, not a percentage
    desk.style.setProperty('--lx', `${(light.x * d.width).toFixed(1)}px`);
    desk.style.setProperty('--ly', `${(light.y * d.height).toFixed(1)}px`);
    const lx = d.left + light.x * d.width;
    const ly = d.top + light.y * d.height;
    for (const o of objects) {
      const r = o.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = cx - lx;
      const dy = cy - ly;
      const len = Math.hypot(dx, dy) || 1;
      // a longer shade the further from the light, within reason
      const k = Math.min(14, 4 + len / 90);
      o.style.setProperty('--sx', `${((dx / len) * k).toFixed(1)}px`);
      o.style.setProperty('--sy', `${((dy / len) * k).toFixed(1)}px`);
    }
    if (lampHead && lamp) {
      // the head turns from its pivot toward the light
      const p = lamp.getBoundingClientRect();
      const px = p.left + p.width * 0.5;
      const py = p.top + p.height * 0.28;
      const a = (Math.atan2(ly - py, lx - px) * 180) / Math.PI;
      // at rest the head points down-left; keep it within a believable swing
      const rest = 135;
      let turn = a - rest;
      while (turn > 180) turn -= 360;
      while (turn < -180) turn += 360;
      lampHead.style.setProperty('--la', `${Math.max(-40, Math.min(40, turn)).toFixed(1)}deg`);
    }
  };
  const ask = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  paint();
  addEventListener('resize', ask);
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    desk.addEventListener('pointermove', (e) => {
      const d = desk.getBoundingClientRect();
      light = { x: (e.clientX - d.left) / d.width, y: (e.clientY - d.top) / d.height };
      ask();
    });
    desk.addEventListener('pointerleave', () => {
      light = { ...REST };
      ask();
    });
  }

  // ---------- the clock: Bangkok, to the second ----------
  const clock = desk.querySelector<HTMLElement>('[data-desk-clock]');
  if (clock) {
    const digits = Array.from(clock.querySelectorAll<HTMLElement>('.flap')).map((el) => new Flap(el));
    const sr = clock.querySelector<HTMLElement>('[data-clock-sr]');
    const vs = clock.querySelector<HTMLElement>('[data-clock-vs]');
    const fmt = (zone?: string, seconds = true) =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        ...(seconds ? { second: '2-digit' } : {}),
        hour12: false,
        timeZone: zone,
      }).format(new Date());
    const tick = (animate: boolean) => {
      const t = fmt('Asia/Bangkok').replace(/:/g, '');
      digits.forEach((f, i) => (animate ? f.flipTo(t[i]) : f.show(t[i])));
      if (sr) sr.textContent = `${t.slice(0, 2)}:${t.slice(2, 4)} in Bangkok. `;
      if (vs) {
        const here = fmt(undefined, false);
        const bkk = fmt('Asia/Bangkok', false);
        vs.textContent = here === bkk ? '' : `${here} where you are`;
      }
    };
    tick(false);
    clock.classList.add('is-live');
    // land on the second, then every second
    setTimeout(() => {
      tick(true);
      setInterval(() => tick(true), 1000);
    }, 1000 - (Date.now() % 1000));
  }

  // ---------- a note can send you to its building in the town ----------
  desk.querySelectorAll<HTMLAnchorElement>('[data-town-gate]').forEach((a) => {
    a.addEventListener('click', () => dispatchEvent(new CustomEvent('town:select', { detail: a.dataset.townGate })));
  });
}
