# Fronteiras de segurança do Farol

Este arquivo existe para deixar explícito **o que o banco impõe** e o que é só
organização de tela — para ninguém assumir proteção onde não existe.

O Farol tem uma característica que muda a leitura toda: **a parte principal do
produto é pública e anônima.** A consulta de ficha na `/demo` não exige login.
Isso é escolha de produto, não descuido — e move o risco de "quem pode ler o
quê" para "quanto alguém pode consumir".

## O que o banco impõe hoje

| Fronteira                         | Regra                                                                                                                                                        | Onde vive                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Portão de aprovação**           | entrar na área logada exige `profiles.is_approved` OU role `admin`                                                                                           | client: `src/lib/access.ts` (`getAccessState`), usado no `beforeLoad` de `_authenticated.tsx` · server: `src/lib/require-approved.ts` |
| **Ninguém se auto-aprova**        | mudar `is_approved` ou `is_guest` exige role `admin`                                                                                                         | trigger `protect_profile_flags` em `supabase/migrations/20260727120000_farol_auth_base.sql`                                           |
| **Novo usuário entra sem acesso** | `handle_new_user` cria o perfil com `is_approved = false` e role `member`                                                                                    | mesma migration                                                                                                                       |
| **Papéis**                        | `user_roles` é legível só pelo próprio usuário; escrita e leitura ampla exigem `admin`                                                                       | RLS na mesma migration                                                                                                                |
| **Cache de ficha**                | `fichas` tem RLS ligada e **zero políticas**: `anon` e `authenticated` não leem nem escrevem; só `service_role` passa                                        | `supabase/migrations/20260728140000_farol_fichas_cache.sql`                                                                           |
| **Contador de quota**             | `demo_lookups` idem — RLS ligada, zero políticas. O `EXECUTE` de `bump_demo_quota` é só do `service_role`, com `anon` e `authenticated` nomeados no `REVOKE` | `supabase/migrations/20260730120000_farol_demo_quota.sql`                                                                             |
| **Teto global protegido**         | `bump_demo_quota` recusa `visitor_hash` que não seja hex de 64 caracteres, o que impede alguém passar a sentinela `__global__` como se fosse visitante       | mesma migration                                                                                                                       |
| **Alvo da leitura de site**       | o servidor só busca **nome de domínio público**: todo literal de IP é recusado, e sufixo de rede interna também                                              | `src/lib/technographics.ts` (`isAllowedTarget`)                                                                                       |
| **Redirecionamento**              | seguido **à mão**, com o alvo revalidado a cada salto e teto de 3 saltos                                                                                     | `src/lib/technographics.server.ts`                                                                                                    |

`has_role`, `is_approved` e `is_guest` são `SECURITY DEFINER` com
`search_path = public` fixo, e o `EXECUTE` delas está revogado de `anon`.

> **Correção de 28/jul/2026 — esta última frase era falsa até hoje.** O arquivo
> afirmava que o `EXECUTE` de `is_approved` tinha sido revogado de
> `PUBLIC`/`anon`. A migration de auth escreveu `REVOKE ... FROM PUBLIC`, e no
> Supabase isso **não** tira a permissão do `anon`, que a tem por concessão
> nominal vinda do `ALTER DEFAULT PRIVILEGES` do schema. A ACL provava:
> `is_approved` carregava `anon=X/postgres`. O `has_role` nunca tinha sido
> revogado de ninguém, e o `handle_new_user` também não.
>
> Na prática, um chamador anônimo podia sondar via `/rest/v1/rpc` se um UUID
> qualquer está aprovado ou tem papel. Exige adivinhar UUID, então o vazamento
> era estreito — mas **um controle declarado que não existe é pior que a fuga**,
> porque a decisão seguinte se apoia nele.
>
> Corrigido em `20260728141000_fix_execute_anon_helpers.sql`. Verificado depois:
> `anon` = falso nas cinco funções. E o cadastro foi testado com controle
> positivo — inserção em `auth.users` disparando o trigger, perfil nascendo com
> `is_approved = false` e papel `member`, usuário de teste removido em seguida.
>
> O controle positivo do diagnóstico estava três linhas abaixo na mesma
> migration: a de `is_guest` nomeia o `anon` e funcionou. Mesmo mecanismo, mesma
> forma, uma palavra a mais.

## SSRF — a fronteira que a Fase 4 criou

A tecnografia inverte quem escolhe o destino: **o visitante informa um endereço e
o servidor busca.** Sem portão, a demo seria um proxy para dentro da rede de quem
hospeda — bastaria pedir `169.254.169.254` para tentar o endpoint de metadados da
nuvem, ou `localhost` para sondar o que roda ao lado.

Duas travas, e a segunda é a que costuma faltar:

**1. O alvo tem que ser domínio público.** `isAllowedTarget` exige rótulo com TLD
alfabético e **recusa todo literal de IP**, v4 e v6, mais os sufixos que nomeiam
rede interna (`.localhost`, `.local`, `.internal`, `.intranet`, `.home.arpa`).
A regra é grosseira de propósito: empresa tem domínio, ninguém digita o IP da
própria loja. Recusar IP de uma vez mata a classe inteira sem depender de acertar
cada faixa reservada — que é onde essas listas falham, por uma faixa esquecida.

**2. Redirecionamento é seguido à mão, revalidando cada salto.** `fetch` segue
redirect por padrão, e é assim que se fura o portão: um domínio público devolve
`302 → http://169.254.169.254/` e o servidor vai. Aqui o redirect é `manual`, só
`https` passa, cada destino volta pelo `isAllowedTarget` e há teto de 3 saltos.
**Validar só o endereço digitado é a forma clássica de achar que se defendeu.**

Verificado com site real em 28/jul/2026: `resultadosdigitais.com.br` redireciona
para `www.rdstation.com` — outro domínio — e a leitura seguiu depois de
revalidar. O teste `o caminho completo` em `technographics.test.ts` cobre o par
`normalizeDomain` → `isAllowedTarget` com o endereço de metadados.

O corpo é lido com teto de **500 KB** e timeout de **8s**. Página maior é
truncada, não recusada.

## O que NÃO é fronteira

**A demo não tem fronteira de leitura, por definição.** Qualquer visitante
consulta qualquer CNPJ. Não há dado privado envolvido: o cadastro da Receita
Federal é público por força de lei, incluindo os nomes do quadro societário.

**`require-approved.ts` existe e ainda não é chamado por ninguém**, e desde a
Fase 3 isso exige explicação, porque `ficha.server.ts` **usa** `supabaseAdmin`.

A regra escrita aqui era: "no dia em que um serverFn usar `supabaseAdmin`, ele
tem que chamar `requireApprovedUser`". Ela estava certa no espírito e larga
demais na letra. O que o admin client cria é a obrigação de o próprio serverFn
fazer a autorização que a RLS faria — e **qual autorização** depende de a tabela
ter dono.

`fichas` não tem dono. Nenhuma linha pertence a um usuário, o conteúdo é
cadastro público da Receita, e a demo é anônima por decisão travada nº 10.
Exigir `requireApprovedUser` ali fecharia o produto, não o protegeria: a
autorização correta para essa tabela é **nenhuma, por desenho** — a mesma que
já vale para a consulta em si, como diz a seção acima.

Então a regra passa a ser, na forma precisa:

> Todo serverFn que usa `supabaseAdmin` tem que declarar qual autorização
> substitui a RLS que ele contornou. **Tabela com dono → `requireApprovedUser`
> (ou checagem equivalente do dono).** Tabela sem dono e de conteúdo público →
> autorização nenhuma, escrita aqui e no arquivo. O que não é aceito é usar o
> admin client sem responder à pergunta.

O que `ficha.server.ts` garante em lugar disso é a outra ponta, que é a que
importa numa tabela sem dono: **só se grava o que `fetchCnpj` devolveu.** O
payload nunca vem do cliente, então não há como envenenar o cache. O que resta
em aberto é volume — quantas linhas um visitante insistente faz nascer — e isso
é a quota da Fase 6, listada abaixo como ausente.

## Quota — o limite de volume (Fase 6)

**A Fase 4 somou uma segunda saída de rede por consulta**, e essa é mais sensível
que a primeira: a leitura do site alvo é uma requisição que o servidor faz em nome
de quem pediu, para um endereço que quem pediu escolheu. Os portões da seção de
SSRF limitam **para onde**; não limitavam **quantas**. Sem quota, o Farol podia ser
usado como varredor de terceiros a partir do IP da Cloudflare — argumento mais forte
a favor desta fase do que economizar chamada à Brasil API.

| Limite            | Valor                                     | Onde                                         |
| ----------------- | ----------------------------------------- | -------------------------------------------- |
| Visitante anônimo | 5 consultas **novas** por dia             | `QUOTA_ANONIMO` em `src/lib/rate-limit.ts`   |
| Conta aprovada    | 50 por dia                                | `QUOTA_APROVADO` (só entra em uso na Fase 8) |
| Teto da casa      | 150 por dia, **só sobre tráfego anônimo** | `QUOTA_GLOBAL`                               |

**A unidade contada é consulta que sai para a rede, não requisição.** Cache hit não
consome: ele não custa nada a ninguém, e cobrar por ele puniria justamente o caminho
que queremos que as pessoas usem. O portão fica em `ficha.functions.ts`, depois de as
duas decisões de cache saírem e antes de qualquer `fetch` — o único ponto do fluxo em
que se sabe se a consulta vai custar.

**O incremento e a leitura são a mesma operação.** `bump_demo_quota` é uma função
`SECURITY DEFINER` que faz os dois `upsert` e devolve os contadores já incrementados.
Contar com `select count(*)` antes de decidir teria corrida: duas requisições
paralelas leem 4 e ambas passam. O preço é que a tentativa negada também consome — e
isso é intencional: negação de graça é convite a insistir.

**Este é o único lugar do código que falha FECHADO.** A regra do `ficha.server.ts` é
que o cache nunca derruba a consulta, porque cache fora do ar é lentidão. Aqui é o
contrário: quota fora do ar é ausência de quota, com a tela idêntica. Então salt
ausente, banco fora do ar ou contrato quebrado da função → recusa, com a frase "não
consegui apurar o limite de consultas agora". A consequência operacional é que
**`DEMO_HASH_SALT` é requisito de deploy**, não enfeite.

### O hash de visitante

O IP **não é gravado em lugar nenhum**. O que entra na tabela é
`sha256(IP + ":" + salt)`, com o salt vivendo só como secret do Worker. Sem salt, o
hash de um IPv4 é enumerável em minutos — o espaço é 2³², e é por isso que a ausência
do salt recusa a consulta em vez de seguir com hash pelado.

A origem do IP é `CF-Connecting-IP`, posto pela borda da Cloudflare.
**`X-Forwarded-For` não é consultado**, de propósito: qualquer cliente pode inventá-lo,
e um limite por IP falsificável não é limite. Requisição sem o header cai num bucket
único compartilhado — bounded, e sinal de que não passou pela borda.

Isso é tratamento de dado pessoal sob a LGPD, com base legal em legítimo
interesse (art. 7º, IX). A política de privacidade tem uma seção dedicada
explicando o mecanismo, porque explicar é parte da base legal.

**Retenção ainda não está implementada.** A tabela é um contador por
`(visitor_hash, dia)`, então ela cresce devagar — um punhado de linhas por dia, não
uma por consulta — mas linha de dia passado não tem propósito depois que o dia virou.
Apagar o que passou de 7 dias é trabalho de rotina agendada, e não existe rotina
agendada neste produto. Está listado abaixo como ausente.

## Limites que ainda não existem

Estão no plano e não estão implementados. Não conte com eles:

- **Retenção da `demo_lookups`.** Contador de dia passado fica na tabela até alguém
  apagar à mão. O propósito declarado é contar o dia corrente; guardar além disso não
  tem base.
- **Oito fichas pré-computadas** (item 1 da Fase 6). Os chips de exemplo hoje são
  três, e cada primeira consulta de uma empresa nova gasta quota como qualquer outra.

## Chaves

A `SUPABASE_PUBLISHABLE_KEY` em `wrangler.jsonc` é pública por design e
respeita RLS — é a chave moderna `sb_publishable_*`, não a anon legada em JWT
que os repos irmãos usam. A `SUPABASE_SERVICE_ROLE_KEY` **bypassa RLS** e só
existe como secret do Worker (`wrangler secret put`), nunca no repo.

**Desde a Fase 3 ela é necessária** — `ficha.server.ts` usa `supabaseAdmin`. Se
o secret não estiver no Worker, o produto **não quebra**: o adapter engole a
`ConfigError`, registra no log e devolve "sem cache", e a ficha sai como saía na
Fase 2. Verificado localmente, onde a chave não existe: a consulta responde e o
log traz `[farol] erro inesperado ao ler cache de ficha … ConfigError`.

A consequência de faltar é silenciosa, então é a primeira coisa a conferir se o
cache parecer não funcionar: **cache que não grava é indistinguível de cache que
não existe**, pela tela.

**Desde a Fase 6 há um segundo secret obrigatório: `DEMO_HASH_SALT`.** A diferença
entre os dois é o modo de falhar, e vale ter em mente na hora de debugar: sem a
service role o produto degrada em silêncio; sem o salt ele **recusa consulta nova e
diz na tela**. Se a demo estiver respondendo "não consegui apurar o limite de
consultas agora", o salt é o primeiro lugar a olhar.
