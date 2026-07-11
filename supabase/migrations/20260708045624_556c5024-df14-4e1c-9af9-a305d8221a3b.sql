
drop policy if exists "event_survey_responses_insert_all" on public.event_survey_responses;
create policy "owner insert esr"
  on public.event_survey_responses
  for insert
  with check (
    session_id = public.current_session_id()
    and option_index between 0 and 7
    and length(shared_code) between 1 and 32
  );
