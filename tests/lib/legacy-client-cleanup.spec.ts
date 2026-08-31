import { afterEach, describe, expect, it, vi } from 'vitest'

import { purgeLegacyClientState } from '@/lib/legacy-client-cleanup'

describe('purgeLegacyClientState', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('removes the legacy auth blob, which carried a bcrypt hash', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', password_hash: '$2a$10$abc' }))
    localStorage.setItem('auth_authenticated', 'true')

    await purgeLegacyClientState()

    expect(localStorage.getItem('auth_user')).toBeNull()
    expect(localStorage.getItem('auth_authenticated')).toBeNull()
  })

  it('keeps the Supabase Auth session so cleanup does not log the user out', async () => {
    localStorage.setItem('sb-abcdefgh-auth-token', JSON.stringify({ access_token: 'jwt' }))
    localStorage.setItem('auth_user', '{}')

    await purgeLegacyClientState()

    expect(localStorage.getItem('sb-abcdefgh-auth-token')).not.toBeNull()
  })

  it('removes every legacy sessionStorage key, including the per-team and per-store prefixes', async () => {
    sessionStorage.setItem('stores_initialized', 'true')
    sessionStorage.setItem('team_members_Samurai', '[]')
    sessionStorage.setItem('team_members_Viking', '[]')
    sessionStorage.setItem('coaching_cache_attendance', '1756654321000')
    sessionStorage.setItem('shows_cache_availability', '1756654321000')

    await purgeLegacyClientState()

    expect(sessionStorage.length).toBe(0)
  })

  it('unregisters leftover service workers and drops their caches', async () => {
    const unregister = vi.fn().mockResolvedValue(true)
    const deleteCache = vi.fn().mockResolvedValue(true)

    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
    })
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache-v2-https://example.com/']),
      delete: deleteCache,
    })

    await purgeLegacyClientState()

    expect(unregister).toHaveBeenCalledOnce()
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-v2-https://example.com/')
  })

  it('resolves rather than throwing when the browser denies storage access', async () => {
    vi.spyOn(window.localStorage, 'key').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })

    localStorage.setItem('auth_user', '{}')

    await expect(purgeLegacyClientState()).resolves.toBeUndefined()
  })
})
