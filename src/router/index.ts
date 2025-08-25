import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import LoginView from '../views/LoginView.vue'
import TeamDashboardView from '../views/TeamDashboardView.vue'
import CaptainDashboardView from '../views/CaptainDashboardView.vue'
import AdminUserManagementView from '../views/AdminUserManagementView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: TeamDashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminUserManagementView,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/captain',
      name: 'captain',
      component: CaptainDashboardView,
      meta: { requiresAuth: true, requiresCaptain: true }
    }
  ],
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login')
    return
  }
  
  // Check if route requires admin access
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/dashboard')
    return
  }
  
  // Check if route requires captain access
  if (to.meta.requiresCaptain && !userStore.isCaptain) {
    next('/dashboard')
    return
  }
  
  // Check if route requires guest (not logged in)
  if (to.meta.requiresGuest && userStore.isAuthenticated) {
    // Redirect to appropriate dashboard based on user role
    if (userStore.isAdmin) {
      next('/admin')
    } else if (userStore.isCaptain) {
      next('/captain')
    } else {
      next('/dashboard')
    }
    return
  }
  
  next()
})

export default router
