
-- Relax event_sessions policies: shared_code is the access token, so any client
-- that knows a valid code can control aggregation across devices.

drop policy if exists "owner insert event sessions" on public.event_sessions;
drop policy if exists "owner update event sessions" on public.event_sessions;
drop policy if exists "owner delete event sessions" on public.event_sessions;

create policy "shared_code insert event sessions"
  on public.event_sessions
  for insert
  with check (
    length(shared_code) between 4 and 32
    and length(coalesce(label, '')) <= 80
    and exists (select 1 from public.groups g where g.shared_code = event_sessions.shared_code)
  );

create policy "shared_code update event sessions"
  on public.event_sessions
  for update
  using (exists (select 1 from public.groups g where g.shared_code = event_sessions.shared_code))
  with check (
    length(coalesce(label, '')) <= 80
    and exists (select 1 from public.groups g where g.shared_code = event_sessions.shared_code)
  );

create policy "shared_code delete event sessions"
  on public.event_sessions
  for delete
  using (exists (select 1 from public.groups g where g.shared_code = event_sessions.shared_code));
