
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS event_title text,
  ADD COLUMN IF NOT EXISTS event_datetime text,
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS event_fee text,
  ADD COLUMN IF NOT EXISTS event_description text,
  ADD COLUMN IF NOT EXISTS organizer_name text,
  ADD COLUMN IF NOT EXISTS event_url text,
  ADD COLUMN IF NOT EXISTS survey_question text,
  ADD COLUMN IF NOT EXISTS survey_options jsonb,
  ADD COLUMN IF NOT EXISTS survey_visibility text NOT NULL DEFAULT 'participants';

CREATE TABLE IF NOT EXISTS public.event_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_code text NOT NULL,
  session_id text NOT NULL,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shared_code, session_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_survey_responses TO anon, authenticated;
GRANT ALL ON public.event_survey_responses TO service_role;

ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_survey_responses_read_all"
  ON public.event_survey_responses FOR SELECT
  USING (true);

CREATE POLICY "event_survey_responses_insert_all"
  ON public.event_survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "event_survey_responses_update_all"
  ON public.event_survey_responses FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "event_survey_responses_delete_all"
  ON public.event_survey_responses FOR DELETE
  USING (true);
