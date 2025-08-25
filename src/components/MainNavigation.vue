<template>
  <nav v-if="userStore.isAuthenticated" class="main-nav">
    <div class="nav-container">
      <div class="nav-left">
        <router-link to="/dashboard" class="nav-brand">
          Team Dashboard
        </router-link>
      </div>
      
      <div class="nav-right">
        <div class="user-info">
          <span class="user-name">{{ userStore.user?.name }}</span>
          <span class="team-badge">{{ userStore.currentTeam || 'No Team' }}</span>
        </div>
        
        <div class="nav-actions">
          <button 
            v-if="userStore.isCaptain || userStore.isAdmin"
            @click="handleRefresh" 
            class="nav-button refresh-button"
            :disabled="isRefreshing"
            :title="isRefreshing ? 'Refreshing...' : 'Refresh Data'"
          >
            <svg 
              class="nav-icon" 
              :class="{ 'spinning': isRefreshing }"
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            <span class="button-text">{{ isRefreshing ? 'Refreshing...' : 'Refresh' }}</span>
          </button>
          
          <!-- Back to Dashboard button (when not on dashboard) -->
          <router-link
            v-if="!isOnDashboardPage"
            to="/dashboard"
            class="nav-button dashboard-button"
          >
            📊 Dashboard
          </router-link>
          
          <router-link
            v-if="userStore.isAdmin && !isOnAdminPage"
            to="/admin"
            class="nav-button admin-button"
          >
            🛠️ <span class="button-text">Admin</span>
          </router-link>
          
          <router-link
            v-if="userStore.isCaptain && !isOnCaptainPage"
            to="/captain"
            class="nav-button captain-button"
          >
            <svg 
              class="nav-icon" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span class="button-text">Captain</span>
          </router-link>
          
          <button @click="handleLogout" class="nav-button logout-button" title="Logout">
            <svg 
              class="nav-icon" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span class="button-text">Logout</span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCoachingStore } from '@/stores/coaching'
import { useShowsStore } from '@/stores/shows'

const userStore = useUserStore()
const coachingStore = useCoachingStore()
const showsStore = useShowsStore()
const route = useRoute()
const router = useRouter()

const isRefreshing = ref(false)

const isOnAdminPage = computed(() => route.path === '/admin')
const isOnCaptainPage = computed(() => route.path === '/captain')
const isOnDashboardPage = computed(() => route.path === '/dashboard')

const handleRefresh = async () => {
  if (isRefreshing.value) return
  
  isRefreshing.value = true
  
  try {
    // Refresh data based on user role
    if (userStore.isCaptain) {
      await Promise.all([
        coachingStore.refreshData(),
        showsStore.refreshData()
      ])
    } else if (userStore.isAdmin) {
      // For admin, refresh user data
      await userStore.getAllUsers()
    }
  } catch (error) {
    console.error('Error refreshing data:', error)
  } finally {
    isRefreshing.value = false
  }
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.main-nav {
  background: white;
  border-bottom: 1px solid #e1e8ed;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-brand {
  font-size: 1.2em;
  font-weight: 600;
  color: #2c3e50;
  text-decoration: none;
  transition: color 0.2s;
}

.nav-brand:hover {
  color: #3498db;
}

.dashboard-button {
  background: #27ae60;
  color: white;
}

.dashboard-button:hover {
  background: #229954;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-weight: 500;
  color: #2c3e50;
}

.team-badge {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.button-text {
  display: inline;
}

.admin-button {
  background: #e74c3c;
  color: white;
}

.admin-button:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.captain-button {
  background: #f39c12;
  color: white;
}

.captain-button:hover {
  background: #e67e22;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.refresh-button {
  background: #17a2b8;
  color: white;
}

.refresh-button:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.refresh-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.logout-button {
  background: #95a5a6;
  color: white;
}

.logout-button:hover {
  background: #7f8c8d;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 15px;
    height: 50px;
  }
  
  .nav-right {
    gap: 10px;
  }
  
  .user-info {
    gap: 8px;
  }
  
  .user-name {
    font-size: 0.9em;
  }
  
  .team-badge {
    font-size: 0.7em;
    padding: 3px 6px;
  }
  
  .nav-button {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .nav-icon {
    width: 14px;
    height: 14px;
  }
  
  .nav-actions {
    gap: 6px;
  }
}

@media (max-width: 640px) {
  .nav-container {
    padding: 0 10px;
  }
  
  .nav-right {
    gap: 8px;
  }
  
  .user-name {
    display: none;
  }
  
  .nav-button {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .nav-actions {
    gap: 4px;
  }
  
  .button-text {
    display: none;
  }
  
  .nav-button {
    min-width: 36px;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .nav-brand {
    font-size: 1em;
  }
  
  .team-badge {
    display: none;
  }
  
  .nav-button {
    padding: 6px 8px;
    font-size: 11px;
    min-width: 32px;
  }
}
</style>
