import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)



// Initialize stores after app is created
const { useCoachingStore } = await import('./stores/coaching')
const { useShowsStore } = await import('./stores/shows')

const coachingStore = useCoachingStore()
const showsStore = useShowsStore()

await Promise.all([
  coachingStore.initializeStore(),
  showsStore.initializeStore()
])

app.mount('#app')
