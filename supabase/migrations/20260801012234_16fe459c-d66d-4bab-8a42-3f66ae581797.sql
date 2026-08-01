CREATE TABLE public.disaster_ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  category text,
  title text NOT NULL,
  body text NOT NULL,
  photo_url text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.disaster_ideas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disaster_ideas TO authenticated;
GRANT ALL ON public.disaster_ideas TO service_role;

ALTER TABLE public.disaster_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas_select_visible" ON public.disaster_ideas
  FOR SELECT USING (hidden = false OR public.is_admin());

CREATE POLICY "ideas_insert_any" ON public.disaster_ideas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "ideas_update_admin" ON public.disaster_ideas
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ideas_delete_admin" ON public.disaster_ideas
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER disaster_ideas_touch BEFORE UPDATE ON public.disaster_ideas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();