import { normalize, extras, roundHalf } from './geometry.js';

export const COLORS = { madeira: '#d79a5b', tijolo: '#d9694f', concreto: '#a3adb9', vidro: '#5fb8dc' };
const K = { roof: '#b5533c', door: '#7a4a2b', glassL: '#e6f4fc', glassR: '#c3dcec', ground: '#7fc47a', wood: '#c9a36b', trim: '#f1e6d2', edge: 'rgba(0,0,0,.25)' };
// Constantes visuais (proporções em metros, relativas às dimensões do projeto)
const VIS = { platform: 1.9, platformH: 0.4, rail: 1, round: 16, floorH: 3, doorW: 1, doorH: 2.1 };

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// Projeção isométrica: x,y no chão (m), z altura (m)
const proj = (x, y, z, s, zs) => [(x - y) * 0.866 * s, (x + y) * 0.5 * s - z * zs];
const pts = (a) => a.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
const poly = (a, fill, stroke = K.edge) => `<polygon points="${pts(a)}" fill="${fill}" stroke="${stroke}"/>`;
const ring = (n, r) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const orient = (a) => (a.reduce((s, q, i) => { const r = a[(i + 1) % a.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) > 0 ? 1 : -1);
const centroid = (a) => [a.reduce((s, q) => s + q[0], 0) / a.length, a.reduce((s, q) => s + q[1], 0) / a.length];
const scalePts = (a, k) => { const [cx, cy] = centroid(a); return a.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]); };

/** Polígono da base conforme o formato (coordenadas em metros). */
export function basePoints(p) {
  const { comprimento: c, largura: l } = p;
  if (p.shape === 'triangulo') return [[0, 0], [c, 0], [0, l]];
  if (p.shape === 'trapezio') return [[0, 0], [c, 0], [(c + p.baseMenor) / 2, l], [(c - p.baseMenor) / 2, l]];
  if (p.shape === 'circulo') return ring(20, p.raio);
  if (p.shape === 'cilindro' || p.shape === 'cone') return ring(VIS.round, p.raio);
  if (p.shape === 'prisma') return [[0, 0], [0, l], [c / 2, l / 2]]; // base l, altura c/2
  return [[0, 0], [c, 0], [c, l], [0, l]];
}

const torreCap = (p) => (p.type === 'torre' && p.shape === 'cilindro' ? Math.max(1.5, roundHalf(p.raio * 1.6)) : 0);

/** Tamanho aproximado da construção: `extent` (m, maior lado da base) e `height` (m). Usado para escalar. */
export function sceneInfo(project) {
  const p = normalize(project);
  const b = basePoints(p);
  const xs = b.map((q) => q[0]), ys = b.map((q) => q[1]);
  let extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  let height;
  if (p.type === 'praca') height = 3.5; // árvores
  else if (p.type === 'mirante') { extent *= VIS.platform; height = p.altura + VIS.platformH + VIS.rail; }
  else if (p.type === 'igreja') { const e = extras(p).campanario; height = e.topo + e.altura + 1; }
  else height = p.altura + p.telhado + torreCap(p);
  return { extent, height };
}

// ---------- Primitivas ----------
/** Prisma reto de base convexa: só as faces voltadas para o observador + topo. */
function extrude(P, base, z0, z1, col, top = true) {
  const sg = orient(base), stroke = base.length > 8 ? 'none' : K.edge;
  let g = '';
  base.forEach((a, i) => {
    const b = base[(i + 1) % base.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = (sg * dy) / L, ny = (-sg * dx) / L;
    if (nx + ny <= 1e-9) return; // face de trás
    g += poly([P(a[0], a[1], z0), P(b[0], b[1], z0), P(b[0], b[1], z1), P(a[0], a[1], z1)], shade(col, 0.73 + 0.09 * (ny - nx)), stroke);
  });
  return top ? g + poly(base.map(([x, y]) => P(x, y, z1)), shade(col, 1.08), 'rgba(0,0,0,.3)') : g;
}

/** Cone/pirâmide: base convexa em z0 e vértice `apex`. Só as faces visíveis. */
function apexSolid(ctx, base, apex, z0, col) {
  const { P, t } = ctx, sg = orient(base), wz = apex[2] - z0;
  let g = '';
  base.forEach((a, i) => {
    const b = base[(i + 1) % base.length];
    const ux = b[0] - a[0], uy = b[1] - a[1], wx = apex[0] - a[0], wy = apex[1] - a[1];
    const n = [sg * uy * wz, -sg * ux * wz, sg * (ux * wy - uy * wx)];
    if (n[0] + n[1] + t * n[2] <= 1e-9) return;
    const L = Math.hypot(n[0], n[1]) || 1;
    g += poly([P(a[0], a[1], z0), P(b[0], b[1], z0), P(apex[0], apex[1], apex[2])], shade(col, 0.73 + 0.09 * ((n[1] - n[0]) / L)), base.length > 8 ? 'none' : K.edge);
  });
  return g;
}

const wall = (P, x0, y0, dx, dy) => (u, z) => P(x0 + dx * u, y0 + dy * u, z);
const rectPath = (W, [u0, u1, z0, z1]) => `M${[W(u0, z0), W(u1, z0), W(u1, z1), W(u0, z1)].map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z`;
const paint = (W, list, fill, stroke = 'rgba(0,0,0,.3)') => (list.length ? `<path d="${list.map((r) => rectPath(W, r)).join('')}" fill="${fill}" stroke="${stroke}" stroke-width=".6"/>` : '');
const centers = (n, w) => Array.from({ length: n }, (_, k) => ((k + 0.5) * w) / n);

/** Janelas/portas de uma fachada de largura w e altura h, proporcionais às dimensões. */
function facade(kind, w, h, door) {
  const glass = [], doors = [], bands = [], mid = w / 2;
  const dw = Math.min(['escola', 'supermercado'].includes(kind) ? VIS.doorW * 1.8 : VIS.doorW, w * 0.3);
  const dh = Math.min(kind === 'casa' ? 2 : VIS.doorH, h * 0.78);
  if (door) doors.push([mid - dw / 2, mid + dw / 2, 0, dh]);
  const clear = (u0, u1, z0) => !(door && z0 < dh + 0.2 && u1 > mid - dw / 2 - 0.3 && u0 < mid + dw / 2 + 0.3);
  const add = (u0, u1, z0, z1) => { if (u0 >= 0.05 && u1 <= w - 0.05 && z1 <= h - 0.15 && clear(u0, u1, z0)) glass.push([u0, u1, z0, z1]); };
  if (kind === 'casa' || kind === 'padariaLado' || kind === 'lojaLado') {
    const n = Math.max(1, Math.floor(w / 3)), ww = Math.min(1, (w / n) * 0.5), z0 = h * 0.35;
    centers(n, w).forEach((u) => add(u - ww / 2, u + ww / 2, z0, Math.min(h - 0.3, z0 + Math.min(1.1, h * 0.4))));
  } else if (kind === 'predio' || kind === 'escola') {
    const fh = kind === 'escola' ? 3.5 : VIS.floorH, rows = Math.max(1, Math.floor(h / fh));
    const n = Math.max(1, Math.floor(w / 2.5)), ww = Math.min(1.1, (w / n) * 0.5);
    for (let r = 0; r < rows; r++) centers(n, w).forEach((u) => add(u - ww / 2, u + ww / 2, r * fh + fh * 0.3, r * fh + fh * 0.75));
    if (kind === 'escola') bands.push([0, w, h - 0.4, h]);
  } else if (kind === 'biblioteca') {
    const n = Math.max(2, Math.floor(w / 3.5)), ww = Math.min(1.2, (w / n) * 0.45);
    centers(n, w).forEach((u) => add(u - ww / 2, u + ww / 2, h * 0.3, h * 0.78));
  } else if (kind === 'loja' || kind === 'padaria' || kind === 'supermercado') { // vitrines
    const z0 = h * (kind === 'padaria' ? 0.22 : 0.18), z1 = h * (kind === 'supermercado' ? 0.6 : 0.62);
    const a = mid - dw / 2 - 0.3, b = mid + dw / 2 + 0.3;
    if (a - w * 0.08 > 0.8) { glass.push([w * 0.08, a, z0, z1]); glass.push([b, w - w * 0.08, z0, z1]); }
    if (kind === 'supermercado') bands.push([0, w, h * 0.78, h * 0.94]);
  } else if (kind === 'igreja') {
    const n = Math.max(2, Math.floor(w / 4)), ww = 0.9;
    centers(n, w).forEach((u) => add(u - ww / 2, u + ww / 2, h * 0.3, h * 0.8));
  }
  return { glass, doors, bands };
}

// ---------- Construções ----------
function rectBuilding(ctx, kind, col) {
  const { p, P, s } = ctx, { comprimento: c, largura: l, altura: h } = p, hr = p.telhado;
  const base = [[0, 0], [c, 0], [c, l], [0, l]];
  let g = extrude(P, base, 0, h, col, hr === 0);
  const WL = wall(P, 0, l, 1, 0), WR = wall(P, c, 0, 0, 1); // WL: face y=l (largura c) · WR: face x=c (largura l)
  const side = kind === 'padaria' ? 'padariaLado' : ['loja', 'supermercado'].includes(kind) ? 'lojaLado' : kind;
  const fl = facade(kind, c, h, kind !== 'igreja');
  const fr = kind === 'igreja' ? { glass: [], doors: [], bands: [] } : facade(side, l, h, false);
  const bandCol = kind === 'supermercado' ? '#d64545' : shade(col, 0.62);
  g += paint(WL, fl.bands, bandCol) + paint(WR, fr.bands, bandCol);
  if (kind === 'biblioteca') { // pilastras e frontão
    const mid = c / 2, pil = [-2.6, -1.4, 1.4, 2.6].map((d) => [mid + d - 0.2, mid + d + 0.2, 0, h - 0.1]).filter((r) => r[0] > 0.2 && r[1] < c - 0.2);
    g += paint(WL, pil, K.trim);
    const ph = Math.min(1.6, h * 0.3), u0 = Math.max(0.2, mid - 3.2), u1 = Math.min(c - 0.2, mid + 3.2);
    g += poly([WL(u0, h), WL(u1, h), WL(mid, h + ph)], shade(col, 1.12));
  }
  g += paint(WL, fl.glass, K.glassL) + paint(WR, fr.glass, K.glassR);
  g += paint(WL, fl.doors, K.door);
  if (hr > 0) { // telhado de duas águas, cumeeira ao longo do comprimento
    const z = h + hr;
    g += poly([P(0, 0, h), P(c, 0, h), P(c, l / 2, z), P(0, l / 2, z)], shade(K.roof, 0.7));
    g += poly([P(0, l, h), P(c, l, h), P(c, l / 2, z), P(0, l / 2, z)], shade(K.roof, 1.0));
    g += poly([P(c, 0, h), P(c, l, h), P(c, l / 2, z)], shade(col, 0.64));
  }
  if (kind === 'loja' || kind === 'padaria') { // toldo listrado sobre a vitrine
    const zt = Math.min(h - 0.3, Math.min(VIS.doorH, h * 0.78) + 0.45), n = Math.max(3, Math.floor(c / 1.2)), a = [kind === 'loja' ? '#d64545' : '#9c5a2b', '#fff4dc'];
    for (let i = 0; i < n; i++) {
      const u0 = (i * c) / n, u1 = ((i + 1) * c) / n;
      g += poly([P(u0, l, zt), P(u1, l, zt), P(u1, l + 0.7, zt - 0.4), P(u0, l + 0.7, zt - 0.4)], a[i % 2], 'rgba(0,0,0,.2)');
    }
  }
  if (kind === 'padaria') g += extrude(P, [[c * 0.15, l * 0.2], [c * 0.15 + Math.min(0.9, c * 0.12), l * 0.2], [c * 0.15 + Math.min(0.9, c * 0.12), l * 0.2 + Math.min(0.9, c * 0.12)], [c * 0.15, l * 0.2 + Math.min(0.9, c * 0.12)]], h, h + 1.3, '#a0522d');
  if (kind === 'escola') { // mastro com bandeira
    const x = c * 0.5, y = l * 0.5, top = Math.min(2.6, h * 0.7 + 1);
    g += `<line x1="${P(x, y, h)[0].toFixed(1)}" y1="${P(x, y, h)[1].toFixed(1)}" x2="${P(x, y, h + top)[0].toFixed(1)}" y2="${P(x, y, h + top)[1].toFixed(1)}" stroke="#555" stroke-width="${Math.max(0.8, s * 0.08).toFixed(1)}"/>`;
    g += poly([P(x, y, h + top), P(x, y + 0.9, h + top), P(x, y + 0.9, h + top - 0.6), P(x, y, h + top - 0.6)], '#e63946', 'none');
  }
  if (kind === 'igreja') g += churchTower(ctx, col, WR);
  return g;
}

function churchTower(ctx, col, WR) {
  const { p, P, s } = ctx, { comprimento: c, largura: l, altura: h, telhado: hr } = p;
  const e = extras(p).campanario, w = e.lado, y0 = l / 2 - w / 2, y1 = l / 2 + w / 2;
  const zr = h + hr * (1 - w / l); // altura do telhado junto à torre
  const Wy = wall(P, c - w, y1, 1, 0); // face voltada para +y (largura w)
  const Wx = wall(P, c, y0, 0, 1);     // face frontal x=c
  let g = poly([Wx(0, 0), Wx(w, 0), Wx(w, e.topo), Wx(0, e.topo)], shade(col, 0.64));
  g += poly([Wy(0, zr), Wy(w, zr), Wy(w, e.topo), Wy(0, e.topo)], shade(col, 0.82));
  const dw = Math.min(1.4, w * 0.55), dh = Math.min(2.4, h * 0.7);
  g += paint(Wx, [[(w - dw) / 2, (w + dw) / 2, 0, dh]], K.door);
  g += paint(Wx, [[w / 2 - 0.3, w / 2 + 0.3, e.topo - 1.7, e.topo - 0.5]], '#3b3b3b', 'none');
  g += paint(Wy, [[w / 2 - 0.3, w / 2 + 0.3, e.topo - 1.7, e.topo - 0.5]], '#3b3b3b', 'none');
  const side = [(y0) / 2, (y1 + l) / 2].filter(() => l > 9); // janelas ao lado da torre na fachada
  g += paint(WR, side.map((u) => [u - 0.45, u + 0.45, h * 0.3, h * 0.75]), K.glassR);
  const apex = [c - w / 2, l / 2, e.topo + e.altura];
  g += apexSolid(ctx, [[c - w, y0], [c, y0], [c, y1], [c - w, y1]], apex, e.topo, K.roof);
  const [ax, ay] = P(apex[0], apex[1], apex[2]), ch = Math.min(1, e.altura * 0.25), [bx, by] = P(apex[0], apex[1], apex[2] + ch);
  const arm = Math.max(1, s * 0.22), cy = by + (ay - by) * 0.35;
  g += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}M${(bx - arm).toFixed(1)} ${cy.toFixed(1)}L${(bx + arm).toFixed(1)} ${cy.toFixed(1)}" stroke="#fff" stroke-width="${Math.max(0.9, s * 0.1).toFixed(1)}" stroke-linecap="round"/>`;
  return g;
}

/** Janelinhas estreitas nas faces visíveis de torres (cilindro/prisma). */
function slits(P, base, h) {
  const sg = orient(base), levels = Math.min(5, Math.max(1, Math.floor(h / 6)));
  let d = '';
  base.forEach((a, i) => {
    const b = base[(i + 1) % base.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    if ((sg * dy) / L - (sg * dx) / L <= 0.2 || i % 2) return;
    for (let k = 0; k < levels; k++) {
      const z0 = ((k + 0.5) * h) / (levels + 0.3), z1 = z0 + Math.min(1.2, h * 0.07 + 0.4);
      const q = [[0.42, z0], [0.58, z0], [0.58, z1], [0.42, z1]].map(([u, z]) => P(a[0] + dx * u, a[1] + dy * u, z));
      d += `M${q.map((r) => `${r[0].toFixed(1)} ${r[1].toFixed(1)}`).join('L')}Z`;
    }
  });
  return d ? `<path d="${d}" fill="#2d3b4a"/>` : '';
}

function mirante(ctx, col) {
  const { p, P } = ctx, h = p.altura, b = basePoints(p), pb = scalePts(b, VIS.platform);
  let g = extrude(P, b, 0, h, col, false);
  g += extrude(P, pb, h, h + VIS.platformH, K.wood, true);
  const rb = scalePts(b, VIS.platform * 0.94), sg = orient(rb), z0 = h + VIS.platformH;
  rb.forEach((a, i) => { // guarda-corpo de vidro nas bordas voltadas para o observador
    const q = rb[(i + 1) % rb.length], dx = q[0] - a[0], dy = q[1] - a[1], L = Math.hypot(dx, dy) || 1;
    if ((sg * dy - sg * dx) / L <= 1e-9) return;
    g += poly([P(a[0], a[1], z0), P(q[0], q[1], z0), P(q[0], q[1], z0 + VIS.rail), P(a[0], a[1], z0 + VIS.rail)], 'rgba(255,255,255,.28)', '#ffffff');
  });
  return g;
}

function torre(ctx, col) {
  const { p, P } = ctx, h = p.altura, b = basePoints(p);
  if (p.shape === 'cone') return apexSolid(ctx, b, [0, 0, h], 0, col);
  if (p.shape === 'piramide') return apexSolid(ctx, b, [p.comprimento / 2, p.largura / 2, h], 0, col);
  const cap = torreCap(p);
  let g = extrude(P, b, 0, h, col, cap === 0);
  g += `<g>${slits(P, b, h)}</g>`;
  if (cap) g += apexSolid(ctx, scalePts(b, 1.15), [0, 0, h + cap], h, K.roof);
  return g;
}

function plaza(ctx) {
  const { p, P, s } = ctx, h = 0.5, { comprimento: c, largura: l } = p;
  let g = extrude(P, basePoints(p), 0, h, K.ground, true);
  if (p.shape === 'circulo') g += poly(ring(14, p.raio * 0.3).map(([x, y]) => P(x, y, h + 0.02)), '#6ec6e8', 'rgba(0,0,0,.2)');
  g += [[0.2, 0.2], [0.4, 0.2], [0.2, 0.4]].map(([a, b]) => { // árvores decorativas
    const [tx, ty] = P(c * a, l * b, h);
    return `<rect x="${tx - s * 0.15}" y="${ty - s * 1.2}" width="${s * 0.3}" height="${s * 1.2}" fill="#8a5a33"/><circle cx="${tx}" cy="${ty - s * 1.6}" r="${s * 0.9}" fill="#3f9d4f"/>`;
  }).join('');
  return g;
}

/** Desenha a construção; (ox,oy) = centro da base na tela, s = px por metro, zs = px por metro de altura. */
export function drawBuilding(project, ox, oy, s, zs = s) {
  const p = normalize(project);
  const b = basePoints(p);
  const [cx, cy] = centroid(b);
  const P = (x, y, z) => proj(x - cx, y - cy, z, s, zs).map((v, i) => v + (i ? oy : ox));
  const ctx = { p, P, s, zs, t: s / zs };
  const col = COLORS[p.material] ?? COLORS.tijolo;
  let g;
  if (p.type === 'praca') g = plaza(ctx);
  else if (p.type === 'mirante') g = mirante(ctx, col);
  else if (p.type === 'torre') g = torre(ctx, col);
  else if (p.shape === 'prisma') g = extrude(P, b, 0, p.altura, col);
  else g = rectBuilding(ctx, p.type, col); // casa, prédio, loja, padaria, supermercado, escola, biblioteca, igreja
  return `<g>${g}</g>`;
}
