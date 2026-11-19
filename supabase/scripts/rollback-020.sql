-- Rolls back 020_doms_additive.sql. Drops ONLY objects created by 020; no pre-existing table,
-- column, policy or row is touched. All doms shows/availability/cast data is deleted with the
-- doms_* tables.

begin;

drop policy profiles_select_doms on profiles;
drop policy coaching_sessions_select_doms on coaching_sessions;
drop policy attendance_select_doms on attendance_records;
drop policy shows_select_doms on shows;
drop policy show_assignments_select_doms on show_assignments;
drop policy show_availability_select_doms on show_availability;

drop function doms_show_cast(uuid);
drop function update_doms_show(uuid, text, date, text[]);
drop function create_doms_show(text, date, text[]);

drop table doms_show_assignments;
drop table doms_show_availability;
drop table doms_show_teams;
drop table doms_shows;

drop function doms_show_targets_team(uuid, text);
drop function user_team(uuid);
drop function current_user_is_doms();

commit;
