-- Removes all doms test data before the new app is deployed. One transaction.
-- Touches only: doms_shows rows named '[TEST]%' (teams, availability and cast cascade),
-- and the single 'test-doms' profile (reverted to a plain member). Nothing else.
--
-- To delete the Test Doms account entirely, do it afterwards in Supabase (Authentication -> Users).

begin;

with deleted as (
  delete from doms_shows where name like '[TEST]%' returning id
)
select count(*) as test_doms_shows_deleted from deleted;

update profiles
set roles = array['member']
where slug = 'test-doms' and roles = array['doms'];

-- Report what is left: anything other than 0 means real doms shows exist (expected only after launch).
select count(*) as remaining_doms_shows from doms_shows;

commit;
