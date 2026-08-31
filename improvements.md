# impros-teams — Code Review / Improvements

Findings from a full review of the app, prioritized. Each item names the file/line of the current
behavior and the resolution specified in [spec.md](./spec.md). This document is the backlog; the
test suite in `tests/` is the checklist — each item below should correspond to one or more spec
tests that go from red to green once it's fixed.

## P0 — Critical security

1. **Every RLS policy is effectively `USING (true)` / `WITH CHECK (true)`.** After all 16
   migrations, `users`, `coaching_sessions`, `attendance_records`, `shows`, `show_dates`,
   `show_assignments`, and `show_availability` all have RLS *enabled* but every active policy is
   permissive-true. Anyone holding the anon key — shipped in the client bundle — can SELECT,
   INSERT, UPDATE, and DELETE every row in every table. `supabase/migrations/012_advanced_rls_with_functions.sql:37-65`
   is the final word on `users`; `004_comprehensive_rls_fix.sql` for the rest.
   `PROPER_RLS_SOLUTION.md:249-253` asserts "No security vulnerabilities" — it's wrong. Root cause:
   the original design has no way to establish caller identity (anon key only), and policies on
   `users` that subqueried `users` under RLS caused infinite recursion
   (`001_initial_schema.sql:162-168`, `008_fix_user_update_policies.sql:10-27`); rather than fix the
   subquery, migrations 009/010 disabled RLS entirely, then 011/012 re-enabled it with `true`
   everywhere. The 001 policies were never dropped, so `users` ends up with 7 coexisting policies.
   **Resolution**: spec.md §4, §7 — Supabase Auth for real identity, `SECURITY DEFINER` helper
   functions to avoid the recursion, and RLS policies that actually check role/team.

2. **`password_hash` is readable by the anon role.** Every login and admin/team query does
   `select('*')` (`src/stores/user.ts:95,271,291`), and RLS doesn't column-filter, so any anon-key
   holder can read every user's bcrypt hash. Combined with #1, they can also read every hash without
   even logging in. **Resolution**: spec.md §4 — no password material in any client-readable table;
   Supabase Auth stores credentials separately in `auth.users`, inaccessible to the anon role.

3. **Any-password backdoor for legacy accounts.**

   ```111:112:src/stores/user.ts
   isPasswordValid = data.password_hash === password || data.password_hash === 'default_password_hash'
   ```

   If a user's `password_hash` column happens to equal the literal string
   `'default_password_hash'` — which `005_add_password_authentication.sql:13` sets for every
   pre-existing row — **any password at all** authenticates as that user, including the seeded
   `System` admin from `015_create_weekly_coaching_sessions.sql:19-22`. **Resolution**: deleted
   entirely under spec.md §4; no plaintext or magic-string comparison exists once Supabase Auth
   owns credentials.

4. **`updateProfile` is a self-promotion vector.**

   ```181:207:src/stores/user.ts
   const updateProfile = async (updates: Partial<User>) => {
     if (!user.value) { return { success: false, error: 'No user logged in' } }
     const { data, error } = await supabase.from('users').update(updates).eq('id', user.value.id)...
   ```

   No field whitelist. `updateProfile({ role: 'admin' })` from the browser console (or from
   application code added later without realizing this) grants yourself admin, and it's a working
   attack today given #1. **Resolution**: spec.md §7.1 — no generic `updateProfile`; self-service
   edits go through a narrow function that only ever touches `name`.

5. **Authorization is decided entirely by a client-editable `localStorage` blob.**
   `saveAuthState`/`loadAuthState` (`src/stores/user.ts:20-72`) persist the full user row —
   including `role` — to `localStorage`, and every `isAdmin`/`isCaptain` computed reads from it.
   Editing that JSON in devtools makes the UI treat you as an admin; combined with #1 the backend
   agrees. **Resolution**: spec.md §4 — Supabase Auth session tokens replace the localStorage user
   blob; role/team are read live from `profiles`, never trusted from client storage.

6. **No permission checks at all on coaching/shows mutations.** `createCoachingSession`,
   `updateCoachingSession`, `deleteCoachingSession` (`src/stores/coaching.ts`), and every mutation
   in `src/stores/shows.ts` (`createShow`, `createShowDate`, `assignMemberToShow`,
   `removeMemberFromShow`, `updateAvailability`, `deleteShow`, `deleteShowDate`, `updateShowDate`)
   have zero authorization checks — contrast with `updateUserRole`/`deleteUser`/`getAllUsers` in the
   same file, which do check. **Resolution**: spec.md §7 — RLS as the real boundary, matching
   client-side checks for UX.

7. **`updateAttendance` trusts the caller-supplied `userId` with no ownership check.**

   ```187:c:\Users\benoit.cavez\code\impros-teams\src\stores\coaching.ts
   const updateAttendance = async (userId: string, sessionId: string, status: ..., currentUserRole?: string) => {
   ```

   Any member can call this with another member's id from devtools and change their attendance.
   The past-date guard is also opt-in: it only fires if the caller *bothers to pass*
   `currentUserRole` — omit it, and a member can silently rewrite history. **Resolution**: spec.md
   §7.1, §7.2 — RLS checks the authenticated caller's own identity server-side, never a
   client-supplied argument.

8. **No queries are team-scoped.** `fetchCoachingSessions`/`fetchAttendanceRecords`/`fetchShows`/etc.
   are called with no team filter on every login (`src/main.ts` via `loadAuthState`,
   `LoginView.vue:185-192`), so every user's browser downloads every team's schedule and relies
   entirely on client-side `.filter()` in the views for isolation — there is no actual data
   boundary between teams today. **Resolution**: spec.md §6, §7 — vue-query keys scoped by team,
   RLS enforcing the same boundary server-side.

## P1 — Data integrity and correctness

9. **`ON DELETE CASCADE` on `created_by` is a data-loss trap.** Every FK from
   `coaching_sessions.created_by`, `shows.created_by`, `show_dates.created_by` to `users(id)` is
   `CASCADE` (`001_initial_schema.sql`). Deleting a user who ever created a session or show deletes
   that session/show and every attendance/availability record attached to it — for the *whole
   team*, not just that user's own data. This is precisely what happens when an admin removes a
   departing captain via the delete button in `AdminUserManagementView.vue:135-142`. Migration 015
   makes it worse: the optional seeded `System` admin user owns ~228 sessions.
   **Resolution**: spec.md §5 — `created_by` becomes nullable, `ON DELETE SET NULL`.

10. **Read-fallback disagrees with stored default for show availability.**
    `getAvailabilityForUser` falls back to `'absent'` when no record exists
    (`src/stores/shows.ts:156`), but new records are created as `'undecided'`
    (`src/stores/shows.ts:232`, matching the DB default). If an availability insert silently fails
    (e.g. `createShowDate`'s best-effort bulk insert at `shows.ts:236-244`, whose error is only
    logged), the affected member displays as unavailable rather than undecided.
    **Resolution**: spec.md §8 — fallback corrected to `'undecided'`.

11. **`validatePassword` is dead code.** Imported at `src/stores/user.ts:5`, never called anywhere
    in the codebase. `register()` accepts any non-empty string, including `"a"`, as a password.
    **Resolution**: spec.md §4.2 — wired into the registration form.

12. **Find-then-insert race instead of upsert.** `updateAttendance`
    (`src/stores/coaching.ts:187-253`) and `updateAvailability`
    (`src/stores/shows.ts:322-361`) look for an existing record in local state, then either UPDATE
    or INSERT based on what they find — against a table with a `UNIQUE(user_id, session_id)`
    constraint. Two near-simultaneous requests (e.g. a captain and a member both touching the same
    cell) can both miss the existing record and both attempt INSERT, and the loser gets a
    constraint-violation error surfaced as a generic failure. Should be a single
    `upsert(..., { onConflict: 'user_id,session_id' })` call.

13. **Attendance/availability records are created non-atomically and best-effort.**
    `createCoachingSession` (`src/stores/coaching.ts:145-178`) and `createShowDate`
    (`src/stores/shows.ts:216-249`) insert the session/show-date, *then* separately fetch team
    members and bulk-insert default attendance/availability rows in a try/catch that only logs on
    failure and does not fail the outer operation. A partial failure leaves some members with no
    record at all (silently covered by the read-fallback, so nobody notices until it disagrees with
    what's actually stored — see #10). Should be a single database transaction, ideally a Postgres
    function.

14. **`AdminUserManagementView.vue` mutates store state optimistically, before the server confirms.**

    ```100:104:src/views/AdminUserManagementView.vue
    <select v-model="user.role" @change="updateUserRole(user)" ...>
    ```

    `v-model` writes directly into `userStore.allUsers[i].role` the instant the dropdown changes,
    before `updateUserRole`'s network call returns. On failure the code calls `loadUsers()` to
    revert (`AdminUserManagementView.vue:238-243`), so there's a window where the UI shows a role
    that was never actually saved, and a user could act on it.

15. **`role` and `is_captain` can silently desync.** `updateUserRole(userId, 'member')` does not
    touch `is_captain`, and `assignCaptainRole` does not touch `role` — so a captain demoted to
    `role: 'member'` keeps `is_captain: true`, and `isCaptain` (`role === 'captain' || is_captain`,
    `src/stores/user.ts:85`) stays true. **Resolution**: spec.md §2 — single `roles` array, no
    second boolean to desync.

16. **`assignMemberToShow` has no availability check.** The store only checks for duplicate
    assignment and the max-members cap (`src/stores/shows.ts:257-297`); a captain can assign someone
    who explicitly marked themselves unavailable. Confirmed as intentional (advisory-only
    availability) — recorded in spec.md §5, not a bug, listed here only so the reasoning isn't lost.

17. **Show dates: the schema supports many dates per show; the only UI that writes to shows uses
    just the first one.** `openUpdateShowDateModal` and `openAssignMembersModal` both operate on
    `getShowDates(show.id)[0]` (`CaptainDashboardView.vue:145-157, 660-670`), so if a show ever
    accumulated a second date, it would be permanently unreachable from the UI.
    **Resolution**: spec.md §5.1 — schema simplified to one date per show, matching actual usage.

## P2 — Substantive code quality

18. **`export const supabase: any`.**

    ```1:12:src/lib/supabase.ts
    let supabase: any
    ...
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    export { supabase }
    ```

    The 190-line `Database` interface defined immediately below this in the same file is never
    applied to the client (`createClient<Database>(...)` is not used), so every `.from('users')`,
    `.select()`, etc. call is fully untyped — the type definitions exist purely as unread
    documentation. Fix: `export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)`.

19. **Dead code inventory** (to delete, per spec.md §10.4/§12):
    - `src/views/AdminDashboardView.vue` — 1414 lines, never routed (`src/router/index.ts` never
      imports it), and broken even if it were: `attendanceMatrix` is a `computed` that returns an
      un-awaited Promise which the template then does `v-for` over
      (`AdminDashboardView.vue:424-426`); `allTeamShowDates` filters on `showDate.showId`
      (`:417-421`) when the actual column is `show_id`, so the availability matrix's date columns
      are always empty; the assign-members modal uses hardcoded mock member data
      (`:448-458`) instead of real users.
    - `src/stores/counter.ts` — the Vue project scaffold's example store, unused.
    - `CaptainDashboardView.vue`: `deleteShow` (lines 725-729, an exact duplicate of
      `confirmDeleteShow`), `deleteShowDate` (731-738, never called from the template),
      `toggleAttendance` (783-791, superseded by the attendance modal), `isMemberAssigned`
      (807-812, never called).
    - `generateSecurePassword` in `src/lib/password-utils.ts:69-84` — written, never called
      anywhere. (Kept and finally used once admin-reset ships, per spec.md §4.3 — not dead in the
      target state, dead today.)

20. **Timezone-unsafe date parsing mixed inconsistently with `date-fns`'s `parseISO`.**
    `new Date('2026-08-30')` is parsed as UTC midnight by the JS spec, which can render as the
    *previous* calendar day in timezones behind UTC — a real risk for a French-timezone app whose
    dates are meant to be calendar dates, not instants. Some call sites correctly use
    `parseISO` (which parses date-only strings as local midnight); others use `new Date(string)`
    directly on the same kind of `YYYY-MM-DD` value:
    - `CaptainDashboardView.vue:452` (`teamCoachingSessions` sort), `:467-470`
      (`isSessionInPast`), `:499-501` (matrix session sort)
    - `AdminUserManagementView.vue:313-316` (`formatDate`, though this one is a timestamp, not a
      pure date, so it's lower-risk)
    - `TeamDashboardView.vue` mixes both patterns in the same file (`parseISO` at lines 220-227,
      `238-239`, `321-323` vs. none elsewhere) — internally consistent here, just worth confirming
      as the pattern to standardize on everywhere else.

21. **`app.mount()` is deferred behind an unindicated async data load.**

    ```16:27:src/main.ts
    userStore.loadAuthState().then(() => {
      app.mount('#app')
    }).catch((error) => {
      app.mount('#app')
    })
    ```

    If a returning user's session restore is slow (it does 6 parallel fetches plus a team-members
    fetch, `src/stores/user.ts:40-63`), the page shows nothing at all — no spinner, no shell — until
    every one of those requests resolves. A network hiccup here means a blank white screen with no
    feedback.

22. **Matrix data goes stale after mutations that don't invalidate it.** `CaptainDashboardView.vue`
    caches `attendanceMatrix`/`availabilityMatrix` for 5 minutes in a local ref
    (`matrixCache`, lines 476-517) and explicitly refreshes it after some mutations
    (`createShowDate`, `updateShowDate`, `toggleShowAvailability`, the attendance modal) but not
    others — `createCoachingSession` (615-628), `deleteCoachingSession` (690-698), and
    `saveMemberAssignments` (836-858) leave the matrix showing pre-mutation data for up to 5
    minutes. **Resolution**: spec.md §6, §10.3 — vue-query invalidation on every mutation, no manual
    cache-clearing to remember per call site.

23. **Optional-argument-as-authorization pattern.** Beyond #7, `currentUserRole?: string` being
    optional on `updateAttendance` means every call site has to remember to pass it, and one already
    doesn't have to (there's no compile-time way to notice a missing argument that changes security
    behavior). This is a symptom of authorization living in application code instead of the database.

24. **`any` types throughout**, defeating the type safety TypeScript is otherwise configured for:
    `TeamDashboardView.vue` (`selectedEvent`, `attendanceMatrixForNextSession`, `teamMembers`, modal
    params), `CaptainDashboardView.vue` (`selectedShow`, `selectedShowDate`, matrix refs, sort
    callbacks), `AdminUserManagementView.vue` (`user` params on every handler). Combined with #18
    (`supabase: any`), there is effectively no compile-time type checking on the data layer at all.

25. **No loading or error states in the two dashboard views.** `TeamDashboardView.vue` and
    `CaptainDashboardView.vue` assume the cache is warm from login-time prefetch and show nothing —
    not even a spinner — while data loads or if a fetch fails (errors are `console.error`-only, e.g.
    `CaptainDashboardView.vue:515`, `TeamDashboardView.vue:489`). Contrast with
    `AdminUserManagementView.vue`, which does this correctly (`loading`/`error` refs with a Retry
    button, lines 18-28). **Resolution**: spec.md §6 — vue-query's `isLoading`/`isError` used
    uniformly.

26. **Accessibility gaps across all custom modals**: no `role="dialog"`, no focus trap, no Escape-to-
    close, close buttons are a bare `&times;` with no `aria-label` (e.g.
    `TeamDashboardView.vue:129`, `CaptainDashboardView.vue:330`). Matrix cells that are clickable
    (`<td @click>`) have no keyboard equivalent and no `role="button"`. The admin delete button is
    an emoji with only a `title` attribute (`AdminUserManagementView.vue:141`), not an accessible
    name for screen readers.

27. **~700 lines duplicated between `CaptainDashboardView.vue` and the dead
    `AdminDashboardView.vue`** — moot once #19 deletes the latter, but indicates the original
    captain/admin split was done by copy-paste rather than extraction. Worth watching for the same
    pattern re-emerging if a cross-team admin view is ever built later (explicitly deferred, see
    spec.md §11).

## P3 — Documentation and housekeeping

28. **18 stale markdown files at the repo root**, several actively contradicting the current code:
    - `SETUP_INSTRUCTIONS.md:29` says to run only migration 001 for setup — that schema has no
      `password_hash` column (added in 005) and none of the working RLS policies.
    - `SUPABASE_SETUP.md:79-82` documents email-based demo logins; the app has used name-based login
      since `NAME_BASED_LOGIN.md`'s own changes, and the demo accounts were deleted by migration 002
      anyway.
    - `SUPABASE_SETUP.md:88-92` recommends adopting Supabase Auth — the one piece of prior advice
      this review actually agrees with (see spec.md §4).
    - `PROPER_RLS_SOLUTION.md:249-253` claims no security vulnerabilities exist (see P0 #1-#2).
    - `SECURITY.md` is entirely about SEO/robots indexing headers, despite its name suggesting an
      actual security policy.
    - `debug-admin-role-update.md:131` suggests disabling RLS entirely as a fallback — the opposite
      of the direction migrations 011/012 (and this spec) take.
    - `CACHING_AND_REFRESH.md` describes cache/refresh behavior that no longer matches
      `MainNavigation.vue` (refresh is now shown to all authenticated users, not just admin/captain
      as the doc claims) or `user.ts` (claims the user store has no caching; `loadAuthState` does
      force-refresh every store on session restore).
    - `README.md:78-84` lists demo credentials (`admin@example.com`, etc.) that don't exist — deleted
      by migration 002 — and describes email login, which doesn't exist either.
    **Resolution**: spec.md's scope — delete all 18, fold anything still accurate into a rewritten
    `README.md`.

29. **`README.md` promises PWA offline support and installability** that don't actually work: login
    requires a network round trip and every view reads live from Supabase with no offline fallback.
    **Resolution**: spec.md §11 — PWA support removed entirely rather than half-documented.

## Explicitly considered and rejected

- **Restoring `AdminDashboardView.vue`** as a cross-team oversight tool for admins. Rejected: it
  would either contradict "admin is not a captain" (if given mutation rights) or require building a
  new read-only view from scratch anyway (the existing file is broken per #19), so nothing in it is
  worth preserving. Left as a possible future feature, out of scope for this round (spec.md §11).
- **A `teams` database table** instead of the fixed 3-team union. Rejected for now: the troupe has
  exactly three fixed teams with no near-term plan to add or rename one; a centralized `TEAMS`
  const (spec.md §3) captures the only real problem (the definition being repeated ~20 times)
  without the cost of migrating every foreign key.
- **Multi-date shows.** Rejected: the schema already supported this and the UI never used it (see
  #17) — simplifying to one date per show removes a table and a class of bug rather than fixing the
  UI to support a capability nobody built for.
