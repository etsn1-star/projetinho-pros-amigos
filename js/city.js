import { drawBuilding, sceneInfo } from './buildings.js';

const T = 64;      // tamanho do bloco
const COLS = 5;    // lotes por fileira
const MAX_H = 130; // altura máxima (px) de uma construção, para torres altas não saírem do mapa
export const pr = (i, j) => [(i - j) * T * 0.866, (i + j) * T * 0.5];

// Lotes ficam em coordenadas ímpares; linhas/colunas pares são ruas -> sem sobreposição.
export const lotOf = (k) => ({ i: 2 * (k % COLS) + 1, j: 2 * Math.floor(k / COLS) + 1 });

/**
 * Desenha a cidade. Cada profundidade (i+j) dos lotes tem um grupo de construções seguido de um
 * grupo vazio `.pp[data-slot]`: é ali que people.js encaixa os pedestres, para que fiquem
 * atrás das construções que estão na frente deles (e nunca "por cima" de um prédio).
 */
export function renderCity(buildings) {
  const rows = Math.max(2, Math.ceil((buildings.length + 1) / COLS));
  const N = 2 * COLS + 1, M = 2 * rows + 1;
  const tiles = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) tiles.push([i, j]);
  tiles.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));

  let svg = tiles.map(([i, j]) => {
    const road = i % 2 === 0 || j % 2 === 0;
    const pts = [pr(i, j), pr(i + 1, j), pr(i + 1, j + 1), pr(i, j + 1)].map((q) => q.join(',')).join(' ');
    return `<polygon points="${pts}" fill="${road ? '#8b95a3' : '#a9de9b'}" stroke="${road ? '#7a8492' : '#93c985'}"/>`;
  }).join('');

  const items = [];
  for (let k = 0; k < COLS * rows; k++) { // lotes vazios = áreas verdes
    const { i, j } = lotOf(k);
    const [x, y] = pr(i + 0.5, j + 0.5);
    if (buildings[k]) {
      const p = buildings[k].project;
      const info = sceneInfo(p);
      const s = Math.min((T * 0.8) / info.extent, MAX_H / (info.height * 0.6));
      items.push({ d: i + j, svg: drawBuilding(p, x, y, s, s * 0.6) });
    } else {
      items.push({ d: i + j, svg: `<rect x="${x - 2}" y="${y - 14}" width="4" height="14" fill="#8a5a33"/><circle cx="${x}" cy="${y - 20}" r="11" fill="#3f9d4f"/>` });
    }
  }
  const byDepth = new Map();
  for (const o of items) byDepth.set(o.d, [...(byDepth.get(o.d) ?? []), o.svg]);
  for (let d = 0; d <= N + M; d += 2) svg += `<g>${(byDepth.get(d) ?? []).join('')}</g><g class="pp" data-slot="${d}"></g>`;

  const w = (N + M) * T * 0.866, h = (N + M) * T * 0.5;
  return `<svg viewBox="${-M * T * 0.866 - 10} -140 ${w + 20} ${h + 150}" data-n="${N}" data-m="${M}" role="img" aria-label="Mapa da cidade">${svg}</svg>`;
}
