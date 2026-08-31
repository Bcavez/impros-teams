/**
 * Clears state left behind on devices that ran a build older than 9d721a2.
 *
 * That refactor swapped hand-rolled auth for Supabase Auth and dropped the PWA, so anyone who
 * used the app before it is carrying three kinds of debris:
 *
 *  - a service worker registration plus a Workbox precache, which keeps serving the old bundle
 *    (see public/sw.js — that file is what actually frees devices still stuck on the old worker;
 *    this module only cleans up devices that already reached the current bundle);
 *  - `auth_user`, which held a full `users` row *including its bcrypt hash*, so it is worth
 *    removing on privacy grounds alone even though nothing reads it any more;
 *  - assorted sessionStorage cache bookkeeping.
 *
 * Keys are matched against an explicit list rather than clearing storage wholesale, because
 * Supabase Auth keeps the live session under `sb-<project-ref>-auth-token` in the same
 * localStorage — wiping that would log everyone out on every boot.
 */

const LEGACY_LOCAL_STORAGE_KEYS = ['auth_user', 'auth_authenticated']

const LEGACY_SESSION_STORAGE_KEYS = ['stores_initialized']

const LEGACY_SESSION_STORAGE_PREFIXES = ['team_members_', 'coaching_cache_', 'shows_cache_']

function purgeStorage(storage: Storage, exactKeys: string[], keyPrefixes: string[]): void {
  const doomed: string[] = []

  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key === null) continue
    if (exactKeys.includes(key) || keyPrefixes.some((prefix) => key.startsWith(prefix))) {
      doomed.push(key)
    }
  }

  // Collect before removing: removeItem() reindexes the remaining keys mid-iteration.
  for (const key of doomed) {
    storage.removeItem(key)
  }
}

/**
 * Best-effort and non-blocking: every step is optional, so a browser that denies storage or
 * service worker access (Safari private browsing, blocked cookies) must still boot normally.
 */
export async function purgeLegacyClientState(): Promise<void> {
  try {
    purgeStorage(window.localStorage, LEGACY_LOCAL_STORAGE_KEYS, [])
    purgeStorage(window.sessionStorage, LEGACY_SESSION_STORAGE_KEYS, LEGACY_SESSION_STORAGE_PREFIXES)
  } catch {
    // Storage unavailable — nothing here is load-bearing.
  }

  // The app ships no service worker of its own, so any registration found here is a leftover.
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    } catch {
      // Ignored.
    }
  }

  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    } catch {
      // Ignored.
    }
  }
}
