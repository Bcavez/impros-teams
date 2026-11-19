-- READ-ONLY. Row count + content fingerprint per existing table.
-- Run before and after any change and diff the output: it must be identical.
-- The md5 is over the full row text ordered by id, so changed/lost/replaced rows are detected,
-- not only changed totals.

select 'auth.users' as tbl, count(*) as n,
       md5(coalesce(string_agg(id::text, ',' order by id), '')) as fingerprint
from auth.users
union all select 'profiles', count(*), md5(coalesce(string_agg(t::text, ',' order by id), '')) from profiles t
union all select 'coaching_sessions', count(*), md5(coalesce(string_agg(t::text, ',' order by id), '')) from coaching_sessions t
union all select 'attendance_records', count(*), md5(coalesce(string_agg(t::text, ',' order by id), '')) from attendance_records t
union all select 'shows', count(*), md5(coalesce(string_agg(t::text, ',' order by id), '')) from shows t
union all select 'show_assignments', count(*), md5(coalesce(string_agg(t::text, ',' order by id), '')) from show_assignments t
union all select 'show_availability', count(*), md5(coalesce(string_agg(t::text, ',' order by id), '')) from show_availability t
order by tbl;
