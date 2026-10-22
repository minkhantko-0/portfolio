import type { RoughAnnotationType } from 'rough-notation/lib/model';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// theme colors come from the CSS custom properties so the palette lives in one place
const themeVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const ACCENT = themeVar('--color-accent', '#0f766e');
const MARKER = themeVar('--color-marker', '#fcc419');
const HOME = themeVar('--color-home', '#e0a80d');

// This module is running, so the inline watchdog in Base.astro, which strips
// `.js` to un-hide every [data-enter] block if the bundle never arrives, has
// done its job. Cancel it before it can fire mid-fetch.
clearTimeout(window.__revealFallback);

// ---------- entrances: the parts of each [data-enter] block arrive in reading order ----------
// CSS does the moving (global.css); this sets the stagger index on the children
// and flips the class once, when the block's top is about 88% down the screen.
const entered = new WeakSet<Element>();
{
  const blocks = document.querySelectorAll<HTMLElement>('[data-enter]');
  const finish = (el: HTMLElement) => {
    if (entered.has(el)) return;
    entered.add(el);
    el.dispatchEvent(new Event('enter:done'));
  };
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    blocks.forEach((b) => {
      b.classList.add('is-in');
      finish(b);
    });
  } else {
    blocks.forEach((b) => {
      Array.from(b.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i)));
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const el = e.target as HTMLElement;
          el.classList.add('is-in');
          // the last child's transform transition is the last thing to settle;
          // the timeout covers a child that has no transition to end
          const last = el.lastElementChild;
          last?.addEventListener('transitionend', () => finish(el), { once: true });
          setTimeout(() => finish(el), 1800);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    );
    blocks.forEach((b) => io.observe(b));
  }
}

/**
 * Everything GSAP-driven, behind a dynamic import. GSAP is ~56 KB gzipped and
 * this whole function is skipped under `prefers-reduced-motion`, so it has no
 * business in the bundle those visitors download.
 */
type Motion = { gsap: typeof import('gsap').gsap; ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger };
let resolveMotion: (m: Motion) => void = () => {};
/** resolves once GSAP and ScrollTrigger are loaded and registered (never, under reduced motion) */
const motionLoaded = new Promise<Motion>((r) => (resolveMotion = r));

async function initMotion() {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);
  resolveMotion({ gsap, ScrollTrigger });

  /** set a path up to be "drawn" (hidden stroke, revealed by dashoffset → 0) */
  const prepDraw = (path: SVGPathElement) => {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    return len;
  };

  // ---------- hero underline: drawn once the letters have landed ----------
  {
    const underlinePaths = document.querySelectorAll<SVGPathElement>('#hero-underline .draw-path');
    underlinePaths.forEach(prepDraw);
    gsap.to(underlinePaths, {
      strokeDashoffset: 0,
      duration: 0.7,
      stagger: 0.15,
      ease: 'power1.inOut',
      delay: 0.7,
    });
  }

  // the font swap changes layout heights, so trigger positions computed at
  // module load are stale; recompute once the swap has actually happened
  document.fonts.ready.then(() => ScrollTrigger.refresh());

  // ---------- hand-drawn arrows: draw their strokes on entering the viewport ----------
  document.querySelectorAll<SVGSVGElement>('svg[data-draw]').forEach((svg) => {
    const paths = svg.querySelectorAll<SVGPathElement>('.draw-path');
    paths.forEach(prepDraw);
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 1.1,
      stagger: 0.3,
      ease: 'power1.inOut',
      scrollTrigger: { trigger: svg, start: 'top 90%', once: true },
    });
  });
}

const motionReady = prefersReducedMotion
  ? Promise.resolve()
  : initMotion().catch(() => {
      // GSAP's chunk did not arrive: the page simply stands still
    });

// ---------- the 3D globe: after the hero has painted, when the browser is idle ----------
// Reduced motion, Save-Data and no-WebGL visitors keep the drawn globe, which is
// the finished composition anyway. The module (Three.js inside) is its own chunk.
{
  const root = document.getElementById('globe');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (root && !prefersReducedMotion && !saveData) {
    const start = () =>
      import('../globe/scene')
        .then(({ mountGlobe }) => mountGlobe(root))
        .then(async (globe) => {
          window.__globe = globe;
          root.dispatchEvent(new CustomEvent('globe:live'));
          // the flight needs both the globe and the scroll engine
          const [{ gsap, ScrollTrigger }, { startFlight }] = await Promise.all([motionLoaded, import('../globe/flight')]);
          startFlight(globe, gsap, ScrollTrigger);
        })
        .catch(() => {
          // no WebGL, or the texture failed: the drawing stays
        });
    if ('requestIdleCallback' in window) requestIdleCallback(() => start(), { timeout: 2500 });
    else setTimeout(start, 900);
  }
}

// ---------- email button: mailto can silently no-op without a mail client,
// so clicking also copies the address and confirms it ----------
const emailBtn = document.getElementById('email-btn');
const emailCopied = document.getElementById('email-copied');
let copiedTimer: ReturnType<typeof setTimeout>;
emailBtn?.addEventListener('click', () => {
  navigator.clipboard?.writeText(emailBtn.dataset.email || '').catch(() => {});
  if (!emailCopied) return;
  // #email-copied is role="status": writing the text here is what announces it.
  emailCopied.textContent = 'copied!';
  emailCopied.classList.add('is-on');
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    emailCopied.classList.remove('is-on');
    setTimeout(() => {
      emailCopied.textContent = '';
    }, 300);
  }, 1600);
});

// ---------- globe pins: hover or focus names the client; press jumps to the chapter ----------
{
  const globe = document.getElementById('globe');
  const tip = document.getElementById('map-tip');
  if (globe && tip) {
    const countryEl = tip.querySelector<HTMLElement>('[data-tip-country]')!;
    const clientEl = tip.querySelector<HTMLElement>('[data-tip-client]')!;
    const show = (pin: HTMLElement) => {
      countryEl.textContent = pin.dataset.country || '';
      clientEl.textContent = pin.dataset.client || '';
      countryEl.style.color = 'home' in pin.dataset ? HOME : ACCENT;
      // park the tip beside the pin, on whichever side has room
      const g = globe.getBoundingClientRect();
      const r = pin.getBoundingClientRect();
      const onLeft = r.left - g.left > g.width * 0.6;
      const x = onLeft ? r.left - g.left - 12 - tip.offsetWidth : r.right - g.left + 12;
      const y = r.top - g.top + r.height / 2 - tip.offsetHeight / 2;
      tip.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
      tip.classList.add('is-on');
    };
    const hide = () => tip.classList.remove('is-on');
    globe.querySelectorAll<HTMLButtonElement>('button.pin').forEach((pin) => {
      pin.addEventListener('pointerenter', () => show(pin));
      pin.addEventListener('pointerleave', hide);
      pin.addEventListener('focus', () => show(pin));
      pin.addEventListener('blur', hide);
      pin.addEventListener('click', () => {
        const target = document.querySelector<HTMLElement>(`.chapter[data-stop="${pin.dataset.stop}"]`);
        target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      });
    });
  }
}

// ---------- rough-notation: hand-drawn underlines/highlights on key phrases ----------
// Runs even with reduced motion (duration 0 = static ink, no animation).
const colors: Record<string, string> = {
  underline: ACCENT,
  highlight: MARKER,
};

// assigned by the lazy import below, before anything is ever observed
let annotate: typeof import('rough-notation').annotate;

const annotated = new WeakSet<Element>();
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || annotated.has(entry.target)) continue;
      annotated.add(entry.target);
      const el = entry.target as HTMLElement;
      const type = (el.dataset.annotate || 'underline') as RoughAnnotationType;
      const annotation = annotate(el, {
        type,
        color: colors[type] || ACCENT,
        strokeWidth: 2,
        padding: 3,
        multiline: true,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 900,
      });
      // rough-notation measures the text at show() time, so drawing while an
      // ancestor is still mid-transform lands the ink in the wrong place.
      // Wait for the block's entrance to finish.
      const show = () => setTimeout(() => annotation.show(), prefersReducedMotion ? 0 : 250);
      const host = prefersReducedMotion ? null : el.closest('[data-enter]');
      if (host && !entered.has(host)) {
        host.addEventListener('enter:done', show, { once: true });
      } else {
        show();
      }
      observer.unobserve(el);
    }
  },
  { threshold: 0.6 }
);

// Observe only once the webfonts have loaded and the motion layer is in place:
// rough-notation measures text (fallback-font metrics misplace the ink).
Promise.all([document.fonts.ready, motionReady]).then(async () => {
  const targets = document.querySelectorAll('[data-annotate]');
  if (!targets.length) return;
  ({ annotate } = await import('rough-notation'));
  targets.forEach((el) => observer.observe(el));
});
