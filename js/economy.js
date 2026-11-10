import { CONFIG } from './config.js';
import { measures } from './geometry.js';

/** Custo estimado (R$). Edificações: volume × material; praça: área × material + perímetro. */
export function estimateCost(project) {
  const mat = CONFIG.materials[project.material];
  if (!mat) throw new Error('Material inválido');
  const m = measures(project);
  const bc = CONFIG.buildingCost?.[project.type] ?? {};
  let variable = 0;
  if (project.type === 'praca') {
    variable += m.baseArea * mat.custoM2;
    // triângulo e trapézio: perímetro não é calculado no jogo, então não gera custo de calçada
    if (m.basePerimeter !== undefined) variable += m.basePerimeter * CONFIG.perimeterCostPerMeter;
  } else {
    variable += m.costVolume * mat.custoM3; // inclui telhado e campanário, quando existem
  }
  return Math.round((bc.fixed ?? CONFIG.fixedCost) + variable * (bc.factor ?? 1));
}

/** Bônus no orçamento inicial conforme o desenvolvimento da cidade (sempre limitado por `max`). */
export function developmentBonus(points) {
  const c = CONFIG.developmentBonus;
  if (!c?.enabled || !(points > 0)) return 0;
  return Math.min(c.max, Math.floor(points / c.pointsPerStep) * c.valuePerStep);
}

export const canAfford = (budget, cost) => cost <= budget;
export const remaining = (budget, cost) => budget - cost;
export const formatBRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
