/**
 * The paper town's interaction (Town.astro). The scene is drawn at a fixed
 * size in "ground pixels" and scaled to the width it is given; buildings
 * answer the pointer (hover: lit windows and their piece of life) and a
 * press shows that project's card. One card at a time with JS; the arrows
 * walk the town in order. Idle motion (the tuk-tuk) runs only on screen.
 */
export function initTown() {
  const root = document.querySelector<HTMLElement>('[data-town]');
  const stage = root?.querySelector<HTMLElement>('.town-stage');
  const scene = root?.querySelector<HTMLElement>('.town-scene');
  const panel = root?.querySelector<HTMLElement>('.town-panel');
  if (!root || !stage || !scene || !panel) return;
  const blds = Array.from(root.querySelectorAll<HTMLElement>('.bld'));
  const cards = Array.from(root.querySelectorAll<HTMLElement>('.town-card'));
  const keys = blds.map((b) => b.dataset.bld || '');
  const index = root.querySelector<HTMLElement>('[data-town-index]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 1023.98px)');

  // ---------- scale: the drawn sheet is 1040 screen px wide at scale 1 ----------
  const SHEET = 1040;
  const fit = () => scene.style.setProperty('--s', (scene.clientWidth / SHEET).toFixed(4));
  fit();
  new ResizeObserver(fit).observe(scene);

  // ---------- select: one building lit, one card shown ----------
  let active = '';
  const select = (key: string, bring = false) => {
    if (!key || key === active) return;
    active = key;
    blds.forEach((b) => {
      const on = b.dataset.bld === key;
      b.classList.toggle('is-active', on);
      b.querySelector('.bld-hit')?.setAttribute('aria-pressed', String(on));
    });
    cards.forEach((c) => {
      const on = c.dataset.card === key;
      c.hidden = !on;
      c.classList.toggle('is-active', on);
    });
    if (index) index.textContent = String(keys.indexOf(key) + 1);
    // the shown card has drawings that play on scroll position; let them re-measure
    dispatchEvent(new Event('town:card'));
    // on a phone the card sits under the town: bring it up after a tap
    if (bring && narrow.matches) panel.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  };
  root.classList.add('is-ready');
  select(keys[0]);

  blds.forEach((b) => b.addEventListener('click', () => select(b.dataset.bld || '', true)));

  // Hover is decided from the scene, by what is under the pointer on each
  // move, with a little slack: a hovered building lifts and the sheet leans,
  // so enter/leave on the buildings themselves flickered as they moved under
  // a still pointer.
  let hovered: HTMLElement | null = null;
  const setHover = (b: HTMLElement | null) => {
    if (b === hovered) return;
    hovered?.classList.remove('is-hover');
    hovered = b;
    hovered?.classList.add('is-hover');
  };
  const SLACK = 10;
  const stillOver = (b: HTMLElement, x: number, y: number) => {
    for (const face of b.querySelectorAll<HTMLElement>('.face')) {
      const r = face.getBoundingClientRect();
      if (x >= r.left - SLACK && x <= r.right + SLACK && y >= r.top - SLACK && y <= r.bottom + SLACK) return true;
    }
    return false;
  };
  if (matchMedia('(hover: hover)').matches) {
    scene.addEventListener('pointermove', (e) => {
      if (hovered && stillOver(hovered, e.clientX, e.clientY)) return;
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.bld') || null;
      setHover(under);
    });
    scene.addEventListener('pointerleave', () => setHover(null));
  }

  // the departures board can send a visitor to a building's gate
  addEventListener('town:select', (e) => select((e as CustomEvent<string>).detail));

  const step = (dir: number) => {
    const i = (keys.indexOf(active) + dir + keys.length) % keys.length;
    select(keys[i]);
  };
  root.querySelector('[data-town-prev]')?.addEventListener('click', () => step(-1));
  root.querySelector('[data-town-next]')?.addEventListener('click', () => step(1));

  // arrow keys walk the roofs; a focused roof shows its card
  const hits = blds.map((b) => b.querySelector<HTMLElement>('.bld-hit'));
  root.querySelector('.town-blocks')?.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    const dir = ke.key === 'ArrowRight' || ke.key === 'ArrowDown' ? 1 : ke.key === 'ArrowLeft' || ke.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    const i = hits.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    ke.preventDefault();
    hits[(i + dir + hits.length) % hits.length]?.focus();
  });
  hits.forEach((h, i) => {
    h?.addEventListener('focus', () => setHover(blds[i]));
    h?.addEventListener('blur', () => setHover(null));
  });

  // ---------- the card keeps the town's height; a long one opens on request ----------
  const frame = root.querySelector<HTMLElement>('[data-card-frame]');
  const more = root.querySelector<HTMLElement>('[data-card-more]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-card-toggle]');
  const toggleText = root.querySelector<HTMLElement>('[data-card-toggle-text]');
  const nav = root.querySelector<HTMLElement>('.town-nav');
  let open = false;
  let settled = 0;
  const tall = () => {
    if (!frame || !nav) return 0;
    const gap = parseFloat(getComputedStyle(panel).rowGap) || 0;
    return Math.max(320, Math.round(stage.getBoundingClientRect().height - nav.getBoundingClientRect().height - gap));
  };
  const setOpen = (flag: boolean) => {
    if (!frame || !more || !toggle) return;
    open = flag;
    frame.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (toggleText) toggleText.textContent = open ? 'Fold it back' : 'Read the rest';
  };
  const fitCard = () => {
    if (!frame || !more) return;
    if (narrow.matches) {
      frame.style.height = '';
      frame.classList.remove('has-more');
      more.hidden = true;
      return;
    }
    const h = tall();
    frame.style.transition = 'none';
    frame.style.height = open ? '' : `${h}px`;
    const overflows = frame.scrollHeight > frame.clientHeight + 4 || open;
    frame.classList.toggle('has-more', overflows);
    more.hidden = !overflows;
    void frame.offsetWidth;
    frame.style.transition = '';
  };
  toggle?.addEventListener('click', () => {
    if (!frame) return;
    clearTimeout(settled);
    const from = frame.getBoundingClientRect().height;
    if (!open) {
      setOpen(true);
      frame.style.height = `${from}px`;
      void frame.offsetWidth;
      frame.style.height = `${frame.scrollHeight}px`;
      settled = window.setTimeout(() => (frame.style.height = ''), reduced ? 0 : 480);
    } else {
      frame.style.height = `${from}px`;
      void frame.offsetWidth;
      setOpen(false);
      frame.style.height = `${tall()}px`;
      // bring the card's top back into view if it has scrolled away
      const top = panel.getBoundingClientRect().top;
      if (top < 0) scrollTo({ top: scrollY + top - 24, behavior: reduced ? 'auto' : 'smooth' });
    }
  });
  if (frame) {
    new ResizeObserver(fitCard).observe(stage);
    narrow.addEventListener('change', fitCard);
    addEventListener('town:card', () => {
      setOpen(false);
      fitCard();
    });
    fitCard();
  }

  // ---------- idle life only while the town is on screen ----------
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => root.classList.toggle('is-on', e.isIntersecting), { threshold: 0.05 }).observe(stage);
  }

  // ---------- phones: the sheet is wider than the screen; start it centred ----------
  const centre = () => {
    if (stage.scrollWidth > stage.clientWidth) stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
  };
  centre();
  narrow.addEventListener('change', centre);
}
