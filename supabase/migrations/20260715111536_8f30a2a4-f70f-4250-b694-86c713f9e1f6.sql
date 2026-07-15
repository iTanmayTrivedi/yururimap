
-- 1) Post type enum
DO $$ BEGIN
  CREATE TYPE public.post_type AS ENUM ('happy', 'request', 'promote');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Unified posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  type public.post_type NOT NULL,
  title TEXT,
  place_label TEXT,
  description TEXT NOT NULL,
  why_needed TEXT,
  affected_group TEXT,
  when_text TEXT,
  official_url TEXT,
  photo_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_type_created_idx ON public.posts (type, created_at DESC);
CREATE INDEX posts_session_idx ON public.posts (session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts read all"   ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts insert self" ON public.posts FOR INSERT WITH CHECK (session_id = public.current_session_id());
CREATE POLICY "posts update own" ON public.posts FOR UPDATE USING (session_id = public.current_session_id());
CREATE POLICY "posts delete own" ON public.posts FOR DELETE
  USING (session_id = public.current_session_id() OR public.is_admin());

CREATE TRIGGER posts_touch_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Likes (heart / agree / me-too) — 1 per session per post
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, session_id)
);
CREATE INDEX post_likes_post_idx ON public.post_likes (post_id);

GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO anon;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes read all"    ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "likes insert self" ON public.post_likes FOR INSERT WITH CHECK (session_id = public.current_session_id());
CREATE POLICY "likes delete own"  ON public.post_likes FOR DELETE USING (session_id = public.current_session_id());

-- 4) Migrate legacy Trouble data into the new unified tables
INSERT INTO public.posts (id, session_id, type, place_label, description, affected_group, lat, lng, created_at, updated_at)
SELECT id, session_id, 'request'::public.post_type, place_label, description, affected_group, lat, lng, created_at, created_at
FROM public.trouble_reports
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_likes (post_id, session_id)
SELECT report_id, session_id FROM public.trouble_metoo
ON CONFLICT (post_id, session_id) DO NOTHING;
