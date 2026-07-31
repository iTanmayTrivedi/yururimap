
CREATE TABLE public.shelters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  crowdedness text NOT NULL DEFAULT 'unknown',
  pet_status text NOT NULL DEFAULT 'unknown',
  needed_supplies text[] NOT NULL DEFAULT '{}',
  problem_categories text[] NOT NULL DEFAULT '{}',
  surplus_supplies text[] NOT NULL DEFAULT '{}',
  announcement text,
  info_url text,
  admin_session_id text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shelters TO anon;
GRANT ALL ON public.shelters TO service_role;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
CREATE POLICY shelters_select ON public.shelters FOR SELECT USING (hidden = false OR public.is_admin());
CREATE POLICY shelters_insert ON public.shelters FOR INSERT WITH CHECK (true);
CREATE POLICY shelters_update ON public.shelters FOR UPDATE
  USING (public.is_admin() OR (admin_session_id IS NOT NULL AND admin_session_id = public.current_session_id()))
  WITH CHECK (public.is_admin() OR (admin_session_id IS NOT NULL AND admin_session_id = public.current_session_id()));
CREATE POLICY shelters_delete ON public.shelters FOR DELETE USING (public.is_admin());
CREATE TRIGGER shelters_touch BEFORE UPDATE ON public.shelters FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.shelter_status_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_id uuid NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
  kind text NOT NULL,
  item_key text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shelter_id, kind, item_key, session_id)
);
GRANT SELECT, INSERT, DELETE ON public.shelter_status_votes TO authenticated, anon;
GRANT ALL ON public.shelter_status_votes TO service_role;
ALTER TABLE public.shelter_status_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY svotes_select ON public.shelter_status_votes FOR SELECT USING (true);
CREATE POLICY svotes_insert ON public.shelter_status_votes FOR INSERT WITH CHECK (true);
CREATE POLICY svotes_delete ON public.shelter_status_votes FOR DELETE USING (session_id = public.current_session_id() OR public.is_admin());

CREATE TABLE public.shelter_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_id uuid NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  content text NOT NULL,
  photo_url text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelter_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shelter_posts TO anon;
GRANT ALL ON public.shelter_posts TO service_role;
ALTER TABLE public.shelter_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY sposts_select ON public.shelter_posts FOR SELECT USING (hidden = false OR public.is_admin());
CREATE POLICY sposts_insert ON public.shelter_posts FOR INSERT WITH CHECK (true);
CREATE POLICY sposts_update ON public.shelter_posts FOR UPDATE
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.shelters s WHERE s.id = shelter_id AND s.admin_session_id = public.current_session_id()))
  WITH CHECK (true);
CREATE POLICY sposts_delete ON public.shelter_posts FOR DELETE USING (
  public.is_admin() OR session_id = public.current_session_id() OR EXISTS (
    SELECT 1 FROM public.shelters s WHERE s.id = shelter_id AND s.admin_session_id = public.current_session_id()));

INSERT INTO public.shelters (name, address, lat, lng, crowdedness, pet_status, needed_supplies, problem_categories)
VALUES
  ('中央区立日本橋小学校 避難所', '東京都中央区日本橋人形町1-1', 35.6862, 139.7822, 'moderate', 'allowed', ARRAY['water','food','blanket'], ARRAY['toilet','cold']),
  ('渋谷区総合文化センター 避難所', '東京都渋谷区東1-19-1', 35.6553, 139.7089, 'crowded', 'conditional', ARRAY['diaper','formula','battery'], ARRAY['charging','information']),
  ('台東区立浅草中学校 避難所', '東京都台東区浅草4-14-11', 35.7195, 139.7965, 'empty', 'not_allowed', ARRAY['hygiene'], ARRAY['medical']);
