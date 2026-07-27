-- Farol — base de autenticação e portão de aprovação.
--
-- Consolidação do que no Cascata estava espalhado em 20 migrations: a base de
-- auth em uma só, sem as tabelas de domínio daquele produto e sem `department`
-- (o Farol não tem departamentos — a rubrica não é escopada por área).
--
-- Fronteiras de segurança, na ordem em que valem:
--   1. RLS nas tabelas — o que o cliente anon/authenticated pode ver.
--   2. `is_approved` — o portão de acesso ao produto (cadastro não basta).
--   3. `is_guest` — conta compartilhada da demo; nunca escreve nada.
-- Ver SEGURANCA.md.

-- ============================================================
-- Papéis
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- ============================================================
-- profiles — espelho de auth.users com o portão de aprovação
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_guest    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- user_roles
-- ============================================================
CREATE TABLE public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_self" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Helpers (SECURITY DEFINER — leem tabela com RLS a partir de policy)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_approved FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_approved(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_guest(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_guest FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_guest(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guest(UUID) TO authenticated;

-- ============================================================
-- Admin gerencia aprovação e papéis
-- ============================================================
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_select_all" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Ninguém se auto-aprova, ninguém se declara convidado
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_profile_flags()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  IF OLD.is_guest IS DISTINCT FROM NEW.is_guest
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change guest flag';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_flags() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER protect_profile_flags_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_flags();

-- ============================================================
-- Novo usuário entra como member, NÃO aprovado
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
