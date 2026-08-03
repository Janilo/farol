# JPS DS — Farol · spec de derivação

**Aprovado em 27/jul/2026.** Os tokens desta spec já estão em `src/styles.css` e no ar em farol.pereirasaraiva.com. O próximo uso deste documento é criar o projeto **"JPS DS — Farol"** no claude.ai/design (remix do J P Saraiva Design System), para as telas desenhadas e os assets — não para redecidir a paleta.

---

## ⛔ LEIA PRIMEIRO — decisões travadas

**As onze decisões abaixo estão fechadas e não se reabrem.** Elas foram tomadas com o Janilo em 27/jul/2026, algumas depois de eu propor o contrário e ser corrigido. O resto deste documento é o _raciocínio_ que levou a elas; quem lê o raciocínio e conclui diferente está reabrindo decisão, não pensando melhor.

**O portão para reabrir é fato novo** — fonte que mudou, medição que contradiz, restrição que apareceu. "Eu acho melhor assim" não é fato novo. Vale para mim em sessão futura, para o projeto no claude.ai/design e para qualquer agente que leia este arquivo.

| #   | Decisão                                                                                                                                                                                                                                                                                                                              | Onde vive              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 1   | **Dark-first.** A alternativa clara com roxo-vinho `--jps-purple` está descartada.                                                                                                                                                                                                                                                   | §1                     |
| 2   | **Não existe tema claro.** `--farol-paper` é para impressão e og-image, não é tema.                                                                                                                                                                                                                                                  | §7                     |
| 3   | **Os valores de cor da §2 são finais.** Contraste WCAG medido nos catorze pares; `--farol-fog` e `--farol-tier-c` já foram corrigidos por falharem AA. Mudança exige recálculo com o número na mesa. _Token **novo** com medição não reabre esta decisão — foi o caso de `--farol-rule-control` (§2.2); mudar valor existente, sim._ | §2, §2.1, §2.2         |
| 4   | **A palavra é "ficha", nunca "dossiê"** na UI. Em PT-BR "dossiê" carrega halo de investigação; o produto lê registro público. No código o tipo segue `dossier`, em inglês.                                                                                                                                                           | §"A palavra"           |
| 5   | **Tagline: "O que as ferramentas globais não veem no Brasil."** Sem nomear concorrente.                                                                                                                                                                                                                                              | abaixo                 |
| 6   | **Tipografia inalterada** — Fraunces + Inter Tight. É o que amarra a família. Em fundo escuro, Fraunces nunca abaixo de peso 500.                                                                                                                                                                                                    | §4                     |
| 7   | **O facho aparece em dois lugares só:** hero (estático) e a varredura única de 900ms na busca. Nada de animação em loop.                                                                                                                                                                                                             | §5                     |
| 8   | **`rubricPorte` vem de seletor na tela, nunca derivado do `porte` da Receita.** A RFB só tem micro/pequeno/demais, e DEMAIS cobre de empresa de 50 pessoas à Ambev — verificado na Brasil API com BB, Petrobras e Ambev.                                                                                                             | glossário, armadilha 2 |
| 9   | **`partner` não tem percentual.** O QSA não traz participação; não inferir sócio majoritário.                                                                                                                                                                                                                                        | glossário, armadilha 3 |
| 10  | **Escopo v1 é a ficha instantânea.** Sem inbox de sinais, sem cron, sem multi-tenant, sem monetização.                                                                                                                                                                                                                               | plano, Fase 2          |
| 11  | **Busca por nome não existe**, e isso é fato sobre as fontes, não pendência: `publica.cnpj.ws/cnpj/search` devolve 400 "CNPJ inválido". Implementar exige fonte com índice textual.                                                                                                                                                  | `enrichment.server.ts` |

Duas decisões de processo que também estão travadas, e que não são de design: os tokens no repo (`src/styles.css`) são a **fonte de verdade** dos valores, e o projeto no claude.ai/design é derivado — se o zip exportado divergir da §2, o repo ganha. E o `errors.ts` é mantido **idêntico por hash** nos cinco apps da família; qualquer edição nele exige a mesma edição nos outros quatro.

---

## 1. Onde o Farol entra na família

O que os três irmãos já ocupam (lido dos `styles.css` de cada repo):

| Produto     | Cor primária                         | Fundo                   | Leitura             |
| ----------- | ------------------------------------ | ----------------------- | ------------------- |
| **Lente**   | teal `#0E6B5E`                       | `--lente-paper` (claro) | pesquisa, escuta    |
| **Prisma**  | índigo `#4A37B5` + violeta `#7A5CF0` | `#F7F6FB` (claro)       | decomposição, mídia |
| **Cascata** | navy `#103C61` + ouro `#B5871C`      | `#F5F8FB` (claro)       | fluxo, margem       |

Os três são **claros, com um matiz próprio**. Teal, índigo e navy estão tomados — e as três famílias vizinhas (verde, roxo, azul) cobrem quase toda a paleta da marca. Um quarto matiz claro começaria a parecer arbitrário: "qual era mesmo o azul do Cascata e o do Farol?".

**Decidido: o Farol se diferencia pelo modo, não por mais um matiz.** É o primeiro produto **dark-first** da família — base neutra escura, um único facho quente.

Por que isso funciona:

- **A metáfora pede.** Farol é luz no escuro. Um farol em fundo bege é um desenho de farol; um facho sobre fundo escuro é a coisa.
- **Não colide com ninguém.** Nenhum irmão é escuro. Zero risco de confundir com o navy do Cascata.
- **Fica dentro da marca.** Base = neutros JPS (`--jps-ink`) aprofundados; facho = `--jps-gold` clareado para brilhar sobre escuro. Nenhuma cor nova de família.
- **A família é a tipografia, não o fundo.** O que amarra os quatro é Fraunces + Inter Tight, a arquitetura de tokens, o layout e a assinatura J P Saraiva — não o bege.

**A alternativa que foi descartada**, registrada para ninguém reapresentá-la como ideia nova: Farol claro com primária no roxo-vinho `--jps-purple #4A1942`, o único primário da marca ainda livre. Ganharia coerência de prateleira e perderia a ideia do facho. Foi avaliada e recusada em 27/jul/2026.

Todo o resto deste documento assume dark-first.

---

## 2. Primitivos `--farol-*`

Mesma convenção dos irmãos: cada produto declara os próprios primitivos com prefixo, derivados da marca, e amarra os papéis semânticos do shadcn a eles.

```css
/* ============================================================
   FAROL PRIMITIVES — noite neutra / facho âmbar
   ============================================================ */

/* Base — neutros aprofundados (família --jps-ink) */
--farol-night: #14181b; /* fundo da aplicação */
--farol-night-deep: #0d1113; /* fundo de seção recuada, hero */
--farol-surface: #1c2226; /* cartão sobre a noite */
--farol-surface-alt: #232b30; /* linha zebrada, hover de cartão */
--farol-rule: #2e383e; /* divisórias sobre escuro — decorativas */
--farol-rule-control: #69808d; /* borda que IDENTIFICA um controle — 3:1, ver §2.1 */

/* Facho — a luz (família --jps-gold #C9A227, clareada p/ contraste em escuro) */
--farol-beam: #e8b93f; /* accent principal: CTA, foco, dado em destaque */
--farol-beam-bright: #f6d073; /* hover, ponto de luz do wordmark */
--farol-beam-deep: #a87f14; /* pressed; e o accent em superfície clara */
--farol-beam-soft: #2a2412; /* preenchimento âmbar sobre escuro (badge, callout) */

/* Texto */
--farol-ink: #f2f0ea; /* texto principal (herda --jps-offwhite) */
--farol-mist: #a9b4ba; /* texto secundário */
--farol-fog: #859299; /* texto terciário, placeholder — corrigido, ver §2.1 */

/* Tiers — cores funcionais da rubrica */
--farol-tier-a: #4fa37f; /* verde-sinal (família --jps-green, clareada) */
--farol-tier-a-soft: #16251f;
--farol-tier-b: #e8b93f; /* = facho: o tier "nutrir" usa a cor da marca */
--farol-tier-b-soft: #2a2412;
--farol-tier-c: #7d8c94; /* cinza-neblina: presente, sem urgência */
--farol-tier-c-soft: #1e2427;

/* Sistema */
--farol-danger: #e0645c; /* --jps-danger-base clareado p/ escuro */
--farol-paper: #f5f6f4; /* superfície clara — landing pública, impressão */

/* Densidade (padrão Cascata) */
--farol-content-max: 1180px;
--farol-topbar-h: 56px;
--farol-tnum: "tnum" 1, "lnum" 1;
```

### 2.1 Contraste — medido, não estimado (27/jul/2026)

Calculei o ratio WCAG de todos os pares de texto da paleta. Dois falharam e já estão corrigidos acima; os valores da tabela §2 são os corrigidos.

| Par                                        | Ratio    | AA (4.5)                                         |
| ------------------------------------------ | -------- | ------------------------------------------------ |
| `ink` sobre `night`                        | 15,67    | passa                                            |
| `ink` sobre `surface`                      | 14,11    | passa                                            |
| `mist` sobre `night`                       | 8,44     | passa                                            |
| `mist` sobre `surface`                     | 7,60     | passa                                            |
| `beam` sobre `night`                       | 9,73     | passa                                            |
| `night-deep` sobre `beam` (texto do botão) | 10,34    | passa                                            |
| `beam-bright` sobre `beam-soft`            | 10,44    | passa                                            |
| `tier-a` sobre `tier-a-soft`               | 5,22     | passa                                            |
| `danger` sobre `night`                     | 5,23     | passa                                            |
| **`fog`** sobre `surface-alt`              | **4,50** | passa **após correção** (era 3,64 com `#6F7C83`) |
| **`tier-c`** sobre `tier-c-soft`           | **4,53** | passa **após correção** (era 4,47 com `#7C8B93`) |

O `fog` foi o achado que importa: ele é a cor de placeholder, e placeholder vive dentro de campo, cujo fundo é `--farol-surface`, não `--farol-night`. Calibrar contra o fundo mais escuro dava falso verde. O valor novo passa nos três fundos (night 5,58 · surface 5,03 · surface-alt 4,50).

`--farol-rule` sobre `--farol-night` dá 1,49 e isso é aceito: é divisória de 0,5px, não texto nem contorno de controle. Se em algum lugar ela virar a borda que identifica um campo, ali precisa de 3:1 (WCAG 1.4.11) e o token certo é outro.

### 2.2 O caso previsto aconteceu — `--farol-rule-control` (28/jul/2026)

A ressalva acima cobrou. O repo tinha `--input: var(--farol-rule)`, e `--input` é
justamente o token de contorno de controle do shadcn: o campo de CNPJ da `/demo`
(`border border-input bg-card`) media **1,34** sobre `--farol-surface`. O
preenchimento também não identificava o controle — `surface` sobre `night` dá 1,11 —
então a borda era o único sinal, e falhava 1.4.11. Achado pelo projeto do
claude.ai/design nas telas; confirmado no código.

Isto **não reabre a decisão travada nº 3**: nenhum valor da §2 mudou. É token novo,
que a própria §2.1 já previa ("o token certo é outro"), com o número na mesa.

`--farol-rule-control: #69808D` — mesmo matiz e saturação do `rule` (r:g:b em
0,745 : 0,908 : 1), no meio do caminho entre `rule` e `fog`:

| Par                                | Ratio | 1.4.11 (3,0) |
| ---------------------------------- | ----- | ------------ |
| `rule-control` sobre `night`       | 4,31  | passa        |
| `rule-control` sobre `night-deep`  | 4,58  | passa        |
| `rule-control` sobre `surface`     | 3,88  | passa        |
| `rule-control` sobre `surface-alt` | 3,48  | passa        |

Passa nos quatro fundos, não só nos dois em uso hoje — controle em linha zebrada ou
em hover de cartão já está coberto.

**Dois vizinhos do mesmo defeito**, achados ao varrer o resto e corrigidos junto:
o chip de empresa-exemplo usava `border-border` (1,49) e virou `border-input`; o
botão "Criar conta" usava `beam/40` (2,57) e subiu para `beam/60` (4,27).

**A régua, e onde ela se aplica.** Contorno de controle: **`--farol-rule-control`
(ou `border-input`, que resolve nele), ou um `beam` a 60%+** — piso 3:1, WCAG
1.4.11. Isso é régua de _borda_. **Texto tem outro piso: 4,5:1 (1.4.3), e ali
`beam/60` não serve** — texto âmbar sobre escuro usa `beam` cheio (9,73 sobre
`night`) ou `beam-bright` sobre `beam-soft` (10,44). Vale para o estado escolhido
de qualquer chip ou seletor.

**O padrão dos dois defeitos importa mais que os dois defeitos:** os primitivos do
shadcn deste repo já estavam certos — `input`, `select`, `textarea`, `toggle` e a
variante `outline` do `button` todos apontam para `border-input`, não para
`--border`. Quem falhou foi **controle feito à mão** direto na rota: um `<button>`
e um `<Link>` estilizados com `border-border`, porque `border` é o que a gente
digita sem pensar. Régua prática: **controle novo usa o primitivo do kit; se for
feito à mão, a borda é `border-input`, nunca `border-border`.**

Isso vale especialmente para os seletores de porte e gatilho da Fase 5 — o
controle mais clicado da ficha, com fundo transparente, onde a borda é o único
sinal. Se saírem do `Select`/`Toggle` do kit, já nascem certos.

Os campos de e-mail e senha (`login`, `signup`, `reset-password`) **já passavam** e
não foram tocados: usam `border-foreground/40`, que compõe para 3,42 sobre
`surface` e 3,49 sobre `night`. O estado focado usa `--farol-beam` — 8,76 sobre
`surface`.

---

## 3. Papéis semânticos

Re-bind no `styles.css` do repo, no mesmo formato do Cascata:

```css
--background: var(--farol-night);
--foreground: var(--farol-ink);
--card: var(--farol-surface);
--card-foreground: var(--farol-ink);
--primary: var(--farol-beam);
--primary-foreground: var(--farol-night-deep); /* texto escuro sobre âmbar */
--muted: var(--farol-surface-alt);
--muted-foreground: var(--farol-mist);
--accent: var(--farol-beam);
--border: var(--farol-rule); /* divisória: decorativa */
--input: var(--farol-rule-control); /* contorno de controle: 3:1 */
--ring: var(--farol-beam);
--destructive: var(--farol-danger);
```

Regra do sistema, mantida: **nunca editar `primitives.css` do DS-mãe.** Divergência do produto acontece aqui e no bloco de primitivos `--farol-*`.

---

## 4. Tipografia

Inalterada — é o que amarra a família. Fraunces (display, eixos `opsz`/`SOFT`/`WONK`) para títulos e números grandes; Inter Tight para UI e corpo. Uma nota de ofício para escuro: pesos finos de Fraunces esgarçam em fundo escuro, então título em `weight 500+`, nunca 300.

Números da ficha (capital social, CNPJ, score) usam `font-variant-numeric` tabular via `--farol-tnum` — alinham em coluna.

---

## 5. Motivo visual: o facho

Um só, usado com parcimônia:

- **Hero da landing** — gradiente cônico estático saindo do canto superior esquerdo, âmbar a 6–8% de opacidade sobre `--farol-night-deep`, esmaecendo em ~60% da largura. Estático. Sem animação em loop.
- **Estado de busca** — enquanto a ficha carrega, o facho faz **uma** varredura de 900ms e para. Movimento que significa "procurando", não decoração.
- **Em nenhum outro lugar.** Cartão, tabela e formulário são sóbrios; a luz é do hero e do momento de busca.

**Wordmark** — "farol" em Fraunces minúscula, tracking levemente negativo, com o ponto de luz no **"o"**: um disco `--farol-beam-bright` com halo curto. Componente `FarolWordmark.tsx`.

Medidas, do projeto do claude.ai/design (28/jul/2026), em `em` para escalar com a tipografia: **lente 0,50em · anel 0,10em · disco 0,204em · tracking −0,03em**, peso 600.

Três notas de ofício que custaram defeito e ficam registradas:

**A lente É o "o", não um enfeite sobre ele.** Por isso o componente é DOM e não SVG, divergindo do `CascataWordmark.tsx`: em `<svg><text>` não há como posicionar um elemento em relação a um glifo sem chumbar o avanço horizontal de "far" na Fraunces, número que muda com peso, `opsz` e versão da fonte. O glifo do Cascata fica _fora_ da palavra, então SVG serve lá. Diferença de geometria, não de gosto.

**`<text>` em .svg servido como documento isolado não vê a `@font-face` da página** — favicon e `<img src>` caem em fonte de sistema. Foi o que acontecia com `public/favicon.svg`, que além disso ainda era o "jps" roxo do DS-mãe. Regra: **asset de marca em .svg não leva texto.** O favicon é a lente sozinha, que é a redução que a §8 já previa.

**O anel é `currentColor`, não âmbar — e isso dispensa variante.** Primeira tentativa no repo pintou o anel de `--farol-beam` e quebrou: sobre o painel `bg-primary` das telas de auth, lente âmbar fica âmbar sobre âmbar e **desaparece** — a palavra lê "far l", sem uma letra. Resolvi com uma variante `onBrand`; o export do DS mostrou que a variante era desnecessária. Com o anel em `currentColor`, ele segue a cor da palavra em qualquer fundo e o componente não precisa saber onde está.

É também a leitura fiel desta seção: a §5 especifica **o disco** como `--farol-beam-bright` e não diz nada sobre o anel — porque o anel é a letra "o", e letra tem a cor do texto. O âmbar é a luz que mora dentro dela. Anel âmbar era invenção minha.

Construção final, do export (`Design/JPS DS Farol.zip`): anel `0.1em solid currentColor` num quadrado de `0.5em`; disco por `inset: 0.048em` — que no furo de 0,30em dá exatamente os 0,204em; halo curto por `box-shadow: 0 0 0.1em 0.028em` do beam-bright a 45%; e `margin: 0 -0.01em 0 0.028em` de acerto ótico, porque a lente é geometricamente perfeita e o "o" da Fraunces não é. Peso 500, `opsz 72`.

---

## 6. Componentes com identidade própria

Além do kit shadcn herdado:

1. **Badge de tier** — pílula com `--farol-tier-{a,b,c}` no texto e `*-soft` no fundo. Mostra a letra e o rótulo: **A · abordar agora**, **B · nutrir**, **C · revisitar** (fechados em 28/jul/2026; a fonte e o porquê de "revisitar" e não "observar" estão na armadilha 4 do glossário). Quando o pré-tier é parcial, ganha um sufixo discreto "parcial".
2. **Cartão da ficha** — três seções empilhadas com divisória `--farol-rule`: **Cadastro** (razão social, CNPJ, CNAE, porte, capital, sócios), **Stack** (chips das ferramentas detectadas, agrupadas por categoria), **Score** (badge de tier + os eixos que somaram, cada um com seu ponto).
3. **Chip de tecnologia** — nome + categoria, com um marcador de _como_ foi detectado (script, header, cookie…). Detecção por inferência (`implies`) vem com o marcador visualmente mais fraco — honestidade de procedência na UI.
4. **Estado vazio da busca** — o facho apagado e a linha "aponte o farol para uma empresa", com os chips de empresas de exemplo logo abaixo.
5. **Seletor de gatilho** — os 19 gatilhos como opções; ao escolher, o badge de tier recalcula na hora. É a peça que demonstra a mecânica da rubrica.

---

## 7. Claro e escuro

O produto é **dark-first**: a área logada e a demo existem só no escuro. Não haverá tema claro na v1 — dois temas é o dobro de superfície para manter e o produto é uma demonstração, não um SaaS com base instalada.

`--farol-paper` existe para dois casos pontuais: qualquer página que precise ser impressa e o eventual og-image claro. Não é um tema.

---

## 8. O que levar para o claude.ai/design

Ao criar o "JPS DS — Farol" como remix:

1. Os primitivos da seção 2 e os re-binds da seção 3.
2. Verificação de contraste AA dos pares de texto.
3. As cinco telas que valem desenhar: landing (hero com facho), demo vazia, ficha completa, ficha sem stack (o caso do site inacessível), estado de quota estourada.
4. Wordmark e favicon.
5. Os três componentes que não existem no kit: badge de tier, cartão da ficha, chip de tecnologia.

---

## Registro das decisões (27/jul/2026)

Detalhe das que estão na tabela do topo. **Nenhuma se reabre sem fato novo.**

1. **Dark-first.** Confirmado. A alternativa clara com roxo-vinho está descartada; a seção 1 fica como registro do porquê — não como opção ainda em aberto.
2. **Tagline: "O que as ferramentas globais não veem no Brasil."** Posicionamento antes de descrição — é a tese do briefing ("o Clay que entende CNPJ") dita sem citar concorrente. Para meta description e og, onde a frase precisa nomear a categoria, o subtítulo é "Ficha instantânea de empresas brasileiras: CNPJ, stack e prioridade em segundos."

3. **A palavra é "ficha", nunca "dossiê"** (27/jul). Em português do Brasil, "dossiê" carrega halo de investigação — virou vocabulário de escândalo político. O produto lê registro público, então a palavra trabalha contra ele. No código o tipo continua `dossier`, em inglês, seguindo a regra do glossário.
