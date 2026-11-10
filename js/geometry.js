// Fórmulas puras, formas disponíveis, desafios e validação de respostas.
import { CONFIG } from './config.js';

// ---------- Fórmulas básicas (as antigas foram mantidas) ----------
export const rectArea = (b, h) => b * h;
export const rectPerimeter = (b, h) => 2 * (b + h);
export const squareArea = (l) => l ** 2;
export const squarePerimeter = (l) => 4 * l;
export const triangleArea = (b, h) => (b * h) / 2;
export const boxVolume = (c, l, h) => c * l * h;
export const cubeVolume = (a) => a ** 3;
export const prismVolume = (baseArea, c) => baseArea * c;
// ---------- Novas ----------
export const trapezoidArea = (B, b, h) => ((B + b) * h) / 2;
export const circleArea = (r) => CONFIG.pi * r ** 2;
export const circumference = (r) => 2 * CONFIG.pi * r;
export const cylinderVolume = (r, h) => circleArea(r) * h;
export const coneVolume = (r, h) => (circleArea(r) * h) / 3;
export const pyramidVolume = (baseArea, h) => (baseArea * h) / 3;

const r2 = (n) => Math.round(n * 100) / 100;
export const roundHalf = (n) => Math.round(n * 2) / 2;
const fmt = (n) => String(r2(n)).replace('.', ',');

// ---------- Formas ----------
// dims = dimensões pedidas ao participante: [chave, rótulo]. `solido` = espacial.
export const DIM_KEYS = ['comprimento', 'largura', 'altura', 'telhado', 'raio', 'baseMenor'];
export const SHAPES = {
  paralelepipedo: { nome: 'Paralelepípedo', solido: true, dims: [['comprimento', 'Comprimento'], ['largura', 'Largura'], ['altura', 'Altura']] },
  cubo:      { nome: 'Cubo', solido: true, dims: [['comprimento', 'Aresta']] },
  prisma:    { nome: 'Prisma triangular', solido: true, dims: [['comprimento', 'Comprimento'], ['largura', 'Largura (base do triângulo)'], ['altura', 'Altura']] },
  cilindro:  { nome: 'Cilindro', solido: true, round: true, dims: [['raio', 'Raio da base'], ['altura', 'Altura']] },
  cone:      { nome: 'Cone', solido: true, round: true, dims: [['raio', 'Raio da base'], ['altura', 'Altura']] },
  piramide:  { nome: 'Pirâmide', solido: true, dims: [['comprimento', 'Comprimento da base'], ['largura', 'Largura da base'], ['altura', 'Altura']] },
  retangulo: { nome: 'Retângulo', dims: [['comprimento', 'Comprimento'], ['largura', 'Largura']] },
  quadrado:  { nome: 'Quadrado', dims: [['comprimento', 'Lado']] },
  triangulo: { nome: 'Triângulo', dims: [['comprimento', 'Base'], ['largura', 'Altura do triângulo']] },
  trapezio:  { nome: 'Trapézio', dims: [['comprimento', 'Base maior'], ['baseMenor', 'Base menor'], ['largura', 'Altura do trapézio']] },
  circulo:   { nome: 'Círculo', round: true, dims: [['raio', 'Raio']] },
};

/** Só casas e igrejas (corpo retangular) têm telhado de duas águas. */
export const hasRoof = (type, shape) =>
  Boolean(CONFIG.limits[type]?.telhado) && ['paralelepipedo', 'cubo'].includes(shape);

/** Dimensões que aparecem na tela para o projeto: [[chave, rótulo], ...] */
export function visibleDims(p) {
  const d = [...SHAPES[p.shape].dims];
  if (hasRoof(p.type, p.shape)) d.push(['telhado', 'Altura do telhado']);
  return d;
}

/**
 * Normaliza dimensões conforme o formato (cubo e quadrado têm um só lado; figuras
 * redondas usam o raio e ocupam um diâmetro). project = { type, shape, comprimento, largura, altura, ... }
 */
export function normalize(p) {
  const q = { ...p };
  if (q.shape === 'cubo') q.largura = q.altura = q.comprimento;
  if (q.shape === 'quadrado') q.largura = q.comprimento;
  if (SHAPES[q.shape]?.round) q.comprimento = q.largura = 2 * q.raio;
  if (q.shape === 'trapezio') q.baseMenor = Math.min(q.baseMenor ?? q.comprimento, q.comprimento);
  // casas antigas (salvas sem telhado) ganham um telhado proporcional à largura
  q.telhado = hasRoof(q.type, q.shape) ? (q.telhado ?? Math.max(1, roundHalf(q.largura * 0.25))) : 0;
  return q;
}

/** Elementos derivados da igreja: campanário (pirâmide de base quadrada) acima da fachada. */
export function extras(p) {
  if (p.type !== 'igreja') return null;
  const lado = Math.min(4, Math.max(2, roundHalf(p.largura * 0.3)));
  return { campanario: { lado, altura: roundHalf(lado * 1.5), topo: p.altura + p.telhado + 1 } };
}

// ---------- Medidas ----------
const SOLIDS = {
  paralelepipedo: ({ comprimento: c, largura: l, altura: h }) => {
    const baseArea = c * l, basePerimeter = 2 * (c + l), lateralArea = basePerimeter * h;
    return { baseArea, basePerimeter, lateralArea, totalArea: 2 * baseArea + lateralArea, volume: baseArea * h };
  },
  cubo: ({ comprimento: a }) => ({ baseArea: a ** 2, basePerimeter: 4 * a, lateralArea: 4 * a ** 2, totalArea: 6 * a ** 2, volume: a ** 3 }),
  // base triangular: base = largura, altura do triângulo = comprimento/2; extensão = altura
  prisma: ({ comprimento: c, largura: l, altura: h }) => {
    const baseArea = triangleArea(l, c / 2);
    return { baseArea, volume: prismVolume(baseArea, h) }; // lateral exigiria os 3 lados: não aplicável
  },
  cilindro: ({ raio: r, altura: h }) => ({
    baseArea: circleArea(r), basePerimeter: circumference(r), lateralArea: circumference(r) * h,
    totalArea: 2 * circleArea(r) + circumference(r) * h, volume: cylinderVolume(r, h),
  }),
  cone: ({ raio: r, altura: h }) => ({ baseArea: circleArea(r), basePerimeter: circumference(r), volume: coneVolume(r, h) }),
  piramide: ({ comprimento: c, largura: l, altura: h }) => ({ baseArea: c * l, basePerimeter: 2 * (c + l), volume: pyramidVolume(c * l, h) }),
};
const PLANAS = {
  retangulo: ({ comprimento: c, largura: l }) => ({ baseArea: rectArea(c, l), basePerimeter: rectPerimeter(c, l) }),
  quadrado: ({ comprimento: c }) => ({ baseArea: squareArea(c), basePerimeter: squarePerimeter(c) }),
  triangulo: ({ comprimento: c, largura: l }) => ({ baseArea: triangleArea(c, l) }), // perímetro exigiria os 3 lados
  trapezio: ({ comprimento: B, baseMenor: b, largura: h }) => ({ baseArea: trapezoidArea(B, b, h) }), // idem
  circulo: ({ raio: r }) => ({ baseArea: circleArea(r), basePerimeter: circumference(r) }),
};

/**
 * Quantidades usadas pela economia e pelo resumo. `volume` é o da estrutura principal
 * (o que o participante calcula); `costVolume` soma telhado e campanário para o custo.
 */
export function measures(project) {
  const p = normalize(project);
  if (!CONFIG.shapes[p.type]?.includes(p.shape)) throw new Error(`Formato inválido: ${p.type}:${p.shape}`);
  const m = { ...(SOLIDS[p.shape] ?? PLANAS[p.shape])(p) };
  if (p.telhado > 0) { // telhado = prisma triangular (frente: base = largura, altura = telhado; extensão = comprimento)
    m.roofGableArea = triangleArea(p.largura, p.telhado);
    m.roofVolume = prismVolume(m.roofGableArea, p.comprimento);
  }
  const ex = extras(p);
  if (ex) m.campanarioVolume = pyramidVolume(ex.campanario.lado ** 2, ex.campanario.altura);
  m.costVolume = (m.volume ?? 0) + (m.roofVolume ?? 0) + (m.campanarioVolume ?? 0);
  return m;
}

// ---------- Fórmulas e textos ----------
const F = {
  paralelepipedo: { area: 'A = comprimento × largura', perimetro: 'P = 2 × (comprimento + largura)', lateral: 'A lateral = perímetro da base × altura', total: 'A total = 2 × área da base + área lateral', volume: 'V = comprimento × largura × altura' },
  cubo: { area: 'A = aresta²', perimetro: 'P = 4 × aresta', lateral: 'A lateral = 4 × aresta²', total: 'A total = 6 × aresta²', volume: 'V = aresta³' },
  prisma: { area: 'A = (base × altura do triângulo) / 2', volume: 'V = área da base × altura do prisma' },
  cilindro: { area: 'A = π × r²', perimetro: 'C = 2 × π × r', lateral: 'A lateral = 2 × π × r × h', total: 'A total = 2 × π × r × (r + h)', volume: 'V = π × r² × h' },
  cone: { area: 'A = π × r²', perimetro: 'C = 2 × π × r', volume: 'V = (π × r² × h) / 3' },
  piramide: { area: 'A = comprimento × largura', perimetro: 'P = 2 × (comprimento + largura)', volume: 'V = (área da base × h) / 3' },
  retangulo: { area: 'A = base × altura', perimetro: 'P = 2 × (base + altura)' },
  quadrado: { area: 'A = lado²', perimetro: 'P = 4 × lado' },
  triangulo: { area: 'A = (base × altura) / 2' },
  trapezio: { area: 'A = (base maior + base menor) × altura / 2' },
  circulo: { area: 'A = π × r²', perimetro: 'C = 2 × π × r' },
};

const DESC = {
  paralelepipedo: (p) => `${fmt(p.comprimento)} m de comprimento, ${fmt(p.largura)} m de largura e ${fmt(p.altura)} m de altura`,
  cubo: (p) => `aresta de ${fmt(p.comprimento)} m`,
  prisma: (p) => `base do triângulo de ${fmt(p.largura)} m, altura do triângulo de ${fmt(p.comprimento / 2)} m e altura do prisma de ${fmt(p.altura)} m`,
  cilindro: (p) => `raio de ${fmt(p.raio)} m e altura de ${fmt(p.altura)} m`,
  cone: (p) => `raio de ${fmt(p.raio)} m e altura de ${fmt(p.altura)} m`,
  piramide: (p) => `base de ${fmt(p.comprimento)} m por ${fmt(p.largura)} m e altura de ${fmt(p.altura)} m`,
  retangulo: (p) => `${fmt(p.comprimento)} m de comprimento e ${fmt(p.largura)} m de largura`,
  quadrado: (p) => `lado de ${fmt(p.comprimento)} m`,
  triangulo: (p) => `base de ${fmt(p.comprimento)} m e altura de ${fmt(p.largura)} m`,
  trapezio: (p) => `base maior de ${fmt(p.comprimento)} m, base menor de ${fmt(p.baseMenor)} m e altura de ${fmt(p.largura)} m`,
  circulo: (p) => `raio de ${fmt(p.raio)} m`,
};

const TITULOS = { area: 'Área da base', perimetro: 'Perímetro da base', lateral: 'Área lateral', total: 'Área total', volume: 'Volume', empena: 'Área da frente do telhado', campanario: 'Volume do campanário' };

/** Observações de apoio exibidas junto com as fórmulas. */
export function helpNotes(project) {
  const p = normalize(project), n = [];
  if (SHAPES[p.shape].round) n.push(`Use π = ${fmt(CONFIG.pi)}.`);
  if (p.shape === 'prisma') n.push('A base do prisma é um triângulo cuja altura é a metade do comprimento.');
  if (p.shape === 'cilindro' || p.shape === 'cone') n.push('r é o raio da base e h é a altura.');
  if (p.telhado > 0) n.push('A frente do telhado é um triângulo: a base é a largura da construção.');
  if (p.type === 'igreja') n.push('O campanário é uma pirâmide de base quadrada.');
  return n;
}

/** Resumo legível das dimensões informadas (para a tela de resultados). */
export function summary(project) {
  const p = normalize(project);
  return visibleDims(p).map(([k, label]) => `${label.replace(/ \(.*\)/, '')}: ${fmt(p[k])} m`).join(' · ');
}

/** Lista de desafios aplicáveis ao projeto, com fórmula e explicação. */
export function buildChallenges(project) {
  const p = normalize(project);
  const m = measures(p);
  const def = SHAPES[p.shape];
  const planar = !def.solido;
  const dims = DESC[p.shape](p);
  const pi = def.round ? ` (use π = ${fmt(CONFIG.pi)})` : '';
  const ex = extras(p);
  const circ = def.round;

  const spec = {
    area: { ok: true, v: m.baseArea, u: 'm²', f: F[p.shape]?.area,
      q: `Seu projeto tem ${dims}. Qual é a área ${planar ? 'da figura' : 'da base'}?${pi}` },
    perimetro: { ok: m.basePerimeter !== undefined, v: m.basePerimeter, u: 'm', f: F[p.shape]?.perimetro,
      q: circ ? `Qual é o comprimento da circunferência ${planar ? 'da praça' : 'da base'}?${pi}` : 'Qual é o perímetro da base?' },
    lateral: { ok: m.lateralArea !== undefined, v: m.lateralArea, u: 'm²', f: F[p.shape]?.lateral,
      q: `Qual é a área lateral (somente as paredes)?${pi}` },
    total: { ok: m.totalArea !== undefined, v: m.totalArea, u: 'm²', f: F[p.shape]?.total,
      q: `Qual é a área total (base, topo e paredes)?${pi}` },
    volume: { ok: m.volume !== undefined, v: m.volume, u: 'm³', f: F[p.shape]?.volume,
      q: p.telhado > 0 ? `Qual é o volume do corpo da construção (sem o telhado), com altura de ${fmt(p.altura)} m?`
        : `Com altura de ${fmt(p.altura)} m, qual é o volume da construção?${pi}` },
    empena: { ok: m.roofGableArea !== undefined, v: m.roofGableArea, u: 'm²', f: 'A = (base × altura) / 2',
      q: `A frente do telhado é um triângulo de base ${fmt(p.largura)} m e altura ${fmt(p.telhado)} m. Qual é a área dele?` },
    campanario: { ok: Boolean(ex), v: ex && m.campanarioVolume, u: 'm³', f: 'V = (área da base × altura) / 3',
      q: ex && `O campanário é uma pirâmide de base quadrada com lado de ${fmt(ex.campanario.lado)} m e altura de ${fmt(ex.campanario.altura)} m. Qual é o volume dele?` },
  };

  let ids = (CONFIG.questions[p.type] ?? ['area']).filter((id) => spec[id]?.ok && spec[id].f);
  if (!ids.length) ids = ['area'];
  return ids.slice(0, CONFIG.maxQuestions).map((id) => {
    const s = spec[id];
    return {
      id, titulo: id === 'area' && planar ? 'Área' : TITULOS[id], pergunta: s.q, valor: r2(s.v), unidade: s.u, formula: s.f,
      explicacao: `Substitua as medidas na fórmula: ${s.f} → ${fmt(s.v)} ${s.u}.`,
    };
  });
}

/** Valida resposta numérica aceitando vírgula decimal e tolerância. */
export function checkAnswer(challenge, raw, tolerance) {
  const n = Number(String(raw).trim().replace(',', '.'));
  return Number.isFinite(n) && Math.abs(n - challenge.valor) <= tolerance + 1e-9;
}
