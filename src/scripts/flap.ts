/**
 * A split flap: two static halves and a flipper hinged across the middle
 * (markup and CSS: .flap in global.css). set() shows the next letter's top
 * half behind the flipper, turns the flipper down, and settles the bottom
 * half; flipTo() can step through the alphabet on the way, as a departure
 * board does; a clock flips straight to the next digit.
 */
const ORDER = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-·:';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Flap {
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
  /** flip toward ch; with steps > 1, through the alphabet on the way */
  flipTo(ch: string, steps = 1) {
    if (REDUCED) return this.show(ch);
    if (ch === this.current && !this.busy) return;
    const target = ORDER.indexOf(ch);
    const from = ORDER.indexOf(this.current);
    const path: string[] = [];
    if (steps <= 1 || target === -1 || from === -1) path.push(ch);
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

/** the markup for one flap showing ch on every face */
export const flapHtml = (ch: string) =>
  `<span class="flap" data-char="${ch}"><span class="flap-top">${ch}</span><span class="flap-bottom">${ch}</span><span class="flap-flip"><span class="flap-flip-front">${ch}</span><span class="flap-flip-back">${ch}</span></span></span>`;
