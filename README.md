# Team Management Dashboard

A single-page app built with Vue 3, TypeScript, Vite, Pinia, Supabase, and TanStack Query for
managing an improv theatre troupe's three teams (Samurai, Gladiator, Viking), their weekly
coaching sessions, and their shows.

[spec.md](./spec.md) documents the target-state behavior; [improvements.md](./improvements.md)
is the original findings list the codebase has since been brought in line with; `tests/` is the
spec-conformance test suite (`npm test`).

## Features

- **Authentication**: name + password login and self-registration via Supabase Auth, one account
  per person (synthetic `name@impros.local` email under the hood — see spec.md §4).
- **Roles**: member (default), captain (scoped to one team), admin (user management). See
  spec.md §2 for the exact role model — note that admin does **not** automatically grant captain
  privileges.
- **Team dashboard**: upcoming coaching sessions and shows, set your own attendance/availability.
- **Captain dashboard**: manage your team's coaching sessions and shows, set attendance for any
  team member, assign a cast.
- **Admin dashboard**: view, search, and filter all accounts; assign roles and teams.
- **Account**: every user can change their own password from the "Mon compte" modal; a
  dashboard-issued password reset forces this open on next login (`must_change_password`).

## Technology stack

- Vue 3 (Composition API, `<script setup>`) + TypeScript
- Vite
- Pinia for mutations/local UI state; TanStack Query (`@tanstack/vue-query`) for server-state
  reads and cache invalidation (see `src/queries/`)
- Vue Router
- Supabase (Postgres + PostgREST + Auth + Row Level Security) as the backend
- `date-fns` for date formatting
- Vitest + `@vue/test-utils` for tests

## Getting started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (see `package.json` `engines`)
- A Supabase project (free tier is enough)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `env.example` to `.env` and fill in your Supabase project's URL and anon key (Project
   Settings → API in the Supabase dashboard):

   ```bash
   cp env.example .env
   ```

3. In the Supabase dashboard, go to **Authentication → Providers → Email** and turn **off
   "Confirm email"**. Accounts use a synthetic `@impros.local` address that can't receive mail, so
   with confirmation on, `signUp` never returns a session and registration silently breaks.

4. Apply the database schema: run `supabase/migrations/017_target_baseline.sql`, then
   `supabase/migrations/018_rls_and_triggers.sql`, then
   `supabase/migrations/019_reset_must_change_password_on_password_change.sql`, in order, via the
   Supabase SQL editor or CLI. Older migrations live under `supabase/migrations/archive/` for
   history only — do not apply them.

5. Optionally seed a season's recurring coaching sessions with
   `supabase/seed-coaching-sessions.sql` (idempotent — safe to re-run).

6. Start the dev server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`. There are no seeded demo accounts — register a user, then
   promote it to admin directly in the Supabase SQL editor:

   ```sql
   update profiles set roles = array['member','admin'] where name = 'Your Name';
   ```

### Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run `vue-tsc` |
| `npm run lint` | Run ESLint with autofix |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with coverage |

### Login

Login is **name-based**, not email-based: enter the name you registered with and your password.
Names are unique by their slugified form (accents/case/punctuation-insensitive), so "Jean-Luc" and
"Jean Luc" are treated as the same account.

## Admin operations outside the browser (spec.md §9)

Deleting a user or resetting a forgotten password both require the Supabase `service_role` key,
which must never reach the browser. Do these from the Supabase dashboard instead:

- **Delete a user**: Authentication → Users → delete. The `profiles` row cascades automatically.
- **Reset a password**: Authentication → Users → the user → "Send password recovery" or set a new
  password directly, then flip their `must_change_password` flag in the SQL editor so the app
  forces them to pick a new one on next login:

  ```sql
  update profiles set must_change_password = true where name = 'Their Name';
  ```

## Project structure

```
src/
├── components/        # Shared Vue components (MainNavigation, AccountModal)
├── lib/                # Supabase client, permissions, teams/roles, query-client, strings
├── queries/            # TanStack Query composables (team-scoped reads, shared cache)
├── router/             # Vue Router configuration and navigation guards
├── stores/             # Pinia stores: user, coaching, shows (mutations + invalidation)
├── views/              # Route-level components
│   ├── LoginView.vue
│   ├── TeamDashboardView.vue          (/dashboard — any member)
│   ├── CaptainDashboardView.vue       (/captain — captains)
│   └── AdminUserManagementView.vue    (/admin — admins)
└── main.ts
tests/
├── fixtures/           Shared test data
├── helpers/            In-memory Supabase fake, Vitest setup
├── lib/                Tests for pure helper modules
├── stores/             Tests for the three Pinia stores
├── queries/            Tests for query keys and cache invalidation
├── router/             Tests for navigation guards
├── components/         Tests for shared components
└── views/              Component tests
supabase/
├── migrations/         Baseline schema + RLS/trigger migration (archive/ is history only)
└── seed-coaching-sessions.sql
```

## Contributing

1. Read [spec.md](./spec.md) for the target behavior and [improvements.md](./improvements.md) for
   the original findings list before changing anything non-trivial.
2. Run `npm test` and `npm run type-check` before opening a change.
3. Keep user-facing strings in French (see `src/lib/strings.ts` for shared ones); keep code,
   comments, and documentation in English.

## License

MIT.
