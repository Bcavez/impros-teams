-- OPTIONAL. Run only AFTER the new app (with doms support) is the deployed version.
-- This is the only doms change that touches an existing table. Safe to skip.
--
-- Guarantees at the database level that a doms is exclusive and team-less.

begin;

do $$
begin
  if exists (
    select 1 from profiles
    where 'doms' = any(roles) and not (roles = array['doms'] and team is null)
  ) then
    raise exception 'A doms profile has extra roles or a team; fix it before adding the constraint';
  end if;
end $$;

alter table profiles add constraint doms_is_exclusive check (
  not ('doms' = any(roles)) or (roles = array['doms'] and team is null)
);

commit;
