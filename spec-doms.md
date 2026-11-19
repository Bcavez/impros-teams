# impros-teams — Feature Spec: the `doms` role

This document specifies a new user role, **doms**, and the dedicated view that comes with it. It
extends [spec.md](./spec.md) (the target-state baseline); section references like "spec.md §7.2"
point there. Where this feature changes something spec.md defines, it is marked
**CHANGES spec.md §X**.

## 0. Backward compatibility (hard constraint)

Development runs against the **production database**. Therefore:

- The doms migration (`020_doms_additive.sql`) only **creates** new objects: tables, functions,
  and policies. It never ALTERs, DROPs, UPDATEs or DELETEs any existing table, column,
  constraint, policy, function, or row.
- Every policy added to an existing table is `for select using (current_user_is_doms())`.
  Permissive policies are OR-ed with existing ones, and the condition is false for every non-doms
  user, so nobody else's access changes.
- Doms shows live in their own `doms_*` tables. Captain shows stay exactly as today
  (`shows.team`, `show_availability`, `show_assignments`). The currently deployed app does not
  know about the new tables and keeps working unchanged.
- The only change to an existing table is the **optional** post-deploy `021` check constraint (§2).

## 1. Summary

A doms is a troupe-level organizer who is **not** a member of any team. They:

- create **doms shows** targeting one or more teams; these appear on the member dashboard of every
  member of the targeted teams and behave like normal shows (availability, cast);
- see a cross-team **shows table** (every show of the app — doms shows and captain shows — against
  every member);
- see a cross-team, read-only **coaching table** (every member's attendance on the dates where all
  three teams train).

A doms sees nothing else in the app.

### Glossary additions

| Term | Meaning |
|---|---|
| Doms | A user whose `roles` is exactly `['doms']` and whose `team` is `NULL`. Not a member, not on any team. |
| Doms show | A row of `doms_shows`, created by a doms, targeting one or more teams (`doms_show_teams`). |
| Captain show | A row of `shows` (unchanged), created by a captain, belonging to exactly that captain's team. |
| Merged coaching date | A date on which **all three** teams have at least one coaching session. |

## 2. Role model

**CHANGES spec.md §2**: `ROLES` gains `'doms'`, and `'member'` is no longer present in *every* role
set — it is absent for doms.

```ts
export const ROLES = Object.freeze(['member', 'captain', 'admin', 'doms'] as const)
```

- A doms has `roles = ['doms']` exactly and `team IS NULL`. Exclusivity is enforced by the grant
  script and the app (admin UI refuses doms targets). An optional post-deploy migration
  `021_doms_exclusive_constraint.sql` adds the database constraint:

  ```sql
  alter table profiles add constraint doms_is_exclusive check (
    not ('doms' = any(roles)) or (roles = array['doms'] and team is null)
  );
  ```

- **Granting**: SQL editor only. The person self-registers first (getting `['member']`), then:

  ```sql
  update profiles set roles = array['doms'], team = null where slug = 'their-slug';
  ```

  Revoking: `roles = array['member']`; an admin then assigns a team in the UI.
- Several doms accounts may exist; all share the same rights over all doms shows. `created_by` is
  informational only.
- `isDoms(user)` is `user.roles.includes('doms')`. `isCaptain`/`isAdmin` are false for a doms.

## 3. Data model (all new, additive)

```sql
create table doms_shows (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  date date not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table doms_show_teams (
  show_id uuid not null references doms_shows(id) on delete cascade,
  team text not null check (team in ('Samurai','Gladiator','Viking')),
  primary key (show_id, team)
);
create table doms_show_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  show_id uuid not null references doms_shows(id) on delete cascade,
  status text not null default 'undecided' check (status in ('absent','present','undecided')),
  updated_at timestamptz not null default now(),
  unique (user_id, show_id)
);
create table doms_show_assignments (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references doms_shows(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unique (show_id, user_id)
);
```

- Doms shows have an uncapped cast.
- "At least one target team" is guaranteed because doms shows and their teams are written only
  through the RPCs below (no INSERT policy on `doms_shows` / `doms_show_teams`).
- Coaching sessions: no schema change. When a team has several sessions on the same date, the doms
  coaching table uses the **earliest-created** one (`created_at`, then `id`).

### 3.1 RPC functions (SECURITY DEFINER, executable by `authenticated` only)

| Function | Caller | Behavior |
|---|---|---|
| `create_doms_show(p_name, p_date, p_teams text[]) returns uuid` | doms | Teams non-empty, distinct, valid. Inserts show, teams, and an `'undecided'` availability row per current member of each target team, atomically. |
| `update_doms_show(p_show_id, p_name, p_date, p_teams text[])` | doms | Updates name/date. **Added** teams get `'undecided'` availability rows for their current members; **removed** teams have their members' availability and assignments for the show deleted. `p_teams` non-empty. |
| `doms_show_cast(p_show_id) returns table(user_id, name, team)` | doms, or a member of a target team | Cast whose **current** team is a target team. Lets members see cast names from other target teams without loosening `profiles` RLS. |

### 3.2 Helper functions

`current_user_is_doms()`, `user_team(uuid)`, `doms_show_targets_team(show_id, team)` — all
SECURITY DEFINER, `stable`, `set search_path = public`.

## 4. Authorization

### 4.1 Permission matrix additions

| Action | Member | Captain | Doms | Admin |
|---|---|---|---|---|
| See doms shows targeting own team on `/dashboard` | ✅ | ✅ (as a member) | — | — |
| Set own availability on a doms show (today or later) | ✅ | ✅ | — | — |
| Set own availability on a past doms show | ❌ | ❌ | — | — |
| See doms shows in `/captain` | — | ❌ | — | — |
| Create/edit/delete doms show, change target teams | ❌ | ❌ | ✅ | ❌ |
| Assign cast on a doms show (target-team members, uncapped) | ❌ | ❌ | ✅ | ❌ |
| Set any target-team member's availability on a doms show, incl. past | ❌ | ❌ | ✅ | ❌ |
| Read every team's shows, availability, cast | ❌ | ❌ | ✅ | ❌ |
| Edit anything on a captain show | ❌ | ✅ (own team) | ❌ | ❌ |
| Read every team's coaching sessions and attendance | ❌ | ❌ | ✅ | ❌ |
| Write any coaching session or attendance | ❌ | ✅ (own team) | ❌ | ❌ |
| Read every profile | ❌ | ❌ | ✅ | ✅ |

**CHANGES spec.md §7.1**: doms is the single exception to "nobody reads another team's data",
with read-only cross-team access, and write access only to doms shows.

### 4.2 RLS (additive only)

On existing tables — SELECT only, new policy names, condition `current_user_is_doms()`:
`profiles_select_doms`, `coaching_sessions_select_doms`, `attendance_select_doms`,
`shows_select_doms`, `show_assignments_select_doms`, `show_availability_select_doms`.

On new tables (RLS enabled):

- `doms_shows`: SELECT for doms, or when the show targets `current_user_team()`; UPDATE and DELETE
  for doms; no INSERT.
- `doms_show_teams`: SELECT when the parent show is visible; no writes.
- `doms_show_availability`: SELECT when the parent show is visible. Write: own row when the show
  targets your team and its date `>= current_date`; or doms when the target user's team is a
  target of the show (past allowed).
- `doms_show_assignments`: SELECT when the parent show is visible. Write: doms only, for
  target-team members.

### 4.3 Client-side predicates (`src/lib/permissions.ts`, additions only)

Existing predicates are unchanged.

| Predicate | Rule |
|---|---|
| `isDoms(user)` | `roles.includes('doms')` |
| `canManageDomsShow(user)` | `isDoms(user)` |
| `canSetDomsAvailabilityFor(actor, target, show)` | `target.team ∈ show.teams` and (actor is target, or `isDoms(actor)`) |
| `canEditPastDomsShow(user, show)` | Not past → true; past → `isDoms(user)` |

## 5. Existing views

### 5.1 `TeamDashboardView.vue` — `/dashboard`

- Doms shows whose target teams include the member's team are merged into the shows list (sorted
  by date) with the same 2-upcoming / "Voir Tout" behavior.
- Doms cards carry a "Doms" badge and list target teams. Cast names come from `doms_show_cast`;
  count shown as `n` (uncapped).
- The status modal writes through the doms store for doms shows; the past-date lock applies to
  everyone (captains included).

### 5.2 `CaptainDashboardView.vue` — `/captain`

**No change.** Doms shows are in other tables, so they never appear there.

### 5.3 `AdminUserManagementView.vue` — `/admin`

- `roleOf(user)` returns `'doms'`, displayed "Doms". Role and team dropdowns disabled on doms rows.
- Role filter gains "Doms"; doms excluded from the "Membres" stat.
- `setUserRole` / `assignTeam` refuse a doms target client-side.

### 5.4 Routing and navigation

- New route `/doms` → `DomsDashboardView.vue`, `meta: { requiresAuth: true, requiresDoms: true }`.
- Non-doms visiting `/doms` → `/dashboard`. Doms visiting `/dashboard`, `/captain`, `/admin`, or a
  guest route → `/doms`.
- `MainNavigation.vue` for a doms: name, "Doms" badge instead of team, Refresh, Mon compte,
  Logout; brand link points to `/doms`.

## 6. `DomsDashboardView.vue` — `/doms`

Title "Tableau de Bord Doms". Top to bottom: **"Créer un Spectacle"** button, shows table,
coaching table. Both tables share the same rows and both have a "Voir tout" toggle: default is
dates `>= today` ascending; the toggle reveals past dates, dimmed and marked "(Passé)". Real
loading / error / empty states.

### 6.1 Rows (shared)

Every profile with a non-null `team`, grouped by team in `TEAMS` order with a group header, sorted
by name. Team-less users and doms are excluded.

### 6.2 Shows table

- **Columns**: all captain shows (`shows`) and all doms shows (`doms_shows`), normalized to one
  list, sorted by date then name. Header: name, date, and a tag — "Doms · <teams>" or the team name.
- **Cells**: "N/A" (greyed, not clickable) when the member's **current** team is not a target of
  the show; otherwise the availability label (fallback `'undecided'`), plus ★ when in the cast.
  Availability/cast come from `show_*` tables for captain shows and `doms_show_*` for doms shows.
- **Doms show columns**: header actions **Modifier** (name, date, team checkboxes ≥1; removing a
  team asks confirmation), **Assigner** (cast modal over target-team members, grouped by team,
  uncapped, availability advisory), **Supprimer** (confirm). Clicking a non-N/A cell cycles
  absent → present → undecided; allowed on past shows.
- **Captain show columns**: read-only.

### 6.3 Coaching table

Read-only, same layout as the captain attendance matrix, for every member.

- **Columns**: one per merged coaching date; dates missing any team are dropped. Date only, no coach.
- **Cell**: member's attendance for their own team's session that day (fallback `'present'`).
- **Summary**: `present / total` over merged dates `<= today`, over all past merged dates
  regardless of the toggle.

### 6.4 Create modal

Name, date, target teams (checkboxes, ≥1, none pre-checked). Calls `create_doms_show`. Past dates
allowed.

### 6.5 Data fetching

Query keys: `['doms-shows', team]` (member-scoped), `['doms-shows', 'all']`, `['doms-show-teams']`,
`['doms-show-availability']`, `['doms-show-assignments']`, `['doms-members']`. Coaching and captain
show data reuse the existing fetchers (RLS returns everything for a doms). Mutations invalidate the
keys they affect.

## 7. Edge cases

| Case | Behavior |
|---|---|
| Doms account deleted | Doms shows remain (`created_by` → NULL); any other doms can manage them. |
| Member joins a target team later | No availability row; shows `'undecided'`; can set it. Doms can cast them. |
| Member leaves a target team | Rows remain but are hidden (N/A, excluded from `doms_show_cast`). |
| Doms removes a target team | That team's members' availability and cast rows for the show are deleted (after confirm). |
| Two coaching sessions same team/date | Doms table uses the earliest-created; captain view unchanged. |
| Deployed (old) app while doms data exists | Never reads `doms_*`; unaffected. |

## 8. Module map

| Module | Change |
|---|---|
| `supabase/migrations/020_doms_additive.sql` | Helpers, `doms_*` tables, RPCs, policies (§3, §4.2). |
| `supabase/migrations/021_doms_exclusive_constraint.sql` | Optional post-deploy constraint (§2). |
| `supabase/scripts/*.sql` | `row-counts`, `rollback-020`, `grant-test-doms`, `cleanup-doms-test-data`. |
| `src/lib/roles.ts`, `permissions.ts`, `strings.ts`, `supabase.ts` | Additions only. |
| `src/lib/doms.ts` (new) | Pure helpers: grouping, `mergeCoachingDates`, `toDomsViewShows`, matrix builders. |
| `src/queries/doms.ts`, `src/stores/domsShows.ts` (new) | Doms fetchers and mutations. |
| `src/stores/user.ts` | `isDoms`; refusals for doms targets. |
| `src/router/index.ts`, `MainNavigation.vue` | §5.4. |
| `TeamDashboardView.vue`, `AdminUserManagementView.vue` | §5.1, §5.3. |
| `DomsDashboardView.vue` (new) | §6. |
| `shows.ts` / `coaching.ts` stores, `CaptainDashboardView.vue` | Untouched. |

## 9. Tests

Existing tests must pass unmodified. New: `tests/migrations/additive.spec.ts` (020 contains no
ALTER/DROP/UPDATE/DELETE/TRUNCATE and only doms-gated SELECT policies on existing tables),
`tests/lib/doms.spec.ts`, permissions additions, `tests/stores/domsShows.spec.ts`, router guard
additions, `tests/views/DomsDashboardView.spec.ts`, and additions for `TeamDashboardView` and
`AdminUserManagementView`.

## 10. Non-goals

- No UI to grant or revoke doms. No doms writes to coaching or attendance. No doms edits to
  captain shows. No per-doms ownership. No notifications. No `UNIQUE(team, date)` on coaching.
