import { CONFIG } from './config.js';

/**
 * Cronômetro baseado em prazo absoluto (Date.now), não em contagem de ticks:
 * continua correto em segundo plano e após atualizar a página, se o prazo
 * estiver salvo na sessão (ver storage.saveSession).
 */
export class CountdownTimer {
  #deadline = 0; #handle = null; #warned = false;
  constructor({ onTick, onWarn, onEnd }) { Object.assign(this, { onTick, onWarn, onEnd }); }

  start(seconds = CONFIG.timeSeconds, deadline = Date.now() + seconds * 1000) {
    this.stop();
    this.#deadline = deadline;
    this.#warned = false;
    this.#handle = setInterval(() => this.#tick(), 250);
    this.#tick();
    return deadline; // salve em storage para sobreviver a F5
  }

  get remainingSeconds() { return Math.max(0, Math.ceil((this.#deadline - Date.now()) / 1000)); }

  stop() { clearInterval(this.#handle); this.#handle = null; }

  #tick() {
    const s = this.remainingSeconds;
    this.onTick?.(s);
    if (!this.#warned && s <= CONFIG.warnSeconds && s > 0) { this.#warned = true; this.onWarn?.(s); }
    if (s <= 0) { this.stop(); this.onEnd?.(); }
  }
}
