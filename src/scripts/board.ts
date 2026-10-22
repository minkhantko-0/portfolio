/**
 * The departures board (Departures.astro). Each cell is a split flap: two
 * static halves and a flipper hinged across the middle. set(next) shows the
 * next letter's top half behind the flipper, turns the flipper down, and
 * settles the bottom half; flipTo() steps through the alphabet on the way.
 * On arrival the board flips in from blank, column by column. A row is
 * chosen by hover, focus or press: its STATUS flips to BOARDING and its
 * sentence reads below. Left alone, the board walks to the next row itself.
 */
const ORDER = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-·:';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

class Flap {
  private top: HTMLElement;
  private bottom: HTMLElement;
  private front: HTMLElement;
  private back: HTMLElement;
  current: string;
  private queue: string[] = [];
  private busy = false;
  constructor(public el: HTMLElement) {
    this.top = el.querySelector('.flap-top')!;
    this.bottom = el.querySelector('.flap-bottom')!;
    this.front = el.querySelector('.flap-flip-front')!;
    this.back = el.querySelector('.flap-flip-back')!;
    this.current = el.dataset.char ?? ' ';
    el.querySelector('.flap-flip')!.addEventListener('animationend', () => this.settle());
  }
  /** no animation: every face shows ch */
  show(ch: string) {
    this.queue = [];
    this.current = ch;
    for (const f of [this.top, this.bottom, this.front, this.back]) f.textContent = ch;
    this.el.classList.remove('is-flipping');
    this.busy = false;
  }
  /** one turn to ch */
  private turn(ch: string) {
    this.busy = true;
    this.top.textContent = ch;
    this.back.textContent = ch;
    this.front.textContent = this.current;
    this.bottom.textContent = this.current;
    this.current = ch;
    this.el.classList.add('is-flipping');
  }
  private settle() {
    this.el.classList.remove('is-flipping');
    this.bottom.textContent = this.current;
    this.front.textContent = this.current;
    this.busy = false;
    const next = this.queue.shift();
    if (next === undefined) return;
    void this.el.offsetWidth; // the class comes straight back: a reflow so the turn restarts
    this.turn(next);
  }
  /** flip through the alphabet toward ch, at most `steps` turns */
  flipTo(ch: string, steps = 5) {
    if (REDUCED) return this.show(ch);
    if (ch === this.current && !this.busy) return;
    const target = ORDER.indexOf(ch);
    const from = ORDER.indexOf(this.current);
    const path: string[] = [];
    if (target === -1 || from === -1) path.push(ch);
    else {
      let d = (target - from + ORDER.length) % ORDER.length;
      if (d === 0) d = ORDER.length;
      const start = d > steps ? target - steps : from;
      for (let k = start + 1; k <= target; k++) path.push(ORDER[(k + ORDER.length) % ORDER.length]);
      if (!path.length) path.push(ch);
    }
    this.queue = path;
    if (!this.busy) this.turn(this.queue.shift()!);
  }
}

export function initBoard() {
  const root = document.querySelector<HTMLElement>('[data-board]');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = Array.from(root.querySelectorAll<HTMLButtonElement>('.board-row'));
  const flaps = new Map<HTMLElement, Flap>();
  root.querySelectorAll<HTMLElement>('.flap').forEach((el) => flaps.set(el, new Flap(el)));
  const statusOf = (row: HTMLElement) => Array.from(row.querySelectorAll<HTMLElement>('[data-col="status"] .flap')).map((el) => flaps.get(el)!);
  const detailFlight = root.querySelector<HTMLElement>('[data-detail-flight]');
  const detailText = root.querySelector<HTMLElement>('[data-detail-text]');
  const detailNote = root.querySelector<HTMLElement>('[data-detail-note]');
  const gate = root.querySelector<HTMLAnchorElement>('[data-detail-gate]');
  const gateLabel = root.querySelector<HTMLElement>('[data-detail-gate-label]');
  const detail = root.querySelector<HTMLElement>('.board-detail');

  // the words for each row live on the row itself (aria-label) and the first
  // detail; keep a copy per row for the swap
  const words = rows.map((r) => {
    const label = r.getAttribute('aria-label') || '';
    const flight = Array.from(r.querySelectorAll<HTMLElement>('[data-col="flight"] .flap'))
      .map((f) => f.dataset.char || ' ')
      .join('')
      .trim();
    return { text: label.slice(label.indexOf(':') + 2), flight };
  });
  const notes = Array.from(root.querySelectorAll<HTMLElement>('.board-fallback .hand')).map((n) => n.textContent || '');
  const labels = new Map<string, string>();
  document.querySelectorAll<HTMLElement>('.bld[data-bld]').forEach((b) => labels.set(b.dataset.bld!, b.querySelector('.bld-tag')?.textContent || ''));

  const pad = (s: string, n: number) => s.toUpperCase().padEnd(n).slice(0, n);
  const setStatus = (row: HTMLElement, text: string, animate: boolean) => {
    const cells = statusOf(row);
    const chars = pad(text, cells.length);
    cells.forEach((f, i) => (animate ? f.flipTo(chars[i], 4) : f.show(chars[i])));
  };

  let chosen = -1;
  const choose = (i: number, animate = !reduced) => {
    if (i === chosen) return;
    if (chosen >= 0) {
      const prev = rows[chosen];
      prev.classList.remove('is-chosen');
      prev.setAttribute('aria-pressed', 'false');
      setStatus(prev, prev.dataset.status || '', animate);
    }
    chosen = i;
    const row = rows[i];
    row.classList.add('is-chosen');
    row.setAttribute('aria-pressed', 'true');
    setStatus(row, 'BOARDING', animate);
    if (detailText) detailText.textContent = words[i].text;
    if (detailFlight) detailFlight.textContent = words[i].flight;
    if (detailNote) detailNote.textContent = notes[i] || '';
    const project = row.dataset.project;
    if (gate) {
      gate.hidden = !project;
      gate.dataset.project = project || '';
      if (gateLabel) gateLabel.textContent = project ? labels.get(project) || '' : '';
    }
    if (detail && animate) {
      detail.classList.remove('is-swapping');
      void detail.offsetWidth;
      detail.classList.add('is-swapping');
    }
  };

  // ---------- rows: hover, focus or press chooses; the gate boards you ----------
  let hovering = false;
  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', () => {
      hovering = true;
      choose(i);
    });
    row.addEventListener('pointerleave', () => (hovering = false));
    row.addEventListener('focus', () => choose(i));
    row.addEventListener('click', () => choose(i));
  });
  gate?.addEventListener('click', () => {
    const key = gate.dataset.project;
    if (key) dispatchEvent(new CustomEvent('town:select', { detail: key }));
  });

  // ---------- the clock: Bangkok's minutes flip over as they pass ----------
  // (the clock sits beside the statement, outside the board element)
  const clock = document.querySelector<HTMLElement>('[data-board-clock]');
  const clockCells = clock ? Array.from(clock.querySelectorAll<HTMLElement>('.flap')).map((el) => new Flap(el)) : [];
  const clockSr = clock?.querySelector<HTMLElement>('[data-board-clock-sr]');
  const clockVs = clock?.querySelector<HTMLElement>('[data-board-clock-vs]');
  const timeIn = (zone?: string) =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone }).format(new Date());
  const tickClock = (animate: boolean) => {
    if (!clockCells.length) return;
    const t = timeIn('Asia/Bangkok');
    clockCells.forEach((f, i) => (animate ? f.flipTo(t[i], 3) : f.show(t[i])));
    if (clockSr) clockSr.textContent = `${t} in Bangkok. `;
    if (clockVs) {
      const here = timeIn();
      clockVs.textContent = here === t ? '' : ` · ${here} where you are`;
    }
  };
  if (clock) {
    tickClock(false);
    setInterval(() => tickClock(true), 1000);
  }

  // ---------- arrival: flip in from blank, column by column ----------
  const all = Array.from(flaps.values());
  const arrive = () => {
    rows.forEach((row, r) => {
      const cells = Array.from(row.querySelectorAll<HTMLElement>('.flap'));
      cells.forEach((el, c) => {
        const f = flaps.get(el)!;
        const target = el.dataset.char ?? ' ';
        setTimeout(() => f.flipTo(target, 3 + ((r + c) % 3)), 80 * r + 22 * c);
      });
    });
    setTimeout(() => choose(0), 80 * rows.length + 22 * 60);
  };
  const belowFold = root.getBoundingClientRect().top > innerHeight;
  if (reduced || !('IntersectionObserver' in window)) {
    choose(0, false);
  } else if (!belowFold) {
    // already in view (a reload here): no theatre, just the chosen row
    choose(0, false);
  } else {
    all.forEach((f) => f.show(' '));
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        arrive();
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  }

  // ---------- left alone, the board walks on ----------
  if (!reduced && 'IntersectionObserver' in window) {
    let onScreen = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      if (!onScreen || hovering || document.hidden || chosen < 0) return;
      if (root.contains(document.activeElement)) return;
      choose((chosen + 1) % rows.length);
    };
    new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        clearInterval(timer);
        if (onScreen) timer = setInterval(tick, 7000);
      },
      { threshold: 0.3 }
    ).observe(root);
  }
}
