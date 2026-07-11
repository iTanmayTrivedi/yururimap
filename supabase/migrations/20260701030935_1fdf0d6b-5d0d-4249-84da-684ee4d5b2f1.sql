
-- 1) groups
CREATE TABLE public.groups (
  shared_code text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  admin_session_id uuid NOT NULL,
  location_precision text NOT NULL DEFAULT '500m',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.groups TO anon, authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select_all" ON public.groups FOR SELECT USING (true);
CREATE POLICY "groups_insert_valid" ON public.groups FOR INSERT WITH CHECK (
  shared_code ~ '^[A-Z0-9_-]{4,32}$' AND length(coalesce(name,'')) <= 60
);

-- 2) comments
CREATE TABLE public.group_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_code text NOT NULL,
  session_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_comments_code_idx ON public.group_comments(shared_code, created_at DESC);
GRANT SELECT, INSERT ON public.group_comments TO anon, authenticated;
GRANT ALL ON public.group_comments TO service_role;
ALTER TABLE public.group_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_select_all" ON public.group_comments FOR SELECT USING (true);
CREATE POLICY "gc_insert_valid" ON public.group_comments FOR INSERT WITH CHECK (
  shared_code ~ '^[A-Z0-9_-]{4,32}$' AND length(content) BETWEEN 1 AND 500
);

-- 3) help requests
CREATE TABLE public.group_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_code text NOT NULL,
  session_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_help_code_idx ON public.group_help_requests(shared_code, created_at DESC);
GRANT SELECT, INSERT ON public.group_help_requests TO anon, authenticated;
GRANT ALL ON public.group_help_requests TO service_role;
ALTER TABLE public.group_help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghr_select_all" ON public.group_help_requests FOR SELECT USING (true);
CREATE POLICY "ghr_insert_valid" ON public.group_help_requests FOR INSERT WITH CHECK (
  shared_code ~ '^[A-Z0-9_-]{4,32}$' AND length(message) <= 500
);

-- 4) surveys
CREATE TABLE public.group_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_code text NOT NULL,
  admin_session_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_surveys_code_idx ON public.group_surveys(shared_code, created_at DESC);
GRANT SELECT, INSERT ON public.group_surveys TO anon, authenticated;
GRANT ALL ON public.group_surveys TO service_role;
ALTER TABLE public.group_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gs_select_all" ON public.group_surveys FOR SELECT USING (true);
CREATE POLICY "gs_insert_valid" ON public.group_surveys FOR INSERT WITH CHECK (
  shared_code ~ '^[A-Z0-9_-]{4,32}$'
  AND length(question) BETWEEN 1 AND 200
  AND jsonb_typeof(options) = 'array'
  AND jsonb_array_length(options) BETWEEN 2 AND 8
);

-- 5) survey responses
CREATE TABLE public.group_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.group_surveys(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, session_id)
);
CREATE INDEX gsr_survey_idx ON public.group_survey_responses(survey_id);
GRANT SELECT, INSERT ON public.group_survey_responses TO anon, authenticated;
GRANT ALL ON public.group_survey_responses TO service_role;
ALTER TABLE public.group_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gsr_select_all" ON public.group_survey_responses FOR SELECT USING (true);
CREATE POLICY "gsr_insert_valid" ON public.group_survey_responses FOR INSERT WITH CHECK (
  option_index BETWEEN 0 AND 7
);
