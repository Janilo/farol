-- A3 (parte 1 de 2) — `is_approved` e `is_guest` saem da API REST.
--
-- Achado do linter do Supabase (0029): as duas são SECURITY DEFINER e podiam ser
-- chamadas por QUALQUER usuário autenticado via /rest/v1/rpc/, então um logado
-- sondava o status de aprovação alheio passando um UUID.
--
-- Por que revogar aqui é seguro, e em `has_role` não seria — foi medido, não
-- suposto (03/ago/2026):
--   • nenhuma policy as referencia (pg_policies, varrido);
--   • nenhum código as chama por RPC — `require-approved.ts` e `access.ts` leem
--     as TABELAS, e o único `.rpc()` do repo é `bump_demo_quota`, com service_role;
--   • o trigger `protect_profile_flags` usa `has_role`, não estas.
--
-- `has_role` fica de fora desta migration DE PROPÓSITO: ela aparece em 4 policies
-- `TO authenticated`, e uma sonda em produção provou que revogar o EXECUTE dela
-- faz a leitura de `user_roles` falhar com "permission denied for function
-- has_role". Policy avalia a expressão com as permissões de quem consulta.
-- Ver a parte 2.
--
-- `PUBLIC, anon` vão junto por higiene: revogar de PUBLIC não mexe em concessão
-- nominal (a lição da migration 20260728230210), então o nome tem que aparecer.

REVOKE EXECUTE ON FUNCTION public.is_approved(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.is_approved(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_guest(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.is_guest(UUID) TO service_role;
