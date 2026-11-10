import { CONFIG as C } from './config.js';
import { SHAPES, DIM_KEYS, buildChallenges, checkAnswer, measures, normalize, visibleDims, summary, helpNotes } from './geometry.js';
import { estimateCost, canAfford, remaining, developmentBonus, formatBRL as brl } from './economy.js';
import { impactOf, cityStats, crowdSize } from './population.js';
import { storage } from './storage.js';
import { CountdownTimer } from './timer.js';
import { drawBuilding, sceneInfo } from './buildings.js';
import { renderCity } from './city.js';
import { crowd } from './people.js';

const $ = (s) => document.querySelector(s);
const TYPES = Object.fromEntries(Object.entries(C.buildings).map(([k, v]) => [k, v.nome]));
const freshBonus = () => ({ status: 'idle', attempts: 0, before: 0, amount: 0, after: 0 });
const S = { mode: 'solo', project: null, phase: 'idle', challenges: [], results: {}, deadline: 0, budget: C.startBudget, devBonus: 0, bonus: freshBonus(), stats: cityStats([]) };
const timer = new CountdownTimer({ onTick, onWarn: () => toast('⏳ Faltam poucos segundos!'), onEnd });
let heroStats = cityStats([]);

const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2600); };
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const num = (n) => (Math.round(n * 100) / 100).toLocaleString('pt-BR');

function show(id) {
  document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('active', e.id === id));
  $('#hud').hidden = !['editor', 'challenge'].includes(S.phase) || !['editor', 'challenge'].includes(id);
  if (id === 'welcome') { crowd.mount($('#hero svg'), crowdSize(heroStats)); refreshWelcome(); }
  else if (id !== 'city') crowd.stop(); // pessoas só na tela inicial e na cidade
  window.scrollTo(0, 0);
}
const save = () => storage.saveSession({ deadline: S.deadline, mode: S.mode, project: S.project, phase: S.phase, results: S.results, budget: S.budget, devBonus: S.devBonus, bonus: S.bonus });

function onTick(s) {
  $('#time').textContent = fmtTime(s);
  $('#bar').style.width = `${(s / C.timeSeconds) * 100}%`;
  $('#hud').classList.toggle('low', s <= C.warnSeconds);
}

// ---------- Cidade ----------
const statsHTML = (st) => `<div>👥 População<b>${num(st.residents)}</b>moradores</div>
  <div>🏫 Capacidade escolar<b>${num(st.students)}</b>alunos</div>
  <div>🏗️ Construções<b>${st.count}</b>na cidade</div>
  <div>⭐ Desenvolvimento<b>${st.level}</b>${st.points} pontos</div>`;

async function refreshWelcome() {
  const st = cityStats(await storage.loadBuildings());
  $('#welcome-stats').textContent = `👥 População da cidade: ${num(st.residents)} · 🏗️ ${st.count} construção(ões) · ⭐ ${st.level}`;
}

async function showCity(msg) {
  const list = await storage.loadBuildings(), st = cityStats(list);
  $('#city-title').textContent = `Cidade de ${C.cityName}`;
  const bonus = developmentBonus(st.points);
  $('#city-info').textContent = `${list.length} construção(ões). ${msg ?? ''}${bonus ? ` Quem começa agora ganha ${brl(bonus)} de bônus de desenvolvimento.` : ''}`;
  $('#city-stats').innerHTML = statsHTML(st);
  $('#city-map').innerHTML = renderCity(list);
  show('city');
  crowd.mount($('#city-map svg'), crowdSize(st));
}

// ---------- Preparação e bônus do desafio presencial ----------
async function openSetup() {
  S.phase = 'idle';
  S.stats = cityStats(await storage.loadBuildings());
  S.devBonus = developmentBonus(S.stats.points);
  S.budget = C.startBudget + S.devBonus;
  S.bonus = freshBonus();
  $('#s-time').textContent = fmtTime(C.timeSeconds);
  $('#bonus-pin').value = ''; $('#bonus-msg').textContent = ''; $('#bonus-confirm').hidden = true;
  renderBudget(); renderBonus();
  show('setup');
}

function renderBudget() {
  $('#s-budget').textContent = brl(S.budget);
  const b = S.bonus.status === 'approved' ? S.bonus.amount : 0;
  const parts = [];
  if (S.devBonus) parts.push(`${brl(C.startBudget)} + ${brl(S.devBonus)} de desenvolvimento da cidade`);
  if (b) parts.push(`${S.devBonus ? '' : `${brl(C.startBudget)} `}+ ${brl(b)} do desafio`);
  $('#s-dev').textContent = parts.length ? ` (${parts.join(' ')})` : '';
}

function renderBonus() {
  const on = C.challengeBonus > 0, B = S.bonus;
  $('#bonus-box').hidden = !on;
  if (!on) return;
  $('#bonus-val').textContent = brl(C.challengeBonus);
  const done = B.status === 'approved', out = B.attempts >= C.challengeMaxAttempts;
  $('#btn-bonus-try').disabled = done || out;
  $('#btn-bonus-try').textContent = done ? '✅ Bônus recebido' : out ? 'Desafio já avaliado' : 'Quero tentar o desafio';
  const r = $('#bonus-result');
  r.hidden = !done;
  if (done) r.innerHTML = `<div>Saldo anterior<b>${brl(B.before)}</b></div><div class="gain">Bônus recebido<b>+ ${brl(B.amount)}</b></div><div>Novo saldo<b>${brl(B.after)}</b></div>`;
}

function approveBonus() {
  if ($('#bonus-pin').value !== C.adminPin) return toast('PIN incorreto.');
  if (S.bonus.status === 'approved') return; // o bônus só vale uma vez por sessão
  S.bonus = { status: 'approved', attempts: S.bonus.attempts + 1, before: S.budget, amount: C.challengeBonus, after: S.budget + C.challengeBonus };
  S.budget = S.bonus.after;
  $('#bonus-confirm').hidden = true; $('#bonus-pin').value = '';
  $('#bonus-msg').textContent = '🎉 Desafio aprovado! O bônus foi somado ao seu orçamento.';
  renderBudget(); renderBonus();
}

function rejectBonus() {
  if (S.bonus.status === 'approved') return;
  S.bonus.status = 'rejected'; S.bonus.attempts++;
  $('#bonus-confirm').hidden = true; $('#bonus-pin').value = '';
  const left = C.challengeMaxAttempts - S.bonus.attempts;
  $('#bonus-msg').textContent = `Desafio não aprovado desta vez. Seu orçamento continua ${brl(S.budget)}.${left > 0 ? ` Você ainda pode tentar ${left} vez(es).` : ''}`;
  renderBonus();
}

/** Projeto inicial: começa em ~25% da faixa de cada medida e, se não couber no orçamento, vai diminuindo. */
function initialProject(type) {
  const lim = C.limits[type], shape = C.shapes[type][0];
  const at = (f) => {
    const p = { type, shape, material: 'tijolo' };
    for (const d of DIM_KEYS) if (lim[d]) { const [a, b, st] = lim[d]; p[d] = b ? a + Math.round(((b - a) * f) / st) * st : 0; }
    return p;
  };
  for (let f = 0.25; f > 0.01; f -= 0.05) { const p = at(f); if (canAfford(S.budget, estimateCost(normalize(p)))) return p; }
  return at(0);
}

function startSession(type) {
  S.mode = document.querySelector('[name=mode]:checked').value;
  S.project = initialProject(type);
  S.phase = 'editor'; S.results = {};
  S.deadline = timer.start(C.timeSeconds);
  save(); openEditor();
}

// ---------- Editor ----------
function openEditor() {
  S.phase = 'editor';
  const p = S.project, lim = C.limits[p.type];
  $('#shape').innerHTML = C.shapes[p.type].map((k) => `<option value="${k}">${SHAPES[k].nome}</option>`).join('');
  $('#material').innerHTML = Object.entries(C.materials).map(([k, m]) => `<option value="${k}">${m.nome}</option>`).join('');
  $('#shape').value = p.shape; $('#material').value = p.material;
  DIM_KEYS.forEach((d) => { if (!lim[d]) return; const i = $(`[data-dim=${d}] input`); [i.min, i.max, i.step] = lim[d]; i.value = p[d]; });
  $('#role').textContent = S.mode === 'duo' ? `Participante 1 constrói: ${TYPES[p.type]}. Participante 2, acompanhe as fórmulas!` : `Monte sua construção: ${TYPES[p.type].toLowerCase()}`;
  updateEditor(); show('editor');
}

/** Ao trocar de formato, reduz as medidas (um passo por vez) até o projeto caber no orçamento. */
function fitBudget() {
  const lim = C.limits[S.project.type];
  for (let k = 0; k < 120; k++) {
    const p = { ...S.project, shape: $('#shape').value, material: $('#material').value };
    DIM_KEYS.forEach((d) => { if (lim[d]) p[d] = Number($(`[data-dim=${d}] input`).value); });
    if (canAfford(S.budget, estimateCost(normalize(p)))) return;
    let moved = false;
    for (const d of ['comprimento', 'largura', 'altura', 'raio']) {
      if (!lim[d]) continue;
      const i = $(`[data-dim=${d}] input`), nv = Math.max(lim[d][0], Number(i.value) - lim[d][2]);
      if (nv !== Number(i.value)) { i.value = nv; moved = true; }
    }
    if (!moved) return;
  }
}

function updateEditor(ev) {
  if (ev?.target?.id === 'shape') fitBudget();
  const p = S.project, lim = C.limits[p.type];
  p.shape = $('#shape').value; p.material = $('#material').value;
  const vis = new Map(visibleDims(normalize({ ...p, shape: p.shape })));
  DIM_KEYS.forEach((d) => {
    const row = $(`[data-dim=${d}]`), i = row.querySelector('input'), on = vis.has(d) && lim[d];
    row.style.display = on ? '' : 'none';
    if (!lim[d]) return;
    if (d === 'baseMenor') { i.max = Math.min(lim[d][1], p.comprimento); if (Number(i.value) > Number(i.max)) i.value = i.max; } // base menor ≤ base maior
    p[d] = Number(i.value);
    row.querySelector('output').textContent = num(p[d]);
    if (on) $(`#l-${d}`).textContent = vis.get(d);
  });

  const q = normalize(p), cost = estimateCost(q), ok = canAfford(S.budget, cost), info = sceneInfo(q);
  const sc = Math.min(8, 190 / info.height, 300 / (1.73 * info.extent), 130 / info.extent); // cabe na área do preview (altura, largura e profundidade)
  $('#preview').innerHTML = `<svg viewBox="-200 -230 400 330">${drawBuilding(q, 0, 40, sc)}</svg>`;
  $('#formulas').innerHTML = buildChallenges(q).map((c) => `<li><b>${c.titulo}:</b> ${c.formula}</li>`).join('')
    + helpNotes(q).map((n) => `<li class="note">ℹ️ ${n}</li>`).join('');
  const im = impactOf(q);
  $('#pop-preview').textContent = im.residents ? `👥 Esta obra deve abrigar cerca de ${num(im.residents)} moradores.`
    : im.students ? `🏫 Esta escola terá capacidade para cerca de ${num(im.students)} alunos.` : `⭐ Esta obra contribui para o desenvolvimento da cidade (+${im.points} pontos).`;
  $('#hud-budget').textContent = brl(S.budget); $('#hud-cost').textContent = brl(cost);
  $('#hud-pop').textContent = num(S.stats.residents);
  $('#warn').textContent = ok ? '' : 'Orçamento insuficiente: reduza as dimensões ou troque o material.';
  $('#btn-confirm').disabled = !ok;
  save();
}

// ---------- Desafio ----------
function openChallenge() {
  S.phase = 'challenge';
  const q = normalize(S.project);
  S.challenges = buildChallenges(q);
  $('#c-role').textContent = S.mode === 'duo' ? 'Participante 2: preencha os cálculos. Participante 1 ajuda!' : 'Calcule com as medidas do seu projeto.';
  $('#c-list').innerHTML = S.challenges.map((c) => `<div class="q card" data-id="${c.id}"><p>${c.pergunta}</p>
    <input inputmode="decimal" aria-label="${c.titulo}"> ${c.unidade} <button>Verificar</button><p class="fb" aria-live="polite"></p></div>`).join('')
    + `<div class="card help"><b>📘 Fórmulas de apoio:</b><ul>${S.challenges.map((c) => `<li><b>${c.titulo}:</b> ${c.formula}</li>`).join('')}${helpNotes(q).map((n) => `<li class="note">ℹ️ ${n}</li>`).join('')}</ul></div>`;
  S.challenges.forEach((c) => {
    const box = $(`.q[data-id=${c.id}]`);
    c.tries = S.results[c.id]?.tries ?? 0;
    box.querySelector('button').onclick = () => {
      const val = box.querySelector('input').value, fb = box.querySelector('.fb');
      c.tries++;
      const ok = checkAnswer(c, val, C.answerTolerance);
      S.results[c.id] = { tries: c.tries, correct: ok || S.results[c.id]?.correct === true };
      fb.className = `fb ${ok ? 'fb-ok' : 'fb-bad'}`;
      fb.textContent = ok ? `✅ Correto! ${c.formula}. ${c.explicacao}` : `❌ Ainda não. Dica: use ${c.formula} e confira as unidades (${c.unidade}). Tente de novo!`;
      save();
    };
  });
  show('challenge');
}

async function finish(timedOut = false) {
  if (S.phase !== 'challenge') return;
  timer.stop(); S.phase = 'results';
  const q = normalize(S.project), cost = estimateCost(q);
  await storage.addBuilding({ id: Date.now(), project: q, cost, ts: Date.now() });
  await storage.clearSession();
  const right = S.challenges.filter((c) => S.results[c.id]?.correct).length;
  const st = cityStats(await storage.loadBuildings()), im = impactOf(q);
  const m = measures(q);
  const B = S.bonus.status === 'approved' ? S.bonus : null;
  const pop = im.residents ? `👥 +${num(im.residents)} moradores` : im.students ? `🏫 capacidade para ${num(im.students)} alunos` : `⭐ +${im.points} pontos de desenvolvimento`;
  $('#r-body').innerHTML = `<p><b>${TYPES[q.type]}</b> (${SHAPES[q.shape].nome}, ${C.materials[q.material].nome})</p>
    <p>${summary(q)}</p>
    <p>Área da base: ${num(m.baseArea)} m²${m.basePerimeter !== undefined ? ` · Perímetro: ${num(m.basePerimeter)} m` : ''}${m.volume !== undefined ? ` · Volume: ${num(m.volume)} m³` : ''}</p>
    <p>Custo: ${brl(cost)} · Saldo restante: ${brl(remaining(S.budget, cost))}</p>
    ${B ? `<p>🎯 Bônus do desafio: ${brl(B.before)} + ${brl(B.amount)} = ${brl(B.after)}</p>` : ''}
    <p>${pop} · População da cidade agora: ${num(st.residents)}</p>
    <p>Desafio: ${right} de ${S.challenges.length} acertos</p>${timedOut ? '<p>⏱ O tempo acabou, mas sua construção foi salva!</p>' : ''}`;
  $('#r-msg').textContent = right === S.challenges.length ? 'Arquiteto nota 10! A cidade ficou mais bonita com você.' : 'Boa construção! Cada cálculo é uma chance de aprender; tente de novo na próxima.';
  show('results');
}

async function onEnd() {
  if (S.phase === 'challenge') return finish(true);
  if (S.phase === 'editor') { S.phase = 'idle'; await storage.clearSession(); toast('⏱ Tempo esgotado!'); showCity('Seu projeto não foi concluído a tempo e não foi adicionado.'); }
}

// ---------- Eventos ----------
$('#btn-start').onclick = openSetup;
$('#btn-see-city').onclick = () => showCity();
$('#btn-home').onclick = () => show('welcome');
$('#btn-new').onclick = openSetup;
$('#btn-r-city').onclick = () => showCity();
$('#btn-bonus-try').onclick = () => { $('#bonus-confirm').hidden = false; $('#bonus-msg').textContent = ''; $('#bonus-pin').focus(); };
$('#btn-bonus-ok').onclick = approveBonus;
$('#btn-bonus-no').onclick = rejectBonus;
$('#btn-bonus-cancel').onclick = () => { $('#bonus-confirm').hidden = true; $('#bonus-pin').value = ''; $('#bonus-msg').textContent = 'Tudo bem! Você segue com o orçamento atual.'; };
$('#editor').addEventListener('input', updateEditor);
$('#btn-confirm').onclick = () => { if (canAfford(S.budget, estimateCost(normalize(S.project)))) { S.phase = 'challenge'; save(); openChallenge(); } };
$('#btn-finish').onclick = () => finish();
$('#btn-admin').onclick = async () => {
  if (prompt('PIN de administrador:') !== C.adminPin) return toast('PIN incorreto.');
  if (confirm('Apagar TODAS as construções da cidade? Esta ação não pode ser desfeita.')) { await storage.clearBuildings(); toast('Cidade reiniciada.'); refreshWelcome(); }
};

// ---------- Inicialização ----------
(async function init() {
  document.title = C.gameName;
  $('#game-name').textContent = C.gameName;
  $('#story').textContent = `A cidade de ${C.cityName} está crescendo depressa e precisa de novos moradores, comércios, escolas e pontos turísticos. Você é o arquiteto convidado: planeje com matemática, respeite o orçamento e ajude a construir a cidade!`;
  // seletor de construções por categoria (a partir de CONFIG.categories/buildings)
  $('#type-list').innerHTML = C.categories.map((cat) => {
    const btns = Object.entries(C.buildings).filter(([, b]) => b.categoria === cat.id)
      .map(([k, b]) => `<button class="type" data-type="${k}">${b.icone}<b>${b.nome}</b></button>`).join('');
    return btns ? `<h3>${cat.nome}</h3><div class="cards">${btns}</div>` : '';
  }).join('');
  document.querySelectorAll('.type').forEach((b) => b.onclick = () => startSession(b.dataset.type));

  const demo = [['casa', 'paralelepipedo', 8, 6, 3, 'tijolo', { telhado: 1.5 }], ['predio', 'paralelepipedo', 8, 8, 20, 'vidro'], ['praca', 'retangulo', 12, 10, 0, 'tijolo'],
    ['igreja', 'paralelepipedo', 16, 9, 7, 'concreto', { telhado: 3 }], ['escola', 'paralelepipedo', 20, 10, 6, 'tijolo'], ['loja', 'paralelepipedo', 9, 7, 4, 'madeira'],
    ['casa', 'cubo', 6, 6, 6, 'madeira', { telhado: 1.5 }], ['mirante', 'cilindro', 4, 4, 10, 'madeira', { raio: 2 }], ['praca', 'circulo', 10, 10, 0, 'tijolo', { raio: 5 }]]
    .map(([type, shape, comprimento, largura, altura, material, extra]) => ({ project: { type, shape, comprimento, largura, altura, material, ...extra } }));
  heroStats = cityStats(demo);
  $('#hero').innerHTML = renderCity(demo);
  if (new URLSearchParams(location.search).has('admin')) $('#btn-admin').hidden = false;
  crowd.mount($('#hero svg'), crowdSize(heroStats));
  refreshWelcome();

  const ses = await storage.loadSession(); // retomar sessão sem reiniciar o relógio
  if (ses && ses.deadline > Date.now()) {
    S.stats = cityStats(await storage.loadBuildings());
    Object.assign(S, { mode: ses.mode, project: ses.project, results: ses.results ?? {}, deadline: ses.deadline, budget: ses.budget ?? C.startBudget, devBonus: ses.devBonus ?? 0, bonus: ses.bonus ?? freshBonus() });
    timer.start(0, ses.deadline);
    if (ses.phase === 'challenge') { S.phase = 'challenge'; openChallenge(); } else openEditor();
  } else if (ses) {
    await storage.clearSession();
    toast('A participação anterior expirou.');
  }
})();
