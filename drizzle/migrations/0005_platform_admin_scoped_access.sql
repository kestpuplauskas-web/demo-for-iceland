CREATE OR REPLACE FUNCTION public.can_access_org(_org_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_platform_admin(auth.uid())
    THEN _org_id = public.current_org_id()
    ELSE EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id AND o.status = 'active'
      WHERE m.user_id = auth.uid() AND m.organization_id = _org_id)
  END
$$;