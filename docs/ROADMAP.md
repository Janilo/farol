# Roadmap do Farol

Estado das fases e o que falta. Este arquivo substitui o plano que vivia em
`~/.claude/plans/`, fora de controle de versão — um roteiro de onze fases que
atravessa sessões precisa de histórico.

**Fases 0, 1 e 2 estão fechadas.** O produto está no ar em
[farol.pereirasaraiva.com](https://farol.pereirasaraiva.com) consultando o
cadastro da Receita Federal por CNPJ.

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

## Fase 3 — Cache de ficha

**A busca por nome saiu do escopo, e isso é fato sobre as fontes.** A rota
`publica.cnpj.ws/cnpj/search`, herdada do script Python que originou o
projeto, devolve `400 {"detalhes":"CNPJ inválido"}` — ela interpreta "search"
como um CNPJ no path. O endpoint não existe e nunca existiu; a busca por nome
daquele script também nunca funcionou. Implementar exige fonte com índice
textual: cnpj.ws pago, Casa dos Dados, ou o dataset do Minha Receita local.
Até lá, `searchCnpjByName` devolve `unavailable` e a tela diz que só consulta
por CNPJ, em vez de culpar a Receita por defeito nosso.

Sobra o cache, que é o que a fase entrega:

- Migration `fichas` (pk `cnpj`, `enrichment jsonb`, `technographics jsonb`,
  `domain`, `fetched_at`; RLS: só `service_role`). Cache com menos de 30 dias
  não bate na fonte.
- `src/lib/ficha.ts` puro (`assembleFicha`) testado com adapters falsos.

## Fase 4 — Tecnografia

É a cunha do produto: as ferramentas brasileiras que scanner global não vê.

- `src/lib/fingerprints.ts` — porta tipada do `tecnografias_br.json`, 24 entradas.
- `src/lib/technographics.ts` (puro) — `detectTechnologies(page, fingerprints)`.
  Três correções sobre o Python: `dom` casa contra atributos `class`/`id`, não
  substring no HTML inteiro; `cookies` contra `Set-Cookie` reais; `implies` em
  duas passadas até ponto fixo, sem depender de ordem de iteração.
- `src/lib/technographics.server.ts` — `fetchTargetSite`, timeout 8s, cap
  500 KB, com erro como estado de primeira classe
  (`unreachable | timeout | blocked`). Ficha sem stack nunca quebra.

  **A frase de cada estado, aprovada pelo Janilo em 28/jul/2026** — copy
  fechada, implementar literal:

  | Estado | Frase |
  |---|---|
  | `unreachable` | O site não respondeu ao endereço informado. |
  | `timeout` | O site demorou demais para responder. |
  | `blocked` | O site recusou a leitura. |

  Abaixo das três, fixa: **"O cadastro da Receita não depende disso."**

  Por que estas palavras, para ninguém "melhorar" depois: *"não respondeu ao
  endereço informado"* e não "não resolveu", porque resolver é vocabulário de
  DNS e a frase devolve a dúvida ao lugar útil — domínio errado no formulário
  é o caso comum e o único que o visitante conserta sozinho. *"demorou demais"*
  **sem número**, porque chumbar "8s" amarra a copy ao valor do adapter e a
  frase passa a mentir quando o timeout mudar. *"recusou a leitura"* e não
  "bloqueou", porque bloquear soa a acusação e o site está funcionando
  perfeitamente — só não quer ser lido por robô. E nenhuma das três diz
  "erro": não houve erro, a stack é opcional e a ficha entregue está completa
  no que prometeu.
- Domínio vem de campo opcional no formulário. Detecção por CNAME via
  DNS-over-HTTPS fica para depois: são 8 dos 24 fingerprints e uma chamada
  extra por consulta.

Nota para quem desenhar a tela: `Stone → Pagar.me` é o **único** `implies` que
existe nos 24. Um segundo exemplo de detecção inferida seria inventado.

**Dois marcadores temporários nas telas do claude.ai/design saem quando esta fase
entrar** (registrados pelo projeto de design em 28/jul, para não virarem copy
definitiva por esquecimento): `stack de exemplo · detector em construção` no
cabeçalho da seção de stack, e o rodapé de procedência da ficha sem stack, que
hoje diz `site não respondeu` para os três estados. O segundo já tem substituto
decidido — as três frases da tabela acima.

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

## Fase 6 — Quota da demo

Hoje **não existe limite nenhum**, e a única proteção é o rate limit da própria
fonte pública. Está registrado em [`../SEGURANCA.md`](../SEGURANCA.md).

1. Oito empresas pré-computadas como chips (seed em `fichas`) — caminho feliz
   sem custo upstream.
2. Cache compartilhado (Fase 3).
3. Migration `demo_lookups` com `visitor_hash` = sha256(IP + salt), **nunca IP
   cru**, e `src/lib/rate-limit.ts` puro: 5 consultas não-cacheadas por dia por
   visitante, 150/dia global. Estouro convida ao cadastro; conta aprovada tem
   50/dia.

## Fase 7 — Design system no claude.ai/design

Depende de o Janilo criar o projeto "JPS DS — Farol" a partir de
[`DESIGN.md`](DESIGN.md); as respostas de conteúdo das telas estão em
[`DESIGN-conteudo-telas.md`](DESIGN-conteudo-telas.md).

Os tokens **já estão no código e no ar** — esta fase agrega as telas
desenhadas, o wordmark refinado e o favicon, não o funcionamento. Se o zip
exportado divergir da §2 da spec, o repo ganha.

## Fase 8 — Área logada

Migration de auth e o portão de aprovação **já existem** (Fase 1). Falta a área
em si: `/app` com a mesma consulta da demo, quota maior e histórico das buscas.

Um gatilho de segurança registrado: nenhum serverFn usa `supabaseAdmin` hoje.
No dia em que um usar, ele **tem** que chamar `requireApprovedUser`, porque o
admin client bypassa RLS.

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

1. Criar o projeto "JPS DS — Farol" no claude.ai/design (Fase 7).
2. Exportar o zip para a pasta de design e sincronizar.

Nada disso bloqueia as fases 3 a 6, que são só código.
