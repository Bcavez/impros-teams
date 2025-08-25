import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Load saved authentication state before mounting app
import { useUserStore } from './stores/user'
const userStore = useUserStore()

// Initialize authentication state and stores
userStore.loadAuthState().then(() => {
  // Mount app after auth state and stores are loaded
  app.mount('#app')
}).catch((error) => {
  console.error('Failed to initialize auth state:', error)
  // Mount app anyway, user will need to login
  app.mount('#app')
})
