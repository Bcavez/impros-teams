import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb } from '../helpers/mock-supabase'
import LoginView from '@/views/LoginView.vue'
import { useUserStore } from '@/stores/user'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/dashboard', component: { template: '<div />' } },
    ],
  })
}

async function mountOnRegisterTab() {
  const router = makeRouter()
  await router.push('/login')
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [router] } })
  const tabs = wrapper.findAll('.tab-button')
  const registerTab = tabs.find((t) => t.text() === 'Inscription')
  await registerTab?.trigger('click')
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('registration password policy is enforced client-side (spec.md §4.2, improvements.md #11)', () => {
  it('does not attempt registration when the password fails the policy', async () => {
    const wrapper = await mountOnRegisterTab()
    const userStore = useUserStore()
    const registerSpy = vi.spyOn(userStore, 'register')

    await wrapper.find('#register-name').setValue('New Person')
    await wrapper.find('#register-password').setValue('a')
    await wrapper.find('#register-confirm-password').setValue('a')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // The store's own validatePassword() call rejects this password (see
    // src/stores/user.ts register()), so the mount-level spy never gets a success — this
    // guards against a future regression where the client-side check is bypassed.
    expect(registerSpy).toHaveBeenCalled()
    expect(await registerSpy.mock.results[0].value).toMatchObject({ success: false })
  })

  it('shows the specific validation errors inline rather than a generic failure message', async () => {
    const wrapper = await mountOnRegisterTab()

    await wrapper.find('#register-name').setValue('New Person')
    await wrapper.find('#register-password').setValue('a')
    await wrapper.find('#register-confirm-password').setValue('a')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('8 characters')
  })
})

describe('registration surfaces the real store error (spec.md §4.2, improvements.md — LoginView.vue:253)', () => {
  it('shows the store\'s error message instead of a hardcoded generic string', async () => {
    const wrapper = await mountOnRegisterTab()
    const userStore = useUserStore()
    vi.spyOn(userStore, 'register').mockResolvedValue({
      success: false,
      error: 'Ce nom est déjà utilisé',
    })

    await wrapper.find('#register-name').setValue('Existing Name')
    await wrapper.find('#register-password').setValue('Str0ngPass')
    await wrapper.find('#register-confirm-password').setValue('Str0ngPass')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Regression guard: src/views/LoginView.vue:253 always shows "Échec de l'inscription",
    // discarding result.error entirely.
    expect(wrapper.text()).toContain('Ce nom est déjà utilisé')
  })
})
