
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subtopic text,
  ADD COLUMN IF NOT EXISTS thanks_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS posts_category_idx ON public.posts(category);

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subtopic text;

CREATE INDEX IF NOT EXISTS activities_category_idx ON public.activities(category);

CREATE TABLE IF NOT EXISTS public.post_thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  age_group text,
  gender text,
  home_area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, session_id)
);

GRANT SELECT, INSERT ON public.post_thanks TO anon, authenticated;
GRANT ALL ON public.post_thanks TO service_role;

ALTER TABLE public.post_thanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_thanks_select_all" ON public.post_thanks
  FOR SELECT USING (true);

CREATE POLICY "post_thanks_insert_any" ON public.post_thanks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS post_thanks_post_idx ON public.post_thanks(post_id);

-- Keep posts.thanks_count in sync
CREATE OR REPLACE FUNCTION public.bump_post_thanks()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET thanks_count = thanks_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS post_thanks_bump ON public.post_thanks;
CREATE TRIGGER post_thanks_bump AFTER INSERT ON public.post_thanks
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_thanks();
