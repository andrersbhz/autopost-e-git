
CREATE TABLE public.visitor_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  longitude double precision,
  latitude double precision,
  country text,
  state text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_history_country ON public.visitor_history(country);
CREATE INDEX idx_visitor_history_created_at ON public.visitor_history(created_at DESC);

GRANT SELECT, INSERT ON public.visitor_history TO authenticated;
GRANT INSERT ON public.visitor_history TO anon;
GRANT ALL ON public.visitor_history TO service_role;

ALTER TABLE public.visitor_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitor history"
  ON public.visitor_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read visitor history"
  ON public.visitor_history FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.record_visitor_history(
  p_user_id text,
  p_longitude double precision,
  p_latitude double precision,
  p_country text,
  p_state text,
  p_city text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.visitor_history (user_id, longitude, latitude, country, state, city)
  VALUES (p_user_id, p_longitude, p_latitude, p_country, p_state, p_city);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_visitor_history(text, double precision, double precision, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_top_countries_history(p_limit integer DEFAULT 10)
RETURNS TABLE(country text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT vh.country, COUNT(*)::bigint AS count
  FROM public.visitor_history vh
  WHERE vh.country IS NOT NULL AND vh.country <> ''
  GROUP BY vh.country
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_countries_history(integer) TO anon, authenticated;
