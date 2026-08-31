-- Row Level Security and supporting functions/triggers for the target-state schema
-- (spec.md §4, §7). Depends on 017_target_baseline.sql.

-- ============================================================================
-- 1. handle_new_user() — creates the profiles row on signup
-- ============================================================================
--
-- SECURITY DEFINER so it can insert into profiles regardless of RLS. This is the ONLY way a
-- profiles row is ever created — there is no client-side insert and no INSERT policy on
-- profiles at all, so an orphaned auth.users row with no matching profile is impossible.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Unknown'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 2. SECURITY DEFINER helpers — read profiles while bypassing its own RLS
-- ============================================================================
--
-- This is what makes the infinite-recursion trap the original schema hit (a `profiles` policy
-- subquerying `profiles` under RLS) structurally impossible: these functions read the table
-- with the privileges of their definer, not the calling role, so they never re-enter RLS.

create or replace function current_user_team()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select team from profiles where id = auth.uid();
$$;

create or replace function current_user_has_role(r text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select r = any(roles) from profiles where id = auth.uid()), false);
$$;

-- ============================================================================
-- 3. Enable RLS everywhere
-- ============================================================================

alter table profiles enable row level security;
alter table coaching_sessions enable row level security;
alter table attendance_records enable row level security;
alter table shows enable row level security;
alter table show_assignments enable row level security;
alter table show_availability enable row level security;

-- ============================================================================
-- 4. profiles
-- ============================================================================
--
-- No INSERT policy: rows are only ever created by handle_new_user() (security definer).
-- No general UPDATE policy: role/team assignment is admin-only; name is immutable in the app.

create policy profiles_select on profiles
  for select
  using (
    id = auth.uid()
    or team = current_user_team()
    or current_user_has_role('admin')
  );

create policy profiles_update_admin on profiles
  for update
  using (current_user_has_role('admin'))
  with check (current_user_has_role('admin'));

-- ============================================================================
-- 5. coaching_sessions
-- ============================================================================

create policy coaching_sessions_select on coaching_sessions
  for select
  using (team = current_user_team());

create policy coaching_sessions_write on coaching_sessions
  for all
  using (team = current_user_team() and current_user_has_role('captain'))
  with check (team = current_user_team() and current_user_has_role('captain'));

-- ============================================================================
-- 6. attendance_records
-- ============================================================================
--
-- Read: anyone on the session's team (needed for the captain's/team's attendance matrix).
-- Write: your own row on a non-past session, or any row on your own team if you're captain
-- (spec.md §7.2 — the past-event lock lives here, not in an optional client argument).

create policy attendance_select on attendance_records
  for select
  using (
    exists (
      select 1 from coaching_sessions cs
      where cs.id = attendance_records.session_id
        and cs.team = current_user_team()
    )
  );

create policy attendance_write on attendance_records
  for all
  using (
    exists (
      select 1 from coaching_sessions cs
      where cs.id = attendance_records.session_id
        and cs.team = current_user_team()
        and (
          (attendance_records.user_id = auth.uid() and cs.date >= current_date)
          or current_user_has_role('captain')
        )
    )
  )
  with check (
    exists (
      select 1 from coaching_sessions cs
      where cs.id = attendance_records.session_id
        and cs.team = current_user_team()
        and (
          (attendance_records.user_id = auth.uid() and cs.date >= current_date)
          or current_user_has_role('captain')
        )
    )
  );

-- ============================================================================
-- 7. shows
-- ============================================================================

create policy shows_select on shows
  for select
  using (team = current_user_team());

create policy shows_write on shows
  for all
  using (team = current_user_team() and current_user_has_role('captain'))
  with check (team = current_user_team() and current_user_has_role('captain'));

-- ============================================================================
-- 8. show_assignments
-- ============================================================================

create policy show_assignments_select on show_assignments
  for select
  using (
    exists (
      select 1 from shows s
      where s.id = show_assignments.show_id
        and s.team = current_user_team()
    )
  );

create policy show_assignments_write on show_assignments
  for all
  using (
    exists (
      select 1 from shows s
      where s.id = show_assignments.show_id
        and s.team = current_user_team()
        and current_user_has_role('captain')
    )
  )
  with check (
    exists (
      select 1 from shows s
      where s.id = show_assignments.show_id
        and s.team = current_user_team()
        and current_user_has_role('captain')
    )
  );

-- ============================================================================
-- 9. show_availability
-- ============================================================================
--
-- Same past-event-lock shape as attendance_records, keyed on the show's own date.

create policy show_availability_select on show_availability
  for select
  using (
    exists (
      select 1 from shows s
      where s.id = show_availability.show_id
        and s.team = current_user_team()
    )
  );

create policy show_availability_write on show_availability
  for all
  using (
    exists (
      select 1 from shows s
      where s.id = show_availability.show_id
        and s.team = current_user_team()
        and (
          (show_availability.user_id = auth.uid() and s.date >= current_date)
          or current_user_has_role('captain')
        )
    )
  )
  with check (
    exists (
      select 1 from shows s
      where s.id = show_availability.show_id
        and s.team = current_user_team()
        and (
          (show_availability.user_id = auth.uid() and s.date >= current_date)
          or current_user_has_role('captain')
        )
    )
  );
