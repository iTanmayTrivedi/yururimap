
-- 1. Extend posts with resolved/hidden + demographics snapshot
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS home_area text;

ALTER TABLE public.post_likes
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS home_area text;

-- 2. Resolution reports
CREATE TABLE IF NOT EXISTS public.resolution_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  description text NOT NULL,
  photo_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  hidden boolean NOT NULL DEFAULT false,
  age_group text, gender text, home_area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_reports TO anon, authenticated;
GRANT ALL ON public.resolution_reports TO service_role;
ALTER TABLE public.resolution_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rr_select ON public.resolution_reports;
CREATE POLICY rr_select ON public.resolution_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS rr_insert ON public.resolution_reports;
CREATE POLICY rr_insert ON public.resolution_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS rr_admin_all ON public.resolution_reports;
CREATE POLICY rr_admin_all ON public.resolution_reports FOR ALL TO anon, authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Verified posters
CREATE TABLE IF NOT EXISTS public.verified_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verified_posters TO anon, authenticated;
GRANT ALL ON public.verified_posters TO service_role;
ALTER TABLE public.verified_posters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vp_select ON public.verified_posters;
CREATE POLICY vp_select ON public.verified_posters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS vp_admin_all ON public.verified_posters;
CREATE POLICY vp_admin_all ON public.verified_posters FOR ALL TO anon, authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  activity_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  scope text NOT NULL DEFAULT 'local',
  place_label text,
  lat double precision,
  lng double precision,
  official_url text,
  photo_url text,
  hidden boolean NOT NULL DEFAULT false,
  age_group text, gender text, home_area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS act_select ON public.activities;
CREATE POLICY act_select ON public.activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS act_insert ON public.activities;
CREATE POLICY act_insert ON public.activities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS act_update_own ON public.activities;
CREATE POLICY act_update_own ON public.activities FOR UPDATE TO anon, authenticated
  USING (session_id = public.current_session_id() OR public.is_admin())
  WITH CHECK (session_id = public.current_session_id() OR public.is_admin());
DROP POLICY IF EXISTS act_delete_own ON public.activities;
CREATE POLICY act_delete_own ON public.activities FOR DELETE TO anon, authenticated
  USING (session_id = public.current_session_id() OR public.is_admin());

DROP TRIGGER IF EXISTS activities_touch ON public.activities;
CREATE TRIGGER activities_touch BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Activity likes
CREATE TABLE IF NOT EXISTS public.activity_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  age_group text, gender text, home_area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, session_id)
);
GRANT SELECT, INSERT, DELETE ON public.activity_likes TO anon, authenticated;
GRANT ALL ON public.activity_likes TO service_role;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS al_select ON public.activity_likes;
CREATE POLICY al_select ON public.activity_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS al_insert ON public.activity_likes;
CREATE POLICY al_insert ON public.activity_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS al_delete_own ON public.activity_likes;
CREATE POLICY al_delete_own ON public.activity_likes FOR DELETE TO anon, authenticated
  USING (session_id = public.current_session_id() OR public.is_admin());

-- 6. Post reports (moderation)
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  resolution_id uuid REFERENCES public.resolution_reports(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reports TO anon, authenticated;
GRANT ALL ON public.post_reports TO service_role;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pr_insert ON public.post_reports;
CREATE POLICY pr_insert ON public.post_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS pr_admin_all ON public.post_reports;
CREATE POLICY pr_admin_all ON public.post_reports FOR ALL TO anon, authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
