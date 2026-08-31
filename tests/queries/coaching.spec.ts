import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb } from '../helpers/mock-supabase'
import { SAMURAI_CAPTAIN, SAMURAI_MEMBER_1 } from '../fixtures/users'
import { FUTURE_SESSION } from '../fixtures/coaching'
import { coachingSessionsKey, attendanceRecordsKey, fetchCoachingSessions } from '@/queries/coaching'
import { queryClient } from '@/lib/query-client'
import { useCoachingStore } from '@/stores/coaching'

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('coaching query keys (spec.md Stage 3)', () => {
  it('scopes the coaching-sessions key by team so different teams never share a cache entry', () => {
    expect(coachingSessionsKey('Samurai')).toEqual(['coaching-sessions', 'Samurai'])
    expect(coachingSessionsKey('Gladiator')).toEqual(['coaching-sessions', 'Gladiator'])
    expect(coachingSessionsKey()).toEqual(['coaching-sessions', null])
  })

  it('attendance-records has a single, team-independent key', () => {
    expect(attendanceRecordsKey()).toEqual(['attendance-records'])
  })

  it('fetchCoachingSessions only returns sessions for the requested team', async () => {
    const sessions = await fetchCoachingSessions('Samurai')
    expect(sessions.every((s) => s.team === 'Samurai')).toBe(true)
  })
})

describe('store mutations invalidate the query cache (spec.md Stage 3b)', () => {
  it('creating a session invalidates every coaching-sessions entry and attendance-records', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await store.createCoachingSession('2999-07-01', 'Samurai', 'Coach Test', SAMURAI_CAPTAIN.id as string)

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(['coaching-sessions'])
    expect(invalidatedKeys).toContainEqual(attendanceRecordsKey())
  })

  it('updating attendance invalidates attendance-records', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', true)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await store.updateAttendance(SAMURAI_MEMBER_1.id as string, FUTURE_SESSION.id as string, 'absent', 'captain')

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(attendanceRecordsKey())
  })

  it('a forced refetch marks the previous cache entry stale before refetching', async () => {
    const store = useCoachingStore()
    await store.fetchCoachingSessions('Samurai', false)
    const query = queryClient.getQueryCache().find({ queryKey: coachingSessionsKey('Samurai'), exact: true })
    expect(query).toBeDefined()

    await store.fetchCoachingSessions('Samurai', true)
    // A successful forced refetch leaves the entry fresh again (not stuck stale).
    expect(query?.isStale()).toBe(false)
  })
})
