import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb } from '../helpers/mock-supabase'
import TeamDashboardView from '@/views/TeamDashboardView.vue'
import { useUserStore } from '@/stores/user'
import { useCoachingStore } from '@/stores/coaching'
import { PAST_SESSION } from '../fixtures/coaching'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' } },
      { path: '/dashboard', component: TeamDashboardView },
    ],
  })
}

async function mountDashboard() {
  const router = makeRouter()
  await router.push('/dashboard')
  await router.isReady()
  const wrapper = mount(TeamDashboardView, {
    global: { plugins: [router], stubs: { MainNavigation: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('team-less members get no data and no fallback team (spec.md §3)', () => {
  it('never queries the Samurai roster as a fallback when the member has no team', async () => {
    const userStore = useUserStore()
    // @ts-expect-error test setup
    userStore.isAuthenticated = true
    // @ts-expect-error test setup
    userStore.user = { id: 'u1', name: 'No Team', slug: 'no-team', roles: ['member'], team: null, must_change_password: false, created_at: '' }
    const getUsersByTeamSpy = vi.spyOn(userStore, 'getUsersByTeam')

    await mountDashboard()

    // Regression guard: today's loadTeamMembers/updateAttendanceMatrix both call
    // `userStore.currentTeam || 'Samurai'`, so a team-less member is shown Samurai's data
    // instead of an empty state.
    const calledWithSamurai = getUsersByTeamSpy.mock.calls.some((call) => call[0] === 'Samurai')
    expect(calledWithSamurai).toBe(false)
    expect(getUsersByTeamSpy).not.toHaveBeenCalled()
  })
})

describe('past events cannot be updated by a member (spec.md §7.2 — client-side mirror)', () => {
  it('blocks confirming a status change for a past coaching session', async () => {
    resetFakeDb({ coaching_sessions: [PAST_SESSION], attendance_records: [] })

    const userStore = useUserStore()
    // @ts-expect-error test setup
    userStore.isAuthenticated = true
    // @ts-expect-error test setup
    userStore.user = { id: 'u1', name: 'Member', slug: 'member', roles: ['member'], team: 'Samurai', must_change_password: false, created_at: '' }
    const coachingStore = useCoachingStore()
    const updateAttendanceSpy = vi.spyOn(coachingStore, 'updateAttendance')
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = await mountDashboard()
    const toggles = wrapper.findAll('.toggle-button.desktop-toggle')
    await toggles[1].trigger('click') // "Voir Plus" for the coaching section — reveal past sessions
    const pastCard = wrapper.find('.coaching-card.past-event')
    await pastCard.trigger('click')
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    expect(alertSpy).toHaveBeenCalled()
    expect(updateAttendanceSpy).not.toHaveBeenCalled()
  })
})
