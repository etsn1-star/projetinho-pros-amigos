// População, desenvolvimento e quantidade de figuras na rua. Regras em CONFIG.population/development/people.
import { CONFIG as C } from './config.js';
import { measures, normalize } from './geometry.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Impacto de UMA construção: moradores, capacidade de alunos e pontos de desenvolvimento. */
export function impactOf(project) {
  const out = { residents: 0, students: 0, points: 0 };
  try {
    const p = normalize(project), m = measures(p), R = C.population;
    out.points = C.development.points[p.type] ?? 0;
    if (p.type === 'casa') out.residents = clamp(Math.round(m.baseArea / R.casa.m2PerResident), R.casa.min, R.casa.max);
    if (p.type === 'predio') {
      const floors = Math.max(1, Math.floor(p.altura / R.predio.floorHeight));
      const apts = Math.max(1, Math.floor(m.baseArea / R.predio.m2PerApartment));
      out.residents = Math.min(R.predio.maxResidents, floors * apts * R.predio.residentsPerApartment);
    }
    if (p.type === 'escola') {
      const floors = Math.max(1, Math.floor(p.altura / R.escola.floorHeight));
      out.students = Math.min(R.escola.maxStudents, Math.floor((m.baseArea * floors) / R.escola.m2PerStudent));
    }
  } catch { /* construção antiga com dados inesperados: conta como zero */ }
  return out;
}

/** Estatísticas da cidade inteira a partir da lista salva. */
export function cityStats(buildings) {
  const s = { count: buildings.length, residents: 0, students: 0, points: 0, level: '' };
  for (const b of buildings) {
    const i = impactOf(b.project);
    s.residents += i.residents; s.students += i.students; s.points += i.points;
  }
  s.level = [...C.development.levels].reverse().find((l) => s.points >= l.min)?.nome ?? '';
  return s;
}

/** Quantas figuras circulando (antes do ajuste por desempenho do aparelho). */
export function crowdSize(stats) {
  const P = C.people;
  const n = Math.ceil(stats.residents / P.residentsPerPerson + stats.points / P.developmentPerPerson);
  return clamp(n, 0, P.max);
}
