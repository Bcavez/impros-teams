import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb, fakeDb } from '../helpers/mock-supabase'
import { DOMS_USER, DOMS_SHOW, DOMS_SHOW_TEAMS } from '../fixtures/doms'
import { ALL_USERS, SAMURAI_MEMBER_1, SAMURAI_MEMBER_2, GLADIATOR_MEMBER } from '../fixtures/users'
import { PAST_DATE, FUTURE_DATE } from '../fixtures/coaching'
import { useDomsShowsStore } from '@/stores/domsShows'
import { useUserStore } from '@/stores/user'
import { fetchDomsShows, fetchDomsCast } from '@/queries/doms'
import { queryClient } from '@/lib/query-client'

const actAs = (profile: Record<string, unknown>) => {
  fakeDb.auth.currentUser = { id: profile.id as string, email: 'x@impros.local' }
  const userStore = useUserStore()
  // @ts-expect-error test setup
  userStore.isAuthenticated = true
  // @ts-expect-error test setup
  userStore.user = { ...profile }
}

beforeEach(() => {
  setActivePinia(createPinia())
  queryClient.clear()
  resetFakeDb({
    profiles: [...ALL_USERS, DOMS_USER],
    doms_shows: [{ ...DOMS_SHOW, date: PAST_DATE, id: 'doms-past' }, DOMS_SHOW],
    doms_show_teams: [...DOMS_SHOW_TEAMS, { show_id: 'doms-past', team: 'Samurai' }],
  })
})

describe('createDomsShow (spec-doms.md §3.1)', () => {
  it('requires at least one team', async () => {
    actAs(DOMS_USER)
    const result = await useDomsShowsStore().createDomsShow('Gala', FUTURE_DATE, [])
    expect(result.success).toBe(false)
  })

  it('creates the show, its teams, and undecided availability for each target team member', async () => {
    actAs(DOMS_USER)
    const result = await useDomsShowsStore().createDomsShow('Gala', FUTURE_DATE, ['Samurai', 'Gladiator'])

    expect(result.success).toBe(true)
    const id = result.id as string
    expect(fakeDb.rows('doms_show_teams').filter((t) => t.show_id === id).map((t) => t.team).sort()).toEqual([
      'Gladiator',
      'Samurai',
    ])
    const availability = fakeDb.rows('doms_show_availability').filter((r) => r.show_id === id)
    expect(availability.every((r) => r.status === 'undecided')).toBe(true)
    expect(availability.map((r) => r.user_id)).toContain(GLADIATOR_MEMBER.id)
    expect(availability.map((r) => r.user_id)).toContain(SAMURAI_MEMBER_1.id)
  })

  it('is refused for non-doms users', async () => {
    actAs(SAMURAI_MEMBER_1)
    const result = await useDomsShowsStore().createDomsShow('Gala', FUTURE_DATE, ['Samurai'])
    expect(result.success).toBe(false)
  })
})

describe('updateDomsShow team changes', () => {
  it('adds availability for added teams and deletes it (and cast) for removed teams', async () => {
    actAs(DOMS_USER)
    const store = useDomsShowsStore()
    await store.assignToDomsShow(DOMS_SHOW.id as string, GLADIATOR_MEMBER.id as string)
    await store.assignToDomsShow(DOMS_SHOW.id as string, SAMURAI_MEMBER_1.id as string)

    const result = await store.updateDomsShow(DOMS_SHOW.id as string, 'Gala 2', FUTURE_DATE, ['Samurai', 'Viking'])

    expect(result.success).toBe(true)
    expect(fakeDb.rows('doms_shows').find((s) => s.id === DOMS_SHOW.id)?.name).toBe('Gala 2')
    const teams = fakeDb.rows('doms_show_teams').filter((t) => t.show_id === DOMS_SHOW.id).map((t) => t.team)
    expect(teams.sort()).toEqual(['Samurai', 'Viking'])
    const cast = fakeDb.rows('doms_show_assignments').filter((a) => a.show_id === DOMS_SHOW.id).map((a) => a.user_id)
    expect(cast).toEqual([SAMURAI_MEMBER_1.id]) // Gladiator cast removed
  })
})

describe('setDomsAvailability (past-event lock, spec-doms.md §4.1)', () => {
  it('lets a member change their own availability on a future doms show', async () => {
    actAs(SAMURAI_MEMBER_1)
    const result = await useDomsShowsStore().setDomsAvailability(
      SAMURAI_MEMBER_1.id as string,
      DOMS_SHOW.id as string,
      'absent',
    )
    expect(result.success).toBe(true)
    expect(
      fakeDb.rows('doms_show_availability').find((r) => r.user_id === SAMURAI_MEMBER_1.id && r.show_id === DOMS_SHOW.id)
        ?.status,
    ).toBe('absent')
  })

  it('blocks members and captains on a past doms show but allows a doms', async () => {
    const store = useDomsShowsStore()
    actAs(SAMURAI_MEMBER_1)
    expect((await store.setDomsAvailability(SAMURAI_MEMBER_1.id as string, 'doms-past', 'absent')).success).toBe(false)
    actAs(DOMS_USER)
    expect((await store.setDomsAvailability(SAMURAI_MEMBER_1.id as string, 'doms-past', 'absent')).success).toBe(true)
  })

  it('two concurrent first-time updates both succeed (upsert)', async () => {
    actAs(DOMS_USER)
    const store = useDomsShowsStore()
    const [a, b] = await Promise.all([
      store.setDomsAvailability(SAMURAI_MEMBER_2.id as string, DOMS_SHOW.id as string, 'present'),
      store.setDomsAvailability(SAMURAI_MEMBER_2.id as string, DOMS_SHOW.id as string, 'absent'),
    ])
    expect(a.success && b.success).toBe(true)
  })
})

describe('queries', () => {
  it('fetchDomsShows(team) only returns doms shows targeting that team', async () => {
    expect((await fetchDomsShows('Gladiator')).map((s) => s.id)).toEqual([DOMS_SHOW.id])
    expect(await fetchDomsShows('Viking')).toEqual([])
    expect((await fetchDomsShows()).length).toBe(2)
  })

  it('doms_show_cast only returns cast on a target team, for a viewer on a target team', async () => {
    actAs(DOMS_USER)
    await useDomsShowsStore().assignToDomsShow(DOMS_SHOW.id as string, GLADIATOR_MEMBER.id as string)
    actAs(SAMURAI_MEMBER_1)
    const cast = await fetchDomsCast(DOMS_SHOW.id as string)
    expect(cast.map((c) => c.user_id)).toEqual([GLADIATOR_MEMBER.id])
  })
})
