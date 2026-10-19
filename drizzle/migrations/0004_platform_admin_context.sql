CREATE TABLE public.platform_admin_context (
  user_id uuid PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_admin_context TO authenticated;
GRANT ALL ON public.platform_admin_context TO service_role;
ALTER TABLE public.platform_admin_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform admins manage own context" ON public.platform_admin_context
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT c.organization_id FROM public.platform_admin_context c
       JOIN public.platform_admins pa ON pa.user_id = c.user_id
       WHERE c.user_id = auth.uid() AND c.organization_id IS NOT NULL),
    (SELECT m.organization_id FROM public.organization_members m
       JOIN public.organizations o ON o.id = m.organization_id AND o.status = 'active'
       WHERE m.user_id = auth.uid() ORDER BY m.created_at LIMIT 1)
  )
$$;