# Plan: YururiMap "Trouble" surveys, RLS fix, initial setup

You asked to prioritize (1) fixed survey feature and (2) shared-code bug fix. I'll also include the small extras (initial setup, home "Trouble" button, bottom-nav entry, trip log map default) since they're tightly coupled to the same UI.

## Priority 1 — Fixed Surveys ("困った")

### Data model (new tables)
- `fixed_survey_categories` — seeded rows: Childcare, Roads & Traffic, Parks & Public Facilities, Schools, Workplace, Healthcare, Mental Health, Crime Prevention, Disaster Prevention, Elderly Care, Other (with slug, icon, order).
- `fixed_surveys` — one active survey per category (title, description, category_id, updated_by, updated_at).
- `fixed_survey_questions` — belongs to survey; fields: label, order, location_enabled.
- `fixed_survey_submissions` — one row per user submit (session_id, survey_id, submitted_at).
- `fixed_survey_answers` — per-question answer: submission_id, question_id, comment (max 150 chars/3 lines), lat, lng, location_source ('current'|'home'|'map'|null).
- `admin_emails` — allowlist table with your two emails; used by `is_admin()` SECURITY DEFINER function.

### RLS
- Categories/surveys/questions: `SELECT` open to `anon`+`authenticated`; INSERT/UPDATE/DELETE gated by `public.is_admin(auth.uid())`.
- Submissions/answers: anyone (anon+auth) can INSERT; SELECT restricted (admin can read all; user can read own via session header).

### Admin auth
- Requires Lovable Cloud auth for admins only. Regular users stay session-based (no login).
- Sign-in page at `/admin/login` (email OTP). Only emails in `admin_emails` see the admin UI.
- Admin surface at `/admin/surveys` — list categories, create/edit/delete surveys and questions (add/remove, toggle location, reorder).

### User surface
- Home: large red "困った / Trouble" button at the top → `/trouble`.
- `/trouble`: numbered category list matching the mockup (1 子育て … 11 その他).
- `/trouble/$slug`: full survey on one page. Each question shows label, 3-line comment box (150 char cap), and if location enabled: three chips (📍 Current / 🏠 Residential / 🗺 Map) with an inline Leaflet map to drop a pin. Single submit button at the bottom.
- Bottom nav: replace/insert a "困った" tab pointing to `/trouble`.

### Initial setup (optional)
- One-time modal on first visit stored in `localStorage` (`niko_profile`): age group, gender, residential area (free text + optional lat/lng via map), location permission toggle. All optional, skippable.
- Residential area is reused as the "🏠 Residential" option in surveys; browser geolocation is used for "📍 Current".

## Priority 2 — Shared code bug (`event_sessions` RLS)

Current INSERT policy likely checks `admin_session_id = current_session_id()` but the header isn't sent on that call, or policy is missing entirely. Fix by:
- Recreating INSERT policy `WITH CHECK (created_by = public.current_session_id())` scoped `TO anon, authenticated`.
- Ensuring the client sends the `x-session-id` header (via a global fetch wrapper on the supabase client for the tables that need it) OR switching the check to allow inserts where `created_by` matches the value being written (server enforces via header). I'll verify current policy first and patch.

## Extra — Trip log map default
- `MapView` gets `worldCopyJump: true` and a lower `minZoom` (2). When there are no points, center on Japan (already default) with `zoom=5`; user can zoom out to see world.

## Not in this plan (per your note)
- Otter redesign — skipped, current version stays.

## Technical notes
- Uses TanStack Start server functions with `requireSupabaseAuth` for admin mutations; public reads via publishable client.
- Admin allowlist via `is_admin()` SECURITY DEFINER + `admin_emails` table so you can add Tanmay's email without a code change.
- All new `public` tables get explicit GRANTs per project rules.

Approve and I'll implement in this order: migration → admin auth + admin UI → user Trouble flow → event_sessions RLS fix → map default → initial setup modal.
