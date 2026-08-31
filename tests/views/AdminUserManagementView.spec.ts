import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb } from '../helpers/mock-supabase'
import AdminUserManagementView from '@/views/AdminUserManagementView.vue'
import { useUserStore } from '@/stores/user'
import { ADMIN_USER } from '../fixtures/users'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' } },
      { path: '/dashboard', component: { template: '<div />' } },
      { path: '/admin', component: AdminUserManagementView },
    ],
  })
}

async function mountAdminView() {
  const router = makeRouter()
  await router.push('/admin')
  await router.isReady()
  const wrapper = mount(AdminUserManagementView, {
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
  userStore.user = { ...ADMIN_USER }
})

describe('privileged account operations move out of the browser (spec.md §9)', () => {
  it('does not render a delete-user control in the browser UI', async () => {
    const wrapper = await mountAdminView()

    // Regression guard: today's delete button calls userStore.deleteUser directly from the
    // browser, which only works because the anon key currently has unrestricted write access
    // to `users` (see improvements.md P0 #1). Once RLS is real, this must be a local script
    // (scripts/admin.ts) run with the service-role key — never a browser-exposed control.
    expect(wrapper.find('.btn-danger').exists()).toBe(false)
  })
})

describe('admin self-protection (already correct today — regression guard)', () => {
  it('disables the role selector for the currently logged-in admin', async () => {
    const wrapper = await mountAdminView()

    const ownRow = wrapper.findAll('tr.user-row').find((row) => row.text().includes(ADMIN_USER.name as string))
    expect(ownRow?.find('.role-select').attributes('disabled')).toBeDefined()
  })
})
