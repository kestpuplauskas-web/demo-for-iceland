ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS referrer_host text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS device text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS visitor_hash text,
  ADD COLUMN IF NOT EXISTS day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS page_views_day_idx ON public.page_views (day);
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_path_idx ON public.page_views (path);
CREATE INDEX IF NOT EXISTS page_views_visitor_idx ON public.page_views (day, visitor_hash);
CREATE INDEX IF NOT EXISTS page_views_is_bot_day_idx ON public.page_views (is_bot, day);

GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;
CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can manage page views" ON public.page_views;
CREATE POLICY "Service role can manage page views"
  ON public.page_views FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.analytics_summary(_from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  IF _from IS NULL OR _to IS NULL OR _to < _from OR (_to - _from) > 400 THEN
    RAISE EXCEPTION 'invalid date range';
  END IF;

  SELECT jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object('views', count(*), 'visitors', count(DISTINCT visitor_hash))
      FROM public.page_views WHERE day BETWEEN _from AND _to AND is_bot = false
    ),
    'bots', (
      SELECT count(*) FROM public.page_views WHERE day BETWEEN _from AND _to AND is_bot = true
    ),
    'previous', (
      SELECT jsonb_build_object('views', count(*), 'visitors', count(DISTINCT visitor_hash))
      FROM public.page_views
      WHERE day BETWEEN (_from - (_to - _from) - 1) AND (_from - 1) AND is_bot = false
    ),
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.day)
      FROM (
        SELECT day, count(*) AS views, count(DISTINCT visitor_hash) AS visitors
        FROM public.page_views WHERE day BETWEEN _from AND _to AND is_bot = false GROUP BY day
      ) d
    ), '[]'::jsonb),
    'top_pages', COALESCE((
      SELECT jsonb_agg(row_to_json(p))
      FROM (
        SELECT path, count(*) AS views FROM public.page_views
        WHERE day BETWEEN _from AND _to AND is_bot = false GROUP BY path ORDER BY count(*) DESC LIMIT 15
      ) p
    ), '[]'::jsonb),
    'sources', COALESCE((
      SELECT jsonb_agg(row_to_json(s))
      FROM (
        SELECT source, count(*) AS views FROM public.page_views
        WHERE day BETWEEN _from AND _to AND is_bot = false GROUP BY source ORDER BY count(*) DESC
      ) s
    ), '[]'::jsonb),
    'devices', COALESCE((
      SELECT jsonb_agg(row_to_json(v))
      FROM (
        SELECT device, count(*) AS views FROM public.page_views
        WHERE day BETWEEN _from AND _to AND is_bot = false GROUP BY device
      ) v
    ), '[]'::jsonb),
    'countries', COALESCE((
      SELECT jsonb_agg(row_to_json(c))
      FROM (
        SELECT coalesce(nullif(country, ''), 'unknown') AS country, count(*) AS views,
               count(DISTINCT visitor_hash) AS visitors
        FROM public.page_views
        WHERE day BETWEEN _from AND _to AND is_bot = false GROUP BY 1 ORDER BY count(*) DESC LIMIT 15
      ) c
    ), '[]'::jsonb),
    'leads', (
      SELECT count(*) FROM public.bookings WHERE created_at::date BETWEEN _from AND _to
    )
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.analytics_summary(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_summary(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.analytics_summary(date, date) TO authenticated, service_role;