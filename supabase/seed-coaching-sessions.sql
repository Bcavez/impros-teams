-- Recurring weekly coaching sessions (spec.md §5.1).
--
-- Not a UI feature or a migration — run this by hand in the Supabase SQL editor once a season,
-- as a captain's schedule for a team is set. Idempotent: re-running with the same parameters
-- inserts nothing new for dates that already have a session.
--
-- Fill in the four values below, then run the whole block.

do $$
declare
  v_team text := 'Samurai';            -- 'Samurai' | 'Gladiator' | 'Viking'
  v_weekday int := 0;                  -- 0 = Sunday .. 6 = Saturday
  v_start_date date := '2026-09-01';
  v_end_date date := '2027-06-30';
  v_coach text := 'TBD';
  v_created_by uuid := null;           -- optional: a profiles.id to attribute creation to
  v_session_date date;
begin
  for v_session_date in
    select d::date
    from generate_series(v_start_date, v_end_date, interval '1 day') as d
    where extract(dow from d) = v_weekday
  loop
    insert into coaching_sessions (date, team, coach, created_by)
    select v_session_date, v_team, v_coach, v_created_by
    where not exists (
      select 1 from coaching_sessions
      where date = v_session_date and team = v_team
    );
  end loop;
end $$;
