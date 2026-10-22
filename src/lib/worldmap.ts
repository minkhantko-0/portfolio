/**
 * Build-time geometry for the globe: the static orthographic view in the
 * hero (SVG) and the equirectangular texture the 3D globe wraps around
 * itself (served from /globe.svg). Both come from the same world-atlas 110m
 * data as the old flat map, with the same ink and hatch treatment, so the
 * drawn globe and the rendered globe are the same drawing.
 */
import {
  geoOrthographic,
  geoEquirectangular,
  geoPath,
  geoGraticule,
  geoDistance,
  type GeoProjection,
} from 'd3-geo';
import { feature } from 'topojson-client';
// @ts-ignore - json module
import world110m from 'world-atlas/countries-110m.json';
import { route } from '../data/route';

export interface CountryFeature {
  id: string;
  geometry: object;
}

// @ts-ignore - topojson types
export const countries = feature(world110m, world110m.objects.countries).features as CountryFeature[];

const stopById = new Map(route.map((s) => [s.id, s]));

/** Integer coordinates: under a device pixel at these sizes, and the scratch
 *  filter displaces every stroke by more than that anyway. */
export const round = (d: string) => d.replace(/\d+\.\d+/g, (m) => (+m).toFixed(0));

export type Kind = 'base' | 'client' | 'home';

export interface Shape {
  d: string;
  kind: Kind;
  id: string;
  name?: string;
  client?: string;
}

function shapesFor(projection: GeoProjection): Shape[] {
  const path = geoPath(projection);
  const out: Shape[] = [];
  for (const c of countries) {
    const d = path(c as never);
    if (!d) continue;
    const stop = stopById.get(String(c.id));
    out.push({
      d: round(d),
      kind: !stop ? 'base' : stop.home ? 'home' : 'client',
      id: String(c.id),
      name: stop?.country,
      client: stop?.client,
    });
  }
  return out;
}

export interface OrthoView {
  size: number;
  radius: number;
  center: [number, number];
  sphere: string;
  graticule: string;
  shapes: Shape[];
  pins: { id: string; x: number; y: number; visible: boolean }[];
}

/**
 * The hero globe as seen before any JavaScript runs: an orthographic view
 * centred on `center` (lon, lat), `radius` units across in a `size` box.
 * The 3D scene matches this exact view with an orthographic camera, so the
 * rendered globe can fade in over the drawn one without a jump.
 */
export function orthographicView(center: [number, number], size = 600, radius = 290): OrthoView {
  const projection = geoOrthographic()
    .rotate([-center[0], -center[1]])
    .scale(radius)
    .translate([size / 2, size / 2]);
  const path = geoPath(projection);
  const sphere = round(path({ type: 'Sphere' } as never) || '');
  const graticule = round(path(geoGraticule().step([30, 30])() as never) || '');
  const shapes = shapesFor(projection);
  const pins = route.map((s) => {
    const [x, y] = projection([s.lon, s.lat]) ?? [0, 0];
    // the far side of the sphere projects too; hide what the camera cannot see
    // hide pins near the limb too: a label on the rim overlaps its neighbours
    const visible = geoDistance([s.lon, s.lat], center) < 1.2;
    return { id: s.id, x: +x.toFixed(1), y: +y.toFixed(1), visible };
  });
  return { size, radius, center, sphere, graticule, shapes, pins };
}

export interface EquirectMap {
  width: number;
  height: number;
  graticule: string;
  shapes: Shape[];
}

/** The texture: the whole world, equirectangular, lon -180..180 left to
 *  right and lat 90..-90 top to bottom, which is what a sphere's UVs expect. */
export function equirectangularMap(width = 2048, height = 1024): EquirectMap {
  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
  const path = geoPath(projection);
  const graticule = round(path(geoGraticule().step([30, 30])() as never) || '');
  return { width, height, graticule, shapes: shapesFor(projection) };
}
