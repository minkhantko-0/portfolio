import type { APIRoute } from 'astro';
import { equirectangularMap } from '../lib/worldmap';

/**
 * /globe.svg — the equirectangular drawing the 3D globe wraps around itself.
 * Built once at build time, fetched only when the Three.js chunk loads, and
 * rasterised in the browser to a canvas texture, so the globe is the same
 * ink as the rest of the page and no PNG ships. Colours are literal here
 * (an SVG loaded as an image cannot read the page's custom properties).
 */
const PAPER = '#fbfaf5';
const INK_SOFT = '#55645f';
const ACCENT = '#0f766e';
const HOME = '#e0a80d';

export const GET: APIRoute = () => {
  const map = equirectangularMap(2048, 1024);
  const paths = map.shapes
    .map((s) => {
      if (s.kind === 'base') {
        return `<path d="${s.d}" fill="#ffffff" stroke="${INK_SOFT}" stroke-opacity="0.55" stroke-width="1.6"/>`;
      }
      const fill = s.kind === 'home' ? 'url(#hatch-home)' : 'url(#hatch-client)';
      const stroke = s.kind === 'home' ? '#22302e' : ACCENT;
      return `<path data-id="${s.id}" d="${s.d}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.width} ${map.height}" width="${map.width}" height="${map.height}">
<defs>
<filter id="scratch" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="7"/></filter>
<pattern id="hatch-client" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-42)"><path d="M0 0v14" stroke="${ACCENT}" stroke-width="3.6" opacity="0.75"/></pattern>
<pattern id="hatch-home" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0v12" stroke="${HOME}" stroke-width="4.4" opacity="0.9"/></pattern>
</defs>
<rect width="${map.width}" height="${map.height}" fill="${PAPER}"/>
<path d="${map.graticule}" fill="none" stroke="${INK_SOFT}" stroke-opacity="0.18" stroke-width="1.2"/>
<g filter="url(#scratch)">${paths}</g>
</svg>`;

  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
