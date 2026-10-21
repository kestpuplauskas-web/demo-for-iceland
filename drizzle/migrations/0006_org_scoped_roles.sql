ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'viewer';

UPDATE public.organization_members m SET role = sub.role FROM (
  SELECT user_id, (array_agg(role ORDER BY CASE role WHEN 'developer' THEN 1 WHEN 'admin' THEN 2 WHEN 'housekeeper' THEN 3 WHEN 'viewer' THEN 4 ELSE 5 END))[1] AS role
  FROM public.user_roles GROUP BY user_id
) sub WHERE sub.user_id = m.user_id;

COMMENT ON TABLE public.user_roles IS 'Global roles; only authoritative for platform admins. Hotel staff roles live in organization_members.role.';

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN public.is_platform_admin(_user_id) THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND (role = _role OR (_role = 'admin' AND role = 'developer')))
  ELSE EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id AND o.status = 'active'
      WHERE m.user_id = _user_id
        AND m.organization_id = CASE WHEN _user_id = auth.uid() THEN public.current_org_id()
          ELSE (SELECT m2.organization_id FROM public.organization_members m2
                JOIN public.organizations o2 ON o2.id = m2.organization_id AND o2.status = 'active'
                WHERE m2.user_id = _user_id ORDER BY m2.created_at LIMIT 1) END
        AND (m.role = _role OR (_role = 'admin' AND m.role = 'developer')))
  END
$$;