/**
 * The projects row. The base is a native horizontal scroll row with snapping
 * (touch, trackpad, keyboard all work). On wide screens with motion allowed,
 * and only when the row is shorter than three screens, the row is held on a
 * sticky stage and moved sideways by the page's vertical scroll, one pixel
 * for one pixel, ending the moment the last item reaches the margin.
 * (taste-skill's "sideways gallery" recipe.)
 */
export function initGallery() {
  const root = document.querySelector<HTMLElement>('.gallery');
  const track = root?.querySelector<HTMLElement>('.gallery-track');
  if (!root || !track) return;
  const wide = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
  let dx = 0;
  let queued = false;

  const place = () => {
    queued = false;
    if (!root.classList.contains('is-pinned')) return;
    const p = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / dx));
    track.style.transform = `translate3d(${(-p * dx).toFixed(1)}px, 0, 0)`;
  };
  const measure = () => {
    // held only where the whole row fits under the heading; short windows keep the drag row
    const could = wide.matches && innerHeight >= 820;
    if (!could) {
      root.classList.remove('is-pinned');
      root.style.height = '';
      track.style.transform = '';
      return;
    }
    root.classList.add('is-pinned'); // measure the row as it would be when pinned
    track.style.transform = '';
    dx = track.scrollWidth - track.clientWidth;
    const pin = dx > 0 && dx < innerHeight * 3;
    root.classList.toggle('is-pinned', pin);
    root.style.height = pin ? `${innerHeight + dx}px` : ''; // one pixel of scroll moves the row one pixel
    if (!pin) track.style.transform = '';
    place();
    dispatchEvent(new Event('gallery:measured'));
  };

  // keyboard: bring the focused item into view, whichever mode the row is in
  track.addEventListener('focusin', (e) => {
    if (!root.classList.contains('is-pinned')) return;
    const item = (e.target as HTMLElement).closest<HTMLElement>('.gallery-item');
    if (!item) return;
    const x = Math.min(dx, Math.max(0, item.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)));
    scrollTo({ top: root.getBoundingClientRect().top + scrollY + x, behavior: 'instant' });
  });
  addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(place);
      }
    },
    { passive: true }
  );
  addEventListener('resize', measure);
  addEventListener('load', measure);
  wide.addEventListener('change', measure);
  document.fonts.ready.then(measure);
  measure();
}
