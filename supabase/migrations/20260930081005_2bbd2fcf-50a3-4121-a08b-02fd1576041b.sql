ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_currency_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_currency_check CHECK (currency IN ('EUR','USD','GBP','ISK','NOK'));

CREATE OR REPLACE FUNCTION public.global_currency()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT currency FROM public.property_settings WHERE scope = 'global' ORDER BY updated_at DESC LIMIT 1), 'EUR')
$$;
REVOKE EXECUTE ON FUNCTION public.global_currency() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.properties_force_global_currency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.currency := public.global_currency();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.properties_force_global_currency() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS properties_force_global_currency ON public.properties;
CREATE TRIGGER properties_force_global_currency BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.properties_force_global_currency();

CREATE OR REPLACE FUNCTION public.sync_properties_currency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.scope = 'global' AND NEW.currency IN ('EUR','USD','GBP','ISK','NOK') THEN
    UPDATE public.properties SET currency = NEW.currency WHERE currency IS DISTINCT FROM NEW.currency;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_properties_currency() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_properties_currency ON public.property_settings;
CREATE TRIGGER sync_properties_currency AFTER INSERT OR UPDATE OF currency ON public.property_settings
FOR EACH ROW EXECUTE FUNCTION public.sync_properties_currency();

UPDATE public.properties SET currency = public.global_currency() WHERE true;