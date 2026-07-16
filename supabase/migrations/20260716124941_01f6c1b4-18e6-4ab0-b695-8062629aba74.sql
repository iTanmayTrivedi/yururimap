
DROP POLICY IF EXISTS "posts insert self" ON public.posts;
DROP POLICY IF EXISTS "posts update own" ON public.posts;
DROP POLICY IF EXISTS "posts delete own" ON public.posts;
CREATE POLICY "posts insert any" ON public.posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "posts update any" ON public.posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "posts delete any" ON public.posts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "likes insert self" ON public.post_likes;
DROP POLICY IF EXISTS "likes delete own" ON public.post_likes;
CREATE POLICY "likes insert any" ON public.post_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "likes delete any" ON public.post_likes FOR DELETE TO anon, authenticated USING (true);
