import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb, fakeDb } from '../helpers/mock-supabase'
import { SAMURAI_CAPTAIN, SAMURAI_MEMBER_1, SAMURAI_MEMBER_2 } from '../fixtures/users'
import { PAST_SESSION, FUTURE_SESSION } from '../fixtures/coaching'
import { useCoachingStore } from '@/stores/coaching'

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('attendance defaults (spec.md §8)', () => {
  it('defaults to "present" when no record exists for a member/session pair', () => {
    const store = useCoachingStore()

    expect(store.getAttendanceForUser('nobody', FUTURE_SESSION.id as string)).toBe('present')
  })

  it('creates "present" attendance records for every team member when a session is created', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)

    const result = await store.createCoachingSession('2999-06-01', 'Samurai', 'Coach Nouveau', SAMURAI_CAPTAIN.id as string)

    expect(result.success).toBe(true)
    const created = fakeDb.rows('attendance_records').filter((r) => r.session_id === result.session?.id)
    expect(created.length).toBeGreaterThan(0)
    expect(created.every((r) => r.status === 'present')).toBe(true)
  })
})

describe('past-event lock is not optional (spec.md §7.2, improvements.md #7)', () => {
  it('rejects a status change on a past session even when no role is supplied by the caller', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)

    // Deliberately omit the 4th argument — this is exactly what a hand-crafted request from
    // devtools would do, and today's optional-argument check (src/stores/coaching.ts:187-199)
    // lets it through.
    const result = await store.updateAttendance(SAMURAI_MEMBER_1.id as string, PAST_SESSION.id as string, 'absent')

    expect(result.success).toBe(false)
  })

  it('still allows a captain to record attendance for a past session', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)

    const result = await store.updateAttendance(SAMURAI_MEMBER_1.id as string, PAST_SESSION.id as string, 'absent', 'captain')

    expect(result.success).toBe(true)
  })

  it('allows a member to change their own attendance for a future session', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)

    const result = await store.updateAttendance(SAMURAI_MEMBER_1.id as string, FUTURE_SESSION.id as string, 'absent', 'member')

    expect(result.success).toBe(true)
  })
})

describe('concurrent attendance updates should not race (improvements.md #12)', () => {
  it('two simultaneous first-time updates for the same member/session both succeed', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)
    await store.fetchAttendanceRecords(undefined, true)

    // Remove the fixture's existing record so both updates below race to create it.
    const untouchedUser = SAMURAI_MEMBER_2.id as string
    const records = fakeDb.rows('attendance_records')
    const withoutFixtureRecord = records.filter(
      (r) => !(r.user_id === untouchedUser && r.session_id === FUTURE_SESSION.id),
    )
    records.splice(0, records.length, ...withoutFixtureRecord)
    await store.fetchAttendanceRecords(undefined, true)

    const [first, second] = await Promise.all([
      store.updateAttendance(untouchedUser, FUTURE_SESSION.id as string, 'present', 'captain'),
      store.updateAttendance(untouchedUser, FUTURE_SESSION.id as string, 'absent', 'captain'),
    ])

    // Target: an upsert on the (user_id, session_id) unique key — never a constraint violation.
    expect(first.success && second.success).toBe(true)
  })
})

describe.todo(
  'coaching session mutations require the caller to be captain of that team (spec.md §7.1) — ' +
    'createCoachingSession/updateCoachingSession/deleteCoachingSession take no caller-identity ' +
    'argument today, so this cannot be exercised without the RLS/RPC work landing first',
)
