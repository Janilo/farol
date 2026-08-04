# Auditoria de Arquitetura — Farol

> Base: `Janilo/farol`, commit `a633bf8` (03/ago/2026). Stack: TanStack Start · React 19 · Vite · Cloudflare Workers · Supabase · Zod · Tailwind 4 · shadcn.
> Referência: Matt Pocock, "Software Fundamentals Matter More Than Ever" (https://www.youtube.com/watch?v=v4F1gFy-hqg).
> Escopo: **arquitetura** — módulos, fatias verticais, interfaces, ocultação de informação, testes. A auditoria de design system é o `docs/DESIGN.md`; a de segurança é o [`SEGURANCA.md`](SEGURANCA.md).

> **Nota sobre a meta.** O roadmap pedia "meta 100%". Auditoria que se obriga a fechar em verde não é auditoria — é carimbo. Esta fechou em **três verdes e dois amarelos**, com cinco achados, sendo **um deles contra a Fase 5, escrita horas antes desta auditoria**. O 100% fica como alvo dos achados, não como resultado declarado.

> **✅ Os cinco achados foram corrigidos na mesma sessão** (decisões dele, 03/ago/2026), e as seções abaixo estão marcadas. O texto do diagnóstico foi mantido no passado, porque um achado que some depois de resolvido tira da próxima pessoa a razão pela qual a decisão foi tomada.

---

## Sumário executivo

O Farol nasceu de um clone do Cascata, e a comparação com a auditoria irmã é o dado mais útil aqui: **os três achados P0 do Cascata não existem neste repo.** Não há matemática do produto reimplementada em cinco telas, não há escrita do browser direto na tabela furando a fatia, e não há ausência de test runner — são 169 testes cobrindo todos os núcleos puros. A separação núcleo-puro / adapter-com-I/O foi aplicada com disciplina desde a Fase 2, e é ela que sustenta as três notas verdes.

O que sobra é de outra natureza, e cabe em uma frase: **o produto carregava estruturas de coisas que não existem.** Uma busca por nome que nunca funcionou tinha tipo, caminho de código, mensagem de erro e tela inteira (A2, resolvido); duas edge functions do Cascata seguiam no repo com `service_role` (A4, resolvido); e o termo que o glossário criou de propósito para evitar o bug mais caro do Cascata foi contrariado pela fase mais recente (A1, resolvido). Nenhum desses é falha de execução tática — são exatamente os pontos onde a estratégia se perde quando cada fase é escrita bem por conta própria.

| Princípio                                      | Nota  | Veredito em uma linha                                                                                                                                                                   |
| ---------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Linguagem ubíqua (DDD)                      | 🟡→🟢 | Glossário forte e seguido no cadastro e na tecnografia. A Fase 5 introduziu `Porte` onde o glossário exige `rubricPorte`; **corrigido nesta sessão** (A1). Resta o rótulo da tela.      |
| 2. Fatias verticais                            | 🟢    | **Zero** escrita do browser direto na tabela. Toda mutação passa por `serverFn`; a consulta é uma fatia limpa de ponta a ponta. É o achado A6 do Cascata já resolvido por desenho.      |
| 3. TDD                                         | 🟡→🟢 | 190 testes: todos os núcleos puros, a Fase 5 conferida contra o Python em 2268 casos e, desde 03/ago, **a composição do orquestrador** (A5). Os adapters seguem sem teste, por desenho. |
| 4. Módulos profundos (Ousterhout)              | 🟢    | `ficha.ts`, `technographics.ts`, `rate-limit.ts` e `tier.ts` são profundos de verdade: interface pequena, decisão difícil dentro, razão documentada.                                    |
| 5. Ocultação de informação & design de sistema | 🟢    | `supabaseAdmin` contido em 3 arquivos server, com a regra de autorização escrita e respondida caso a caso no `SEGURANCA.md`. A ressalva das 3 funções por RPC foi fechada (A3).         |

---

## A arquitetura em uma tela

```
src/
  lib/
    cnpj.ts                  ← validação de dígitos (puro)                    ◀ MÓDULO PROFUNDO
    enrichment.ts            ← payload da Receita → Enrichment (puro)
    enrichment.server.ts     ← fetchCnpj (I/O). A busca por nome saiu — achado A2
    ficha.ts                 ← decideFromCache / decideStackFromCache (puro)  ◀ MÓDULO PROFUNDO
    ficha.server.ts          ← leitura e gravação do cache (supabaseAdmin)
    ficha.functions.ts       ← resolverConsulta (a fatia, testável) + getFichaFn (casca)
    technographics.ts        ← extractSnapshot / detectTechnologies (puro)    ◀ MÓDULO PROFUNDO
    technographics.server.ts ← fetchTargetSite: 8s, teto de leitura, redirect
    fingerprints.ts          ← catálogo GERADO de tecnografias_br.json
    rate-limit.ts            ← decideQuota (puro)                             ◀ MÓDULO PROFUNDO
    rate-limit.server.ts     ← consumirQuota: bump atômico (supabaseAdmin)
    tier.ts / triggers.ts    ← porta de compute_pre_tier (puro)               ◀ MÓDULO PROFUNDO
    require-approved.ts      ← gate server-side · has_role vive em `private` (A3)
    errors.ts / error-codes.ts ← erros tipados, canônicos com os irmãos
  routes/
    demo.tsx                 ← a consulta pública
    index.tsx · metodologia.tsx · login/signup/reset · _authenticated/app.tsx
supabase/
  migrations/ (5)            ← auth, cache de fichas, quota, seed dos chips
                               (as edge functions do Cascata saíram — achado A4)
```

O **seam** (onde a lógica se parte entre runtimes):

```
                    BROWSER (React 19)
        ┌──────────────────┴────────────────────┐
        │ consulta                    │ pré-tier (Fase 5)
        ▼                             ▼
  useServerFn(getFichaFn)      computePreTier()  ← puro, roda no cliente,
        │                             │            NÃO consome quota
        ▼                             └── nunca cruza o seam
  Cloudflare Worker (serverFn)
   • quota ANTES de qualquer fetch  ✅ falha fechado
   • decideFromCache / decideStackFromCache
   • supabaseAdmin (bypassa RLS, com autorização declarada)
        │                    │                    │
        ▼                    ▼                    ▼
   Brasil API          site do alvo         Supabase Postgres
   (cadastro)          (tecnografia)        RLS ligada, ZERO policies
                                              has_role em schema `private`
```

Duas escolhas de seam que valem registro. **A quota fica no Worker, antes do primeiro `fetch`** (`ficha.functions.ts:113`) — é o único ponto do fluxo onde se sabe se a consulta vai custar saída de rede, e a unidade contada é isso, não requisição. E **o pré-tier nunca cruza o seam**: é cálculo puro no cliente, então mexer na rubrica não consome quota nem gera carga. As duas decisões são coerentes com o que o produto cobra.

---

## 1 — Linguagem ubíqua 🟡

**O que está certo.** O `GLOSSARIO.md` não é decorativo: ele define 22 termos com grão e idioma, e o código segue. `fingerprint` (a regra) e `detection` (o achado) são distinguidos consistentemente em `technographics.ts`; `stack`, `ficha`, `enrichment` e `snapshot` aparecem com o mesmo sentido do schema ao botão. O caso mais forte é `RfbPorte` em `enrichment.ts:42`, com o comentário em `:60` — _"Faixa da Receita. NÃO é o porte da rubrica."_ O tipo carrega o qualificador no nome, exatamente como a armadilha 2 do glossário manda.

**Onde vaza — e o furo é da fase mais recente.** O glossário criou `rubricPorte` (`GLOSSARIO.md:37`) com nome híbrido **de propósito**, e a armadilha 2 (`GLOSSARIO.md:46`) explica por quê: confundir a escala da Receita com a da rubrica é _"a receita completa do bug do Cascata"_. A Fase 5 chamou o tipo de **`Porte`** e o rótulo da tela de "Porte" (`PreTier.tsx`), sem qualificador nenhum. **Corrigido nesta sessão:** o tipo é `RubricPorte` (`tier.ts:32`), e o comentário acima dele registra por que o nome é longo.

O efeito é uma inversão desconfortável: no mesmo repo, o porte que **não** entra no score é o qualificado (`RfbPorte`), e o que **entra** é o genérico (`Porte`). Quem abrir `tier.ts` primeiro não tem como saber qual dos dois está lendo — que é precisamente a ambiguidade que o nome híbrido foi inventado para fechar. Não há bug hoje, porque os dois tipos nunca se encontram numa mesma função; o defeito é que a próxima pessoa a juntá-los não vai ser avisada pelo nome.

> Este achado é contra código escrito horas antes desta auditoria, na mesma sessão. Está aqui porque uma auditoria que poupa o trabalho recente do próprio auditor não vale a leitura.

---

## 2 — Fatias verticais 🟢

A consulta é uma fatia limpa e única: `demo.tsx` → `getFichaFn` (`ficha.functions.ts:164`) → decisões puras de cache → adapters de I/O → Postgres. A rota não conhece Supabase, não monta query e não sabe o que é `supabaseAdmin`; ela recebe `FichaResult`, uma união discriminada, e escolhe a frase.

**O achado A6 do Cascata não existe aqui.** Uma varredura por `supabase.from(`, `.insert(`, `.upsert(`, `.update(` e `.delete(` em `src/routes/` e `src/components/` volta **vazia**: nenhuma escrita sai do browser direto para a tabela. Só existem duas `serverFn` no repo (`auth.functions.ts` e `ficha.functions.ts`), e toda mutação passa por uma delas. No Cascata, essa era a fatia furada em três telas.

O erro atravessa a fatia com tipo, não com string: `FichaError` (`ficha.functions.ts:29`) é um union de nove códigos, e a tela mapeia código → frase. Três códigos distintos só para quota (`:36–38`) porque são três conversas diferentes — o visitante estourou o dele, a casa estourou o do dia, ou a quota não pôde ser apurada, e essa última não pode acusar o visitante de algo que é falha nossa.

---

## 3 — TDD 🟡

**169 testes em 10 arquivos**, e a distribuição mostra que o esforço foi para onde a decisão é difícil:

| Arquivo                                                   |  Testes | O que protege                                           |
| --------------------------------------------------------- | ------: | ------------------------------------------------------- |
| `technographics.test.ts`                                  |      52 | detecção, vias, normalização de domínio, alvo permitido |
| `tier.test.ts`                                            |      28 | rubrica, cortes, tetos, paridade com o Python           |
| `ficha.test.ts`                                           |      25 | as três saídas do cache e a chave separada da stack     |
| `rate-limit.test.ts`                                      |      15 | fronteira do limite, dia de Brasília                    |
| `cnpj.test.ts` · `enrichment.test.ts`                     | 13 + 13 | dígitos verificadores, CNAE com zero à esquerda         |
| `errors` · `error-codes` · `access` · `rate-limit.server` |      23 | erros tipados, gate de acesso                           |

A Fase 5 foi além do repo: a porta de `compute_pre_tier` foi conferida contra o **Python original em 2268 casos**, com 100% de paridade, e `tier.test.ts` guarda um espelho das constantes de urgência que quebra se um dos dois lados mudar sozinho.

**O buraco é o orquestrador.** `ficha.functions.ts` não tem teste — e é o módulo com mais ramos do repo: ordem entre quota e `fetch`, stack em paralelo com cadastro, `stale` servido quando a fonte cai, a exceção do `COMPANY_NOT_FOUND` que ganha do cache, a promessa aguardada para não vazar no Worker (`:142`). Cada peça que ele chama é testada isoladamente; **a composição não é.** É o lugar onde um refactor futuro pode inverter a ordem de dois `await` e passar em toda a suíte.

Os adapters (`*.server.ts`) também não têm teste, o que é defensável — eles são finos de propósito e testá-los exigiria dublar rede e banco.

---

## 4 — Módulos profundos (Ousterhout) 🟢

Quatro módulos com a proporção certa entre interface e implementação:

- **`ficha.ts`** — a interface é `decideFromCache(row, agora)`. Atrás dela mora a decisão que só aparece no terceiro caso: cache velho **e** fonte fora do ar não é erro nem recusa, é servir o velho dizendo que é velho. O comentário em `:84–92` registra que, sem essa função, quem orquestra escreveria `if (fresca) servir; else buscar` e jogaria fora a única cópia disponível quando a Brasil API responde 503.
- **`decideStackFromCache`** (mesmo arquivo) — resolve uma armadilha real, reproduzida em produção: a linha do cache é indexada por CNPJ, mas a stack depende do **domínio**. Sem a separação, consultar o CNPJ X informando `a.com` e depois `b.com` devolveria a stack de `a.com` rotulada como de `b.com` — dado errado com cara de procedência, o pior defeito possível neste produto.
- **`rate-limit.ts`** — `decideQuota` recebe contadores **já incrementados**, e o comentário em `:38–50` explica que isso não é implementação vazando: o incremento e a leitura têm que ser a mesma transação, senão duas requisições paralelas leem 4 e ambas passam.
- **`tier.ts`** — `computePreTier(input)` devolve `TierResult` com `score`, `tier`, `reasons`, `caps` e `partial`. O `partial` é a parte profunda: sem ele, um resultado de dois eixos leria como veredito de quatro, e um C que quer dizer "não sei" viraria "não serve".

Nenhum desses módulos tem _pass-through_ — a camada que os chama não repete a decisão deles.

---

## 5 — Ocultação de informação & design de sistema 🟢

`supabaseAdmin` aparece em **3 arquivos server** (`ficha.server.ts`, `rate-limit.server.ts`, `require-approved.ts`) mais o cliente que o constrói. Nenhum arquivo de rota o importa.

O que eleva isto acima de "está contido" é a regra do `SEGURANCA.md`: **quem usa `supabaseAdmin` tem que declarar qual autorização substitui a RLS que contornou.** Tabela com dono → `requireApprovedUser`; tabela sem dono e pública → nenhuma, escrita e justificada. O inaceitável é não responder à pergunta. Essa formulação é mais precisa do que a regra antiga do Cascata ("quem usar `supabaseAdmin` chama `requireApprovedUser`"), que estava certa no espírito e larga demais na letra — aplicá-la a `fichas`, que não tem dono e é pública, fecharia a demo em vez de protegê-la.

As tabelas `fichas` e `demo_lookups` têm **RLS ligada e zero policies**, de propósito: `anon` e `authenticated` não passam, `service_role` passa por definição. O linter do Supabase sinaliza as duas como `rls_enabled_no_policy` (INFO) — é **falso positivo para este desenho**, e fica registrado aqui para ninguém "corrigir" adicionando policy e abrir o que estava fechado.

**A ressalva real vinha do mesmo linter:** três funções `SECURITY DEFINER` (`has_role`, `is_approved`, `is_guest`) eram executáveis por qualquer usuário autenticado via `/rest/v1/rpc/`. É o achado A3, **corrigido em 03/ago/2026**.

---

## Achados priorizados

### A1 — `Porte` contradiz `rubricPorte` do glossário (P1) · ✅ CORRIGIDO em 03/ago/2026

A Fase 5 declarou `export type Porte = "Early" | "Scale-up" | "Grande"` (hoje `RubricPorte`, em `tier.ts:32`). O glossário exige `rubricPorte` (`GLOSSARIO.md:37`), e a armadilha 2 explica que a confusão entre as duas escalas é o bug mais caro do Cascata. Hoje não há defeito — os tipos não se encontram —, mas o nome deixou de avisar.

**Corrigido.** `Porte` → `RubricPorte` em `tier.ts` e `PreTier.tsx` (o `triggers.ts` não usava o tipo). Só o **tipo** foi renomeado: as strings de razão ("Porte viável: …") espelham as do Python e divergir delas quebraria a paridade, e o rótulo em PT-BR da tela é questão de copy, não de código. O tipo agora carrega no comentário a razão do nome, para não ser "simplificado" depois. ⚠️ **Fica aberto um resquício de UI:** na mesma `/demo`, a ficha exibe o porte da Receita e o seletor do pré-tier se chama "Porte" — a ambiguidade que o código não tem mais, a tela ainda tem. Mexer nisso é copy e precisa do OK dele.

### A2 — Busca por nome: estado impossível modelado como possível (P1) · ✅ CORRIGIDO em 03/ago/2026

`searchCnpjByName` (`enrichment.server.ts:99`) devolve `{ ok: false, error: "unavailable" }` **incondicionalmente**, e isso é deliberado — a rota herdada do script Python não existe na fonte (Fase 3). A consequência é que tudo depois de `ficha.functions.ts:192` é inalcançável: os ramos `none_found`, `rate_limited` e `SOURCE_UNAVAILABLE` (`:193–195`), a resolução do candidato único (`:199–202`) e o retorno `{ status: "choose" }` (`:204`).

O custo não é o código morto — é o que ele sustenta: a variante `choose` em `FichaResult` (`:42`), o código `NAME_NO_MATCH` em `FichaError` (`:32`) e em `error-codes.ts:15`, a frase correspondente em `demo.tsx:50`, o estado `escolher` (`demo.tsx:101`), o handler (`:117`) e a tela de seleção (`:259`). **O tipo afirma que o produto tem um recurso que ele não tem**, e foi essa mesma afirmação que sobreviveu na home até ser corrigida hoje (`fix: a home prometia busca por nome que nunca existiu`).

**Corrigido pela remoção** — a outra saída, implementar, depende de contratar fonte com índice textual (cnpj.ws pago, Casa dos Dados ou Minha Receita local) e segue disponível: `enrichment.server.ts` guarda, em comentário, o fato sobre as fontes e o lugar por onde recomeçar.

Saíram os 17 pontos que sustentavam o recurso inexistente: `searchCnpjByName`, `NameMatch` e `SearchByNameResult` (`enrichment.server.ts`); a variante `choose` e o código `NAME_NO_MATCH` (`ficha.functions.ts`); o código em `error-codes.ts`; e na `demo.tsx` o estado `escolher`, o handler, a frase e as 31 linhas da tela de seleção.

**O comportamento visível não mudou, e isso é a prova de que o código era morto:** digitar um nome devolve exatamente a mesma frase de antes — verificado em dev local com "Petrobras", que retorna _"Por ora o Farol consulta só por CNPJ…"_, e nenhuma tela de escolha aparece, porque nunca podia aparecer.

**Quem pegou a remoção foi o teste que congela a contagem de códigos** (`error-codes.test.ts`), com o comentário "bump this count deliberately". Ele reprovou em 8→7 e foi atualizado com a razão escrita — é exatamente para isso que a contagem está travada.

### A3 — Três funções `SECURITY DEFINER` expostas por RPC (P1, segurança) · ✅ CORRIGIDO em 03/ago/2026

O linter do Supabase (`authenticated_security_definer_function_executable`, WARN) aponta que `has_role`, `is_approved` e `is_guest` podem ser chamadas por qualquer usuário autenticado via `/rest/v1/rpc/`. Como rodam com os privilégios do dono, um usuário logado pode consultar `is_approved(<uuid de outro>)` e descobrir o status de aprovação alheio.

O impacto hoje é baixo — a base tem poucos usuários e o dado é só um booleano —, mas é vazamento por desenho, não por acidente, e **cresce exatamente quando a Fase 8 sair da suspensão** e a área logada tiver gente.

**A correção proposta acima estava errada para uma das três, e a sonda é que mostrou.** Ficou registrada como estava para que o erro não se repita: `REVOKE EXECUTE ... FROM authenticated` nas três **quebraria a área logada**.

Uma sonda em produção revogou o `EXECUTE` de `has_role`, tentou ler `user_roles` como `authenticated` e restaurou o grant, tudo na mesma chamada. Resultado: `permission denied for function has_role`. **Policy avalia a expressão com as permissões de quem consulta**, e `has_role` está em 4 policies `TO authenticated` — revogar fecharia o produto para tapar um vazamento de booleano.

Aplicado em duas migrations, porque as metades têm risco diferente:

- **`20260804130909`** — `is_approved` e `is_guest` perdem o `EXECUTE` de `authenticated`. Seguro porque foi medido antes: nenhuma policy as referencia, e nenhum código as chama por RPC (`require-approved.ts` e `access.ts` leem as **tabelas**; o único `.rpc()` do repo é `bump_demo_quota`, com `service_role`).
- **`20260804131011`** — `has_role` vai para o schema **`private`**, que o PostgREST não publica. É a outra remediação que o próprio lint oferece. As 4 policies e o trigger `protect_profile_flags` foram recriados apontando para lá, e `public.has_role` foi dropada **sem `CASCADE`**, de propósito: se sobrasse dependência não mapeada, o `DROP` falharia e a migration inteira reverteria.

**Verificado com controle positivo e negativo:** `profiles` e `user_roles` seguem legíveis; `public.has_role` não existe mais; `private.has_role` executa para `authenticated`; `anon` esbarra em `permission denied for schema private`; `is_approved` e `is_guest` respondem `permission denied`. Depois disso, **os três `WARN` sumiram do `get_advisors`** — restaram só os dois `INFO` de `rls_enabled_no_policy`, que são o falso positivo documentado no princípio 5.

### A4 — Edge functions do Cascata órfãs no repo (P2) · ✅ CORRIGIDO em 03/ago/2026

`supabase/functions/extract-customers/` e `extract-inputs/` são do **Cascata** — extraem clientes e inputs de waterfall com IA — e vieram no clone da Fase 1. No Farol: ninguém as invoca (varredura por `functions.invoke` volta vazia) e **nenhuma está deployada** (`list_edge_functions` no projeto `sscnhpcyvcsgtacundgc` devolve lista vazia).

Não são superfície viva, então não são P0. Mas carregam `SUPABASE_SERVICE_ROLE_KEY`, `Access-Control-Allow-Origin: *` e checam apenas `getUser(token)` **sem verificar `is_approved`** — que é literalmente o achado A4 da auditoria do Cascata, herdado por cópia. Um `supabase functions deploy` distraído põe as duas no ar com essa configuração.

**Corrigido.** As duas pastas foram removidas. Conferido antes: nenhuma referência no repo, nenhuma menção em `supabase/config.toml`, nenhuma deployada. Se algum dia o Farol precisar de edge function, ela nasce com o gate correto — `getUser()` sozinho não basta, tem que checar `is_approved` como manda o `SEGURANCA.md`.

### A5 — O orquestrador não tem teste (P2) · ✅ CORRIGIDO em 03/ago/2026

`ficha.functions.ts` concentra a ordem entre quota e `fetch`, o paralelismo entre stack e cadastro, o fallback para `stale`, a exceção do `COMPANY_NOT_FOUND` e o `await` que impede promessa solta no Worker. Todas as peças que ele chama são testadas; a composição não.

**Corrigido.** `ficha.functions.test.ts`, com **21 testes** e os adapters de I/O dublados — os quatro casos previstos e mais dezessete que a leitura do orquestrador revelou (ordem entre validação de CNPJ e busca por nome, os três códigos de quota, site inacessível que não derruba a ficha, `stack: null` como "nem tentou", o que é e o que não é regravado).

**Foi preciso um refactor para o teste existir, e ele é o achado dentro do achado.** A composição morava dentro do `createServerFn`, e `createServerFn` só roda no runtime do TanStack Start, que guarda o contexto num `AsyncLocalStorage`: chamar `getFichaFn` de um teste falha com _"No Start context found"_ **antes de executar uma linha da nossa lógica**. Ou seja, a composição não estava sem teste por esquecimento — ela era **inalcançável para teste por construção**. Agora `resolverConsulta` é exportada e recebe `agora` por parâmetro, e o `getFichaFn` é uma casca que valida e delega.

**Um dos testes documenta uma dependência, não um comportamento desejável.** O orquestrador faz `await writeCachedFicha(ficha)` sem `try/catch`, e o comentário ao lado diz que gravar é otimização. É verdade — mas quem garante isso é `ficha.server.ts`, que envolve o upsert em `try/catch` e nunca lança. O teste `escrita que lança DERRUBA a consulta` afirma o estado real e falha de propósito se alguém tornar o orquestrador autossuficiente, que é quando ele deve ser reescrito.

---

## O que já está certo (não regredir)

1. **Núcleo puro separado do I/O**, com `agora` sempre injetado. É o que permite 169 testes sem fake timers nem rede.
2. **Nenhuma escrita do browser direto na tabela.** Toda mutação passa por `serverFn`.
3. **A quota falha fechado** e é cobrada antes do primeiro `fetch`, contando saída de rede em vez de requisição.
4. **Erro é tipo, não string** — `FichaError` com nove códigos, cada um com uma frase própria na tela.
5. **`fingerprints.ts` é gerado**, e o tamanho do catálogo é interpolado de `CATALOGO`, nunca digitado na copy.
6. **A regra do `supabaseAdmin` é uma pergunta que precisa de resposta**, não uma proibição larga.
7. **A rubrica tem paridade provada** com o motor Python — 2268 casos —, e o espelho das constantes no teste é o alarme para divergência silenciosa.
8. **RLS ligada com zero policies é escolha, não esquecimento.** Está documentada aqui e no `SEGURANCA.md` para resistir ao linter.

---

## Checklist de verificação

Rodado nesta auditoria, em 03/ago/2026 (o `pnpm` do PATH é o 11 e o projeto pede o 10 — daí o `npx pnpm@10`):

- [x] `npx pnpm@10 run lint` — 0 erros, 6 warnings pré-existentes
- [x] `npx pnpm@10 run format:check` — limpo
- [x] `npx pnpm@10 run typecheck` — limpo
- [x] `npx pnpm@10 run test` — 169 testes, 10 arquivos
- [x] `npx pnpm@10 run build` — Worker + config de deploy gerados
- [x] Advisors de segurança do Supabase — 2 INFO (falso positivo documentado) + 3 WARN (achado A3)
- [x] Edge functions deployadas — nenhuma
- [x] Smoke em produção — `/demo` responde, pré-tier recalcula, teto rebaixa (verificado na Fase 5)
