-- ============================================================
-- NEXA Insight — Etapa 1: fundação multiempresa
-- ============================================================

-- Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.nexa_role AS ENUM (
    'super_admin','org_admin','manager','supervisor','quality_analyst','agent','auditor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nexa_org_status AS ENUM ('active','suspended','trial','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nexa_segment AS ENUM (
    'sales','support','collections','finance','health','education','telecom','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- nexa_organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nexa_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  segment public.nexa_segment NOT NULL DEFAULT 'other',
  plan TEXT NOT NULL DEFAULT 'trial',
  status public.nexa_org_status NOT NULL DEFAULT 'trial',
  logo_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexa_organizations TO authenticated;
GRANT ALL ON public.nexa_organizations TO service_role;
ALTER TABLE public.nexa_organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- nexa_organization_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nexa_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.nexa_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.nexa_role NOT NULL DEFAULT 'agent',
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexa_organization_members TO authenticated;
GRANT ALL ON public.nexa_organization_members TO service_role;
ALTER TABLE public.nexa_organization_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nexa_org_members_user ON public.nexa_organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_nexa_org_members_org ON public.nexa_organization_members(organization_id);

-- ============================================================
-- Helper functions (SECURITY DEFINER, no recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.nexa_is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nexa_organization_members
    WHERE user_id = _user_id AND role = 'super_admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.nexa_is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nexa_organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND status = 'active'
  ) OR public.nexa_is_super_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.nexa_has_org_role(_user_id UUID, _org_id UUID, _roles public.nexa_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nexa_organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
      AND role = ANY(_roles) AND status = 'active'
  ) OR public.nexa_is_super_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.nexa_user_org_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.nexa_organization_members
  WHERE user_id = _user_id AND status = 'active';
$$;

-- ============================================================
-- RLS: nexa_organizations
-- ============================================================
DROP POLICY IF EXISTS "nexa_orgs_select_members" ON public.nexa_organizations;
CREATE POLICY "nexa_orgs_select_members" ON public.nexa_organizations FOR SELECT TO authenticated
  USING (public.nexa_is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS "nexa_orgs_insert_authenticated" ON public.nexa_organizations;
CREATE POLICY "nexa_orgs_insert_authenticated" ON public.nexa_organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "nexa_orgs_update_admins" ON public.nexa_organizations;
CREATE POLICY "nexa_orgs_update_admins" ON public.nexa_organizations FOR UPDATE TO authenticated
  USING (public.nexa_has_org_role(auth.uid(), id, ARRAY['org_admin','super_admin']::public.nexa_role[]))
  WITH CHECK (public.nexa_has_org_role(auth.uid(), id, ARRAY['org_admin','super_admin']::public.nexa_role[]));

DROP POLICY IF EXISTS "nexa_orgs_delete_super" ON public.nexa_organizations;
CREATE POLICY "nexa_orgs_delete_super" ON public.nexa_organizations FOR DELETE TO authenticated
  USING (public.nexa_is_super_admin(auth.uid()));

-- ============================================================
-- RLS: nexa_organization_members
-- ============================================================
DROP POLICY IF EXISTS "nexa_members_select_org" ON public.nexa_organization_members;
CREATE POLICY "nexa_members_select_org" ON public.nexa_organization_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.nexa_is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "nexa_members_insert_self_or_admin" ON public.nexa_organization_members;
CREATE POLICY "nexa_members_insert_self_or_admin" ON public.nexa_organization_members FOR INSERT TO authenticated
  WITH CHECK (
    -- Criador da empresa pode se auto-vincular como org_admin
    (user_id = auth.uid() AND role = 'org_admin'
      AND EXISTS (SELECT 1 FROM public.nexa_organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()))
    OR public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','super_admin']::public.nexa_role[])
  );

DROP POLICY IF EXISTS "nexa_members_update_admin" ON public.nexa_organization_members;
CREATE POLICY "nexa_members_update_admin" ON public.nexa_organization_members FOR UPDATE TO authenticated
  USING (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','super_admin']::public.nexa_role[]))
  WITH CHECK (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','super_admin']::public.nexa_role[]));

DROP POLICY IF EXISTS "nexa_members_delete_admin" ON public.nexa_organization_members;
CREATE POLICY "nexa_members_delete_admin" ON public.nexa_organization_members FOR DELETE TO authenticated
  USING (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','super_admin']::public.nexa_role[]));

-- ============================================================
-- nexa_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nexa_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  active_organization_id UUID REFERENCES public.nexa_organizations(id) ON DELETE SET NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexa_profiles TO authenticated;
GRANT ALL ON public.nexa_profiles TO service_role;
ALTER TABLE public.nexa_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nexa_profiles_select_self_or_orgmate" ON public.nexa_profiles;
CREATE POLICY "nexa_profiles_select_self_or_orgmate" ON public.nexa_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nexa_organization_members m1
      JOIN public.nexa_organization_members m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = nexa_profiles.id
        AND m1.status = 'active' AND m2.status = 'active'
    )
    OR public.nexa_is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "nexa_profiles_upsert_self" ON public.nexa_profiles;
CREATE POLICY "nexa_profiles_upsert_self" ON public.nexa_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "nexa_profiles_update_self" ON public.nexa_profiles;
CREATE POLICY "nexa_profiles_update_self" ON public.nexa_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- nexa_teams
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nexa_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.nexa_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#84cc16',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexa_teams TO authenticated;
GRANT ALL ON public.nexa_teams TO service_role;
ALTER TABLE public.nexa_teams ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nexa_teams_org ON public.nexa_teams(organization_id);

DROP POLICY IF EXISTS "nexa_teams_select_members" ON public.nexa_teams;
CREATE POLICY "nexa_teams_select_members" ON public.nexa_teams FOR SELECT TO authenticated
  USING (public.nexa_is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "nexa_teams_write_admin" ON public.nexa_teams;
CREATE POLICY "nexa_teams_write_admin" ON public.nexa_teams FOR ALL TO authenticated
  USING (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','manager','super_admin']::public.nexa_role[]))
  WITH CHECK (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','manager','super_admin']::public.nexa_role[]));

-- ============================================================
-- nexa_team_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nexa_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.nexa_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.nexa_organizations(id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexa_team_members TO authenticated;
GRANT ALL ON public.nexa_team_members TO service_role;
ALTER TABLE public.nexa_team_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nexa_team_members_team ON public.nexa_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_nexa_team_members_user ON public.nexa_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_nexa_team_members_org ON public.nexa_team_members(organization_id);

DROP POLICY IF EXISTS "nexa_team_members_select" ON public.nexa_team_members;
CREATE POLICY "nexa_team_members_select" ON public.nexa_team_members FOR SELECT TO authenticated
  USING (public.nexa_is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "nexa_team_members_write_admin" ON public.nexa_team_members;
CREATE POLICY "nexa_team_members_write_admin" ON public.nexa_team_members FOR ALL TO authenticated
  USING (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','manager','super_admin']::public.nexa_role[]))
  WITH CHECK (public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','manager','super_admin']::public.nexa_role[]));

-- ============================================================
-- nexa_audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nexa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.nexa_organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.nexa_audit_logs TO authenticated;
GRANT ALL ON public.nexa_audit_logs TO service_role;
ALTER TABLE public.nexa_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nexa_audit_org ON public.nexa_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_nexa_audit_created ON public.nexa_audit_logs(created_at DESC);

DROP POLICY IF EXISTS "nexa_audit_select_admin" ON public.nexa_audit_logs;
CREATE POLICY "nexa_audit_select_admin" ON public.nexa_audit_logs FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.nexa_has_org_role(auth.uid(), organization_id, ARRAY['org_admin','auditor','super_admin']::public.nexa_role[])
  );

DROP POLICY IF EXISTS "nexa_audit_insert_member" ON public.nexa_audit_logs;
CREATE POLICY "nexa_audit_insert_member" ON public.nexa_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR public.nexa_is_org_member(auth.uid(), organization_id))
  );

-- ============================================================
-- Triggers de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.nexa_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS nexa_orgs_updated_at ON public.nexa_organizations;
CREATE TRIGGER nexa_orgs_updated_at BEFORE UPDATE ON public.nexa_organizations
  FOR EACH ROW EXECUTE FUNCTION public.nexa_set_updated_at();

DROP TRIGGER IF EXISTS nexa_members_updated_at ON public.nexa_organization_members;
CREATE TRIGGER nexa_members_updated_at BEFORE UPDATE ON public.nexa_organization_members
  FOR EACH ROW EXECUTE FUNCTION public.nexa_set_updated_at();

DROP TRIGGER IF EXISTS nexa_profiles_updated_at ON public.nexa_profiles;
CREATE TRIGGER nexa_profiles_updated_at BEFORE UPDATE ON public.nexa_profiles
  FOR EACH ROW EXECUTE FUNCTION public.nexa_set_updated_at();

DROP TRIGGER IF EXISTS nexa_teams_updated_at ON public.nexa_teams;
CREATE TRIGGER nexa_teams_updated_at BEFORE UPDATE ON public.nexa_teams
  FOR EACH ROW EXECUTE FUNCTION public.nexa_set_updated_at();

-- ============================================================
-- Auto-criação de perfil NEXA ao signup (sem afetar profiles existentes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.nexa_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.nexa_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS nexa_on_auth_user_created ON auth.users;
CREATE TRIGGER nexa_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.nexa_handle_new_user();
