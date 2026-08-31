<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const ready = ref(userStore.authReady)

userStore.ensureAuthReady().then(() => {
  ready.value = true
})
</script>

<template>
  <div v-if="!ready" class="app-loading" role="status" aria-live="polite">
    <div class="spinner"></div>
  </div>
  <RouterView v-else />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
}

.app-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-loading .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e8ed;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: app-loading-spin 0.8s linear infinite;
}

@keyframes app-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
