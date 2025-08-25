import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'captain' | 'member'
  team: 'Samurai' | 'Gladiator' | 'Viking' | null
  isCaptain: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)

  // Computed properties
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isCaptain = computed(() => user.value?.role === 'captain' || user.value?.isCaptain)
  const canAccessAdmin = computed(() => isAdmin.value || isCaptain.value)
  const currentTeam = computed(() => user.value?.team)

  // Actions
  const login = async (email: string, password: string) => {
    // In a real app, this would make an API call
    // For demo purposes, we'll simulate authentication
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        team: null,
        isCaptain: false
      },
      {
        id: '2',
        name: 'Samurai Captain',
        email: 'samurai@example.com',
        role: 'captain',
        team: 'Samurai',
        isCaptain: true
      },
      {
        id: '3',
        name: 'Gladiator Captain',
        email: 'gladiator@example.com',
        role: 'captain',
        team: 'Gladiator',
        isCaptain: true
      },
      {
        id: '4',
        name: 'Viking Captain',
        email: 'viking@example.com',
        role: 'captain',
        team: 'Viking',
        isCaptain: true
      },
      {
        id: '5',
        name: 'Samurai Member',
        email: 'member1@example.com',
        role: 'member',
        team: 'Samurai',
        isCaptain: false
      },
      {
        id: '6',
        name: 'Samurai Member 2',
        email: 'member2@example.com',
        role: 'member',
        team: 'Samurai',
        isCaptain: false
      },
      {
        id: '7',
        name: 'Gladiator Member',
        email: 'member3@example.com',
        role: 'member',
        team: 'Gladiator',
        isCaptain: false
      },
      {
        id: '8',
        name: 'Viking Member',
        email: 'member4@example.com',
        role: 'member',
        team: 'Viking',
        isCaptain: false
      }
    ]

    const foundUser = mockUsers.find(u => u.email === email)
    
    if (foundUser) {
      user.value = foundUser
      isAuthenticated.value = true
      return { success: true, user: foundUser }
    } else {
      return { success: false, error: 'Invalid credentials' }
    }
  }

  const logout = () => {
    user.value = null
    isAuthenticated.value = false
  }

  const register = async (name: string, email: string, password: string) => {
    // In a real app, this would make an API call
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role: 'member',
      team: null,
      isCaptain: false
    }
    
    user.value = newUser
    isAuthenticated.value = true
    return { success: true, user: newUser }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
      return { success: true, user: user.value }
    }
    return { success: false, error: 'No user logged in' }
  }

  const assignTeam = (userId: string, team: 'Samurai' | 'Gladiator' | 'Viking') => {
    // This would typically be an admin/captain action
    if (user.value && (isAdmin.value || (isCaptain.value && user.value.team === team))) {
      // In a real app, this would update the user in the database
      return { success: true }
    }
    return { success: false, error: 'Unauthorized' }
  }

  const assignCaptainRole = (userId: string, team: 'Samurai' | 'Gladiator' | 'Viking') => {
    // Only admins can assign captain role
    if (isAdmin.value) {
      // In a real app, this would update the user in the database
      return { success: true }
    }
    return { success: false, error: 'Only admins can assign captain role' }
  }

  return {
    // State
    user,
    isAuthenticated,
    
    // Computed
    isAdmin,
    isCaptain,
    canAccessAdmin,
    currentTeam,
    
    // Actions
    login,
    logout,
    register,
    updateProfile,
    assignTeam,
    assignCaptainRole
  }
}) 