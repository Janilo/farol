-- A3 (parte 2 de 2) — `has_role` sai da API REST sem perder o EXECUTE.
--
-- Aqui revogar NÃO era opção, e isso foi medido, não deduzido. Sonda em produção
-- (03/ago/2026): com `REVOKE EXECUTE ON has_role FROM authenticated`, um
-- `SELECT count(*) FROM user_roles` como `authenticated` falha com
--
--     permission denied for function has_role
--
-- porque a policy avalia a expressão com as permissões de QUEM CONSULTA, e
-- `has_role` está em 4 policies `TO authenticated`. Revogar fecharia a área
-- logada inteira para tapar um vazamento de booleano.
--
-- Então usa-se a outra remediação que o próprio lint 0029 oferece: tirar a função
-- do **schema exposto**. O PostgREST só publica os schemas configurados (`public`
-- e `graphql_public`); `private` não é um deles, então /rest/v1/rpc/has_role
-- deixa de existir — enquanto as policies seguem chamando normalmente, porque
-- elas referenciam a função pelo nome qualificado, não pela API.
--
-- `anon` não recebe USAGE em `private`, de propósito.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated, service_role;

-- As 4 policies passam a apontar para a cópia privada. Recriadas uma a uma em vez
-- de um ALTER: policy não tem ALTER que troque a expressão preservando o resto.
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_admin_select_all ON public.user_roles;
CREATE POLICY user_roles_admin_select_all ON public.user_roles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- O trigger que impede não-admin de mexer nos flags também apontava para a
-- pública. Mesma lógica, mesma mensagem de erro.
CREATE OR REPLACE FUNCTION public.protect_profile_flags()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved
     AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  IF OLD.is_guest IS DISTINCT FROM NEW.is_guest
     AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change guest flag';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_flags() FROM PUBLIC, anon, authenticated;

-- Sem RESTRICT/CASCADE explícito: RESTRICT é o padrão, então se sobrou alguma
-- dependência que a varredura não achou, o DROP falha e a migration inteira
-- reverte. É a rede que se quer aqui.
DROP FUNCTION public.has_role(UUID, public.app_role);
