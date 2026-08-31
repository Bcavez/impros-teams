-- Target-state baseline (spec.md). Replaces migrations 001-016 (archived under
-- supabase/migrations/archive/ for history). Live data is disposable — this migration drops
-- the old anon-key-authenticated schema entirely and rebuilds it on Supabase Auth.
--
-- Run this once, in full, against a project where you have already:
--   1. Turned OFF "Confirm email" (Authentication -> Providers -> Email) — @impros.local
--      addresses can't receive mail, so email confirmation would block every signup.
--
-- After running this file, register through the app UI, then grant yourself admin with:
--   update profiles set roles = array['member','admin'] where slug = 'your-slug';

-- ============================================================================
-- 0. Extensions
-- ============================================================================

create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Drop the old schema
-- ============================================================================

drop table if exists show_availability cascade;
drop table if exists show_assignments cascade;
drop table if exists show_dates cascade;
drop table if exists shows cascade;
drop table if exists attendance_records cascade;
drop table if exists coaching_sessions cascade;
drop table if exists users cascade;

drop function if exists is_admin() cascade;
drop function if exists is_captain() cascade;
drop function if exists is_captain_of_team(text) cascade;
drop function if exists current_user_role() cascade;
drop function if exists current_user_team() cascade;
drop function if exists current_user_has_role(text) cascade;
drop function if exists handle_new_user() cascade;
drop function if exists immutable_unaccent(text) cascade;

-- ============================================================================
-- 2. Helper: an IMMUTABLE unaccent wrapper
-- ============================================================================

-- unaccent() ships as STABLE, but Postgres requires an IMMUTABLE expression for a generated
-- column. The default unaccent dictionary never actually changes at runtime, so wrapping it
-- is safe — this is the standard workaround for this exact limitation.
create or replace function immutable_unaccent(text) returns text as $$
  select unaccent('unaccent', $1)
$$ language sql immutable parallel safe strict;

-- ============================================================================
-- 3. profiles — mirrors auth.users 1:1
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  slug text generated always as (
    trim(both '-' from regexp_replace(lower(immutable_unaccent(name)), '[^a-z0-9]+', '-', 'g'))
  ) stored,
  roles text[] not null default array['member'],
  team text check (team in ('Samurai', 'Gladiator', 'Viking')),
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  constraint captain_requires_team check (
    not ('captain' = any(roles)) or team is not null
  )
);

create unique index profiles_slug_key on profiles (slug);

comment on column profiles.slug is
  'Generated from name; backs both the unique-name constraint and the synthetic '
  '<slug>@impros.local auth email (src/lib/auth-identity.ts). Two names that slugify '
  'identically are treated as a collision by design (spec.md §4.2).';

-- ============================================================================
-- 4. coaching_sessions / attendance_records
-- ============================================================================

create table coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  team text not null check (team in ('Samurai', 'Gladiator', 'Viking')),
  coach text not null check (btrim(coach) <> ''),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_id uuid not null references coaching_sessions(id) on delete cascade,
  status text not null default 'present' check (status in ('absent', 'present', 'undecided')),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

-- ============================================================================
-- 5. shows / show_assignments / show_availability
-- ============================================================================

create table shows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text not null check (team in ('Samurai', 'Gladiator', 'Viking')),
  date date not null,
  max_cast integer not null default 5,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table show_assignments (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unique (show_id, user_id)
);

create table show_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  status text not null default 'undecided' check (status in ('absent', 'present', 'undecided')),
  updated_at timestamptz not null default now(),
  unique (user_id, show_id)
);
