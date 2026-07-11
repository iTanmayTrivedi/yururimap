
CREATE TABLE public.event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_code text NOT NULL,
  label text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_sessions_code_idx ON public.event_sessions(shared_code, started_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sessions TO anon, authenticated;
GRANT ALL ON public.event_sessions TO service_role;

ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read event sessions"
  ON public.event_sessions FOR SELECT
  USING (true);

CREATE POLICY "anyone insert event sessions"
  ON public.event_sessions FOR INSERT
  WITH CHECK (
    length(shared_code) BETWEEN 4 AND 32
    AND length(coalesce(label,'')) <= 80
  );

CREATE POLICY "anyone update event sessions"
  ON public.event_sessions FOR UPDATE
  USING (true)
  WITH CHECK (length(coalesce(label,'')) <= 80);

CREATE POLICY "anyone delete event sessions"
  ON public.event_sessions FOR DELETE
  USING (true);
