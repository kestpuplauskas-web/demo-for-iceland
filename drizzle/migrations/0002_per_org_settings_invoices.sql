ALTER TABLE public.property_settings DROP CONSTRAINT IF EXISTS property_settings_scope_key;
DROP INDEX IF EXISTS public.property_settings_scope_key;
CREATE UNIQUE INDEX IF NOT EXISTS property_settings_org_scope_key ON public.property_settings (organization_id, scope);

DROP INDEX IF EXISTS public.invoices_series_number_idx;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_series_number_idx ON public.invoices (organization_id, invoice_series, invoice_number);

CREATE OR REPLACE FUNCTION public.default_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE(public.current_org_id(), '00000000-0000-0000-0000-000000000001'::uuid) $$;

CREATE OR REPLACE FUNCTION public.claim_invoice_number(_org_id uuid DEFAULT NULL)
RETURNS TABLE(series text, number integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_series text; v_number integer; v_org uuid;
BEGIN
  v_org := COALESCE(_org_id, public.default_org_id());
  UPDATE public.property_settings
  SET invoice_next_number = invoice_next_number + 1
  WHERE scope = 'global' AND organization_id = v_org
  RETURNING invoice_series, invoice_next_number - 1 INTO v_series, v_number;
  IF v_number IS NULL THEN
    RAISE EXCEPTION 'Settings not found for this hotel — save Invoice settings first.';
  END IF;
  RETURN QUERY SELECT v_series, v_number;
END;
$function$;
DROP FUNCTION IF EXISTS public.claim_invoice_number();

CREATE OR REPLACE FUNCTION public.global_currency()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE((SELECT currency FROM public.property_settings WHERE scope = 'global' AND organization_id = public.default_org_id() LIMIT 1), 'EUR') $$;

INSERT INTO public.property_settings (scope, organization_id, display_name, email, invoice_series, invoice_next_number)
SELECT 'global', o.id, o.name, o.contact_email, 'INV', 1
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.property_settings s WHERE s.organization_id = o.id AND s.scope = 'global');