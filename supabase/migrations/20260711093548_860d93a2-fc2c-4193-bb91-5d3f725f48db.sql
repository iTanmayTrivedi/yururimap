
-- ============================================================
-- (1) Fix event_sessions + groups RLS (with proper uuid<->text casts)
-- ============================================================
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE TO anon, authenticated
  USING (admin_session_id::text = public.current_session_id())
  WITH CHECK (admin_session_id::text = public.current_session_id());

DROP POLICY IF EXISTS "shared_code insert event sessions" ON public.event_sessions;
CREATE POLICY "event_sessions_insert_admin" ON public.event_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(shared_code) BETWEEN 4 AND 32
    AND length(COALESCE(label, '')) <= 80
    AND (
      EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.shared_code = event_sessions.shared_code
          AND g.admin_session_id::text = public.current_session_id()
      )
      OR created_by::text = public.current_session_id()
    )
  );

-- ============================================================
-- (2) Admin allowlist (session-based, passphrase-protected)
-- ============================================================
CREATE TABLE public.super_admins (
  session_id text PRIMARY KEY,
  label      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO anon, authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_read" ON public.super_admins FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.admin_secret (
  id int PRIMARY KEY DEFAULT 1,
  passphrase text NOT NULL,
  CONSTRAINT admin_secret_singleton CHECK (id = 1)
);
INSERT INTO public.admin_secret(id, passphrase) VALUES (1, 'yururi-admin-2026');

CREATE OR REPLACE FUNCTION public.claim_admin(_passphrase text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean; sid text;
BEGIN
  SELECT (passphrase = _passphrase) INTO ok FROM public.admin_secret WHERE id = 1;
  IF NOT COALESCE(ok, false) THEN RETURN false; END IF;
  sid := public.current_session_id();
  IF sid IS NULL OR length(sid) < 8 THEN RETURN false; END IF;
  INSERT INTO public.super_admins(session_id, label) VALUES (sid, 'claimed')
    ON CONFLICT (session_id) DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_admin(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE session_id = public.current_session_id());
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================================
-- (3) Fixed survey system
-- ============================================================
CREATE TABLE public.fixed_survey_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name_ja     text NOT NULL,
  name_en     text NOT NULL,
  emoji       text NOT NULL DEFAULT '📝',
  order_index int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fixed_survey_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fixed_survey_categories TO authenticated;
GRANT ALL ON public.fixed_survey_categories TO service_role;
ALTER TABLE public.fixed_survey_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_read" ON public.fixed_survey_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cat_admin_write" ON public.fixed_survey_categories FOR ALL TO anon, authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.fixed_survey_categories(slug, name_ja, name_en, emoji, order_index) VALUES
  ('childcare','子育て','Childcare','👶',1),
  ('roads-traffic','道路・交通','Roads & Traffic','🚗',2),
  ('parks-facilities','公園・公共施設','Parks & Public Facilities','🌳',3),
  ('schools','学校','Schools','🏫',4),
  ('workplace','職場','Workplace','💼',5),
  ('healthcare','医療','Healthcare','🩺',6),
  ('mental-health','メンタルヘルス','Mental Health','💗',7),
  ('crime-prevention','防犯','Crime Prevention','🚨',8),
  ('disaster','防災','Disaster Prevention','🌊',9),
  ('elderly-care','介護','Elderly Care','👵',10),
  ('other','その他','Other','📝',11);

CREATE TABLE public.fixed_surveys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES public.fixed_survey_categories(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX fixed_surveys_active_per_category
  ON public.fixed_surveys(category_id) WHERE is_published;
GRANT SELECT ON public.fixed_surveys TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fixed_surveys TO authenticated;
GRANT ALL ON public.fixed_surveys TO service_role;
ALTER TABLE public.fixed_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surv_read" ON public.fixed_surveys FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "surv_admin_write" ON public.fixed_surveys FOR ALL TO anon, authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.fixed_survey_questions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         uuid NOT NULL REFERENCES public.fixed_surveys(id) ON DELETE CASCADE,
  label             text NOT NULL,
  order_index       int NOT NULL DEFAULT 0,
  location_enabled  boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fixed_survey_questions_by_survey ON public.fixed_survey_questions(survey_id, order_index);
GRANT SELECT ON public.fixed_survey_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fixed_survey_questions TO authenticated;
GRANT ALL ON public.fixed_survey_questions TO service_role;
ALTER TABLE public.fixed_survey_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "q_read" ON public.fixed_survey_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "q_admin_write" ON public.fixed_survey_questions FOR ALL TO anon, authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.fixed_survey_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id    uuid NOT NULL REFERENCES public.fixed_surveys(id) ON DELETE CASCADE,
  session_id   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fixed_survey_submissions_by_survey ON public.fixed_survey_submissions(survey_id);
GRANT INSERT ON public.fixed_survey_submissions TO anon, authenticated;
GRANT SELECT ON public.fixed_survey_submissions TO anon, authenticated;
GRANT ALL ON public.fixed_survey_submissions TO service_role;
ALTER TABLE public.fixed_survey_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_insert" ON public.fixed_survey_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (session_id = public.current_session_id());
CREATE POLICY "sub_read" ON public.fixed_survey_submissions FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR session_id = public.current_session_id());

CREATE TABLE public.fixed_survey_answers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id    uuid NOT NULL REFERENCES public.fixed_survey_submissions(id) ON DELETE CASCADE,
  question_id      uuid NOT NULL REFERENCES public.fixed_survey_questions(id) ON DELETE CASCADE,
  comment          text,
  lat              double precision,
  lng              double precision,
  location_source  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT answers_comment_len CHECK (comment IS NULL OR length(comment) <= 400),
  CONSTRAINT answers_locsrc CHECK (location_source IS NULL OR location_source IN ('current','home','map'))
);
CREATE INDEX fixed_survey_answers_by_submission ON public.fixed_survey_answers(submission_id);
GRANT INSERT ON public.fixed_survey_answers TO anon, authenticated;
GRANT SELECT ON public.fixed_survey_answers TO anon, authenticated;
GRANT ALL ON public.fixed_survey_answers TO service_role;
ALTER TABLE public.fixed_survey_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ans_insert" ON public.fixed_survey_answers FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fixed_survey_submissions s
    WHERE s.id = fixed_survey_answers.submission_id
      AND s.session_id = public.current_session_id()
  ));
CREATE POLICY "ans_read" ON public.fixed_survey_answers FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.fixed_survey_submissions s
    WHERE s.id = fixed_survey_answers.submission_id
      AND s.session_id = public.current_session_id()
  ));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER fixed_surveys_touch BEFORE UPDATE ON public.fixed_surveys
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
