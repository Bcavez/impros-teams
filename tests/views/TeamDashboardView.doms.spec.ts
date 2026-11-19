import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb, fakeDb } from '../helpers/mock-supabase'
import TeamDashboardView from '@/views/TeamDashboardView.vue'
import { useUserStore } from '@/stores/user'
import { queryClient } from '@/lib/query-client'
import { ALL_USERS, SAMURAI_MEMBER_1, GLADIATOR_MEMBER } from '../fixtures/users'
import { DOMS_USER, DOMS_SHOW, DOMS_SHOW_TEAMS } from '../fixtures/doms'
import { FUTURE_SHOW_DATE } from '../fixtures/shows'

async function mountAs(profile: Record<string, unknown>) {
  fakeDb.auth.currentUser = { id: profile.id as string, email: 'x@impros.local' }
  const userStore = useUserStore()
  // @ts-expect-error test setup
  userStore.isAuthenticated = true
  // @ts-expect-error test setup
  userStore.user = { ...profile }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' } },
      { path: '/dashboard', component: TeamDashboardView },
    ],
  })
  await router.push('/dashboard')
  await router.isReady()
  const wrapper = mount(TeamDashboardView, { global: { plugins: [router], stubs: { MainNavigation: true } } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  queryClient.clear()
  resetFakeDb({
    profiles: [...ALL_USERS, DOMS_USER],
    shows: [FUTURE_SHOW_DATE],
    show_assignments: [],
    show_availability: [],
    doms_shows: [DOMS_SHOW],
    doms_show_teams: DOMS_SHOW_TEAMS, // Samurai + Gladiator
    doms_show_availability: [],
    doms_show_assignments: [
      { id: 'dc-1', show_id: DOMS_SHOW.id, user_id: GLADIATOR_MEMBER.id },
      { id: 'dc-2', show_id: DOMS_SHOW.id, user_id: SAMURAI_MEMBER_1.id },
    ],
  })
})

describe('doms shows on the member dashboard (spec-doms.md §5.1)', () => {
  it('lists a doms show targeting the member team with a Doms badge and its teams', async () => {
    const wrapper = await mountAs(SAMURAI_MEMBER_1)

    const cards = wrapper.findAll('.show-card')
    expect(cards).toHaveLength(2) // captain show + doms show
    const domsCard = cards.find((c) => c.text().includes(DOMS_SHOW.name as string))!
    const badges = domsCard.findAll('.doms-badge').map((b) => b.text())
    expect(badges).not.toContain('Doms')
    expect(badges).toContain('Samurai')
    expect(badges).toContain('Gladiator')
  })

  it('shows cast names from other target teams and an uncapped count', async () => {
    const wrapper = await mountAs(SAMURAI_MEMBER_1)
    const domsCard = wrapper.findAll('.show-card').find((c) => c.text().includes(DOMS_SHOW.name as string))!

    expect(domsCard.text()).toContain(GLADIATOR_MEMBER.name as string)
    expect(domsCard.find('.member-count').text()).toBe('(2)')
  })

  it('does not list a doms show that does not target the member team', async () => {
    resetFakeDb({
      profiles: [...ALL_USERS, DOMS_USER],
      shows: [],
      doms_shows: [DOMS_SHOW],
      doms_show_teams: [{ show_id: DOMS_SHOW.id, team: 'Viking' }],
    })
    const wrapper = await mountAs(SAMURAI_MEMBER_1)

    expect(wrapper.findAll('.show-card')).toHaveLength(0)
  })

  it('writes a member\'s own availability to doms_show_availability, not show_availability', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    const wrapper = await mountAs(SAMURAI_MEMBER_1)
    const domsCard = wrapper.findAll('.show-card').find((c) => c.text().includes(DOMS_SHOW.name as string))!

    await domsCard.trigger('click')
    const buttons = wrapper.findAll('.status-button')
    await buttons.find((b) => b.text() === 'Indisponible')!.trigger('click')
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    const row = fakeDb.rows('doms_show_availability').find((r) => r.user_id === SAMURAI_MEMBER_1.id)
    expect(row?.status).toBe('absent')
    expect(fakeDb.rows('show_availability')).toHaveLength(0)
  })
})
