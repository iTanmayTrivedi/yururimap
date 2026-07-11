
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  message text not null,
  email text,
  lang text,
  created_at timestamptz not null default now()
);

grant select, insert on public.feedback to anon, authenticated;
grant all on public.feedback to service_role;

alter table public.feedback enable row level security;

create policy "feedback_insert_self"
  on public.feedback
  for insert
  with check (
    session_id = public.current_session_id()
    and length(message) between 1 and 2000
    and (email is null or length(email) <= 200)
  );

create policy "feedback_select_own"
  on public.feedback
  for select
  using (session_id = public.current_session_id());
