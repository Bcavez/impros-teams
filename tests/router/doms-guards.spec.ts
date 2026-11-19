import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import '../helpers/mock-supabase'
import router from '@/router'
import { useUserStore } from '@/stores/user'

async function navigate(path: string) {
  await router.push(path)
  await router.isReady()
  return router.currentRoute.value.path
}

const login = (roles: string[], team: string | null) => {
  const store = useUserStore()
  // @ts-expect-error test setup
  store.isAuthenticated = true
  // @ts-expect-error test setup
  store.user = { id: 'u', name: 'U', slug: 'u', roles, team, must_change_password: false, created_at: '' }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await router.push('/login')
  await router.isReady()
})

describe('doms routing (spec-doms.md §5.4)', () => {
  it('a doms can reach /doms and is redirected there from every other route', async () => {
    login(['doms'], null)
    expect(await navigate('/doms')).toBe('/doms')
    expect(await navigate('/dashboard')).toBe('/doms')
    expect(await navigate('/captain')).toBe('/doms')
    expect(await navigate('/admin')).toBe('/doms')
  })

  it('a doms leaving the guest-only /login is sent to /doms', async () => {
    login(['doms'], null)
    await navigate('/doms')
    expect(await navigate('/login')).toBe('/doms')
  })

  it.each([
    ['member', ['member'], 'Samurai'],
    ['captain', ['member', 'captain'], 'Samurai'],
    ['admin', ['member', 'admin'], null],
  ])('a %s is redirected away from /doms', async (_label, roles, team) => {
    login(roles as string[], team as string | null)
    await navigate('/dashboard')
    expect(await navigate('/doms')).toBe('/dashboard')
  })

  it('an unauthenticated user is redirected to /login from /doms', async () => {
    expect(await navigate('/doms')).toBe('/login')
  })
})
