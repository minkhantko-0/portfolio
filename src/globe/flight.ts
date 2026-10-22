/**
 * The flight: the paper plane flies the route on the globe as the chapters
 * scroll past it. One GSAP timeline, scrubbed by the chapters' scroll
 * position, owns everything: the globe turns to follow the plane, the leg's
 * dashed trail draws in behind it, the chapter it lands at is lit, the count
 * under the globe reads "3 of 7". Native scroll; the scrollbar tells the
 * truth; nothing is captured.
 *
 * Only where the globe is held beside the chapters (wide screens). Phones,
 * reduced motion and no-JS show the rest: the whole route drawn, the plane
 * at home.
 */
import {
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import type { GlobeHandle } from './scene';
import { route } from '../data/route';

const INK = '#22302e';
const INK_SOFT = '#55645f';
const PAPER = '#fbfaf5';
const SEGMENTS = 72;

/** the stops in flying order: home first and last */
function legs() {
  const home = route.find((s) => s.home) ?? route[route.length - 1];
  const stops = route.filter((s) => s !== home);
  const order = [home, ...stops, home];
  return order.slice(1).map((to, i) => ({ from: order[i], to }));
}

/** a great-circle arc from a to b on the unit sphere, lifted in the middle like a flight */
function arc(a: Vector3, b: Vector3, radius: number, lift: number) {
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const angle = ua.angleTo(ub);
  const pts: Vector3[] = [];
  const tmp = new Vector3();
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    // slerp
    if (angle < 1e-4) tmp.copy(ua);
    else tmp.copy(ua).multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle)).addScaledVector(ub, Math.sin(t * angle) / Math.sin(angle));
    const h = 1 + lift * Math.sin(Math.PI * t) * Math.min(1, angle / 1.2);
    pts.push(tmp.clone().multiplyScalar(radius * h));
  }
  return { pts, angle };
}

/** a paper plane, nose along +z, folded keel below */
function paperPlane(size: number) {
  const g = new Group();
  const n = [0, 0, size * 0.6];
  const l = [-size * 0.38, size * 0.08, -size * 0.4];
  const r = [size * 0.38, size * 0.08, -size * 0.4];
  const c = [0, -size * 0.04, -size * 0.38];
  const k = [0, -size * 0.22, -size * 0.3];
  const body = new BufferGeometry();
  body.setAttribute('position', new Float32BufferAttribute([...n, ...l, ...c, ...n, ...c, ...r, ...n, ...c, ...k], 3));
  body.computeVertexNormals();
  const mesh = new Mesh(body, new MeshBasicMaterial({ color: PAPER, side: DoubleSide }));
  const edges = new LineSegments(new EdgesGeometry(body, 10), new LineBasicMaterial({ color: INK }));
  g.add(mesh, edges);
  return g;
}

function lonLatOf(v: Vector3) {
  const u = v.clone().normalize();
  const lat = Math.asin(u.y) * (180 / Math.PI);
  // inverse of toPoint: x = -cos(phi) sinθ, z = sin(phi) sinθ, phi = lon + 180
  const phi = Math.atan2(u.z, -u.x) * (180 / Math.PI);
  let lon = phi - 180;
  if (lon < -180) lon += 360;
  return { lon, lat };
}

export function startFlight(globe: GlobeHandle, gsap: typeof Gsap, ScrollTrigger: typeof ST) {
  const chapters = Array.from(document.querySelectorAll<HTMLElement>('.chapter'));
  const list = document.querySelector<HTMLElement>('.chapters');
  const count = document.querySelector<HTMLElement>('[data-count-current]');
  const spread = document.querySelector<HTMLElement>('.spread');
  if (!chapters.length || !list) return;

  // ---------- geometry on the globe ----------
  const rig = new Group();
  globe.surface.add(rig);
  const R = globe.radius;
  const trails: { line: Line; total: number }[] = [];
  const paths: Vector3[][] = [];
  for (const { from, to } of legs()) {
    const a = globe.point(from.lon, from.lat);
    const b = globe.point(to.lon, to.lat);
    const { pts } = arc(a, b, R, 0.16);
    paths.push(pts);
    // the trail hugs the surface; the plane flies above it
    const ground = arc(a, b, R, 0).pts.map((p) => p.multiplyScalar(1.004));
    const geometry = new BufferGeometry().setFromPoints(ground);
    const line = new Line(geometry, new LineDashedMaterial({ color: INK_SOFT, dashSize: 6, gapSize: 5, transparent: true, opacity: 0.85 }));
    line.computeLineDistances();
    line.geometry.setDrawRange(0, 0);
    rig.add(line);
    trails.push({ line, total: ground.length });
  }
  const plane = paperPlane(R * 0.1);
  rig.add(plane);

  const forward = new Vector3();
  const up = new Vector3();
  // the plane banks with the speed of the scroll and settles as it stops
  let roll = 0;
  let rollTarget = 0;
  const placePlane = (leg: number, t: number, follow: boolean) => {
    const pts = paths[leg];
    const i = Math.min(SEGMENTS - 1, Math.floor(t * SEGMENTS));
    const f = t * SEGMENTS - i;
    plane.position.lerpVectors(pts[i], pts[i + 1], f);
    forward.subVectors(pts[Math.min(SEGMENTS, i + 1)], pts[i]).add(plane.position);
    up.copy(plane.position).normalize();
    plane.up.copy(up);
    plane.lookAt(forward);
    roll += (rollTarget - roll) * 0.18;
    plane.rotateZ(roll);
    if (!follow) return;
    const at = lonLatOf(plane.position);
    globe.lookAt(at.lon, at.lat, 0);
  };
  const rest = () => {
    trails.forEach(({ line, total }) => line.geometry.setDrawRange(0, total));
    const last = paths[paths.length - 1];
    plane.position.copy(last[SEGMENTS]);
    forward.subVectors(last[SEGMENTS], last[SEGMENTS - 1]).add(plane.position);
    up.copy(plane.position).normalize();
    plane.up.copy(up);
    plane.lookAt(forward);
    globe.invalidate();
  };

  // ---------- progress → state ----------
  const n = chapters.length;
  const FLY = 0.62; // the first part of each chapter's scroll is the flight, the rest the stay
  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
    if (count) count.textContent = i < 0 ? 'home' : `${i + 1} of ${n}`;
  };
  const apply = (p: number) => {
    const leg = Math.min(n - 1, Math.floor(p * n));
    const local = p * n - leg;
    const t = Math.min(1, local / FLY);
    for (let k = 0; k < trails.length; k++) {
      const { line, total } = trails[k];
      line.geometry.setDrawRange(0, k < leg ? total : k === leg ? Math.round(t * total) : 0);
    }
    // before the first chapter the globe stays as drawn (or as the visitor left it)
    placePlane(leg, t, p > 0);
    setActive(p <= 0 ? -1 : leg);
    globe.allowIdle(p <= 0);
    globe.invalidate();
  };

  // ---------- scrub, only where the globe is held ----------
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    spread?.classList.add('flight-live');
    const proxy = { p: 0 };
    apply(0);
    const tween = gsap.to(proxy, {
      p: 1,
      ease: 'none',
      onUpdate: () => apply(proxy.p),
      scrollTrigger: {
        trigger: list,
        start: 'top 62%',
        end: 'bottom 62%',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          rollTarget = Math.max(-1, Math.min(1, self.getVelocity() / 2500)) * -0.45;
        },
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      spread?.classList.remove('flight-live');
      setActive(-1);
    };
  });
  mm.add('(max-width: 1023.98px)', () => {
    // the finished composition: every leg drawn, the plane home
    rest();
    globe.allowIdle(true);
    if (count) count.textContent = 'home';
    return () => undefined;
  });
  ScrollTrigger.refresh();
}
