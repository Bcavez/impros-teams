import { vi } from 'vitest'
import { createFakeSupabaseClient, FakeSupabaseDatabase, type Row } from './supabase-fake'
import { ALL_USERS } from '../fixtures/users'
import { ALL_SESSIONS, ATTENDANCE_RECORDS } from '../fixtures/coaching'
import { ALL_SHOWS, SHOW_ASSIGNMENTS, SHOW_AVAILABILITY } from '../fixtures/shows'
import { syntheticEmail } from '@/lib/auth-identity'

/**
 * Registers a fake in-memory Supabase client in place of the real `@/lib/supabase` module.
 * Must be imported before any store module in a test file (static imports are hoisted, so
 * simply importing this helper first is enough — see mock-supabase usage in tests/stores/*).
 */
export const fakeDb = new FakeSupabaseDatabase()

seedDefaultSchema(fakeDb)

vi.mock('@/lib/supabase', () => ({
  supabase: createFakeSupabaseClient(fakeDb),
}))

function seedDefaultSchema(db: FakeSupabaseDatabase) {
  db.defineTable('profiles', [], [['slug']])
  db.defineTable('coaching_sessions', [])
  db.defineTable('attendance_records', [], [['user_id', 'session_id']])
  db.defineTable('shows', [])
  db.defineTable('show_assignments', [], [['show_id', 'user_id']])
  db.defineTable('show_availability', [], [['user_id', 'show_id']])
}

/** Deep-enough clone so mutating a fetched row never leaks back into the shared fixture object. */
const clone = (rows: Row[]): Row[] => rows.map((r) => ({ ...r }))

/** Reset every table back to a known fixture state. Call from `beforeEach`. */
export function resetFakeDb(overrides: Partial<Record<string, Row[]>> = {}) {
  seedDefaultSchema(fakeDb)
  fakeDb.rows('profiles').push(...clone(overrides.profiles ?? ALL_USERS))
  fakeDb.rows('coaching_sessions').push(...clone(overrides.coaching_sessions ?? ALL_SESSIONS))
  fakeDb.rows('attendance_records').push(...clone(overrides.attendance_records ?? ATTENDANCE_RECORDS))
  fakeDb.rows('shows').push(...clone(overrides.shows ?? ALL_SHOWS))
  fakeDb.rows('show_assignments').push(...clone(overrides.show_assignments ?? SHOW_ASSIGNMENTS))
  fakeDb.rows('show_availability').push(...clone(overrides.show_availability ?? SHOW_AVAILABILITY))
  fakeDb.auth.reset()
}

/** Registers a fixture profile as a logged-in-capable auth account, for login/session tests. */
export function seedAuthUser(profile: Row, password: string) {
  fakeDb.auth.seedUser(profile.id as string, syntheticEmail(profile.name as string), password)
}
