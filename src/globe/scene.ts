/**
 * The 3D paper globe. Mounts into #globe-mount, over the build-time SVG
 * drawing, with an orthographic camera whose units are the SVG's viewBox
 * units, so the first rendered frame lines up with the drawing exactly and
 * the drawing can fade away underneath it.
 *
 * What is here: the sphere wrapped in the rasterised /globe.svg, a three-step
 * toon light so the real day side and night side show (the sun is placed
 * from the clock), an inverted-hull ink outline and a once-perturbed paper
 * surface so it reads as drawn, the seven pins on the surface, and the
 * interaction: drag to spin with inertia, arrow keys, the pointer's tilt,
 * optional phone tilt, hover on a country. Rendering is on demand (only
 * while something moves, while the globe is on screen and the tab visible).
 *
 * Everything that reads as text stays in the DOM: the pin buttons in
 * GlobeStatic.astro are moved to follow the surface each frame.
 */
import {
  AmbientLight,
  BackSide,
  CanvasTexture,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  Raycaster,
  RedFormat,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { loadGlobeSkin } from './texture';
import { route, type Stop } from '../data/route';

export interface GlobeHandle {
  /** turn so that lon/lat faces the camera; `ms` 0 jumps */
  lookAt(lon: number, lat: number, ms?: number): void;
  /** the group the flight (plane, trail) attaches to: the sphere's own frame */
  readonly surface: Group;
  readonly radius: number;
  /** ask for frames: anything that changed the scene calls this */
  invalidate(): void;
  /** the flight owns the orientation while flying; idle drift only when it says so */
  allowIdle(flag: boolean): void;
  /** lon/lat → position on the sphere's own frame, at `lift` × radius */
  point(lon: number, lat: number, lift?: number): Vector3;
  dispose(): void;
}

const INK = '#22302e';
const PAPER = '#f6f5ef';
const ACCENT = '#0f766e';
const MARKER = '#fcc419';

const d2r = MathUtils.degToRad;

/** lon/lat to a point on a sphere of radius r, in the frame the texture is wrapped in */
export function toPoint(lon: number, lat: number, r: number, out = new Vector3()) {
  const phi = d2r(lon + 180);
  const theta = d2r(90 - lat);
  return out.set(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

/** the sun's position over the earth right now: subsolar latitude and longitude */
function subsolar(now = new Date()) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = (now.getTime() - start) / 86400000;
  const decl = 23.44 * Math.sin(d2r((360 / 365) * (284 + day)));
  const utc = now.getUTCHours() + now.getUTCMinutes() / 60;
  let lon = 180 - 15 * utc;
  if (lon < -180) lon += 360;
  return { lon, lat: decl };
}

/** paper: push the sphere's vertices in and out a little, once, with smooth seeded noise */
function crumple(geometry: SphereGeometry, amount: number) {
  const pos = geometry.attributes.position;
  const v = new Vector3();
  const dirs = [new Vector3(0.7, 0.3, 0.6), new Vector3(-0.4, 0.8, 0.2), new Vector3(0.3, -0.5, 0.8)].map((d) => d.normalize());
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n =
      Math.sin(v.dot(dirs[0]) * 5.3) * 0.5 + Math.sin(v.dot(dirs[1]) * 7.1 + 1.3) * 0.3 + Math.sin(v.dot(dirs[2]) * 11.7 + 2.1) * 0.2;
    const r = geometry.parameters.radius * (1 + amount * n);
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function toonGradient() {
  // dotNL from -1 (left) to 1 (right): night for the far half, one soft step at
  // the terminator, then full day. Sixteen texels keep the band about ten degrees.
  const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 128, 255, 255, 255, 255, 255, 255, 255]);
  const tex = new DataTexture(data, 16, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export async function mountGlobe(root: HTMLElement): Promise<GlobeHandle> {
  const mount = root.querySelector<HTMLElement>('#globe-mount');
  if (!mount) throw new Error('no globe mount');
  const size = +(root.dataset.size || 600);
  const radius = +(root.dataset.radius || 290);
  const lon0 = +(root.dataset.lon || 100);
  const lat0 = +(root.dataset.lat || 15);
  const phone = matchMedia('(max-width: 767px)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  // ---------- renderer, camera, scene ----------
  const renderer = new WebGLRenderer({ alpha: true, antialias: !phone, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.5 : 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;opacity:0;transition:opacity 600ms ease';
  mount.appendChild(canvas);

  const camera = new OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 1, 4000);
  camera.position.set(0, 0, 2000);
  camera.lookAt(0, 0, 0);
  const scene = new Scene();

  // tilt (pitch, screen x) ⊃ hover (the pointer's few degrees) ⊃ spin (yaw, the pole) ⊃ surface
  const tilt = new Group();
  const hover = new Group();
  const spin = new Group();
  const surface = new Group();
  tilt.add(hover);
  hover.add(spin);
  spin.add(surface);
  scene.add(tilt);

  // ---------- the skin ----------
  const skin = await loadGlobeSkin('/globe.svg', phone ? 1024 : 2048, phone ? 512 : 1024);
  const texture = new CanvasTexture(skin.canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;

  // ---------- the sphere, its outline, its light ----------
  const geometry = new SphereGeometry(radius, phone ? 96 : 160, phone ? 48 : 80);
  crumple(geometry, 0.011);
  // lights are physical since r155 (irradiance / π): ambient 0.9π keeps the night
  // side at 90% of the drawing, and the sun adds the last 10% on the day side,
  // so the lit paper is exactly the paper of the rest of the page
  const material = new MeshToonMaterial({ map: texture, gradientMap: toonGradient(), color: new Color('#ffffff') });
  const sphere = new Mesh(geometry, material);
  surface.add(sphere);

  const outline = new Mesh(geometry, new MeshBasicMaterial({ color: INK, side: BackSide }));
  outline.scale.setScalar(1.009);
  surface.add(outline);

  // the sun is a property of the earth right now, so it lives in the sphere's frame
  const sun = new DirectionalLight('#ffffff', 0.1 * Math.PI);
  const sunAt = () => {
    const s = subsolar();
    toPoint(s.lon, s.lat, 1000, sun.position);
  };
  sunAt();
  sun.target.position.set(0, 0, 0);
  surface.add(sun, sun.target);
  scene.add(new AmbientLight('#ffffff', 0.9 * Math.PI));
  const sunTimer = setInterval(() => {
    sunAt();
    invalidate();
  }, 60000);

  // ---------- pins on the surface ----------
  const pinMeshes: { stop: Stop; mesh: Mesh }[] = [];
  const pinGeo = new SphereGeometry(5.5, 16, 12);
  const pinOut = new SphereGeometry(5.5, 16, 12);
  for (const stop of route) {
    const p = toPoint(stop.lon, stop.lat, radius * 1.005);
    const mesh = new Mesh(pinGeo, new MeshBasicMaterial({ color: stop.home ? MARKER : ACCENT }));
    mesh.position.copy(p);
    if (stop.home) mesh.scale.setScalar(1.25);
    const ring = new Mesh(pinOut, new MeshBasicMaterial({ color: stop.home ? INK : PAPER, side: BackSide }));
    ring.scale.setScalar(1.35);
    mesh.add(ring);
    surface.add(mesh);
    pinMeshes.push({ stop, mesh });
  }

  // ---------- orientation ----------
  // the drawn globe faces lon0/lat0 with north up; match it exactly
  const yawFor = (lon: number) => d2r(-90 - lon);
  const pitchFor = (lat: number) => d2r(lat);
  spin.rotation.y = yawFor(lon0);
  tilt.rotation.x = pitchFor(lat0);
  const PITCH_MAX = d2r(62);

  // targets the loop eases toward (drag writes them directly, lookAt tweens them)
  let yawTarget = spin.rotation.y;
  let pitchTarget = tilt.rotation.x;
  let yawVel = 0;
  let pitchVel = 0;
  let tween: { from: [number, number]; to: [number, number]; t0: number; ms: number } | null = null;
  const hoverTarget = new Vector2();

  // ---------- DOM pins follow the surface ----------
  const pinEls = new Map<string, { li: HTMLElement; button: HTMLElement }>();
  root.querySelectorAll<HTMLElement>('.globe-pins li[data-pin]').forEach((li) => {
    const button = li.querySelector<HTMLElement>('button.pin')!;
    pinEls.set(li.dataset.pin!, { li, button });
  });
  const world = new Vector3();
  const normal = new Vector3();
  const placePins = () => {
    const box = root.clientWidth;
    for (const { stop, mesh } of pinMeshes) {
      const el = pinEls.get(stop.id);
      if (!el) continue;
      mesh.getWorldPosition(world);
      normal.copy(world).normalize();
      const facing = normal.z;
      // hide pins near the rim (about 66° from the centre), as the drawing does
      const visible = facing > 0.4;
      el.li.hidden = !visible;
      if (!visible) continue;
      const x = (world.x / size + 0.5) * box;
      const y = (0.5 - world.y / size) * box;
      el.li.style.left = `${x.toFixed(1)}px`;
      el.li.style.top = `${y.toFixed(1)}px`;
      // labels fade out toward the rim rather than popping
      el.button.style.opacity = String(MathUtils.smoothstep(facing, 0.4, 0.58));
    }
  };

  // ---------- idle: after twenty seconds without a hand on it, a slow turn ----------
  // (stops at the first touch, off screen, in a hidden tab, and while the flight flies)
  let idleAllowed = true;
  let idleSpin = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdle = () => {
    clearTimeout(idleTimer);
    idleSpin = false;
    if (!idleAllowed) return;
    idleTimer = setTimeout(() => {
      if (!idleAllowed || !onScreen || !visible) return;
      idleSpin = true;
      invalidate();
    }, 20000);
  };
  const allowIdle = (flag: boolean) => {
    idleAllowed = flag;
    armIdle();
  };

  // ---------- render on demand ----------
  let frames = 0;
  let raf = 0;
  let onScreen = true;
  let visible = !document.hidden;
  const invalidate = () => {
    frames = Math.max(frames, 2);
    if (!raf && onScreen && visible) raf = requestAnimationFrame(tick);
  };

  const resize = () => {
    const w = root.clientWidth;
    renderer.setSize(w, w, false);
    placePins();
    invalidate();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(root);

  let last = performance.now();
  function tick(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let moving = false;

    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.ms);
      const e = 1 - Math.pow(1 - k, 3);
      yawTarget = tween.from[0] + (tween.to[0] - tween.from[0]) * e;
      pitchTarget = tween.from[1] + (tween.to[1] - tween.from[1]) * e;
      if (k >= 1) tween = null;
      moving = true;
    } else if (idleSpin && !dragging) {
      yawTarget -= 0.025 * dt;
      moving = true;
    } else if (!dragging) {
      // inertia after a drag
      if (Math.abs(yawVel) > 1e-4 || Math.abs(pitchVel) > 1e-4) {
        yawTarget += yawVel * dt;
        pitchTarget = MathUtils.clamp(pitchTarget + pitchVel * dt, -PITCH_MAX, PITCH_MAX);
        yawVel *= Math.pow(0.08, dt);
        pitchVel *= Math.pow(0.08, dt);
        moving = true;
      }
    }

    // ease the groups toward their targets
    const ease = 1 - Math.pow(0.001, dt);
    const dy = yawTarget - spin.rotation.y;
    const dp = pitchTarget - tilt.rotation.x;
    if (Math.abs(dy) > 1e-5 || Math.abs(dp) > 1e-5) {
      spin.rotation.y += dy * ease;
      tilt.rotation.x += dp * ease;
      moving = true;
    }
    const hx = hoverTarget.x - hover.rotation.y;
    const hy = hoverTarget.y - hover.rotation.x;
    if (Math.abs(hx) > 1e-5 || Math.abs(hy) > 1e-5) {
      hover.rotation.y += hx * ease * 0.6;
      hover.rotation.x += hy * ease * 0.6;
      moving = true;
    }

    renderer.render(scene, camera);
    placePins();
    for (const fn of afterRender) fn();

    if (moving || frames > 0) {
      frames = Math.max(0, frames - 1);
      raf = requestAnimationFrame(tick);
    }
  }
  const afterRender: (() => void)[] = [];

  // ---------- interaction ----------
  let dragging = false;
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let moved = 0;
  const DRAG = (Math.PI / size) * 1.15; // radians per pixel: a full drag across the globe is about half a turn

  const onDown = (e: PointerEvent) => {
    armIdle();
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = e.timeStamp;
    moved = 0;
    yawVel = pitchVel = 0;
    tween = null;
    root.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
  };
  const onMove = (e: PointerEvent) => {
    if (idleSpin) armIdle();
    if (dragging && e.pointerId === pointerId) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dt = Math.max(8, e.timeStamp - lastT) / 1000;
      moved += Math.abs(dx) + Math.abs(dy);
      yawTarget += dx * DRAG;
      pitchTarget = MathUtils.clamp(pitchTarget + dy * DRAG, -PITCH_MAX, PITCH_MAX);
      yawVel = (dx * DRAG) / dt;
      pitchVel = (dy * DRAG) / dt;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
      invalidate();
      return;
    }
    if (coarse) return;
    // the globe leans a few degrees toward the hand
    const r = root.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    hoverTarget.set(nx * d2r(3.5), ny * d2r(3.5));
    hoverCountry(e.clientX, e.clientY);
    invalidate();
  };
  const endDrag = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    root.classList.remove('is-dragging');
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {}
    // a tap on a country (no real drag) jumps to its chapter
    if (moved < 6) {
      const id = countryAt(e.clientX, e.clientY);
      if (id) pinEls.get(id)?.button.click();
    }
    invalidate();
  };
  const onLeave = () => {
    hoverTarget.set(0, 0);
    setCountry(null);
    invalidate();
  };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('pointerleave', onLeave);
  // touch scrolling must still work on the page; the globe only takes horizontal drags
  root.style.touchAction = 'pan-y';

  // keyboard: arrow keys turn the globe, from the globe itself or from a focused pin
  const onKey = (e: KeyboardEvent) => {
    armIdle();
    const step = d2r(15);
    switch (e.key) {
      case 'ArrowLeft':
        yawTarget += step;
        break;
      case 'ArrowRight':
        yawTarget -= step;
        break;
      case 'ArrowUp':
        pitchTarget = MathUtils.clamp(pitchTarget - step * 0.6, -PITCH_MAX, PITCH_MAX);
        break;
      case 'ArrowDown':
        pitchTarget = MathUtils.clamp(pitchTarget + step * 0.6, -PITCH_MAX, PITCH_MAX);
        break;
      default:
        return;
    }
    e.preventDefault();
    tween = null;
    invalidate();
  };
  root.addEventListener('keydown', onKey);

  // a focused pin turns the globe to face it
  const lookAt = (lon: number, lat: number, ms = 900) => {
    const targetYaw = yawFor(lon);
    const targetPitch = MathUtils.clamp(pitchFor(lat), -PITCH_MAX, PITCH_MAX);
    // shortest way round
    let fromYaw = yawTarget;
    const twoPi = Math.PI * 2;
    fromYaw = fromYaw - twoPi * Math.round((fromYaw - targetYaw) / twoPi);
    yawVel = pitchVel = 0;
    if (ms <= 0) {
      yawTarget = targetYaw;
      pitchTarget = targetPitch;
      tween = null;
    } else {
      tween = { from: [fromYaw, pitchTarget], to: [targetYaw, targetPitch], t0: performance.now(), ms };
    }
    invalidate();
  };
  pinEls.forEach(({ button }, id) => {
    const stop = route.find((s) => s.id === id);
    if (!stop) return;
    button.addEventListener('focus', () => lookAt(stop.lon, stop.lat));
  });

  // ---------- hover on a country: the surface itself answers the pointer ----------
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let hovered: string | null = null;
  const countryAt = (clientX: number, clientY: number): string | null => {
    const r = root.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(sphere, false)[0];
    if (!hit || !hit.uv) return null;
    return skin.idAt(hit.uv.x, hit.uv.y);
  };
  const setCountry = (id: string | null) => {
    if (id === hovered) return;
    if (hovered) pinEls.get(hovered)?.button.dispatchEvent(new Event('pointerleave'));
    hovered = id;
    root.style.cursor = id ? 'pointer' : '';
    if (id) pinEls.get(id)?.button.dispatchEvent(new Event('pointerenter'));
  };
  const hoverCountry = (x: number, y: number) => setCountry(dragging ? null : countryAt(x, y));

  // ---------- phone tilt, behind a tap (iOS asks permission) ----------
  const tiltButton = document.querySelector<HTMLButtonElement>('[data-tilt-toggle]');
  let tilting = false;
  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    hoverTarget.set(MathUtils.clamp(e.gamma / 45, -1, 1) * d2r(6), MathUtils.clamp((e.beta - 45) / 45, -1, 1) * d2r(6));
    invalidate();
  };
  if (tiltButton && coarse && 'DeviceOrientationEvent' in window) {
    tiltButton.hidden = false;
    tiltButton.addEventListener('click', async () => {
      if (tilting) {
        removeEventListener('deviceorientation', onOrientation);
        tilting = false;
        tiltButton.setAttribute('aria-pressed', 'false');
        hoverTarget.set(0, 0);
        invalidate();
        return;
      }
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      try {
        if (DOE.requestPermission && (await DOE.requestPermission()) !== 'granted') return;
      } catch {
        return;
      }
      addEventListener('deviceorientation', onOrientation);
      tilting = true;
      tiltButton.setAttribute('aria-pressed', 'true');
    });
  }

  // ---------- lifecycle: only draw while on screen and the tab is visible ----------
  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) {
        invalidate();
        armIdle();
      } else {
        idleSpin = false;
      }
    },
    { threshold: 0 }
  );
  io.observe(root);
  const onVisibility = () => {
    visible = !document.hidden;
    if (visible) invalidate();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---------- first frame: fade in over the drawing ----------
  renderer.render(scene, camera);
  placePins();
  canvas.style.opacity = '1';
  root.classList.add('is-live');
  invalidate();
  armIdle();

  return {
    lookAt,
    surface,
    radius,
    invalidate,
    allowIdle,
    point: (lon, lat, lift = 1) => toPoint(lon, lat, radius * lift),
    dispose() {
      cancelAnimationFrame(raf);
      clearInterval(sunTimer);
      clearTimeout(idleTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', endDrag);
      root.removeEventListener('pointercancel', endDrag);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('keydown', onKey);
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
      root.classList.remove('is-live');
    },
  };
}
