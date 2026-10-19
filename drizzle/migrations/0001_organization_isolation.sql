CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.organization_id FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id AND o.status = 'active'
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_access_org(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id AND o.status = 'active'
    WHERE m.user_id = auth.uid() AND m.organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.set_row_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v := public.current_org_id();
    IF v IS NOT NULL THEN NEW.organization_id := v; END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['properties','bookings','property_settings','inquiries','expenses','content_templates','contract_templates','content_translations','invoices','housekeeping_tasks','room_status','property_rate_calendar','api_clients']
  LOOP
    EXECUTE format('CREATE POLICY "org isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.can_access_org(organization_id)) WITH CHECK (public.can_access_org(organization_id))', t);
    EXECUTE format('CREATE TRIGGER set_organization BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_row_organization()', t);
  END LOOP;
END $$;