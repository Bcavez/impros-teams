import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { queryClient } from './lib/query-client'
import { purgeLegacyClientState } from './lib/legacy-client-cleanup'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
// Views/composables that call `useQuery` without an explicit `queryClient` option (e.g. inside
// component `<script setup>`) resolve it via injection from this same shared instance.
app.use(VueQueryPlugin, { queryClient })

// Deliberately not awaited: this only evicts debris from pre-Supabase-Auth builds, so it must
// never delay the first paint.
void purgeLegacyClientState()

// Mount immediately — App.vue shows a loading shell until session restore resolves, and the
// router guard awaits the same promise before deciding anything (improvements.md #21).
useUserStore(pinia).ensureAuthReady()

app.mount('#app')
