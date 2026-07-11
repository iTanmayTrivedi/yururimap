
ALTER TABLE public.admin_secret ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_secret FROM anon, authenticated, public;
