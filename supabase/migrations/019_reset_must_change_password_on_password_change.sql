-- Fixes must_change_password never clearing after a password change.
--
-- Root cause: `profiles_update_admin` (018_rls_and_triggers.sql) is the ONLY update policy on
-- `profiles`, and it requires the caller to already be an admin. A regular member changing their
-- own password therefore has their `update({ must_change_password: false })` silently dropped by
-- RLS (0 rows affected, no error) — the flag never clears server-side, so the "Mon compte" modal
-- keeps force-reopening on every subsequent login even though the password itself did change.
--
-- Per spec.md §7.1, `must_change_password` is "admin- or system-only" — there is deliberately no
-- self-service profile write of any kind, so the fix is not to add a self-update policy but to
-- make the reset itself system-managed: a SECURITY DEFINER trigger on auth.users that clears the
-- flag on the matching profiles row whenever the user's password actually changes.

create or replace function handle_password_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.profiles set must_change_password = false where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_password_changed on auth.users;
create trigger on_auth_user_password_changed
  after update on auth.users
  for each row execute function handle_password_change();
