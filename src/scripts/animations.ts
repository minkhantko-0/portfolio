import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { annotate } from 'rough-notation';
import type { RoughAnnotationType } from 'rough-notation/lib/model';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  // --- section/content reveals (elements start hidden via .js .reveal CSS) ---
  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  // --- hand-drawn arrows: draw strokes when they enter the viewport ---
  document.querySelectorAll<SVGSVGElement>('svg[data-draw]').forEach((svg) => {
    const paths = svg.querySelectorAll<SVGPathElement>('.draw-path');
    paths.forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 1.1,
      stagger: 0.35,
      ease: 'power1.inOut',
      scrollTrigger: { trigger: svg, start: 'top 90%', once: true },
    });
  });

  // --- timeline squiggle: drawn progressively, scrubbed by scroll ---
  document.querySelectorAll<SVGSVGElement>('svg[data-draw-scrub]').forEach((svg) => {
    const path = svg.querySelector<SVGPathElement>('.draw-path');
    if (!path) return;
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(path, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: { trigger: svg, start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
    });
  });
}

// --- rough-notation: hand-drawn circles/underlines/highlights on key phrases ---
// Runs even with reduced motion (duration 0 = static ink, no animation).
const colors: Record<string, string> = {
  circle: '#d9480f',
  underline: '#d9480f',
  highlight: '#ffd43b',
  box: '#d9480f',
  'strike-through': '#d9480f',
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
        strokeWidth: type === 'circle' ? 3 : 2,
        padding: type === 'circle' ? 8 : 3,
        multiline: true,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 900,
      });
      // slight delay so the annotation lands after the reveal settles
      setTimeout(() => annotation.show(), prefersReducedMotion ? 0 : 350);
      observer.unobserve(el);
    }
  },
  { threshold: 0.6 }
);

document.querySelectorAll('[data-annotate]').forEach((el) => observer.observe(el));
