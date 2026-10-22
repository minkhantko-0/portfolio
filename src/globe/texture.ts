/**
 * The globe's skin, made in the browser from /globe.svg (an equirectangular
 * drawing built at build time from the same world-atlas data as the rest of
 * the page). Rasterising the SVG here keeps the ink identical to the drawn
 * globe and ships ~36 KB of paths instead of a PNG; it runs once, after the
 * hero has painted, and costs tens of milliseconds.
 *
 * The same SVG also yields an "id map": each client country drawn in a flat
 * unique colour, read back by pixel so a pointer over the sphere can be
 * turned into a country without any geometry on the GPU side.
 */
export interface GlobeSkin {
  /** the drawn world, ready for a CanvasTexture */
  canvas: HTMLCanvasElement;
  /** country id at a texture coordinate (u 0..1 west→east, v 0..1 south→north), or null */
  idAt(u: number, v: number): string | null;
}

const ID_W = 1024;
const ID_H = 512;

function rasterise(svgText: string, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no 2d context'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('globe texture failed to rasterise'));
    };
    img.src = url;
  });
}

/** paint every client country in its own flat colour, from the same path data */
function idMap(svgText: string, viewW: number, viewH: number) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const paths = Array.from(doc.querySelectorAll('path[data-id]'));
  const canvas = document.createElement('canvas');
  canvas.width = ID_W;
  canvas.height = ID_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(ID_W / viewW, ID_H / viewH);
  const ids: string[] = [];
  paths.forEach((p, i) => {
    const id = p.getAttribute('data-id') || '';
    ids.push(id);
    // colour index i+1 in the red channel; 0 stays "no country"
    ctx.fillStyle = `rgb(${i + 1}, 0, 0)`;
    ctx.fill(new Path2D(p.getAttribute('d') || ''));
  });
  const data = ctx.getImageData(0, 0, ID_W, ID_H).data;
  return (u: number, v: number): string | null => {
    const x = Math.min(ID_W - 1, Math.max(0, Math.floor(u * ID_W)));
    const y = Math.min(ID_H - 1, Math.max(0, Math.floor((1 - v) * ID_H)));
    const r = data[(y * ID_W + x) * 4];
    return r ? (ids[r - 1] ?? null) : null;
  };
}

export async function loadGlobeSkin(url = '/globe.svg', width = 2048, height = 1024): Promise<GlobeSkin> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`globe texture ${res.status}`);
  const svgText = await res.text();
  const view = /viewBox="0 0 (\d+) (\d+)"/.exec(svgText);
  const viewW = view ? +view[1] : width;
  const viewH = view ? +view[2] : height;
  const [canvas, idAt] = await Promise.all([rasterise(svgText, width, height), Promise.resolve(idMap(svgText, viewW, viewH))]);
  return { canvas, idAt };
}
