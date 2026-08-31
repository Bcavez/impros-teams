# impros-teams — Target Specification

This document describes the **target state** of the application: how it should behave once the
work tracked in [improvements.md](./improvements.md) has been implemented. It intentionally
diverges from the current codebase in several places — each such place is marked
**CURRENT BEHAVIOR DIFFERS** with a one-line note on what changes and why.

The accompanying test suite in `tests/` asserts this specification. Tests that fail today are the
implementation checklist; as each one is implemented, it should turn green.

## 1. Purpose and domain

A small, self-hosted PWA-style web app used by an improv theatre troupe to manage three fixed
teams (**Samurai**, **Gladiator**, **Viking**), each of which runs weekly coaching sessions and
periodically puts on shows. Members record whether they'll attend coaching and whether they're
available for a show; captains manage their own team's schedule and roster; admins manage
accounts.

### Glossary

| Term | Meaning |
|---|---|
| Member | Any registered user. Baseline role, always present in `roles`. |
| Captain | A member with the `captain` role, scoped to exactly one team (`profiles.team`). Manages that team's coaching sessions, shows, and roster. |
| Admin | A member with the `admin` role. Manages user accounts, roles, and team assignments only. **Does not** implicitly gain captain powers — see §4. |
| Coaching session | A single team practice on a given date, with a coach (free text) and per-member attendance. |
| Show | A single performance on a given date, with per-member availability and an assigned cast (max 5). |
| Attendance | A member's present/absent/undecided status for a coaching session. Defaults to **present** (opt-out). |
| Availability | A member's present/absent/undecided status for a show. Defaults to **undecided** (opt-in). |

## 2. Roles

```ts
// src/lib/roles.ts
export const ROLES = ['member', 'captain', 'admin'] as const
export type Role = typeof ROLES[number]
```

- `profiles.roles: Role[]`, `NOT NULL DEFAULT '{member}'`, always includes `'member'` explicitly.
- A user's role set is independent per role: `['member']`, `['member', 'captain']`,
  `['member', 'admin']`, or in principle `['member', 'captain', 'admin']` (not used today, but not
  forbidden — an admin may be promoted to captain of a team later without contradiction).
- **`admin` does not imply `captain`.** `isCaptain` is `roles.includes('captain')` — nothing else.
  **CURRENT BEHAVIOR DIFFERS**: today `isCaptain` is `role === 'captain' || is_captain`, a single
  `role` enum plus an independent boolean that can desync (`src/stores/user.ts:85`).
- There is no `is_captain` column in the target schema — folded into `roles`.

## 3. Teams

```ts
// src/lib/teams.ts
export const TEAMS = ['Samurai', 'Gladiator', 'Viking'] as const
export type Team = typeof TEAMS[number]
```

One centralized definition, imported everywhere a team union or list is needed, instead of the
union type and hardcoded arrays repeated in `src/lib/supabase.ts` and all three stores today.

- A user has **no team** (`profiles.team IS NULL`) until an admin assigns one.
- **There is no fallback team.** `getUsersByTeam(currentTeam || 'Samurai')`-style fallbacks are
  removed everywhere (`src/views/LoginView.vue:195`, `CaptainDashboardView.vue:491-492`,
  `AdminDashboardView.vue:425,442`, `src/stores/coaching.ts`/`shows.ts` matrix builders). A
  team-less user's views issue **zero** coaching/shows queries and show an explicit empty state:
  "You have not been assigned to a team yet. An administrator will assign you shortly."
- Only an admin can assign or change a user's team (`assignTeam`). **CURRENT BEHAVIOR DIFFERS**:
  today a captain can also assign users into their own team, and the check compares the *caller's*
  team to the target team rather than the *target user's* current team, so a captain can move a
  member out of another team into theirs (`src/stores/user.ts:210-213`).

## 4. Authentication

**Target: Supabase Auth**, not the current custom bcrypt-in-the-browser scheme.
**CURRENT BEHAVIOR DIFFERS**: today the client fetches the full `users` row — including
`password_hash` — via the anon key and compares bcrypt hashes in JavaScript
(`src/stores/user.ts:93-113`), then stores that entire row in `localStorage`
(`saveAuthState`/`loadAuthState`), from which every authorization decision (`isAdmin`, `isCaptain`)
is derived. Editing `localStorage` in devtools is enough to become an admin, because the server
never checks who is actually asking.

Login remains **name-only** in the UI (see §4.1 on why email login was considered and rejected),
but under the hood every account has a synthetic Supabase Auth email:

```
slug(name) + '@impros.local'
```

where `slug()` lowercases, strips accents, and replaces anything that isn't `[a-z0-9]` with `-`.
No real email address is collected or stored anywhere in the system.

### 4.1 Why Supabase Auth (not just a hardened custom scheme)

Row Level Security policies are the only real enforcement boundary Supabase offers, and every
useful policy is written in terms of `auth.uid()` — the caller's identity, taken from a JWT that
Supabase's client library attaches automatically after `signInWithPassword`. The anon key alone
carries no identity, which is exactly why the current schema's policies all degenerate to
`USING (true)` (see the RLS audit in improvements.md) and why "strict team scoping" (§7) is
otherwise unachievable server-side. Adopting Supabase Auth is also less code than hardening the
custom scheme (delete `bcryptjs`, `src/lib/password-utils.ts`'s hashing half, the
`password_hash` column, and ~150 lines of store logic), and since the deployed data is disposable,
the usual migration cost (existing sessions, existing hashes) does not apply.

### 4.2 Registration

- Self-registration stays open. A new user starts with `roles = ['member']` and `team = NULL`.
- Password policy (already written, currently dead code — `validatePassword` in
  `src/lib/password-utils.ts` is imported but never called): minimum 8 characters, at least one
  uppercase letter, one lowercase letter, and one digit. Enforced client-side before submit, with
  each failing rule shown inline, and re-validated by a Postgres check via Supabase Auth's password
  requirements where configurable.
- On failure, the real error from Supabase Auth is surfaced to the user. **CURRENT BEHAVIOR
  DIFFERS**: today `LoginView.vue:253` discards the store's error and always shows the generic
  "Échec de l'inscription", so a duplicate-name conflict looks identical to a network error.
- `name` is hard-unique by its slugified form (`profiles.slug` is a `generated always as` column
  with a unique index — see §5): "Jean-Luc" and "Jean Luc" collide by design, and registration with
  either fails with a clear "ce nom est déjà utilisé" error rather than a soft, bypassable warning.

### 4.3 Password management

Two flows, neither requiring an email provider:

- **Self-service change**: a logged-in user supplies their current password and a new one;
  implemented via `supabase.auth.updateUser({ password })` after reauthentication.
- **Admin reset**: performed directly from the Supabase dashboard (Authentication → Users — see
  §9), which is the only place holding the `service_role` key. The admin sets a new password there
  and flips `must_change_password = true` on the affected row in the SQL editor; the app then
  forces the "Mon compte" password-change modal open on that user's next login until they change
  it themselves.

**CURRENT BEHAVIOR DIFFERS**: today there is no password-change or reset flow of any kind.

## 5. Data model

`profiles` mirrors `auth.users` 1:1 by id. No `users` table with credentials in it, no `email`
column (dropped — see rationale in improvements.md: the app sends no email today, and the
synthetic-address design in §4 makes a real address unnecessary for auth).

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  roles        text[] not null default array['member'],
  team         text check (team in ('Samurai','Gladiator','Viking')),
  must_change_password boolean not null default false,
  created_at   timestamptz not null default now()
);

create table coaching_sessions (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  team         text not null check (team in ('Samurai','Gladiator','Viking')),
  coach        text not null check (btrim(coach) <> ''),
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table attendance_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  session_id   uuid not null references coaching_sessions(id) on delete cascade,
  status       text not null default 'present' check (status in ('absent','present','undecided')),
  updated_at   timestamptz not null default now(),
  unique (user_id, session_id)
);

create table shows (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  team         text not null check (team in ('Samurai','Gladiator','Viking')),
  date         date not null,                    -- folded in from show_dates; one date per show
  max_cast     integer not null default 5,        -- see MAX_CAST_SIZE note below
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table show_assignments (
  id           uuid primary key default gen_random_uuid(),
  show_id      uuid not null references shows(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  unique (show_id, user_id)
);

create table show_availability (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  show_id      uuid not null references shows(id) on delete cascade,
  status       text not null default 'undecided' check (status in ('absent','present','undecided')),
  updated_at   timestamptz not null default now(),
  unique (user_id, show_id)
);
```

Notes:

- **`show_dates` is dropped.** A show has exactly one date. **CURRENT BEHAVIOR DIFFERS**: the
  current schema supports many dates per show, but the only UI that mutates shows
  (`CaptainDashboardView.vue`) only ever reads `datesByShow(showId)[0]` (lines 145–157, 660), so a
  second date is silently invisible. Rather than fix the UI to expose multi-date shows, the schema
  is simplified to match how the app is actually used.
- **`max_cast` defaults to 5 and is exposed as `MAX_CAST_SIZE = 5`** in `src/lib/shows.ts` as the
  single source of truth for the UI's cast-size cap; the column exists for flexibility but the UI
  does not currently offer editing it, matching the decision to keep cast size fixed.
- **`created_by` is nullable with `ON DELETE SET NULL`.** **CURRENT BEHAVIOR DIFFERS**: today every
  `created_by` foreign key is `ON DELETE CASCADE` (`supabase/migrations/001_initial_schema.sql`),
  so deleting a user who ever created a coaching session or show deletes that session/show and
  every attendance/availability row hanging off it — for the whole team, not just that user. This
  is a live data-loss trap for the exact operation ("admin deletes a departing captain") the admin
  dashboard exists to support. Personal rows (`attendance_records`, `show_availability`,
  `show_assignments`) keep `ON DELETE CASCADE` because they legitimately belong to the deleted
  person.
- No `email` column anywhere in `profiles`. Contact happens outside the app (in person, group
  chat). The RGPD notice is updated accordingly (§10).
- Assigning a member to a show does not require them to have declared themselves available.
  Availability is advisory; the assignment modal shows it as a color-coded hint but never blocks
  the click. This matches current behavior and is an explicit choice, not an oversight.

### 5.1 Recurring coaching sessions

**CURRENT BEHAVIOR DIFFERS**: `supabase/migrations/015_create_weekly_coaching_sessions.sql` seeded
weekly Sunday sessions for a fixed range ending 2026-05-31 — a hardcoded date range that, by
definition, expires. There is no equivalent app feature or migration in the target state; instead
`supabase/seed-coaching-sessions.sql` is a small idempotent `generate_series` SQL snippet (team,
weekday, start date, end date), run directly in the Supabase SQL editor once a season by whoever
administers the database. It is explicitly **not** a UI feature, and not a Node script — no local
tooling or service-role key is needed to run it.

## 6. Data fetching and caching

**Target: `@tanstack/vue-query`** for every read (`useQuery`) and write (`useMutation`), replacing:

- The bespoke `sessionStorage` timestamp cache duplicated per data type across
  `src/stores/coaching.ts` and `src/stores/shows.ts` (6 near-identical `getCacheTimestamp` /
  `setCacheTimestamp` pairs), which starts "pre-expired" via `Date.now() - 6*60*1000`.
- The `stores_initialized` sessionStorage flag that views branch on to decide whether to redirect
  to `/login` (`TeamDashboardView.vue:360`, `CaptainDashboardView.vue:867`).
- The two independent team-member caches: the in-store `teamMembersCache` ref in
  `coaching.ts:311` and the `sessionStorage` `team_members_${team}` key written in three places
  (`LoginView.vue`, `user.ts`, and read directly by both dashboard views).

Query keys are namespaced by team where relevant (`['coaching-sessions', team]`,
`['shows', team]`), so switching teams (after an admin reassignment) never shows stale data, and
mutations invalidate the exact keys they affect instead of a blanket 5-minute cache duration.
Every view gets real `isLoading` / `isError` / empty states from vue-query instead of assuming a
warm cache.

## 7. Authorization

Enforced in **two places**: RLS policies in Postgres (the real boundary, made possible by §4's move
to Supabase Auth) and client-side checks in the stores/views (for UX — so a member never even sees
a control they can't use). The RLS policies are the specification; the client-side checks must
never be the only check.

RLS helper functions (avoids the "infinite recursion" trap the original schema hit by having
policies on `profiles` subquery `profiles` under RLS):

```sql
create function current_user_team() returns text
  language sql security definer stable
  as $$ select team from profiles where id = auth.uid() $$;

create function current_user_has_role(r text) returns boolean
  language sql security definer stable
  as $$ select r = any(roles) from profiles where id = auth.uid() $$;
```

### 7.1 Permission matrix

| Action | Member | Captain (own team) | Captain (other team) | Admin |
|---|---|---|---|---|
| View own team's coaching sessions & shows | ✅ | ✅ | — | — |
| View another team's data | ❌ | ❌ | ❌ | ❌ |
| Create/edit/delete coaching session | ❌ | ✅ | ❌ | ❌ |
| Create/edit/delete show | ❌ | ✅ | ❌ | ❌ |
| Set own attendance/availability | ✅ (future & today only) | ✅ | — | — |
| Set another member's attendance/availability | ❌ | ✅ (own team) | ❌ | ❌ |
| Edit attendance/availability for a past date | ❌ | ✅ | ❌ | ❌ |
| Assign member to show cast | ❌ | ✅ (own team) | ❌ | ❌ |
| View all user accounts | ❌ | ❌ | ❌ | ✅ |
| Change a user's role | ❌ | ❌ | ❌ | ✅ |
| Assign a user's team | ❌ | ❌ | ❌ | ✅ |
| Delete a user | ❌ | ❌ | ❌ | ✅ |
| Reset a user's password | ❌ | ❌ | ❌ | ✅ (local script only, §9) |

Nobody — including admin — can read another team's coaching/shows data. Admin is deliberately
**not** a superset of captain (see §2); if a troupe ever wants an admin to run a team's coaching,
that admin is granted the `captain` role and a `team`, like anyone else.

**CURRENT BEHAVIOR DIFFERS** in several ways, all closed by the RLS policies above:

- `createCoachingSession`, `updateCoachingSession`, `deleteCoachingSession`, and every mutation in
  `src/stores/shows.ts` have **no permission check at all** today — they're one client-side
  `if (!isAdmin.value)` away from every other store method, and shows/coaching methods don't even
  have that.
- `updateAttendance(userId, sessionId, status)` accepts any `userId`, so today one member can set
  another member's attendance from devtools.
- `fetchCoachingSessions(undefined, true)` and the shows equivalents are called with no team filter
  on every login, so every user's browser downloads every team's rows and relies on client-side
  `.filter()` in the views — there is no data isolation between teams today, only display
  filtering.
- `updateProfile(updates: Partial<User>)` (`src/stores/user.ts:181`) writes any column the caller
  passes to their own row, so `updateProfile({ roles: ['member', 'admin'] })` is a working
  self-promotion today. The target state has **no self-service profile write of any kind** —
  `updateProfile` is deleted outright rather than narrowed, because name is immutable in-app once
  registered (there is no UI path to rename yourself) and every other column (`roles`, `team`,
  `must_change_password`) is admin- or system-only. The only thing a user can change about their
  own account is their password (§4.3).

### 7.2 Past-event lock

Members cannot create or change an attendance or availability record for a coaching session or
show dated before today. Captains can, for their own team, so they can record what actually
happened after the fact. This rule is identical for coaching and shows and is enforced in the RLS
`WITH CHECK` / `USING` clause (comparing `date < current_date` against `current_user_has_role`),
not passed as an optional client argument. **CURRENT BEHAVIOR DIFFERS**: today the coaching version
of this rule only fires if the caller happens to pass an optional `currentUserRole` argument
(`src/stores/coaching.ts:187-199`), and the shows version does not exist at all.

## 8. Attendance and availability defaults

| | Default on creation | Fallback when no record exists |
|---|---|---|
| Coaching attendance | `present` (opt-out — training is the expectation) | `present` |
| Show availability | `undecided` (opt-in — cast slots are limited) | `undecided` |

**CURRENT BEHAVIOR DIFFERS**: today the show-availability read fallback is `'absent'`
(`src/stores/shows.ts:156`) while the stored default is `'undecided'`
(`src/stores/shows.ts:232` / `supabase/migrations/001_initial_schema.sql`), so a member whose
availability insert silently fails displays as unavailable rather than undecided — the fallback is
corrected to match what's actually stored.

## 9. Admin operations outside the browser

Deleting a user and resetting a password both require the Supabase `service_role` key, which must
never reach a browser bundle. They are **not** exposed in `AdminUserManagementView.vue` — there is
no delete button and no reset flow in the app at all. Instead, an admin performs both directly in
the **Supabase dashboard** (Authentication → Users): delete a user there (the `profiles` row
cascades automatically), or set a new password there and flip `must_change_password = true` on
that row in the SQL editor (see §4.3). No local script, service-role `.env`, or `scripts/admin.ts`
exists or is needed — the dashboard already holds the service-role key so nothing else has to.

**CURRENT BEHAVIOR DIFFERS**: today both operations are buttons in `AdminUserManagementView.vue`
calling `userStore.deleteUser` / no reset flow exists at all; they work today only because the
anon key currently has unrestricted write access to `users` (see the RLS audit in
improvements.md) — a hole that closes once RLS is real, which is exactly why these operations must
move out of the browser entirely.

## 10. Views (current file layout preserved)

### 10.1 `LoginView.vue` — `/login`

Two tabs, Connexion / Inscription. Login: name + password. Registration: name, password, confirm
password, GDPR consent checkbox (required). On success, redirects by role: admin → `/admin`,
captain → `/captain`, member → `/dashboard`. GDPR notice text is updated to remove references to
email collection (§5) and to describe the corrected data-retention/deletion story.

### 10.2 `TeamDashboardView.vue` — `/dashboard` (any authenticated member)

- Two collapsible lists: upcoming shows (default 2, "Voir Tout" reveals all including past) and
  upcoming coaching sessions (default 4, "Voir Plus" reveals all).
- A read-only attendance matrix for the **next upcoming** coaching session only.
- Clicking a card opens a modal to set the member's own attendance/availability for that event;
  blocked client-side for past dates (mirroring §7.2, enforced for real by RLS).
- If the member has no team: no queries are issued; an explicit empty state is shown instead of
  falling back to Samurai's data (§3).

### 10.3 `CaptainDashboardView.vue` — `/captain` (captain only, scoped to their own team)

Two tabs:

- **Gestion Coaching**: attendance matrix (all members × all sessions, past columns marked),
  create/edit-coach/delete session, click a cell to set any member's attendance for that session
  (subject to §7.2 for past dates).
- **Gestion Spectacles**: availability matrix, create/edit/delete show (name + date), assign up to
  `MAX_CAST_SIZE` members per show regardless of their stated availability (§5), remove assigned
  members.

Matrix data is fetched via vue-query and invalidated by every mutation that affects it (§6) —
**CURRENT BEHAVIOR DIFFERS**: today several mutations (`createCoachingSession`,
`deleteCoachingSession`, `saveMemberAssignments`) don't invalidate the 5-minute matrix cache, so
the matrix can show stale data for up to 5 minutes after an edit.

### 10.4 `AdminUserManagementView.vue` — `/admin` (admin only)

Stats (total/admins/captains/members), a searchable/filterable user table, and per-row controls to
change role, change team, and (no longer) delete or reset a password — those move to §9. The role
control only ever offers **member / capitaine**: admin is never an assignable option from this UI,
and toggling captain on/off preserves an existing `admin` role on that row rather than clobbering
it (§2's independent-role-set model). An admin cannot change their own role or team from this
table (self-protection, unchanged from today).

**Note on the file named `AdminDashboardView.vue`**: this file is deleted. It was never routed
(`src/router/index.ts` never imports it — the only route named "admin" maps to
`AdminUserManagementView.vue` above) and is not part of the target state. See improvements.md for
why it existed and why it isn't restored.

## 11. Non-goals for this round

- No PWA/offline support. `vite-plugin-pwa` is removed; the app is a plain SPA that requires a
  network connection, same as it functionally does today, but without the false "offline support"
  claim in the current README.
- No i18n library. The UI stays French-only. Centralization in `src/lib/strings.ts` is
  **partial by design**: strings reused across more than one component (status labels,
  confirm-dialog text, generic validation messages, empty states, and `MainNavigation.vue`'s
  labels — "Dashboard", "Admin", "Captain", "Logout", "Refresh", all translated) live there and are
  tested; a string that only ever appears once, inline in a single template, stays inline rather
  than being indirected through a constants file for its own sake.
- No cross-team admin oversight dashboard. Considered and explicitly rejected for this round — see
  improvements.md.
- No accessibility audit. Improvements.md's accessibility findings (missing form labels/ARIA
  attributes, keyboard-trap risk in modals, color-only status indicators) are real but explicitly
  out of scope for this round — see improvements.md for the full list, deferred as a follow-up.

## 12. Module map (new modules only — existing paths unchanged)

| Module | Exports |
|---|---|
| `src/lib/teams.ts` | `TEAMS`, `Team` |
| `src/lib/roles.ts` | `ROLES`, `Role` |
| `src/lib/permissions.ts` | Pure predicates: `isAdmin(user)`, `isCaptain(user)`, `isCaptainOfTeam(user, team)`, `canEditCoachingSession(user, session)`, `canEditShow(user, show)`, `canSetAttendanceFor(actor, targetUserId, session)`, `canEditPastEvent(user)`, `isPastDate(date, today)` |
| `src/lib/shows.ts` | `MAX_CAST_SIZE` |
| `src/lib/password-policy.ts` | `validatePassword(password): { isValid, errors }` (behavior unchanged from today's `src/lib/password-utils.ts`, relocated and actually wired up) |
| `src/lib/strings.ts` | Centralized French UI strings (partial — see §11) |
| `src/lib/auth-identity.ts` | `slugify(name): string`, `syntheticEmail(name): string` |
| `src/lib/query-client.ts` | Shared `QueryClient` singleton, passed explicitly to every `useQuery`/`fetchQuery` call (§6) |
| `src/queries/coaching.ts`, `src/queries/shows.ts`, `src/queries/profiles.ts` | Team-scoped `useQuery` composables plus their underlying fetchers and query-key builders |
| `src/components/AccountModal.vue` | Self-service password change; force-opens when `must_change_password` is true (§4.3) |
