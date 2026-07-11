
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood text NOT NULL,
  mood_en text NOT NULL,
  mood_color text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  exact_lat double precision,
  exact_lng double precision,
  rounded_lat double precision,
  rounded_lng double precision,
  shared_code text,
  session_id text NOT NULL
);

CREATE INDEX submissions_session_id_idx ON public.submissions(session_id);
CREATE INDEX submissions_shared_code_idx ON public.submissions(shared_code);
CREATE INDEX submissions_timestamp_idx ON public.submissions(timestamp DESC);

GRANT SELECT, INSERT ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read submissions"
  ON public.submissions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (true);
