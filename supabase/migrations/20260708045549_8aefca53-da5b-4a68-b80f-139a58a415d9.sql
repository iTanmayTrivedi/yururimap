
drop policy if exists "Anyone can delete submissions" on public.submissions;
create policy "Owners can delete their submissions"
  on public.submissions
  for delete
  to anon, authenticated
  using (session_id = public.current_session_id());
