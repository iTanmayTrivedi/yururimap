
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS exact_lat float8,
  ADD COLUMN IF NOT EXISTS exact_lng float8;

DROP POLICY IF EXISTS "Anyone can create valid submissions" ON public.submissions;
CREATE POLICY "Anyone can create valid submissions" ON public.submissions
FOR INSERT TO anon, authenticated
WITH CHECK (
  mood IS NOT NULL AND char_length(mood) BETWEEN 1 AND 50
  AND mood_en IS NOT NULL AND char_length(mood_en) BETWEEN 1 AND 50
  AND mood_color IS NOT NULL AND mood_color ~ '^#[0-9A-Fa-f]{6}$'
  AND session_id IS NOT NULL AND char_length(session_id) BETWEEN 8 AND 64
  AND (shared_code IS NULL OR char_length(shared_code) BETWEEN 1 AND 32)
  AND (rounded_lat IS NULL OR (rounded_lat BETWEEN -90 AND 90))
  AND (rounded_lng IS NULL OR (rounded_lng BETWEEN -180 AND 180))
  AND (exact_lat IS NULL OR (exact_lat BETWEEN -90 AND 90))
  AND (exact_lng IS NULL OR (exact_lng BETWEEN -180 AND 180))
);

DROP POLICY IF EXISTS "Anyone can delete submissions" ON public.submissions;
CREATE POLICY "Anyone can delete submissions" ON public.submissions
FOR DELETE TO anon, authenticated
USING (true);

GRANT DELETE ON public.submissions TO anon, authenticated;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS results_visible boolean NOT NULL DEFAULT true;
