CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  contact_email text,
  verification_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_status_chk CHECK (status IN ('active','blocked','pending')),
  CONSTRAINT organizations_subdomain_chk CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id) $$;

CREATE POLICY "platform admins read own row" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members see own memberships" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "platform admins update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER organizations_touch BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- First tenant + backfill
INSERT INTO public.organizations (id, name, subdomain, plan, status, trial_ends_at, contact_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Mánahlíð', 'manahlid', 'pro', 'active', NULL, 'stay@manahlid.is');

INSERT INTO public.organization_members (organization_id, user_id)
SELECT DISTINCT '00000000-0000-0000-0000-000000000001'::uuid, user_id FROM public.user_roles
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_admins (user_id)
SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'developer'
ON CONFLICT DO NOTHING;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['properties','bookings','property_settings','inquiries','expenses','content_templates','contract_templates','content_translations','invoices','housekeeping_tasks','room_status','property_rate_calendar','api_clients']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT ''00000000-0000-0000-0000-000000000001''::uuid REFERENCES public.organizations(id)', t);
    EXECUTE format('UPDATE public.%I SET organization_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE organization_id IS NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)', t || '_org_idx', t);
  END LOOP;
END $$;