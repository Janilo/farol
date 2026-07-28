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

`has_role`, `is_approved` e `is_guest` são `SECURITY DEFINER` com
`search_path = public` fixo, e o `EXECUTE` de `is_approved`/`is_guest` foi
revogado de `PUBLIC`/`anon`.

## O que NÃO é fronteira

**A demo não tem fronteira de leitura, por definição.** Qualquer visitante
consulta qualquer CNPJ. Não há dado privado envolvido: o cadastro da Receita
Federal é público por força de lei, incluindo os nomes do quadro societário.

**`require-approved.ts` existe mas ainda não é chamado por ninguém.** Nenhum
serverFn de hoje usa `supabaseAdmin`, então não há caminho que precise
re-checar a aprovação no servidor. Isso vale enquanto a área logada for um
placeholder. **No dia em que um serverFn usar `supabaseAdmin`, ele tem que
chamar `requireApprovedUser` — o admin client bypassa RLS.**

## Limites que ainda não existem

Estão no plano e não estão implementados. Não conte com eles:

- **Quota da demo.** A intenção é 5 consultas não-cacheadas por dia por
  visitante, identificado por hash do IP com salt secreto. Hoje **não há
  limite nenhum** — a única proteção é o rate limit da própria fonte pública.
- **Cache de ficha.** Sem cache, cada consulta bate na Brasil API.

Consequência prática: enquanto isso não existir, a demo pode esgotar o limite
da fonte pública se alguém insistir, e o efeito é a mensagem "a fonte pública
limitou as consultas por agora".

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
existe como secret do Worker (`wrangler secret put`), nunca no repo. Hoje ela
não é necessária, porque nada usa `supabaseAdmin`.
