import type { RoughAnnotationType } from 'rough-notation/lib/model';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// theme colors come from the CSS custom properties so the palette lives in one place
const themeVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const ACCENT = themeVar('--color-accent', '#0f766e');
const MARKER = themeVar('--color-marker', '#fcc419');
const HOME = themeVar('--color-home', '#e0a80d');

// reveal elements whose entrance animation has fully settled (annotations wait on this)
const revealDone = new WeakSet<Element>();

/**
 * Everything GSAP-driven, behind a dynamic import. GSAP is ~56 KB gzipped and
 * this whole function is skipped under `prefers-reduced-motion`, so it has no
 * business in the bundle those visitors download. The small interactive bits
 * that DO run for everyone (the copied-to-clipboard toast, the map tooltip)
 * are plain CSS transitions further down for the same reason.
 */
async function initMotion() {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  /** set a path up to be "drawn" (hidden stroke, revealed by dashoffset → 0) */
  const prepDraw = (path: SVGPathElement) => {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    return len;
  };

  // Initial hidden states are applied up front, before any rough-notation SVG
  // attaches. Its absolutely-positioned SVGs anchor to the nearest transformed
  // ancestor, so adding a transform later would re-anchor them and shift the
  // drawn ink. Transforms must exist from t=0 and never be cleared. (The
  // annotation pass below awaits `motionReady` so this ordering still holds
  // now that GSAP arrives asynchronously.)
  // NOTE: the hero text (greeting / name / tagline / cta / note) is animated
  // in CSS now — see global.css. GSAP must not touch it, or its per-tick
  // transform writes would fight the running CSS animation.
  gsap.set('.map-pin', { scale: 0, transformOrigin: '50% 50%' });
  gsap.set('.map-label, .pin-home-ring', { opacity: 0 });
  gsap.set('.map-ink', { opacity: 0 });
  // main gets a transform NOW so rough-notation SVGs anchor to it from the
  // start (the velocity skew below would otherwise re-anchor them later)
  gsap.set('main', { skewY: 0.001, transformOrigin: '50% 50%', force3D: true });

  // ---------- hero decoration (drawn paths + map) ----------
  // No longer gated on `document.fonts.ready`: nothing here measures text, and
  // waiting on the fonts used to hold up the whole hero. The delay picks up
  // roughly where the CSS text entrance leaves off, preserving the choreography.
  {
    const underlinePaths = document.querySelectorAll<SVGPathElement>('#hero-underline .draw-path');
    const doodlePaths = document.querySelectorAll<SVGPathElement>('.hero-doodles .draw-path');

    underlinePaths.forEach(prepDraw);
    doodlePaths.forEach(prepDraw);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.85 });

    tl.to(underlinePaths, { strokeDashoffset: 0, duration: 0.7, stagger: 0.15, ease: 'power1.inOut' })
      .to('.hero-doodles', { opacity: 1, duration: 0.01 }, '-=0.4')
      .to(doodlePaths, { strokeDashoffset: 0, duration: 1, stagger: 0.05, ease: 'power1.inOut' }, '<')
      // The countries used to fade in one-by-one with a random stagger. Every
      // one of those writes landed on a child of the <g filter="url(#scratch)">
      // wrapper, so each frame re-ran the feTurbulence/feDisplacementMap over
      // the whole map. The ink now fades as a single group — group opacity is
      // composited after the filter, so the filter rasterizes once.
      .to('.map-ink', { opacity: 1, duration: 0.5 }, '<')
      .to('.map-pin', { scale: 1, duration: 0.45, stagger: 0.13, ease: 'back.out(2.5)' }, '-=0.6')
      .to('.map-label', { opacity: 1, duration: 0.4, stagger: 0.08 }, '-=0.6')
      .to('.pin-home-ring', { opacity: 1, duration: 0.3 }, '-=0.3');

    // "you are here" pulse on the Thailand ring
    gsap.to('.pin-home-ring', {
      scale: 1.7,
      opacity: 0,
      transformOrigin: '50% 50%',
      duration: 1.6,
      ease: 'power1.out',
      repeat: -1,
      repeatDelay: 0.4,
      delay: 4,
    });

    // continuous life after the entrance
    gsap.to('[data-float]', {
      y: () => gsap.utils.random(-12, 12),
      rotation: () => gsap.utils.random(-4, 4),
      duration: () => gsap.utils.random(2, 3.4),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 1.2,
    });
    gsap.to('.twinkle', {
      scale: 0.55,
      opacity: 0.35,
      transformOrigin: '50% 50%',
      duration: () => gsap.utils.random(0.7, 1.4),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.35,
    });
    gsap.to('.scroll-cue', { y: 9, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // the font swap changes layout heights, so trigger positions computed at
  // module load are stale — recompute once the swap has actually happened.
  // This still waits on the fonts, but nothing visible is blocked behind it.
  document.fonts.ready.then(() => ScrollTrigger.refresh());

  // ---------- scroll reveals: per-variant choreography, not one straight slide ----------
  const initialPose: Record<string, () => gsap.TweenVars> = {
    up: () => ({ y: gsap.utils.random(55, 100), rotation: gsap.utils.random(-3, 3) }),
    left: () => ({ x: -110, skewX: 7, rotation: -2 }),
    right: () => ({ x: 110, skewX: -7, rotation: 2 }),
    'arc-left': () => ({ x: -130, y: 80, rotation: -6 }),
    'arc-right': () => ({ x: 130, y: 80, rotation: 6 }),
    pop: () => ({ scale: 0.5, rotation: -8, y: 50 }),
    flip: () => ({ rotationX: -60, transformPerspective: 700, transformOrigin: '50% 0%', y: 40 }),
  };
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.set(el, { opacity: 0, ...(initialPose[el.dataset.reveal || 'up'] || initialPose.up)() });
  });

  function revealIn(el: HTMLElement, delay: number) {
    const variant = el.dataset.reveal || 'up';
    // rough-notation measures text when it draws, so annotations inside this
    // element must wait until the transform (esp. scale/rotation) settles
    const done = () => {
      revealDone.add(el);
      el.dispatchEvent(new Event('reveal:done'));
    };
    if (variant === 'arc-left' || variant === 'arc-right') {
      // curved entry: overshoot past the resting point, then swing back
      const dir = variant === 'arc-right' ? 1 : -1;
      gsap
        .timeline({ delay, onComplete: done })
        .to(el, { opacity: 1, x: dir * -14, y: -14, rotation: dir * -2, duration: 0.65, ease: 'power2.out' })
        .to(el, { x: 0, y: 0, rotation: 0, duration: 0.45, ease: 'power3.out' });
    } else if (variant === 'flip') {
      gsap.to(el, { opacity: 1, rotationX: 0, y: 0, duration: 1.1, delay, ease: 'power4.out', onComplete: done });
    } else if (variant === 'pop') {
      gsap.to(el, { opacity: 1, scale: 1, rotation: 0, y: 0, duration: 0.9, delay, ease: 'back.out(1.9)', onComplete: done });
    } else {
      gsap.to(el, { opacity: 1, x: 0, y: 0, rotation: 0, skewX: 0, duration: 1, delay, ease: 'power4.out', onComplete: done });
    }
    // child choreography: skill icons wind up and spin in, chips scatter-cascade
    el.querySelectorAll<SVGElement>('.skill-icon').forEach((icon) => {
      gsap.fromTo(
        icon,
        { rotation: -140, scale: 0, transformOrigin: '50% 50%' },
        { rotation: 0, scale: 1, duration: 1.2, delay: delay + 0.15, ease: 'elastic.out(1, 0.45)' }
      );
    });
    const chips = el.querySelectorAll('.chip-pop');
    if (chips.length) {
      gsap.fromTo(
        chips,
        { scale: 0, y: 14, rotation: () => gsap.utils.random(-10, 10) },
        {
          scale: 1,
          y: 0,
          rotation: 0,
          duration: 0.5,
          delay: delay + 0.2,
          ease: 'back.out(2.4)',
          stagger: { each: 0.035, from: 'random' },
        }
      );
    }
  }

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => batch.forEach((el, i) => revealIn(el as HTMLElement, i * 0.1)),
  });

  // ---------- scrub-settled elements: fly in tied to scroll, reversible ----------
  gsap.utils.toArray<HTMLElement>('[data-settle]').forEach((el, i) => {
    gsap.fromTo(
      el,
      { y: 110, x: i % 2 ? 44 : -44, rotation: i % 2 ? 9 : -9, scale: 0.88, opacity: 0 },
      {
        y: 0,
        x: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 55%', scrub: 0.6 },
      }
    );
  });

  // Both of the scrubbed decorative layers below are `display: none` on phones,
  // so building their ScrollTriggers there is pure cost for something nobody
  // can see. matchMedia creates them only where they render, and reverts them
  // when the query stops matching.
  const mm = gsap.matchMedia();

  // ---------- parallax drift for decorative layers ----------
  // every [data-parallax] element is hidden below `sm` (the individual doodles
  // then appear at sm / lg / xl depending on how much room they need)
  mm.add('(min-width: 640px)', () => {
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      const strength = parseFloat(el.dataset.parallax || '12');
      gsap.fromTo(
        el,
        { yPercent: strength },
        {
          yPercent: -strength,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section, header, footer') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        }
      );
    });
  });

  // ---------- scroll ball: weaves across the page background with scroll ----------
  // #scroll-stage is `hidden lg:block`
  mm.add('(min-width: 1024px)', () => {
    const ball = document.getElementById('scroll-ball');
    if (!ball) return;
    gsap
      .timeline({
        defaults: { ease: 'sine.inOut', transformOrigin: '50% 50%' },
        scrollTrigger: { start: 0, end: 'max', scrub: 0.6, invalidateOnRefresh: true },
      })
      .to(ball, { x: '80vw', y: '16vh', rotation: 420 })
      .to(ball, { x: '10vw', y: '38vh', rotation: 840 })
      .to(ball, { x: '72vw', y: '58vh', rotation: 1260 })
      .to(ball, { x: '20vw', y: '82vh', rotation: 1680 });
  });

  // ---------- velocity skew: the page leans with fast scrolling ----------
  const skewSetter = gsap.quickSetter('main', 'skewY', 'deg');
  const skewClamp = gsap.utils.clamp(-1.6, 1.6);
  const skewProxy = { skew: 0 };
  ScrollTrigger.create({
    onUpdate(self) {
      const skew = skewClamp(self.getVelocity() / -400);
      if (Math.abs(skew) > Math.abs(skewProxy.skew)) {
        skewProxy.skew = skew;
        gsap.to(skewProxy, {
          skew: 0,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: true,
          onUpdate: () => skewSetter(skewProxy.skew),
        });
      }
    },
  });

  // ---------- hand-drawn arrows & doodles: draw strokes on entering viewport ----------
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

  // ---------- experience timeline squiggle: scrubbed by scroll ----------
  document.querySelectorAll<SVGSVGElement>('svg[data-draw-scrub]').forEach((svg) => {
    const path = svg.querySelector<SVGPathElement>('.draw-path');
    if (!path) return;
    prepDraw(path);
    gsap.to(path, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: { trigger: svg, start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
    });
  });

  // ---------- paper plane rides its dashed route between hero and about ----------
  // MotionPathPlugin is another ~10 KB gzipped and drives this one tween, so it
  // only loads once we know the route is actually on the page.
  const plane = document.querySelector('#plane');
  if (plane) {
    const { MotionPathPlugin } = await import('gsap/MotionPathPlugin');
    gsap.registerPlugin(MotionPathPlugin);
    gsap.to(plane, {
      motionPath: {
        path: '#plane-route',
        align: '#plane-route',
        alignOrigin: [0.5, 0.5],
        autoRotate: true,
      },
      ease: 'none',
      scrollTrigger: { trigger: '#plane-divider', start: 'top 95%', end: 'top 20%', scrub: 0.6 },
    });
  }
}

// This module is running, so the inline watchdog in Base.astro — which strips
// `.js` to un-hide every [data-reveal]/[data-settle] section if the bundle
// never arrives — has done its job. Cancel it before it can fire mid-fetch and
// flash those sections in and back out on a slow connection. The remaining
// failure mode, GSAP's own chunk not loading, is handled by the catch below.
clearTimeout(window.__revealFallback);

const motionReady = prefersReducedMotion
  ? Promise.resolve()
  : initMotion().catch(() => {
      // nothing is going to animate the reveal targets in, so un-hide them and
      // let the page stand still rather than stay blank
      document.documentElement.classList.remove('js');
    });

// ---------- email button: mailto can silently no-op without a mail client,
// so clicking also copies the address and confirms it ----------
const emailBtn = document.getElementById('email-btn');
const emailCopied = document.getElementById('email-copied');
let copiedTimer: ReturnType<typeof setTimeout>;
emailBtn?.addEventListener('click', () => {
  navigator.clipboard?.writeText(emailBtn.dataset.email || '').catch(() => {});
  if (!emailCopied) return;
  emailCopied.classList.add('is-on');
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => emailCopied.classList.remove('is-on'), 1600);
});

// ---------- map tooltip: hover a country/pin to see who I shipped for ----------
const tip = document.getElementById('map-tip');
const tipWrap = document.querySelector<HTMLElement>('.hero-doodles');
if (tip && tipWrap) {
  const countryEl = tip.querySelector<HTMLElement>('[data-tip-country]')!;
  const clientEl = tip.querySelector<HTMLElement>('[data-tip-client]')!;

  // The wrapper's box only moves on scroll (it parallaxes) and on resize, so
  // measure it then. This used to be a getBoundingClientRect() inside an
  // unthrottled mousemove, forcing layout on every pointer sample.
  let wrapRect = tipWrap.getBoundingClientRect();
  const remeasure = () => {
    wrapRect = tipWrap.getBoundingClientRect();
  };
  addEventListener('scroll', remeasure, { passive: true });
  addEventListener('resize', remeasure, { passive: true });

  document.querySelectorAll<SVGElement>('[data-client]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      countryEl.textContent = el.dataset.country || '';
      clientEl.textContent = el.dataset.client || '';
      // home base gets the "currently based" gold; clients keep the accent
      countryEl.style.color = 'home' in el.dataset ? HOME : ACCENT;
      remeasure();
      tip.classList.add('is-on');
    });
    el.addEventListener('mouseleave', () => tip.classList.remove('is-on'));
    el.addEventListener('mousemove', (e) => {
      const ev = e as MouseEvent;
      tip.style.translate = `${ev.clientX - wrapRect.left + 16}px ${ev.clientY - wrapRect.top + 18}px`;
    });
  });
}

// ---------- rough-notation: hand-drawn underlines/highlights on key phrases ----------
// Runs even with reduced motion (duration 0 = static ink, no animation).
const colors: Record<string, string> = {
  underline: ACCENT,
  highlight: MARKER,
  box: ACCENT,
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
      // ancestor is still mid-scale/rotation lands the ink in the wrong place
      // (was viewport-width dependent). Wait for the reveal to actually finish.
      const show = () => setTimeout(() => annotation.show(), prefersReducedMotion ? 0 : 350);
      const host = prefersReducedMotion ? null : el.closest('[data-reveal]');
      if (host && !revealDone.has(host)) {
        host.addEventListener('reveal:done', show, { once: true });
      } else {
        show();
      }
      observer.unobserve(el);
    }
  },
  { threshold: 0.6 }
);

// Observe only once the webfonts have loaded AND the motion layer has set its
// permanent transforms: rough-notation measures text (fallback-font metrics
// misplace the ink) and anchors its absolute SVGs to the nearest transformed
// ancestor (so `main` must already carry its transform). The library itself is
// imported lazily — no ink is drawn until both of those settle anyway, so it
// has no business in the bundle that gates first render.
Promise.all([document.fonts.ready, motionReady]).then(async () => {
  const targets = document.querySelectorAll('[data-annotate]');
  if (!targets.length) return;
  ({ annotate } = await import('rough-notation'));
  targets.forEach((el) => observer.observe(el));
});
