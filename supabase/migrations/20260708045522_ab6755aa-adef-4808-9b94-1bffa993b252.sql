
create or replace function public.current_session_id()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('request.headers', true)::json ->> 'x-session-id', '')
$$;

drop policy if exists "anyone delete event sessions" on public.event_sessions;
drop policy if exists "anyone update event sessions" on public.event_sessions;
drop policy if exists "anyone insert event sessions" on public.event_sessions;

create policy "owner delete event sessions"
  on public.event_sessions
  for delete
  using (created_by::text = public.current_session_id());

create policy "owner update event sessions"
  on public.event_sessions
  for update
  using (created_by::text = public.current_session_id())
  with check (
    created_by::text = public.current_session_id()
    and length(coalesce(label, '')) <= 80
  );

create policy "owner insert event sessions"
  on public.event_sessions
  for insert
  with check (
    length(shared_code) between 4 and 32
    and length(coalesce(label, '')) <= 80
    and created_by::text = public.current_session_id()
  );

drop policy if exists "event_survey_responses_delete_all" on public.event_survey_responses;
drop policy if exists "event_survey_responses_update_all" on public.event_survey_responses;

create policy "owner delete esr"
  on public.event_survey_responses
  for delete
  using (session_id = public.current_session_id());

create policy "owner update esr"
  on public.event_survey_responses
  for update
  using (session_id = public.current_session_id())
  with check (session_id = public.current_session_id());

drop policy if exists "gs_insert_valid" on public.group_surveys;
create policy "gs_insert_valid"
  on public.group_surveys
  for insert
  with check (
    (shared_code ~ '^[A-Z0-9_-]{4,32}$')
    and (length(question) between 1 and 200)
    and (jsonb_typeof(options) = 'array')
    and (jsonb_array_length(options) between 2 and 8)
    and admin_session_id::text = public.current_session_id()
  );

drop policy if exists "groups_insert_valid" on public.groups;
create policy "groups_insert_valid"
  on public.groups
  for insert
  with check (
    (shared_code ~ '^[A-Z0-9_-]{4,32}$')
    and length(coalesce(name, '')) <= 60
    and admin_session_id::text = public.current_session_id()
  );
