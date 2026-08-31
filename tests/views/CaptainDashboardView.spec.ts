import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb } from '../helpers/mock-supabase'
import CaptainDashboardView from '@/views/CaptainDashboardView.vue'
import { useUserStore } from '@/stores/user'
import { useCoachingStore } from '@/stores/coaching'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' } },
      { path: '/captain', component: CaptainDashboardView },
    ],
  })
}

async function mountCaptainDashboard() {
  const router = makeRouter()
  await router.push('/captain')
  await router.isReady()
  const wrapper = mount(CaptainDashboardView, {
    global: { plugins: [router], stubs: { MainNavigation: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
  const userStore = useUserStore()
  // @ts-expect-error test setup
  userStore.isAuthenticated = true
  // @ts-expect-error test setup
  userStore.user = { id: 'captain-1', name: 'Captain', slug: 'captain', roles: ['member', 'captain'], team: 'Samurai', must_change_password: false, created_at: '' }
})

describe('attendance matrix invalidation after mutation (spec.md §6/§10.3, improvements.md #22)', () => {
  it('refetches the attendance matrix after creating a coaching session', async () => {
    const coachingStore = useCoachingStore()
    const wrapper = await mountCaptainDashboard()
    const matrixSpy = vi.spyOn(coachingStore, 'getAttendanceMatrix')
    const callsBeforeCreate = matrixSpy.mock.calls.length

    const createButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Créer Session de Coaching')
    await createButton?.trigger('click')
    await wrapper.find('#coaching-date').setValue('2999-08-01')
    await wrapper.find('#coaching-coach').setValue('Coach Test')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Regression guard: CaptainDashboardView's createCoachingSession handler must call
    // refreshMatrixData, or the cached attendance grid keeps showing the pre-creation state.
    expect(matrixSpy.mock.calls.length).toBeGreaterThan(callsBeforeCreate)
  })
})
