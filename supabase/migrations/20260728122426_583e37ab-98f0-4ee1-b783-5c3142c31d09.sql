ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS place_relation text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS apply_url text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS homepage_url text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS donation_url text;