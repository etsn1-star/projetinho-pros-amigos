# Construindo a Cidade Virtual da EEPAG

Jogo educativo de matemática criado para a **ExpoMat**. Cada visitante assume o papel de arquiteto: escolhe uma construção, define dimensões, formato e material dentro de um orçamento e de um tempo limitado, resolve os cálculos de geometria e vê sua obra ser adicionada a uma cidade que cresce a cada participação, com população e pessoas caminhando pelas ruas.

## Estrutura de diretórios

```
arquiteto-virtual/        (nome da pasta mantido para não quebrar publicações existentes)
├── index.html          # Telas do jogo
├── README.md
├── css/
│   └── style.css       # Estilos, responsividade e animações
└── js/
    ├── main.js         # Interface e fluxo (telas, editor, desafio, bônus, resultados)
    ├── config.js       # TODAS as configurações centralizadas
    ├── geometry.js     # Formas, fórmulas, desafios e validação de respostas
    ├── economy.js      # Custos, orçamento e bônus de desenvolvimento
    ├── buildings.js    # Desenho isométrico das construções em SVG
    ├── city.js         # Layout da cidade compartilhada
    ├── population.js   # (novo) população, desenvolvimento e quantidade de pessoas
    ├── people.js       # (novo) pessoas circulando pelas ruas
    ├── storage.js      # Persistência (localStorage), isolada para troca futura
    └── timer.js        # Cronômetro com prazo absoluto
```

Sem imagens, fontes ou bibliotecas externas: tudo é SVG gerado por código. Tecnologias: HTML5, CSS3, JavaScript ES6+ (módulos), SVG e `localStorage`.

## Executar localmente

Os módulos ES **não funcionam com duplo clique** (`file://`). Use um servidor HTTP dentro da pasta:

```
python3 -m http.server 8000
```

e acesse `http://localhost:8000`.

## Publicar gratuitamente

**GitHub Pages:** envie o conteúdo da pasta (com `index.html` na raiz), em *Settings → Pages* escolha a branch `main` e `/ (root)`.
**Netlify:** *Add new site → Deploy manually* e arraste a pasta. Não há build.

## Novidades desta versão

- **Nome:** "Construindo a Cidade Virtual da EEPAG" (`CONFIG.gameName`).
- **11 construções**, agrupadas na tela: Casa, Prédio, Praça · Loja, Padaria, Supermercado · Escola, Biblioteca · Igreja · Mirante, Torre.
- **Formas planas e espaciais:** quadrado, retângulo, triângulo, trapézio, círculo, cubo, paralelepípedo, prisma triangular, pirâmide, cilindro e cone.
- **Cálculos:** área da base, perímetro (ou circunferência), área lateral, área total e volume, mais a área da frente do telhado (triângulo) e o volume do campanário da igreja. Só aparecem os cálculos aplicáveis à figura. Respostas aceitam vírgula ou ponto, com a tolerância `answerTolerance`. As fórmulas ficam no editor e na tela do desafio. Figuras redondas usam **π = 3,14** (`CONFIG.pi`), informado ao participante.
- **Visual:** casas com telhado, porta e janelas; escola, biblioteca (frontão e pilastras), igreja (telhado, torre com cruz), loja/padaria (toldo), supermercado (letreiro), mirante (plataforma com guarda-corpo) e torre. Tudo é proporcional às medidas informadas.
- **População:** casa = área da base ÷ 12 (1 a 8); prédio = andares × apartamentos × 3 (máx. 600); escola informa capacidade de alunos (não soma moradores); demais construções somam pontos de desenvolvimento.
- **Pessoas na cidade:** figuras caminham só pelas ruas, passando atrás ou na frente das construções conforme a profundidade. A quantidade cresce com população e desenvolvimento, até `people.max`. Com "reduzir movimento" no aparelho, as figuras ficam paradas.
- **Desafio para ganhar bônus** (tela de preparação, antes de o tempo começar): o participante decide se quer tentar; um monitor digita o PIN e toca em *Aprovado* ou *Não aprovado*. Aprovado soma `challengeBonus` ao orçamento **somente daquela sessão**, uma única vez, mostrando saldo anterior, bônus e novo saldo.

## Configurações (`js/config.js`)

| Configuração | Padrão | Função |
|---|---|---|
| `gameName` / `cityName` | — | Nome do jogo / da cidade |
| `timeSeconds`, `warnSeconds` | 180, 30 | Duração da partida e aviso de fim |
| `startBudget` | 100000 | Orçamento inicial (R$ fictícios) |
| `answerTolerance` | 0.01 | Tolerância nas respostas |
| `pi` | 3.14 | Valor de π usado e exibido |
| `maxQuestions` | 4 | Máximo de cálculos por construção |
| `challengeBonus` | 10000 | Bônus do desafio presencial (0 esconde a opção) |
| `challengeMaxAttempts` | 1 | Tentativas do desafio por sessão |
| `developmentBonus` | ver arquivo | Bônus no orçamento inicial por desenvolvimento da cidade, **com teto** (`max`); não acumula entre participantes. `enabled:false` desliga |
| `adminPin` | 2026 | PIN do administrador e dos monitores |
| `limits` | — | Mínimo, máximo e passo das dimensões por construção |
| `shapes` | — | Formas permitidas por construção |
| `questions` | — | Cálculos pedidos por construção |
| `materials`, `buildingCost`, `fixedCost`, `perimeterCostPerMeter` | — | Custos (cada construção pode ter `fixed` e `factor`) |
| `population`, `development` | — | Regras de população, pontos e níveis da cidade |
| `people` | max 30 | `max`, `speed`, `fps`, `lowEndFactor`, `reducedMotion` |

`storageKey` foi mantida: cidades já salvas continuam aparecendo (construções antigas ganham telhado proporcional ao serem desenhadas).

## Como testar cada funcionalidade

1. **Nome:** título da aba e tela inicial.
2. **Construções/formas:** *Começar* → escolher cada construção; o seletor *Formato* mostra só as formas compatíveis e os controles mudam (raio, telhado, base menor...).
3. **Cálculos:** *Confirmar projeto* e responder (teste `12,56` e `12.56`; erre de propósito).
4. **Orçamento:** o *Custo* no topo muda com as medidas; acima do saldo o botão é bloqueado.
5. **Bônus:** na preparação, *Quero tentar o desafio* → PIN `2026` → *Aprovado*. Tente de novo: o botão fica bloqueado. Com *Não aprovado* o saldo não muda.
6. **População e pessoas:** conclua uma construção e abra *Ver a cidade*: painel com população, alunos, desenvolvimento e figuras nas ruas.
7. **Persistência e cronômetro:** atualize a página (F5) no meio da partida; o tempo e o saldo continuam.
8. **Reiniciar a cidade:** abra com `?admin=1` e use o botão administrativo (PIN e confirmação).

## Regras e observações

- Tempo esgotado no editor: a construção não é adicionada. No desafio: é adicionada com o desafio incompleto.
- Resposta errada não bloqueia o jogo; o resultado é registrado.
- **O `localStorage` não sincroniza entre dispositivos:** a cidade é compartilhada apenas no mesmo navegador/computador. O bônus e o PIN rodam no navegador (servem para organização, não são segurança real).

## Limitações conhecidas

- Cone, pirâmide, prisma triangular, trapézio e triângulo não pedem área lateral/perímetro, pois exigiriam raízes quadradas ou lados que o jogo não pede.
- O mirante e a torre cilíndrica têm detalhes (plataforma, cobertura cônica) apenas decorativos; os cálculos referem-se à estrutura principal.
- A cidade usa grade de 5 lotes por fileira (anterior a esta versão): com muitas dezenas de construções o mapa fica comprido e pequeno em celulares.
- Em aparelhos com 2 núcleos ou menos (ou pouca memória), a quantidade de pessoas é reduzida pela metade e a animação diminui a taxa de quadros se detectar lentidão.
