/*
 * Self-destroying service worker.
 *
 * Builds up to 9d721a2 shipped vite-plugin-pwa with `registerType: 'autoUpdate'` and a Workbox
 * precache covering `**\/*.{js,css,html,ico,png,svg}`. That means every visitor of the old app
 * still has a service worker registered at this exact URL (`sw.js` is vite-plugin-pwa's default
 * filename) which answers navigations from its precache — so those devices keep booting the old
 * bundle, which authenticates against the dropped `users` table and can no longer log in.
 *
 * Removing the plugin is not enough to free them: with `_redirects` doing an SPA rewrite, a
 * missing /sw.js is answered with index.html rather than a 404, so the browser's update check
 * fails on the MIME type and silently keeps the old worker alive. The registration only goes
 * away if this URL keeps serving a valid script that tears itself down.
 *
 * Do not delete this file until the old clients are gone (a year is a safe margin); deleting it
 * resurrects the stale-cache trap for anyone who has not opened the app since.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))

      await self.registration.unregister()

      // Reload the tabs this worker still controls, so they pick up the current bundle from the
      // network instead of sitting on the old one until the user happens to navigate again.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    })(),
  )
})
