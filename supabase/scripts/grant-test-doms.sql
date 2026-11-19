-- Grants the doms role to the dedicated "Test Doms" account (register it through the app first;
-- its slug is 'test-doms'). Changes exactly one row.
--
-- TESTING RULES (the dev environment IS the production database):
--   * Create only doms shows, and prefix every name with "[TEST]" so the cleanup script finds them.
--   * Target teams on test shows will create 'undecided' availability rows for REAL members in
--     doms_show_availability. These are invisible to the deployed app and removed by cleanup.
--   * Never create test members on teams: they would appear in real captains' matrices.
--   * When logged in as real users locally, only touch [TEST] doms shows.
--   * Run supabase/scripts/cleanup-doms-test-data.sql before deploying the new app.

begin;

update profiles
set roles = array['doms'], team = null
where slug = 'test-doms';

do $$
begin
  if (select count(*) from profiles where slug = 'test-doms' and roles = array['doms']) <> 1 then
    raise exception 'Test Doms account not found: register "Test Doms" through the app first';
  end if;
end $$;

commit;
