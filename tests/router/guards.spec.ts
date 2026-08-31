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

beforeEach(async () => {
  setActivePinia(createPinia())
  await router.push('/login')
  await router.isReady()
})

describe('unauthenticated users (spec.md §7.1)', () => {
  it('are redirected to /login from a protected route', async () => {
    expect(await navigate('/dashboard')).toBe('/login')
    expect(await navigate('/admin')).toBe('/login')
    expect(await navigate('/captain')).toBe('/login')
  })

  it('can reach /login itself', async () => {
    expect(await navigate('/login')).toBe('/login')
  })
})

describe('member (spec.md §7.1 — admin is not a captain, and vice versa)', () => {
  beforeEach(() => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.isAuthenticated = true
    // @ts-expect-error test setup
    store.user = { id: 'm1', name: 'Member', slug: 'member', roles: ['member'], team: 'Samurai', must_change_password: false, created_at: '' }
  })

  it('can reach /dashboard but not /admin or /captain', async () => {
    expect(await navigate('/dashboard')).toBe('/dashboard')
    expect(await navigate('/admin')).toBe('/dashboard')
    expect(await navigate('/captain')).toBe('/dashboard')
  })

  it('is redirected away from /login to /dashboard (guest-only route)', async () => {
    await navigate('/dashboard') // land somewhere other than /login first, so the next
    // push to /login is a real navigation the guard evaluates, not a same-route no-op.
    expect(await navigate('/login')).toBe('/dashboard')
  })
})

describe('captain', () => {
  beforeEach(() => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.isAuthenticated = true
    // @ts-expect-error test setup
    store.user = { id: 'c1', name: 'Captain', slug: 'captain', roles: ['member', 'captain'], team: 'Samurai', must_change_password: false, created_at: '' }
  })

  it('can reach /captain but not /admin', async () => {
    expect(await navigate('/captain')).toBe('/captain')
    expect(await navigate('/admin')).toBe('/dashboard')
  })

  it('is redirected away from /login to /captain', async () => {
    await navigate('/captain')
    expect(await navigate('/login')).toBe('/captain')
  })
})

describe('admin (spec.md §2 — admin does not implicitly gain captain access)', () => {
  beforeEach(() => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.isAuthenticated = true
    // @ts-expect-error test setup
    store.user = { id: 'a1', name: 'Admin', slug: 'admin', roles: ['member', 'admin'], team: null, must_change_password: false, created_at: '' }
  })

  it('can reach /admin but not /captain', async () => {
    expect(await navigate('/admin')).toBe('/admin')
    expect(await navigate('/captain')).toBe('/dashboard')
  })

  it('is redirected away from /login to /admin', async () => {
    await navigate('/admin')
    expect(await navigate('/login')).toBe('/admin')
  })
})
