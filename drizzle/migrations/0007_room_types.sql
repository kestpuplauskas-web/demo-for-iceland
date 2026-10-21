CREATE TABLE public.room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_types TO authenticated;
GRANT ALL ON public.room_types TO service_role;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_organization BEFORE INSERT ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.set_row_organization();
CREATE POLICY "Admins manage room types" ON public.room_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewers read room types" ON public.room_types FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'::app_role));
CREATE POLICY "org isolation" ON public.room_types AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_org(organization_id)) WITH CHECK (public.can_access_org(organization_id));