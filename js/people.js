// Pessoas circulando pelas ruas da cidade isométrica. Decorativo: não interfere no jogo.
// As ruas são as linhas pares da grade (ver city.js); cada pessoa anda de cruzamento em cruzamento.
import { CONFIG as C } from './config.js';
import { pr } from './city.js';

const SKIN = ['#f2c9a0', '#d9a273', '#a8744f', '#7a4b2d'];
const SHIRT = ['#e63946', '#2f6fed', '#ffb703', '#2e9e5b', '#8e44ad', '#ff7f50', '#14a3a3'];
const NS = 'http://www.w3.org/2000/svg';
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const isLowEnd = () => (navigator.hardwareConcurrency ?? 8) <= 2 || (navigator.deviceMemory ?? 8) <= 2;

class Crowd {
  #walkers = []; #raf = 0; #last = 0; #gap = 0; #slow = 0; #N = 0; #M = 0; #slots = new Map();

  /** Quantidade e posição atual (em quarteirões) das figuras — útil para testes. */
  get positions() { return this.#walkers.map((w) => ({ u: w.u, v: w.v, slot: w.slot })); }
  get count() { return this.#walkers.length; }

  mount(svg, wanted) {
    this.stop();
    if (!svg) return;
    const P = C.people, still = prefersReducedMotion();
    if (still && P.reducedMotion === 'off') return;
    this.#N = Number(svg.dataset.n); this.#M = Number(svg.dataset.m);
    svg.querySelectorAll('.pp').forEach((g) => this.#slots.set(Number(g.dataset.slot), g));
    const n = Math.min(P.max, Math.round(wanted * (isLowEnd() ? P.lowEndFactor : 1)));
    for (let k = 0; k < n; k++) this.#walkers.push(this.#spawn());
    svg.dataset.people = String(n);
    this.#walkers.forEach((w) => this.#place(w));
    if (still || !n) return; // movimento reduzido: figuras paradas
    this.#gap = 1000 / P.fps; this.#slow = 0; this.#last = 0;
    this.#raf = requestAnimationFrame((t) => this.#frame(t));
  }

  stop() {
    cancelAnimationFrame(this.#raf); this.#raf = 0;
    this.#walkers.forEach((w) => w.el.remove());
    this.#walkers = []; this.#slots.clear();
  }

  #neighbors([a, b]) {
    return [[a + 2, b], [a - 2, b], [a, b + 2], [a, b - 2]].filter(([x, y]) => x >= 0 && y >= 0 && x <= this.#N - 1 && y <= this.#M - 1);
  }

  #spawn() {
    const from = [2 * rnd((this.#N - 1) / 2 + 1), 2 * rnd((this.#M - 1) / 2 + 1)];
    const el = document.createElementNS(NS, 'g');
    el.innerHTML = `<ellipse cy="0" rx="2.6" ry="1" fill="rgba(0,0,0,.18)"/><g class="b"><path d="M-.9 -1.4V0M.9 -1.4V0" stroke="#34495e" stroke-width="1"/>` +
      `<rect x="-1.8" y="-6.4" width="3.6" height="5.2" rx="1.4" fill="${pick(SHIRT)}"/><circle cy="-8.6" r="1.9" fill="${pick(SKIN)}"/></g>`;
    const w = { el, body: el.querySelector('.b'), from, to: null, prev: null, t: Math.random(), lane: (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.12),
      speed: C.people.speed * (0.8 + Math.random() * 0.4), off: [0, 0], carry: [0, 0], phase: Math.random() * 6, u: 0, v: 0, slot: -1 };
    this.#turn(w);
    return w;
  }

  /** Escolhe o próximo cruzamento (sem voltar, salvo em beco) e ajusta a faixa de caminhada. */
  #turn(w) {
    const opts = this.#neighbors(w.from), ahead = opts.filter(([x, y]) => !w.prev || x !== w.prev[0] || y !== w.prev[1]);
    w.to = pick(ahead.length ? ahead : opts);
    const du = Math.sign(w.to[0] - w.from[0]), dv = Math.sign(w.to[1] - w.from[1]);
    const off = [-dv * w.lane, du * w.lane];
    w.carry = [w.off[0] - off[0], w.off[1] - off[1]]; // suaviza a curva nas esquinas
    w.off = off; w.du = du; w.dv = dv;
  }

  #place(w) {
    const k = Math.max(0, 1 - w.t / 0.25);
    w.u = w.from[0] + 0.5 + w.du * 2 * w.t + w.off[0] + w.carry[0] * k;
    w.v = w.from[1] + 0.5 + w.dv * 2 * w.t + w.off[1] + w.carry[1] * k;
    const [x, y] = pr(w.u, w.v);
    w.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    w.body.setAttribute('transform', `translate(0 ${(Math.sin(w.phase) * 0.5).toFixed(2)})`);
    // camada de profundidade: depois das construções que ficam atrás dele, antes das que ficam à frente
    const slot = Math.min(this.#N + this.#M, Math.max(0, 2 * Math.floor((w.u + w.v - 1) / 2)));
    if (slot !== w.slot) { w.slot = slot; this.#slots.get(slot)?.appendChild(w.el); }
  }

  #frame(now) {
    this.#raf = requestAnimationFrame((t) => this.#frame(t));
    if (this.#last && now - this.#last < this.#gap) return;
    const raw = this.#last ? now - this.#last : this.#gap;
    this.#last = now;
    const dt = Math.min(raw, 100) / 1000; // evita saltos ao voltar de outra aba
    // aparelho lento: poucos quadros -> reduz a quantidade de figuras e a taxa de quadros
    this.#slow = raw > 60 ? this.#slow + 1 : Math.max(0, this.#slow - 1);
    if (this.#slow > 30 && this.#walkers.length > 4) {
      this.#walkers.splice(Math.ceil(this.#walkers.length / 2)).forEach((w) => w.el.remove());
      this.#gap = 1000 / 15; this.#slow = 0;
    }
    for (const w of this.#walkers) {
      w.t += (w.speed * dt) / 2; w.phase += dt * 6;
      while (w.t >= 1) { w.t -= 1; w.prev = w.from; w.from = w.to; this.#turn(w); }
      this.#place(w);
    }
  }
}

export const crowd = new Crowd();
