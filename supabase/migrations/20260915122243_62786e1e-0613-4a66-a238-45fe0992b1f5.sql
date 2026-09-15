CREATE TABLE public.property_secrets (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  door_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_secrets TO authenticated;
GRANT ALL ON public.property_secrets TO service_role;

ALTER TABLE public.property_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage property secrets"
  ON public.property_secrets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'));

CREATE TRIGGER touch_property_secrets_updated_at
  BEFORE UPDATE ON public.property_secrets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.property_secrets (property_id, door_code)
SELECT id, door_code FROM public.properties WHERE door_code IS NOT NULL AND door_code <> '';

ALTER TABLE public.properties DROP COLUMN door_code;

CREATE OR REPLACE FUNCTION public.admin_get_door_code(_property_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.door_code
  FROM public.property_secrets s
  WHERE s.property_id = _property_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'))
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_door_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_door_code(uuid) TO authenticated, service_role;