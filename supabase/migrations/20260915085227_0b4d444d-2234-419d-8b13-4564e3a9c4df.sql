ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_currency_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_currency_check CHECK (currency IN ('EUR','ISK'));

GRANT SELECT (currency) ON public.properties TO anon, authenticated;