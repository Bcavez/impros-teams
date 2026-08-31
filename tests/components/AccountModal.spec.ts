import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb } from '../helpers/mock-supabase'
import AccountModal from '@/components/AccountModal.vue'
import { useUserStore } from '@/stores/user'

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

function setLoggedInUser(overrides: Partial<{ must_change_password: boolean }> = {}) {
  const userStore = useUserStore()
  userStore.user = {
    id: 'u1',
    name: 'Test User',
    slug: 'test-user',
    roles: ['member'],
    team: 'Samurai',
    must_change_password: false,
    created_at: '',
    ...overrides,
  }
  return userStore
}

describe('AccountModal must_change_password gate (spec.md §7)', () => {
  it('is hidden by default when the profile does not require a password change', () => {
    setLoggedInUser()
    const wrapper = mount(AccountModal, { props: { open: false } })

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('forces itself open when must_change_password is true, even if the open prop is false', () => {
    setLoggedInUser({ must_change_password: true })
    const wrapper = mount(AccountModal, { props: { open: false } })

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.close-button').exists()).toBe(false)
  })
})

describe('AccountModal password change form', () => {
  it('rejects mismatched passwords without calling the store', async () => {
    const userStore = setLoggedInUser()
    const changeSpy = vi.spyOn(userStore, 'changePassword')
    const wrapper = mount(AccountModal, { props: { open: true } })

    await wrapper.find('#current-password').setValue('OldPassw0rd')
    await wrapper.find('#new-password').setValue('NewPassw0rd')
    await wrapper.find('#confirm-new-password').setValue('Different0rd')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(changeSpy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('ne correspondent pas')
  })

  it('calls userStore.changePassword and shows the store error on failure', async () => {
    const userStore = setLoggedInUser()
    vi.spyOn(userStore, 'changePassword').mockResolvedValue({
      success: false,
      error: 'Mot de passe actuel incorrect',
    })
    const wrapper = mount(AccountModal, { props: { open: true } })

    await wrapper.find('#current-password').setValue('WrongPassw0rd')
    await wrapper.find('#new-password').setValue('NewPassw0rd')
    await wrapper.find('#confirm-new-password').setValue('NewPassw0rd')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Mot de passe actuel incorrect')
  })

  it('shows a success message and closes a non-forced modal after a successful change', async () => {
    vi.useFakeTimers()
    const userStore = setLoggedInUser()
    vi.spyOn(userStore, 'changePassword').mockResolvedValue({ success: true })
    const wrapper = mount(AccountModal, { props: { open: true } })

    await wrapper.find('#current-password').setValue('OldPassw0rd')
    await wrapper.find('#new-password').setValue('NewPassw0rd')
    await wrapper.find('#confirm-new-password').setValue('NewPassw0rd')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('succès')

    vi.advanceTimersByTime(1500)
    await flushPromises()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])

    vi.useRealTimers()
  })
})
