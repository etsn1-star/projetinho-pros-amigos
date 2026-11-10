import { CONFIG } from './config.js';

// Interface de armazenamento. Para usar Supabase no futuro, crie outro adaptador
// com os mesmos métodos assíncronos e troque a exportação `storage` no final.
class LocalStorageAdapter {
  async #read() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) ?? {}; }
    catch { return {}; } // JSON corrompido ou storage indisponível
  }
  async #write(data) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); return true; }
    catch { return false; }
  }
  async loadBuildings() { return (await this.#read()).buildings ?? []; }
  async addBuilding(b) {
    const d = await this.#read();
    d.buildings = [...(d.buildings ?? []), b];
    return this.#write(d);
  }
  async clearBuildings() { const d = await this.#read(); d.buildings = []; return this.#write(d); }
  // Sessão (prazo absoluto) — evita estender o tempo atualizando a página.
  async loadSession() { return (await this.#read()).session ?? null; }
  async saveSession(s) { const d = await this.#read(); d.session = s; return this.#write(d); }
  async clearSession() { const d = await this.#read(); delete d.session; return this.#write(d); }
}

export const storage = new LocalStorageAdapter();
