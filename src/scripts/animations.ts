import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { annotate } from 'rough-notation';
import type { RoughAnnotationType } from 'rough-notation/lib/model';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** set a path up to be "drawn" (hidden stroke, revealed by dashoffset → 0) */
function prepDraw(path: SVGPathElement) {
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  return len;
}

if (!prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);

  // Initial hidden states are applied up front, before any rough-notation SVG
  // attaches. Its absolutely-positioned SVGs anchor to the nearest transformed
  // ancestor, so adding a transform later would re-anchor them and shift the
  // drawn ink. Transforms must exist from t=0 and never be cleared.
  gsap.set('.hero-greeting', { y: -18 });
  gsap.set('.hero-tagline', { y: 26 });
  // container-level tween: the buttons carry their own CSS transitions
  // (hover lift), and CSS transitions fight GSAP's per-tick transform writes
  gsap.set('.hero-cta', { y: 34, scale: 0.95 });
  gsap.set('.hero-note', { x: -24 });

  // ---------- hero entrance (runs once fonts are ready so SplitText measures right) ----------
  document.fonts.ready.then(() => {
    const nameEl = document.querySelector<HTMLElement>('.hero-name');
    const underlinePaths = document.querySelectorAll<SVGPathElement>('#hero-underline .draw-path');
    const doodlePaths = document.querySelectorAll<SVGPathElement>('.hero-doodles .draw-path');

    underlinePaths.forEach(prepDraw);
    doodlePaths.forEach(prepDraw);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to('.hero-greeting', { opacity: 1, y: 0, duration: 0.5 });

    if (nameEl) {
      // words wrapper keeps line wrapping at word boundaries on small screens
      const split = new SplitText(nameEl, { type: 'chars,words' });
      gsap.set(split.chars, { yPercent: 115, rotation: () => gsap.utils.random(-14, 14) });
      gsap.set(nameEl, { opacity: 1 });
      tl.to(
        split.chars,
        { yPercent: 0, rotation: 0, duration: 0.9, stagger: 0.045, ease: 'back.out(1.6)' },
        '-=0.2'
      );
    }

    tl.to(underlinePaths, { strokeDashoffset: 0, duration: 0.7, stagger: 0.15, ease: 'power1.inOut' }, '-=0.35')
      .to('.hero-tagline', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
      .to('.hero-cta', { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, '-=0.3')
      .to('.hero-doodles', { opacity: 1, duration: 0.01 }, '-=0.7')
      .to(doodlePaths, { strokeDashoffset: 0, duration: 1, stagger: 0.05, ease: 'power1.inOut' }, '<')
      .to('.hero-note', { opacity: 1, x: 0, duration: 0.5 }, '-=0.5');

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
    gsap.to('.connector path', { strokeDashoffset: -28, duration: 1.4, ease: 'none', repeat: -1 });
    gsap.to('.scroll-cue', { y: 9, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });

  // ---------- scroll reveals: batched so groups cascade in together ----------
  const reveals: Record<string, gsap.TweenVars> = {
    up: { y: 64, rotation: 1.5 },
    left: { x: -80, rotation: -1.5 },
    right: { x: 80, rotation: 1.5 },
    pop: { scale: 0.6, rotation: -5, y: 30 },
  };
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.set(el, { opacity: 0, ...reveals[el.dataset.reveal || 'up'] });
  });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      batch.forEach((el, i) => {
        const variant = (el as HTMLElement).dataset.reveal || 'up';
        gsap.to(el, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 0.8,
          delay: i * 0.09,
          ease: variant === 'pop' ? 'back.out(1.7)' : 'power3.out',
        });
      }),
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
  const plane = document.querySelector('#plane');
  if (plane) {
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

// ---------- rough-notation: hand-drawn underlines/highlights on key phrases ----------
// Runs even with reduced motion (duration 0 = static ink, no animation).
const colors: Record<string, string> = {
  underline: '#d9480f',
  highlight: '#ffd43b',
  box: '#d9480f',
};

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
        color: el.dataset.annotateColor || colors[type] || '#d9480f',
        strokeWidth: 2,
        padding: 3,
        multiline: true,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 900,
      });
      // wait out the reveal tween (~0.9s incl. batch stagger): rough-notation
      // measures the text at show() time, and a mid-pop scale shrinks the rect
      setTimeout(() => annotation.show(), prefersReducedMotion ? 0 : 1000);
      observer.unobserve(el);
    }
  },
  { threshold: 0.6 }
);

// observe only after webfonts load — rough-notation measures text, and drawing
// against fallback-font metrics leaves the ink strokes misplaced after the swap
document.fonts.ready.then(() => {
  document.querySelectorAll('[data-annotate]').forEach((el) => observer.observe(el));
});
