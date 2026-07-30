# Roadmap do Farol

Estado das fases e o que falta. Este arquivo substitui o plano que vivia em
`~/.claude/plans/`, fora de controle de versão — um roteiro de onze fases que
atravessa sessões precisa de histórico.

**Fases 0, 1, 2, 3, 4 e 7 estão fechadas.** O produto está no ar em
[farol.pereirasaraiva.com](https://farol.pereirasaraiva.com) consultando o
cadastro da Receita Federal por CNPJ, com cache de 30 dias e detecção de
tecnografia brasileira a partir do site.

As decisões travadas estão em [`DESIGN.md`](DESIGN.md); os termos, em
[`../GLOSSARIO.md`](../GLOSSARIO.md). Nada aqui as reabre.

---

## ✅ Fase 0 — Specs aprovadas

Spec do design system ([`DESIGN.md`](DESIGN.md)) e linguagem ubíqua
([`../GLOSSARIO.md`](../GLOSSARIO.md)), as duas aprovadas em 27/jul/2026.

## ✅ Fase 1 — Repo no ar

Clone do Cascata reduzido ao molde comum, com o domínio dele removido. Worker
`farol` em `farol.pereirasaraiva.com`, projeto Supabase próprio, migration
única de auth sem `department`. Tokens `--farol-*` com contraste WCAG medido.

Três defeitos que só apareceram rodando, e o registro fica porque cada um é uma
armadilha do molde: layout pathless sem filhos colapsa para `/` e colide com a
index; `profiles.department` não existe mais e o layout ainda a pedia no
`select`; `font-light` em Fraunces sobre fundo escuro esgarça.

## ✅ Fase 2 — Consulta de ficha por CNPJ

Núcleo puro testado (`cnpj.ts`, `enrichment.ts`), adapter fino com I/O
(`enrichment.server.ts`) e a fatia (`ficha.functions.ts`) com união
discriminada em vez de exceção. Demo pública em `/demo`.

Dois achados que valem mais que o código:

**O CNAE vem como inteiro no payload.** `cnae_fiscal: 600001` — o zero à
esquerda se perde, e o CNAE da Petrobras é `0600-0/01`. Coberto por teste.

**O `porte` da Receita não dimensiona.** A escala tem três faixas (`01` micro,
`03` pequeno porte, `05` demais) e não existe "grande": BB, Petrobras e Ambev
voltam todas `DEMAIS`. Por isso `rubricPorte` vem de seletor na tela, nunca
derivado — decisão travada nº 8.

---

## ✅ Fase 3 — Cache de ficha

**A busca por nome saiu do escopo, e isso é fato sobre as fontes.** A rota
`publica.cnpj.ws/cnpj/search`, herdada do script Python que originou o
projeto, devolve `400 {"detalhes":"CNPJ inválido"}` — ela interpreta "search"
como um CNPJ no path. O endpoint não existe e nunca existiu; a busca por nome
daquele script também nunca funcionou. Implementar exige fonte com índice
textual: cnpj.ws pago, Casa dos Dados, ou o dataset do Minha Receita local.
Até lá, `searchCnpjByName` devolve `unavailable` e a tela diz que só consulta
por CNPJ, em vez de culpar a Receita por defeito nosso.

Sobra o cache, que é o que a fase entregou:

- Migration `fichas` — pk `cnpj` com `check` de 14 dígitos, `enrichment jsonb`,
  `technographics jsonb` e `domain` para a Fase 4, `fetched_at`. RLS ligada e
  **zero políticas**: `anon` e `authenticated` não passam, `service_role` passa
  por definição. Sem policy para alguém afrouxar sem perceber.
- `src/lib/ficha.ts` puro — `decideFromCache`, `isFresh`, `cacheAgeInDays`,
  `fichaFromSource`, `formatFetchedAt`. 15 testes, `agora` sempre injetado.
- `src/lib/ficha.server.ts` — adapter que **nunca lança**: falha de cache vira
  "siga sem cache", alto no log e silenciosa na tela.
- `getFichaFn` passou a devolver `Ficha` (com `fetchedAt` e `fromCache`) em vez
  de `Enrichment` cru, e a tela mostra "lido em DD/MM/AAAA" na procedência.

Três decisões que valem mais que o código:

**Cache velho + fonte fora do ar serve o velho, não erra.** É o terceiro caso
que justifica `decideFromCache` existir: sem ele, quem orquestra escreve
`if (fresca) servir; else buscar` e joga fora a única cópia que tinha quando a
Brasil API responde 503. A exceção é `COMPANY_NOT_FOUND` — se a fonte afirma que
o CNPJ não existe, isso é informação nova sobre o mundo e ganha do cache; servir
a cópia velha ali esconderia uma baixa cadastral.

**A tela diz quando a fonte foi lida, não que veio do cache.** Que o Farol tenha
cache é problema do Farol. O que muda a leitura de quem vê é a idade do dado.

**Guarda de forma na leitura.** O cache guarda o `Enrichment` já interpretado,
então mudar `extractEnrichment` deixa linha antiga com forma velha. Um `zod`
mínimo no esqueleto transforma isso em miss em vez de servir campo `undefined`
na tela — prefere trabalho a mentira.

## ✅ Fase 4 — Tecnografia

É a cunha do produto: as ferramentas brasileiras que scanner global não vê.
**Fechada em 28/jul/2026.**

### O que a fase entregou

- `src/lib/fingerprints.ts` — porta **gerada** do `tecnografias_br.json`, com
  `CATALOGO` exportado. Todos os literais do tamanho do catálogo foram varridos
  do código e da copy aprovada: nenhum número digitado sobrou.
- `src/lib/technographics.ts` (puro) — `extractSnapshot` (HTML → retrato),
  `detectTechnologies`, `stackFromSnapshot`, `normalizeDomain`, `isAllowedTarget`,
  `countLabel`. 44 testes.
- `src/lib/technographics.server.ts` — `fetchTargetSite`: 8s, teto de 500 KB lido
  em fluxo, redirect manual revalidado, erro como estado de primeira classe.
- `decideStackFromCache` em `ficha.ts` — a stack tem chave diferente do cadastro.
- Seção de stack na `/demo`, campo de site opcional, chips por categoria com o
  marcador da via e a evidência no tooltip.

### Cinco defeitos do motor Python, não três

O roadmap previa três correções. Ao ler o `detectar_tecnografias.py` apareceram
cinco, e as duas novas são as piores.

**`implies` estava invertido.** O JSON diz `Stone: implies: ["Pagar.me"]`, que na
convenção do Wappalyzer significa "se Stone foi detectado, Pagar.me também está".
O Python fazia `if implied in detected: matched = true` — concluía **Stone** a
partir de Pagar.me. Pagar.me é o adquirido e existe sem Stone, então a inferência
criava uma relação comercial que o dado não sustenta.

**O padrão de PIX era o literal `pix`.** Casa com `pixel.gif`, `pixi.js`, Facebook
Pixel e Pixabay — falso positivo em quase todo site com rastreamento. **PIX saiu do
catálogo** (decisão do Janilo, 28/jul), e não pelo padrão quebrado, que era
consertável: é que PIX **não discrimina nada**. Todo e-commerce brasileiro aceita,
então o achado não move priorização de conta nenhuma. E PIX é método de pagamento
— as outras 23 são empresas que a companhia contratou.

As três previstas: `dom` era substring no HTML inteiro, e errava nas duas direções
(`.vtex` casava com a palavra em prosa ou num comentário; `[data-pix]` **nunca**
casava, porque o `lstrip("#.")` deixava os colchetes e a string literal com
colchetes não existe no HTML); `cookies` era substring no HTML em vez dos
`Set-Cookie`; `implies` dependia da ordem de iteração do dicionário.

E uma sexta que o roadmap também não previa: **`scripts` casava contra o HTML
inteiro**, então `pagar\.me` casava com a palavra em prosa. Aqui casa contra as
URLs extraídas do documento.

### Ordem das vias é força de prova

Header → script → meta → cookie → dom, e **não** a ordem do Python. Header
proprietário como `X-VTEX` é quase conclusivo: só o próprio produto o emite. Nome
de classe de CSS é o mais fraco — é escolha de quem escreveu o HTML e pode
coincidir. Cada ferramenta aparece uma vez, com a via mais forte que casou,
porque é um marcador por chip na tela.

`Stone → Pagar.me` é o **único** `implies` do catálogo, e há teste fixando isso.
Um segundo exemplo de detecção inferida na tela seria inventado.

### `empty` é achado, não ausência — e por isso é ramo próprio

`StackResult` é união `ok | empty | error`, e a ficha carrega
`stack: StackResult | null`, onde `null` é **nem tentou**. Dois campos opcionais
(`technologies?` + `error?`) deixariam representar estado ilegal e perderiam
justamente o `empty`.

Na tela: nos três `error` a seção **não existe**; no `empty` ela **existe**, com
uma linha no lugar dos chips. "Nenhuma das 23" diz que a empresa não roda nada do
catálogo brasileiro, o que é informação sobre a empresa. Se a seção sumisse nos
dois, o achado ficaria indistinguível de "nem tentou".

`stackFromSnapshot` existe para tornar `{ status: "ok", technologies: [] }`
inatingível: zero detecções é `empty`, e quem chama não escolhe.

### Copy, aprovada e travada

Frases por estado de falha (28/jul/2026) — implementadas literais:

| Estado | Frase |
|---|---|
| `unreachable` | O site não respondeu ao endereço informado. |
| `timeout` | O site demorou demais para responder. |
| `blocked` | O site recusou a leitura. |

Abaixo das três, fixa: **"O cadastro da Receita não depende disso."**

Estado `empty` (aprovado 28/jul, **com** o número): *"O site foi lido. Nenhuma das
{CATALOGO} ferramentas do catálogo apareceu."* O número carrega a informação de
escala, que é parte do que faz o achado ser achado — "nenhuma das 23" diz que a
busca foi ampla. Interpolado de `CATALOGO`, nunca literal.

**Hierarquia, não frases de igual peso:** o estado sai em `--farol-fog` e a linha
fixa em `--farol-mist`, um passo mais clara. A inversão é de propósito — com o
mesmo tom o visitante lê a de cima e para, e a de cima é a que não interessa. Quem
faz o trabalho é a linha fixa: ela impede a leitura de que a ficha inteira falhou.
Medido: `fog` 5,58 e `mist` 8,44 sobre o fundo do cartão, ambos AA.

Token de procedência por status: `ok` → `N ferramentas` (singular em 1, e há
teste); `empty` → `lido · nenhuma das N`; `error` → a frase no rodapé, fora do
token, porque rodapé é lista de fontes e sentença dentro de token mistura dois
registros.

Por que estas palavras, para ninguém "melhorar" depois: *"não respondeu ao
endereço informado"* e não "não resolveu", porque resolver é vocabulário de DNS e
a frase devolve a dúvida ao lugar útil — domínio errado no formulário é o caso
comum e o único que o visitante conserta sozinho. *"demorou demais"* **sem
número**, porque chumbar "8s" amarra a copy ao valor do adapter. *"recusou a
leitura"* e não "bloqueou", porque o site está funcionando e só não quer ser lido
por robô. Nenhuma diz "erro": a stack é opcional e a ficha entregue está completa
no que prometeu.

### O portão de SSRF

A fase inverteu quem escolhe o destino da requisição: o visitante informa o
endereço e **o servidor busca**. Duas travas, detalhadas em
[`../SEGURANCA.md`](../SEGURANCA.md) — e a segunda é a que costuma faltar:
**redirect é seguido à mão com revalidação a cada salto**, porque `fetch` seguindo
redirect sozinho fura qualquer validação feita só na entrada.

### Por que regex e não HTMLRewriter

`HTMLRewriter` seria o caminho nativo da Cloudflare, e **não existe no Node** —
então `pnpm dev` quebraria e o desenvolvimento deixaria de exercitar este caminho.
Paridade dev/produção venceu elegância de parser. O alvo é curto (atributos e
`<meta>`) e o corpo já vem com teto. O que se perde ao não ter árvore é
aninhamento e ordem, e a detecção não usa nenhum dos dois.

### Verificado com site real (28/jul/2026)

Os quatro estados, contra sites de verdade, através do adapter:

| Alvo | Resultado |
|---|---|
| `omie.com.br` | `ok` — Omie via script; redirect para `www` seguido; corpo truncado no teto |
| `resultadosdigitais.com.br` | `ok` — RD Station CRM; **redirect entre domínios** para `www.rdstation.com`, revalidado |
| `ambev.com.br` | `empty` — leu e não achou nada do catálogo |
| `bb.com.br`, `petrobras.com.br` | `blocked` — recusaram a leitura |

**Uma sonda de rede foi escrita e removida.** Teste que bate em site de terceiro
não entra no CI: deixaria o CI instável e faria requisição a terceiros a cada push.

### O que ficou de fora, e o custo

**Detecção por CNAME não roda.** Oito dos 23 têm padrão de `cname` (Sankhya, Omie,
Conta Azul, Loja Integrada, VTEX, PipeRun, Moskit, Ploomes) e exigiria uma chamada
DNS-over-HTTPS por consulta. **Custa sensibilidade, não cobertura:** os oito têm
padrão de `scripts` também, então nenhuma ferramenta fica indetectável — só fica
mais difícil de achar quando a empresa usa o produto em subdomínio próprio sem
carregar script do fornecedor.

**5xx cai em `unreachable`.** A frase fica esticada para um 500, que respondeu com
erro. Esticada de propósito: um quarto estado exigiria copy nova e aprovação, e o
efeito para quem lê é idêntico (ficha sem stack). Se a distinção passar a importar,
o conserto é um estado e uma frase, não uma gambiarra.

**O marcador `stack de exemplo · detector em construção` sai das telas do
claude.ai/design** — é o último temporário que restava lá, e agora o detector
existe.

## Fase 5 — Pré-tier interativo

- `src/lib/tier.ts` (puro) — porta de `compute_pre_tier`: setor core +1;
  Scale-up ou Grande +1; gatilho urgente {G1,G4,G7,G12,G13,G15,G19} +2 e médio
  {G2,G3,G5,G6,G11,G14,G16,G17,G18} +1; caminho quente {G12,G13} +1;
  **Grande sem caminho quente −1 e teto C**. Corte: ≥4 A, ≥2 B, senão C. Teto
  rebaixa, nunca promove. `TierResult` com `partial`, `reasons[]`, `caps[]`.
- `src/lib/triggers.ts` — os 19 gatilhos com id, rótulo PT e urgência.
- UI: **dois seletores que recalculam ao vivo** (puros, rodam no cliente):
  gatilho, 19 opções, e porte, três opções. Texto fixo dizendo que o eixo de
  alcance é premissa do operador calibrada para consultor solo, com link para
  `/metodologia`.
- **Contraste:** saem do `Select`/`Toggle` do kit, que já apontam para
  `border-input`. Se forem feitos à mão, a borda é `border-input`, nunca
  `border-border` — foi assim que os chips de exemplo nasceram em 1,49
  (DESIGN.md §2.2). No estado escolhido, o piso do texto é 4,5, não 3.

## ✅ Fase 4.2 — O teto de leitura escondia achado

Aberta em 30/jul/2026 pela varredura de candidatos a chip da Fase 6, que rendeu
duas detecções de terceiro em 24 sites. Investigando o motivo, o defeito apareceu:

| Medida | Valor |
|---|---|
| HTML de `farmrio.com.br` | 609.886 bytes |
| `MAX_BYTES` de então | 512.000 |
| Onde aparece `vtexassets.com` | byte 609.358 |

O fingerprint do VTEX **já casava** esse padrão. O detector devolvia `empty`, que
na tela diz "li o site e não achei nada", quando o certo era "li menos da metade
do site". Vitrine moderna embute JSON grande no documento — a Farm roda deco.cx —
e as URLs de CDN do fornecedor caem no fim.

Teto para 2 MB. Efeito medido na re-varredura: Farm passou de `empty` a VTEX, e a
C&A também apareceu. Extração mais lenta ficou em 1,7 s com o fetch incluso.

**Uma hipótese minha que a medição derrubou**, e que teria virado código à toa: eu
tinha diagnosticado dois defeitos, o segundo sendo ocorrência percent-encoded
(`vtex%2Floaders%2F`, no byte 172.118). Fui ver em que atributo estava: em nenhum —
está dentro de um `<script>`. O detector lê URLs e não corpo de JS, de propósito,
porque ler JS traz falso positivo em massa. Era um defeito só.

**Segunda rodada, 44 sites, e um falso positivo.** A varredura ampla rendeu quatro
detecções boas (Telhanorte, Pague Menos, Oceane por VTEX; Movidesk por Zenvia) e
uma falsa: `octadesk.com` como VTEX + Nuvemshop, pela via `dom`. A Octadesk carrega
6 classes exatamente `vtex` e 7 exatamente `nuvemshop` — é a seção de integrações.
Ela integra com as duas e não roda nenhuma.

O seletor que é o **slug do fornecedor** detecta o oposto do que promete: quem fala
dele, não quem o usa — e página de integrações de concorrente é o lugar onde esse
nome mais aparece. `.vtex`, `.nuvemshop` e `.nuvem-shop` saíram, aqui e no
`tecnografias_br.json`. Ficam os seletores que a plataforma **emite**:
`.mercadopago-button` é classe do SDK, `#jivo_chat_widget` e `#blip-chat` são ids de
widget, e id não vira nome de logotipo. Custo em recall: zero observado — nas 68
sondagens do dia, toda detecção legítima veio por `script`.

**O achado maior é sobre o método, não sobre um bug.** Das 8 detecções reais
acumuladas, 7 são VTEX; a exceção é Movidesk → Zenvia. VTEX serve assets de
`vtexassets.com` e por isso aparece na URL. RD Station, Omie, Totvs, Sankhya, Conta
Azul e os CRMs rodam no servidor ou entram por gerenciador de tags depois do
documento inicial. Ler só o documento inicial é decisão de projeto — sem navegador,
sem execução de JS —, e a consequência é que **a tecnografia demonstra bem
plataforma de e-commerce e mal o resto do catálogo.** Isso vai para a tela em vez de
ficar implícito: a demo diz o viés.

**Correção de fato falso no repo**, achada no mesmo caminho: o cabeçalho de
`fingerprints.ts` afirmava que o script de geração estava no commit da Fase 4. Não
está — nunca foi commitado. O arquivo foi gerado uma vez e hoje é mantido à mão,
o que significa que mudar um fingerprint exige mudar também o JSON, senão o motor
Python e o Farol discordam em silêncio.

## ✅ Fase 6 — Quota da demo

Feita em 30/jul/2026, **antes** da Fase 9 de propósito: a 9 é o que coloca o Farol no
site institucional e cria tráfego, e fazer a 9 primeiro seria criar a demanda antes do
portão. O risco era teórico só porque ninguém sabia que o produto existia.

1. ✅ **Oito empresas pré-computadas como chips**, fechado em 30/jul/2026. Seed em
   `supabase/migrations/20260730180000_farol_seed_chips.sql`, e cada par CNPJ↔site tem
   procedência: o CNPJ saiu do rodapé do próprio site (loja virtual é obrigada a
   publicá-lo, Decreto 7.962/2013, então o par se autovalida), foi conferido na Brasil
   API contra a marca, e a stack veio do detector rodando contra o site.

   **Petrobras e Banco do Brasil saíram.** Eram anti-exemplos: nenhuma das 23
   ferramentas aparece em empresa daquele porte, então os chips demonstravam o produto
   não achando nada — e são empresas que ninguém prospecta com este método. A Ambev
   ficou como `empty` deliberado.

   **Sete dos oito são VTEX, e isso é limite do produto, não da curadoria.** Em ~50
   empresas varridas, nenhuma detecção de terceiro fora de VTEX sobreviveu ao
   escrutínio. Ler HTML inicial enxerga bem plataforma de e-commerce e quase nada mais:
   ERP não aparece em site institucional, CRM idem, SDK de pagamento carrega no
   checkout e chat entra por JS assíncrono. Isso pesa no discurso da Fase 9.

   A varredura pagou por si: achou os dois falsos positivos consertados na Fase 4.2 e o
   teto de leitura. **Uma candidata foi descartada por julgamento, não por medição** —
   a Movidesk detecta Zenvia por `<iframe src>`, o que está correto, mas a Zenvia é
   dona da Movidesk e aquilo é infra da matriz. Tecnografia não distingue fornecedor de
   controlador, e nenhum código conserta isso.
2. ~~Cache compartilhado~~ — **feito na Fase 3.**
3. ✅ `demo_lookups` com `visitor_hash` = sha256(IP + salt) e `src/lib/rate-limit.ts`
   puro: 5 novas/dia por visitante anônimo, 150/dia global, 50/dia para conta aprovada
   (que só passa a ser alcançável na Fase 8).

O que a implementação decidiu e o plano não previa:

- **Contador, não log.** A forma óbvia — uma linha por consulta e `count(*)` na hora
  de decidir — tem corrida: duas requisições paralelas leem 4 e ambas passam. Aqui o
  incremento e a leitura são a mesma transação (`bump_demo_quota`), então a decisão usa
  o número que ela mesma produziu. Efeito colateral aceito de propósito: **tentativa
  negada também consome.** Negação de graça é convite a insistir.
- **Falha fechado**, ao contrário de todo o resto do produto. Salt ausente, banco fora
  do ar ou contrato quebrado da função → recusa. Quota que falha aberta é ausência de
  quota com a tela idêntica, que é exatamente o defeito que esta fase fecha. A
  consequência é que **`DEMO_HASH_SALT` virou requisito de deploy** — e requisito de
  `.env` local, se quiser exercitar consulta nova fora do cache.
- **A unidade contada é consulta que sai para a rede**, não requisição. Cache hit é
  grátis. O portão fica depois das duas decisões de cache e antes de qualquer `fetch`.
- **Nega a consulta inteira** quando só a stack precisaria de rede e o cadastro estava
  em cache. Servir o cadastro com `stack: null` seria pior: `null` significa "nem
  tentou" (armadilha 5 do glossário), e usá-lo para "não te deixei tentar" devolve
  silêncio a quem digitou um site.
- **O nome do secret veio do `.env.example`**, que já reservava `DEMO_HASH_SALT` antes
  de existir código lendo. Eu tinha escrito `DEMO_QUOTA_SALT` e o exemplo apontaria
  para variável que ninguém lê — sintoma seria a quota "não funcionar" em produção com
  o secret configurado.
- **O dia é o de Brasília, não UTC.** Em UTC o dia viraria às 21h de quem está usando,
  e quota nova de madrugada é o furo mais óbvio de um limite diário.

**O teste em produção achou um defeito da Fase 4, corrigido no mesmo dia.** O campo
de site não limpava ao trocar o CNPJ. Clicar num exemplo (que preenche os dois
campos) e digitar outro CNPJ mandava o par errado ao servidor, e o cache
compartilhado gravou um MEI de São Vicente com `domain: ambev.com.br`. A linha foi
apagada. Duas travas: a UI limpa o site quando o CNPJ muda, e `decideStackFromCache`
deixou de servir o par guardado a quem não pediu site. A segunda é a que vale — o
servidor não tem como saber se o par digitado é verdadeiro, então a trava fica na
afirmação, não na gravação. Ver armadilha 8 do glossário.

Sobra dali um flanco menor, **não corrigido**: quando o cadastro vence os 30 dias e é
relido sem site informado, a gravação zera `domain` e `technographics` da linha. Não
afirma nada falso, só perde a leitura e obriga a reler o site depois. Comportamento
anterior a esta fase.

**O que NÃO foi verificado no navegador, e por quê.** O botão de preview não sobe:
ele falha com `This project is configured to use 10.18.0 of pnpm. Your current pnpm is
v11.17.0` **antes** de chegar ao comando — trocar `runtimeExecutable` para o binário do
vite não muda nada, testado em 30/jul/2026 com caminho relativo e absoluto. Ou seja,
`.claude/launch.json` não é a alavanca; o pnpm do ambiente do preview é que resolve por
corepack para outra versão. No terminal normal `pnpm --version` devolve 10.18.0 e tudo
roda. A verificação da quota é em produção, depois do secret.

## ✅ Fase 7 — Design system no claude.ai/design

Projeto criado e exportado em 28/jul/2026 (`Design/JPS DS Farol.zip`): oito
pranchas, app navegável de seis rotas, e os 25 tokens batendo com o repo.

O que voltou de lá e virou correção no código: o anel da lente é `currentColor`
e não âmbar (a variante `onBrand` que eu tinha criado era desnecessária); o
halo curto que a §5 pedia e eu tinha omitido; `--farol-rule-control` como token
de contorno de controle; `.ico` de quatro resoluções e `apple-touch-icon`, que
o repo não tinha.

Marcador temporário que sobra nas telas: `stack de exemplo · detector em
construção`, que sai com a Fase 4.

## Fase 8 — Área logada

Migration de auth e o portão de aprovação **já existem** (Fase 1). Falta a área
em si: `/app` com a mesma consulta da demo, quota maior e histórico das buscas.

**A regra do `supabaseAdmin` mudou de forma na Fase 3**, porque o cache passou
a usá-lo. A antiga — "quem usar `supabaseAdmin` chama `requireApprovedUser`" —
estava certa no espírito e larga demais na letra: `fichas` não tem dono e o
conteúdo é público, então exigir aprovação ali fecharia a demo em vez de
protegê-la. A forma precisa está em [`../SEGURANCA.md`](../SEGURANCA.md):
**quem usa `supabaseAdmin` tem que declarar qual autorização substitui a RLS
que contornou.** Tabela com dono → `requireApprovedUser`. Tabela sem dono e
pública → nenhuma, escrita. O inaceitável é não responder à pergunta.

Na área logada, que **tem** dono, a resposta volta a ser `requireApprovedUser`.

Teste de RLS mínimo, no padrão do Lente: `anon` não lê `fichas` nem
`demo_lookups`; `authenticated` não escreve em `fichas`.

## Fase 9 — Site institucional

Em `Janilo/jp-saraiva-site`: incluir o Farol em `src/content/services.ts` e em
`src/routes/produtos.tsx` — hoje a página diz "três produtos" e o título da
seção lista só Lente, Prisma e Cascata. Com quatro itens, remover o div filler
do grid. Conferir og e description.

## Fase 10 — Auditoria

`AUDITORIA-ARQUITETURA.md` no formato dos irmãos: os cinco princípios avaliados
módulo a módulo, meta 100%. `SEGURANCA.md` e `README.md` já estão escritos.

**Verificação:** `pnpm test` → `pnpm typecheck` → `pnpm dev` (fluxo completo) →
`pnpm build` → push → smoke em produção. O runtime da Cloudflare já foi
verificado com dado real na Fase 2; o `fetch` para host externo funciona no
`workerd`.

---

## O que ainda depende do Janilo

**Uma coisa, e ela bloqueia a Fase 6 em produção: o secret `DEMO_HASH_SALT` no
Worker.** Qualquer string longa e aleatória serve; ela nunca sai do servidor. Sem
ela, a demo passa a recusar consulta de empresa nova com "não consegui apurar o
limite de consultas agora" — porque a quota falha fechado, por desenho. Consulta de
empresa já em cache continua funcionando.

Fora isso, duas escolhas de produto, nenhuma bloqueante:

- **Quais oito empresas viram chip** (item 1 da Fase 6). É vitrine, então é decisão
  dele. Cada uma precisa do par CNPJ↔site conferido.
- **A copy dos três estados de quota** em `demo.tsx` (`QUOTA_VISITANTE`,
  `QUOTA_GLOBAL`, `QUOTA_INDISPONIVEL`), escrita mas não aprovada.

As duas pendências anteriores fecharam em 28/jul/2026: a copy do estado
`empty` foi aprovada (com o número), e a `SUPABASE_SERVICE_ROLE_KEY` está no
Worker — verificado em produção, com linha nascendo na tabela e a segunda consulta
vindo do cache.

Uma nota de ambiente: o `.env` local tem a linha da service role **comentada**, de
propósito ou não. O efeito é que `pnpm dev` roda com o cache em no-op — a consulta
funciona e o log traz `ConfigError`. Quem desenvolver aqui exercita o caminho sem
cache, que é o que mais quebra; quem quiser exercitar o cache localmente
descomenta a linha.

As fases 5, 6, 8, 9 e 10 são só código.
