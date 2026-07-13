
-- Fix event_sessions insert policy: remove dependency on x-session-id request header
DROP POLICY IF EXISTS event_sessions_insert_admin ON public.event_sessions;
CREATE POLICY event_sessions_insert_admin ON public.event_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(shared_code) BETWEEN 4 AND 32
    AND length(COALESCE(label, '')) <= 80
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.shared_code = event_sessions.shared_code
        AND g.admin_session_id::text = event_sessions.created_by::text
    )
  );

-- trouble_reports
CREATE TABLE public.trouble_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  place_label text NOT NULL CHECK (length(place_label) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 500),
  affected_group text CHECK (affected_group IS NULL OR length(affected_group) <= 40),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.trouble_reports TO anon, authenticated;
GRANT ALL ON public.trouble_reports TO service_role;
ALTER TABLE public.trouble_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY trouble_reports_select ON public.trouble_reports FOR SELECT USING (true);
CREATE POLICY trouble_reports_insert ON public.trouble_reports FOR INSERT
  WITH CHECK (length(session_id) BETWEEN 8 AND 64);
CREATE POLICY trouble_reports_delete_own ON public.trouble_reports FOR DELETE
  USING (session_id = public.current_session_id());

-- trouble_metoo
CREATE TABLE public.trouble_metoo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.trouble_reports(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, session_id)
);
GRANT SELECT, INSERT ON public.trouble_metoo TO anon, authenticated;
GRANT ALL ON public.trouble_metoo TO service_role;
ALTER TABLE public.trouble_metoo ENABLE ROW LEVEL SECURITY;
CREATE POLICY trouble_metoo_select ON public.trouble_metoo FOR SELECT USING (true);
CREATE POLICY trouble_metoo_insert ON public.trouble_metoo FOR INSERT
  WITH CHECK (length(session_id) BETWEEN 8 AND 64);

CREATE INDEX trouble_metoo_report_id_idx ON public.trouble_metoo(report_id);
CREATE INDEX trouble_reports_created_at_idx ON public.trouble_reports(created_at DESC);
