-- 1) Remove publicly-readable exact coordinates (privacy fix)
ALTER TABLE public.submissions DROP COLUMN IF EXISTS exact_lat;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS exact_lng;

-- 2) Replace the always-true INSERT policy with a validated one
DROP POLICY IF EXISTS "Anyone can create submissions" ON public.submissions;

CREATE POLICY "Anyone can create valid submissions"
ON public.submissions
FOR INSERT
TO public
WITH CHECK (
  mood IS NOT NULL
  AND char_length(mood) BETWEEN 1 AND 50
  AND mood_en IS NOT NULL
  AND char_length(mood_en) BETWEEN 1 AND 50
  AND mood_color IS NOT NULL
  AND mood_color ~ '^#[0-9A-Fa-f]{6}$'
  AND session_id IS NOT NULL
  AND char_length(session_id) BETWEEN 8 AND 64
  AND (shared_code IS NULL OR char_length(shared_code) BETWEEN 1 AND 32)
  AND (rounded_lat IS NULL OR (rounded_lat BETWEEN -90 AND 90))
  AND (rounded_lng IS NULL OR (rounded_lng BETWEEN -180 AND 180))
);