-- Doms role (spec-doms.md). Depends on 017-019.
--
-- PURELY ADDITIVE: this file only CREATEs new objects (tables, functions, policies). It never
-- alters, drops, updates or deletes any existing table, column, constraint, policy or row, so the
-- currently deployed app keeps working unchanged. Every policy added to an existing table is
-- `for select using (current_user_is_doms())`, which is false for every non-doms user.
-- (tests/migrations/additive.spec.ts enforces this.)
--
-- Plain `create` (no `if not exists` / `or replace`) on purpose: a name collision aborts the
-- whole transaction instead of silently overwriting something.
--
-- Before running: take a dump (supabase/scripts/backup-prod.ps1).
-- After running: run supabase/scripts/row-counts.sql and diff against the "before" output.

begin;

-- ============================================================================
-- 1. Helper functions
-- ============================================================================

create function current_user_is_doms()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select current_user_has_role('doms');
$$;

create function user_team(p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select team from profiles where id = p_user_id;
$$;

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table doms_shows (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  date date not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table doms_show_teams (
  show_id uuid not null references doms_shows(id) on delete cascade,
  team text not null check (team in ('Samurai', 'Gladiator', 'Viking')),
  primary key (show_id, team)
);

create table doms_show_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  show_id uuid not null references doms_shows(id) on delete cascade,
  status text not null default 'undecided' check (status in ('absent', 'present', 'undecided')),
  updated_at timestamptz not null default now(),
  unique (user_id, show_id)
);

create table doms_show_assignments (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references doms_shows(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unique (show_id, user_id)
);

alter table doms_shows enable row level security;
alter table doms_show_teams enable row level security;
alter table doms_show_availability enable row level security;
alter table doms_show_assignments enable row level security;

-- Defined after the tables because SQL-language function bodies are validated at creation.
create function doms_show_targets_team(p_show_id uuid, p_team text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_team is not null
    and exists (select 1 from doms_show_teams where show_id = p_show_id and team = p_team);
$$;

-- ============================================================================
-- 3. RPC functions
-- ============================================================================

create function create_doms_show(p_name text, p_date date, p_teams text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_teams text[];
begin
  if not current_user_is_doms() then
    raise exception 'Only doms can create doms shows';
  end if;
  if p_name is null or btrim(p_name) = '' or p_date is null then
    raise exception 'Name and date are required';
  end if;

  select coalesce(array_agg(distinct t), '{}') into v_teams from unnest(p_teams) as t;
  if cardinality(v_teams) = 0 then
    raise exception 'At least one target team is required';
  end if;
  if exists (select 1 from unnest(v_teams) t where t not in ('Samurai', 'Gladiator', 'Viking')) then
    raise exception 'Invalid team';
  end if;

  insert into doms_shows (name, date, created_by)
    values (btrim(p_name), p_date, auth.uid())
    returning id into v_id;

  insert into doms_show_teams (show_id, team) select v_id, t from unnest(v_teams) t;

  insert into doms_show_availability (user_id, show_id, status)
    select id, v_id, 'undecided' from profiles where team = any (v_teams);

  return v_id;
end;
$$;

create function update_doms_show(p_show_id uuid, p_name text, p_date date, p_teams text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teams text[];
  v_removed text[];
  v_added text[];
begin
  if not current_user_is_doms() then
    raise exception 'Only doms can update doms shows';
  end if;
  if not exists (select 1 from doms_shows where id = p_show_id) then
    raise exception 'Doms show not found';
  end if;
  if p_name is null or btrim(p_name) = '' or p_date is null then
    raise exception 'Name and date are required';
  end if;

  select coalesce(array_agg(distinct t), '{}') into v_teams from unnest(p_teams) as t;
  if cardinality(v_teams) = 0 then
    raise exception 'At least one target team is required';
  end if;
  if exists (select 1 from unnest(v_teams) t where t not in ('Samurai', 'Gladiator', 'Viking')) then
    raise exception 'Invalid team';
  end if;

  update doms_shows set name = btrim(p_name), date = p_date where id = p_show_id;

  select coalesce(array_agg(team), '{}') into v_removed
    from doms_show_teams where show_id = p_show_id and team <> all (v_teams);
  select coalesce(array_agg(t), '{}') into v_added
    from unnest(v_teams) t
    where t not in (select team from doms_show_teams where show_id = p_show_id);

  if cardinality(v_removed) > 0 then
    delete from doms_show_availability
      where show_id = p_show_id
        and user_id in (select id from profiles where team = any (v_removed));
    delete from doms_show_assignments
      where show_id = p_show_id
        and user_id in (select id from profiles where team = any (v_removed));
    delete from doms_show_teams where show_id = p_show_id and team = any (v_removed);
  end if;

  if cardinality(v_added) > 0 then
    insert into doms_show_teams (show_id, team) select p_show_id, t from unnest(v_added) t;
    insert into doms_show_availability (user_id, show_id, status)
      select id, p_show_id, 'undecided' from profiles where team = any (v_added)
      on conflict (user_id, show_id) do nothing;
  end if;
end;
$$;

create function doms_show_cast(p_show_id uuid)
returns table (user_id uuid, name text, team text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.name, p.team
  from doms_show_assignments sa
  join profiles p on p.id = sa.user_id
  where sa.show_id = p_show_id
    and doms_show_targets_team(p_show_id, p.team)
    and (current_user_is_doms() or doms_show_targets_team(p_show_id, current_user_team()));
$$;

revoke all on function create_doms_show(text, date, text[]) from public, anon;
revoke all on function update_doms_show(uuid, text, date, text[]) from public, anon;
revoke all on function doms_show_cast(uuid) from public, anon;
grant execute on function create_doms_show(text, date, text[]) to authenticated;
grant execute on function update_doms_show(uuid, text, date, text[]) to authenticated;
grant execute on function doms_show_cast(uuid) to authenticated;

-- ============================================================================
-- 4. Policies on the new tables
-- ============================================================================

-- No INSERT policy on doms_shows / doms_show_teams: creation goes through create_doms_show().
create policy doms_shows_select on doms_shows
  for select
  using (current_user_is_doms() or doms_show_targets_team(id, current_user_team()));

create policy doms_shows_update on doms_shows
  for update
  using (current_user_is_doms())
  with check (current_user_is_doms());

create policy doms_shows_delete on doms_shows
  for delete
  using (current_user_is_doms());

create policy doms_show_teams_select on doms_show_teams
  for select
  using (exists (select 1 from doms_shows s where s.id = doms_show_teams.show_id));

create policy doms_show_availability_select on doms_show_availability
  for select
  using (exists (select 1 from doms_shows s where s.id = doms_show_availability.show_id));

create policy doms_show_availability_write on doms_show_availability
  for all
  using (
    exists (
      select 1 from doms_shows s
      where s.id = doms_show_availability.show_id
        and (
          (doms_show_availability.user_id = auth.uid()
            and doms_show_targets_team(s.id, current_user_team())
            and s.date >= current_date)
          or (current_user_is_doms()
              and doms_show_targets_team(s.id, user_team(doms_show_availability.user_id)))
        )
    )
  )
  with check (
    exists (
      select 1 from doms_shows s
      where s.id = doms_show_availability.show_id
        and (
          (doms_show_availability.user_id = auth.uid()
            and doms_show_targets_team(s.id, current_user_team())
            and s.date >= current_date)
          or (current_user_is_doms()
              and doms_show_targets_team(s.id, user_team(doms_show_availability.user_id)))
        )
    )
  );

create policy doms_show_assignments_select on doms_show_assignments
  for select
  using (exists (select 1 from doms_shows s where s.id = doms_show_assignments.show_id));

create policy doms_show_assignments_write on doms_show_assignments
  for all
  using (
    current_user_is_doms()
    and doms_show_targets_team(show_id, user_team(user_id))
  )
  with check (
    current_user_is_doms()
    and doms_show_targets_team(show_id, user_team(user_id))
  );

-- ============================================================================
-- 5. Doms read access on EXISTING tables (SELECT only, false for everyone else)
-- ============================================================================

create policy profiles_select_doms on profiles
  for select using (current_user_is_doms());

create policy coaching_sessions_select_doms on coaching_sessions
  for select using (current_user_is_doms());

create policy attendance_select_doms on attendance_records
  for select using (current_user_is_doms());

create policy shows_select_doms on shows
  for select using (current_user_is_doms());

create policy show_assignments_select_doms on show_assignments
  for select using (current_user_is_doms());

create policy show_availability_select_doms on show_availability
  for select using (current_user_is_doms());

commit;
