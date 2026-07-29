-- Correção: um controle que o SEGURANCA.md afirmava e que não existia.
--
-- O arquivo dizia que o EXECUTE de `is_approved` tinha sido revogado de
-- `PUBLIC`/`anon`. A migration de auth (20260727120000) escreveu:
--
--     REVOKE EXECUTE ON FUNCTION public.is_approved(UUID) FROM PUBLIC;
--
-- e isso **não** tira a permissão do `anon`. No Supabase o `anon` tem
-- concessão própria, vinda do ALTER DEFAULT PRIVILEGES do schema, e revogar
-- de PUBLIC não mexe em concessão nominal. A ACL provava: `is_approved`
-- carregava `anon=X/postgres`.
--
-- O controle positivo estava na mesma migration, três linhas abaixo: a de
-- `is_guest` nomeia o anon —
--
--     REVOKE EXECUTE ON FUNCTION public.is_guest(UUID) FROM PUBLIC, anon;
--
-- — e essa funcionou. Mesmo mecanismo, mesma forma, uma palavra a mais. Não
-- é teoria sobre o Postgres: é a diferença observada entre duas linhas
-- vizinhas do mesmo arquivo.
--
-- Impacto real, para dimensionar sem inflar: `is_approved(uuid)` e
-- `has_role(uuid, app_role)` são SECURITY DEFINER e devolvem booleano, então
-- um chamador anônimo podia sondar via /rest/v1/rpc se um UUID qualquer está
-- aprovado ou tem papel. Exige adivinhar UUID, então o vazamento é estreito —
-- mas era um controle declarado que não existia, e isso é pior que a fuga.
--
-- `handle_new_user()` nunca foi revogada de ninguém. É função de trigger e
-- referencia NEW, então chamá-la por RPC estoura fora do contexto de trigger;
-- ainda assim não tem por que estar exposta. Que trigger não precisa de
-- EXECUTE do chamador está provado no próprio banco: `protect_profile_flags`
-- já está revogada dos três desde 27/jul e o trigger dela funciona.

-- Nenhuma policy referencia estas duas para `anon` — todas as oito policies
-- são {authenticated} e só `has_role` aparece em expressão. Conferido antes.
REVOKE EXECUTE ON FUNCTION public.is_approved(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_approved(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
