import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb } from '../helpers/mock-supabase'
import AdminUserManagementView from '@/views/AdminUserManagementView.vue'
import { useUserStore } from '@/stores/user'
import { ADMIN_USER, ALL_USERS } from '../fixtures/users'
import { DOMS_USER } from '../fixtures/doms'

async function mountAdminView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' } },
      { path: '/admin', component: AdminUserManagementView },
    ],
  })
  await router.push('/admin')
  await router.isReady()
  const wrapper = mount(AdminUserManagementView, { global: { plugins: [router], stubs: { MainNavigation: true } } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb({ profiles: [...ALL_USERS, DOMS_USER] })
  const userStore = useUserStore()
  // @ts-expect-error test setup
  userStore.isAuthenticated = true
  // @ts-expect-error test setup
  userStore.user = { ...ADMIN_USER }
})

describe('doms accounts in the admin table (spec-doms.md §5.3)', () => {
  it('shows the Doms role and disables the role and team dropdowns on that row', async () => {
    const wrapper = await mountAdminView()
    const row = wrapper.findAll('tr.user-row').find((r) => r.text().includes(DOMS_USER.name as string))!

    expect((row.find('.role-select').element as HTMLSelectElement).value).toBe('doms')
    expect(row.find('.role-select').attributes('disabled')).toBeDefined()
    expect(row.find('.team-select').attributes('disabled')).toBeDefined()
  })

  it('offers a Doms role filter', async () => {
    const wrapper = await mountAdminView()
    const options = wrapper.find('.filter-select').findAll('option').map((o) => o.text())
    expect(options).toContain('Doms')
  })

  it('does not count a doms as a regular member', async () => {
    const wrapper = await mountAdminView()
    const memberCard = wrapper.findAll('.stat-card').find((c) => c.text().includes('Membres'))!
    const memberLikeUsers = ALL_USERS.filter((u) => !(u.roles as string[]).some((r) => r === 'admin' || r === 'captain'))
    expect(memberCard.find('.stat-number').text()).toBe(String(memberLikeUsers.length))
  })

  it('refuses to change the role or team of a doms from the store', async () => {
    await mountAdminView()
    const userStore = useUserStore()
    expect((await userStore.setUserRole(DOMS_USER.id as string, 'member')).success).toBe(false)
    expect((await userStore.assignTeam(DOMS_USER.id as string, 'Samurai')).success).toBe(false)
  })
})
