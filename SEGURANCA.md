# Fronteiras de segurança do Farol

Este arquivo existe para deixar explícito **o que o banco impõe** e o que é só
organização de tela — para ninguém assumir proteção onde não existe.

O Farol tem uma característica que muda a leitura toda: **a parte principal do
produto é pública e anônima.** A consulta de ficha na `/demo` não exige login.
Isso é escolha de produto, não descuido — e move o risco de "quem pode ler o
quê" para "quanto alguém pode consumir".

## O que o banco impõe hoje

| Fronteira | Regra | Onde vive |
|---|---|---|
| **Portão de aprovação** | entrar na área logada exige `profiles.is_approved` OU role `admin` | client: `src/lib/access.ts` (`getAccessState`), usado no `beforeLoad` de `_authenticated.tsx` · server: `src/lib/require-approved.ts` |
| **Ninguém se auto-aprova** | mudar `is_approved` ou `is_guest` exige role `admin` | trigger `protect_profile_flags` em `supabase/migrations/20260727120000_farol_auth_base.sql` |
| **Novo usuário entra sem acesso** | `handle_new_user` cria o perfil com `is_approved = false` e role `member` | mesma migration |
| **Papéis** | `user_roles` é legível só pelo próprio usuário; escrita e leitura ampla exigem `admin` | RLS na mesma migration |
| **Cache de ficha** | `fichas` tem RLS ligada e **zero políticas**: `anon` e `authenticated` não leem nem escrevem; só `service_role` passa | `supabase/migrations/20260728140000_farol_fichas_cache.sql` |
| **Alvo da leitura de site** | o servidor só busca **nome de domínio público**: todo literal de IP é recusado, e sufixo de rede interna também | `src/lib/technographics.ts` (`isAllowedTarget`) |
| **Redirecionamento** | seguido **à mão**, com o alvo revalidado a cada salto e teto de 3 saltos | `src/lib/technographics.server.ts` |

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

## Limites que ainda não existem

Estão no plano e não estão implementados. Não conte com eles:

- **Quota da demo.** A intenção é 5 consultas não-cacheadas por dia por
  visitante, identificado por hash do IP com salt secreto. Hoje **não há
  limite nenhum**.

O cache de ficha **passou a existir na Fase 3** e reduz o problema sem
resolvê-lo: CNPJ repetido em 30 dias não bate na fonte, mas quem varrer CNPJs
distintos continua batendo — e agora também faz nascer uma linha por consulta.

**A Fase 4 somou uma segunda saída de rede por consulta**, e essa é mais sensível
que a primeira: a leitura do site alvo é uma requisição que o servidor faz em nome
de quem pediu, para um endereço que quem pediu escolheu. Os portões da seção de
SSRF limitam **para onde**; não limitam **quantas**. Sem quota, o Farol pode ser
usado como varredor de terceiros a partir do IP da Cloudflare — e esse é o
argumento mais forte a favor da Fase 6, mais forte do que economizar chamada à
Brasil API.

A proteção contra insistência continua sendo só o rate limit da fonte pública, e
o efeito visível continua sendo "a fonte pública limitou as consultas por agora".

## Sobre o hash de IP, quando existir

O compromisso registrado é **não guardar endereço IP**, e sim o resultado de um
hash com salt que vive só no servidor. O propósito é contar consultas por
visitante no dia, nada além. Sem o salt, o hash não volta a ser IP.

Isso é tratamento de dado pessoal sob a LGPD, com base legal em legítimo
interesse (art. 7º, IX). A política de privacidade tem uma seção dedicada
explicando o mecanismo, porque explicar é parte da base legal.

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
