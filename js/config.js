// Configuração central: nenhum valor de jogo deve ficar espalhado pelo código.
export const CONFIG = {
  gameName: 'Construindo a Cidade Virtual da EEPAG',
  cityName: 'Nova Esperança',
  timeSeconds: 180,          // duração de cada participação
  warnSeconds: 30,           // aviso de fim de tempo
  startBudget: 100000,       // R$ fictícios por visitante
  answerTolerance: 0.01,     // tolerância de arredondamento nas respostas
  adminPin: '2026',          // PIN do administrador e dos monitores (não é segurança real, roda no navegador)
  storageKey: 'arquitetoVirtual.v1', // mantido de propósito: preserva as cidades já salvas nos navegadores
  pi: 3.14,                  // valor de π usado nas figuras redondas (mostrado ao participante)
  maxQuestions: 4,           // máximo de cálculos por construção (mantém a partida em ~3 min)

  // ---- Desafio presencial (bônus no orçamento) ----
  challengeBonus: 10000,     // R$ somados ao orçamento da sessão se a equipe aprovar. 0 = esconde a opção
  challengeMaxAttempts: 1,   // quantas vezes o participante pode tentar o desafio na mesma sessão

  // ---- Bônus de desenvolvimento da cidade (limitado: não vira economia infinita) ----
  // A cada `pointsPerStep` pontos de desenvolvimento, o ORÇAMENTO INICIAL de quem começa
  // ganha `valuePerStep`, até o teto `max`. O dinheiro não acumula entre participantes.
  developmentBonus: { enabled: true, pointsPerStep: 10, valuePerStep: 500, max: 5000 },

  // ---- Catálogo de construções (ordem = ordem na tela) ----
  categories: [
    { id: 'basico', nome: 'Moradia e lazer' },
    { id: 'comercio', nome: 'Comércio' },
    { id: 'educacao', nome: 'Educação' },
    { id: 'religiao', nome: 'Religião' },
    { id: 'turismo', nome: 'Turismo' },
  ],
  buildings: {
    casa:         { nome: 'Casa residencial', icone: '🏠', categoria: 'basico' },
    predio:       { nome: 'Prédio',           icone: '🏢', categoria: 'basico' },
    praca:        { nome: 'Praça',            icone: '🌳', categoria: 'basico' },
    loja:         { nome: 'Loja',             icone: '🏪', categoria: 'comercio' },
    padaria:      { nome: 'Padaria',          icone: '🥖', categoria: 'comercio' },
    supermercado: { nome: 'Supermercado',     icone: '🛒', categoria: 'comercio' },
    escola:       { nome: 'Escola',           icone: '🏫', categoria: 'educacao' },
    biblioteca:   { nome: 'Biblioteca',       icone: '📚', categoria: 'educacao' },
    igreja:       { nome: 'Igreja',           icone: '⛪', categoria: 'religiao' },
    mirante:      { nome: 'Mirante',          icone: '🔭', categoria: 'turismo' },
    torre:        { nome: 'Torre',            icone: '🗼', categoria: 'turismo' },
  },

  // Limites em metros [mín, máx, passo]. Chaves: comprimento, largura, altura,
  // telhado (altura do telhado), raio (figuras redondas), baseMenor (trapézio).
  limits: {
    casa:         { comprimento: [4, 20, 0.5], largura: [4, 20, 0.5], altura: [2.5, 4, 0.5], telhado: [1, 3, 0.5] },
    predio:       { comprimento: [6, 25, 0.5], largura: [6, 25, 0.5], altura: [9, 60, 1] },
    praca:        { comprimento: [10, 40, 1],  largura: [10, 40, 1],  altura: [0, 0, 1], baseMenor: [5, 30, 1], raio: [4, 20, 1] },
    loja:         { comprimento: [5, 15, 0.5], largura: [5, 12, 0.5], altura: [3, 5, 0.5] },
    padaria:      { comprimento: [4, 12, 0.5], largura: [4, 10, 0.5], altura: [3, 4.5, 0.5] },
    supermercado: { comprimento: [12, 35, 1],  largura: [8, 25, 1],   altura: [3.5, 8, 0.5] },
    escola:       { comprimento: [12, 40, 1],  largura: [8, 20, 1],   altura: [3.5, 10, 0.5] },
    biblioteca:   { comprimento: [8, 24, 1],   largura: [8, 18, 1],   altura: [3.5, 8, 0.5] },
    igreja:       { comprimento: [9, 30, 1],   largura: [7, 18, 1],   altura: [5, 12, 0.5], telhado: [2, 6, 0.5] },
    mirante:      { comprimento: [3, 10, 0.5], largura: [3, 10, 0.5], altura: [4, 15, 0.5], raio: [1.5, 5, 0.5] },
    torre:        { comprimento: [2, 8, 0.5],  largura: [2, 8, 0.5],  altura: [10, 40, 1],  raio: [1, 4, 0.5] },
  },

  // Formatos permitidos por construção (o primeiro é o padrão)
  shapes: {
    casa:         ['paralelepipedo', 'cubo'],
    predio:       ['paralelepipedo', 'prisma'],
    praca:        ['retangulo', 'quadrado', 'triangulo', 'trapezio', 'circulo'],
    loja:         ['paralelepipedo', 'cubo'],
    padaria:      ['paralelepipedo', 'cubo'],
    supermercado: ['paralelepipedo'],
    escola:       ['paralelepipedo'],
    biblioteca:   ['paralelepipedo', 'cubo'],
    igreja:       ['paralelepipedo'],
    mirante:      ['cilindro', 'prisma'],
    torre:        ['cilindro', 'prisma', 'cone', 'piramide'],
  },

  // Cálculos pedidos em cada construção (só entram os aplicáveis à figura escolhida).
  // ids: area, perimetro, lateral, total, volume, empena (triângulo do telhado), campanario (pirâmide da igreja)
  questions: {
    casa: ['area', 'perimetro', 'volume', 'empena'],
    predio: ['area', 'perimetro', 'volume'],
    praca: ['area', 'perimetro'],
    loja: ['area', 'lateral', 'volume'],
    padaria: ['area', 'perimetro', 'volume'],
    supermercado: ['area', 'total', 'volume'],
    escola: ['area', 'perimetro', 'volume'],
    biblioteca: ['area', 'lateral', 'volume'],
    igreja: ['area', 'volume', 'empena', 'campanario'],
    mirante: ['area', 'lateral', 'volume'],
    torre: ['area', 'lateral', 'volume'],
  },

  // Materiais fictícios: custo por m³ (edificações) e por m² (praça)
  materials: {
    madeira:  { nome: 'Madeira',  custoM3: 120, custoM2: 80 },
    tijolo:   { nome: 'Tijolo',   custoM3: 180, custoM2: 110 },
    concreto: { nome: 'Concreto', custoM3: 240, custoM2: 150 },
    vidro:    { nome: 'Vidro',    custoM3: 320, custoM2: 200 },
  },
  perimeterCostPerMeter: 60,  // muretas/calçadas da praça
  fixedCost: 2000,            // custo adicional de projeto (padrão)
  // Custo por construção: `fixed` substitui o custo fixo; `factor` multiplica a parte variável (material).
  buildingCost: {
    casa: { fixed: 2000, factor: 1 }, predio: { fixed: 2000, factor: 1 }, praca: { fixed: 2000, factor: 1 },
    loja: { fixed: 2000, factor: 1 }, padaria: { fixed: 2000, factor: 1 }, supermercado: { fixed: 2000, factor: 1 },
    escola: { fixed: 2000, factor: 1 }, biblioteca: { fixed: 2000, factor: 1 }, igreja: { fixed: 2000, factor: 1 },
    mirante: { fixed: 2000, factor: 1 }, torre: { fixed: 2000, factor: 1 },
  },

  // ---- População (estimativa simples e transparente) ----
  population: {
    casa:   { m2PerResident: 12, min: 1, max: 8 },                                   // moradores = área da base ÷ 12
    predio: { floorHeight: 3, m2PerApartment: 40, residentsPerApartment: 3, maxResidents: 600 }, // andares × apartamentos × 3
    escola: { floorHeight: 3.5, m2PerStudent: 3, maxStudents: 1500 },                // alunos = área construída ÷ 3 (não são moradores)
  },
  // Pontos de desenvolvimento: todas as construções contribuem, mesmo sem aumentar a população.
  development: {
    points: { casa: 1, predio: 2, praca: 2, loja: 2, padaria: 2, supermercado: 3, escola: 3, biblioteca: 3, igreja: 2, mirante: 2, torre: 2 },
    levels: [
      { min: 0, nome: 'Vilarejo' }, { min: 10, nome: 'Povoado' }, { min: 25, nome: 'Vila' },
      { min: 50, nome: 'Cidade pequena' }, { min: 100, nome: 'Cidade' }, { min: 200, nome: 'Metrópole' },
    ],
  },

  // ---- Pessoas circulando (decorativo) ----
  people: {
    max: 30,                  // limite de figuras na tela
    residentsPerPerson: 12,   // 1 figura a cada 12 moradores...
    developmentPerPerson: 3,  // ...mais 1 a cada 3 pontos de desenvolvimento
    speed: 0.12,              // ruas (quarteirões) por segundo — valor baixo = caminhada lenta
    fps: 30,                  // limite de quadros por segundo da animação
    lowEndFactor: 0.5,        // fator aplicado à quantidade em aparelhos fracos
    reducedMotion: 'static',  // com "reduzir movimento" ativo: 'static' (figuras paradas) ou 'off' (sem figuras)
  },
};
