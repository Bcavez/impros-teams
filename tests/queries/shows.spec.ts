import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb } from '../helpers/mock-supabase'
import { SAMURAI_CAPTAIN } from '../fixtures/users'
import { showsKey, showAvailabilityKey, fetchShows } from '@/queries/shows'
import { teamMembersKey, fetchTeamMembers } from '@/queries/profiles'
import { queryClient } from '@/lib/query-client'
import { useShowsStore } from '@/stores/shows'

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('shows/profiles query keys (spec.md Stage 3)', () => {
  it('scopes the shows key by team', () => {
    expect(showsKey('Samurai')).toEqual(['shows', 'Samurai'])
    expect(showsKey()).toEqual(['shows', null])
  })

  it('scopes the team-members key by team, replacing the old teamMembersCache', () => {
    expect(teamMembersKey('Samurai')).toEqual(['team-members', 'Samurai'])
  })

  it('fetchShows only returns shows for the requested team', async () => {
    const shows = await fetchShows('Samurai')
    expect(shows.every((s) => s.team === 'Samurai')).toBe(true)
  })

  it('fetchTeamMembers returns an empty array with no team, instead of throwing', async () => {
    expect(await fetchTeamMembers(null)).toEqual([])
  })
})

describe('store mutations invalidate the query cache (spec.md Stage 3b)', () => {
  it('creating a show invalidates shows and show-availability', async () => {
    const store = useShowsStore()
    await store.fetchShows('Samurai', true)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await store.createShow('Nouveau Spectacle', 'Samurai', '2999-08-01', SAMURAI_CAPTAIN.id as string)

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(['shows'])
    expect(invalidatedKeys).toContainEqual(showAvailabilityKey())
  })

  it('team-member lookups for the same team share one cache entry across stores', async () => {
    const fetchSpy = vi.fn(() => fetchTeamMembers('Samurai'))
    await queryClient.fetchQuery({ queryKey: teamMembersKey('Samurai'), queryFn: fetchSpy })
    await queryClient.fetchQuery({ queryKey: teamMembersKey('Samurai'), queryFn: fetchSpy })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
