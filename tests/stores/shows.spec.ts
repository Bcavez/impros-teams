import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb, fakeDb } from '../helpers/mock-supabase'
import { SAMURAI_CAPTAIN, SAMURAI_MEMBER_1, SAMURAI_MEMBER_2 } from '../fixtures/users'
import { FUTURE_SHOW_DATE, PAST_SHOW_DATE } from '../fixtures/shows'
import { useShowsStore } from '@/stores/shows'

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('availability defaults (spec.md §8, improvements.md #10)', () => {
  it('defaults to "undecided" — not "absent" — when no record exists', () => {
    const store = useShowsStore()

    expect(store.getAvailabilityForUser('nobody', FUTURE_SHOW_DATE.id as string)).toBe('undecided')
  })

  it('creates "undecided" availability records for every team member when a show is created', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)

    const result = await store.createShow('Cabaret Printemps', 'Samurai', '2999-07-01', SAMURAI_CAPTAIN.id as string)

    expect(result.success).toBe(true)
    const created = fakeDb.rows('show_availability').filter((r) => r.show_id === result.show?.id)
    expect(created.length).toBeGreaterThan(0)
    expect(created.every((r) => r.status === 'undecided')).toBe(true)
  })
})

describe('past-event lock applies to shows too (spec.md §7.2)', () => {
  it('rejects an availability change on a past show date for a plain member', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)

    const result = await store.updateAvailability(SAMURAI_MEMBER_1.id as string, PAST_SHOW_DATE.id as string, 'absent')

    expect(result.success).toBe(false)
  })

  it('allows a member to change their own availability for a future show date', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)

    const result = await store.updateAvailability(SAMURAI_MEMBER_1.id as string, FUTURE_SHOW_DATE.id as string, 'absent')

    expect(result.success).toBe(true)
  })
})

describe('cast assignment is advisory-only re: availability (spec.md §5 — explicit decision, not a bug)', () => {
  it('allows assigning a member who declared themselves unavailable', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)
    await store.fetchShowAssignments(true)
    await store.updateAvailability(SAMURAI_MEMBER_2.id as string, FUTURE_SHOW_DATE.id as string, 'absent')

    const result = await store.assignMemberToShow(FUTURE_SHOW_DATE.id as string, SAMURAI_MEMBER_2.id as string)

    expect(result.success).toBe(true)
  })

  it('still enforces the max-cast-size limit', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)
    await store.fetchShowAssignments(true)

    const fillerIds = ['filler-2', 'filler-3', 'filler-4', 'filler-5']
    for (const id of fillerIds) {
      await store.assignMemberToShow(FUTURE_SHOW_DATE.id as string, id)
    }

    const result = await store.assignMemberToShow(FUTURE_SHOW_DATE.id as string, 'filler-6')

    expect(result.success).toBe(false)
  })
})

describe('concurrent availability updates should not race (improvements.md #12)', () => {
  it('two simultaneous first-time updates for the same member/show date both succeed', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)

    const [first, second] = await Promise.all([
      store.updateAvailability(SAMURAI_MEMBER_2.id as string, FUTURE_SHOW_DATE.id as string, 'present'),
      store.updateAvailability(SAMURAI_MEMBER_2.id as string, FUTURE_SHOW_DATE.id as string, 'absent'),
    ])

    expect(first.success && second.success).toBe(true)
  })
})

describe.todo(
  'show mutations require the caller to be captain of that team (spec.md §7.1) — ' +
    'createShow/updateShow/deleteShow/etc. take no caller-identity argument today, so ' +
    'this cannot be exercised without the RLS/RPC work landing first',
)
