import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { hashPassword, comparePassword, isBcryptHash, validatePassword } from '@/lib/password-utils'

type User = Database['public']['Tables']['users']['Row']

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const allUsers = ref<User[]>([])

  // Persistent authentication functions
  const saveAuthState = (userData: User) => {
    try {
      localStorage.setItem('auth_user', JSON.stringify(userData))
      localStorage.setItem('auth_authenticated', 'true')
    } catch (error) {
      console.error('Failed to save auth state:', error)
    }
  }

  const loadAuthState = async () => {
    try {
      const savedUser = localStorage.getItem('auth_user')
      const isAuth = localStorage.getItem('auth_authenticated')
      
      if (savedUser && isAuth === 'true') {
        const userData = JSON.parse(savedUser)
        user.value = userData
        isAuthenticated.value = true
        
        // Initialize stores after restoring authentication state
        console.log('🔄 Initializing stores after auth state restore...')
        const { useCoachingStore } = await import('./coaching')
        const { useShowsStore } = await import('./shows')
        
        const coachingStore = useCoachingStore()
        const showsStore = useShowsStore()
        
        await Promise.all([
          coachingStore.fetchCoachingSessions(undefined, true),
          coachingStore.fetchAttendanceRecords(undefined, true),
          showsStore.fetchShows(true),
          showsStore.fetchShowDates(true),
          showsStore.fetchShowAssignments(true),
          showsStore.fetchShowAvailability(true)
        ])
        
        // Cache team members for the user's team
        const teamMembersResult = await getUsersByTeam(userData.team || 'Samurai')
        if (teamMembersResult.success) {
          const teamMembersCacheKey = `team_members_${userData.team}`
          sessionStorage.setItem(teamMembersCacheKey, JSON.stringify(teamMembersResult.users))
        }
        
        sessionStorage.setItem('stores_initialized', 'true')
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to load auth state:', error)
      return false
    }
  }

  const clearAuthState = () => {
    try {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_authenticated')
    } catch (error) {
      console.error('Failed to clear auth state:', error)
    }
  }

  // Computed properties
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isCaptain = computed(() => user.value?.role === 'captain' || user.value?.is_captain)
  const canAccessAdmin = computed(() => isAdmin.value) // Only admins can access admin dashboard
  const currentTeam = computed(() => user.value?.team)

  // Actions
  const login = async (name: string, password: string) => {
    try {
      // Get user by name
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .single()

      if (error || !data) {
        return { success: false, error: 'Invalid credentials' }
      }

      // Check if user has a bcrypt hash or legacy plain text
      let isPasswordValid = false
      
      if (isBcryptHash(data.password_hash)) {
        // User has bcrypt hash - compare with bcrypt
        isPasswordValid = await comparePassword(password, data.password_hash)
      } else {
        // Legacy plain text password - check directly (for backward compatibility)
        isPasswordValid = data.password_hash === password || data.password_hash === 'default_password_hash'
      }

      if (isPasswordValid) {
        user.value = data
        isAuthenticated.value = true
        saveAuthState(data) // Save authentication state
        return { success: true, user: data }
      } else {
        return { success: false, error: 'Invalid credentials' }
      }
    } catch (error) {
      return { success: false, error: 'Login failed' }
    }
  }

  const logout = () => {
    user.value = null
    isAuthenticated.value = false
    clearAuthState() // Clear persistent authentication state
    
    // Clear all cache when user logs out
    import('./coaching').then(({ useCoachingStore }) => {
      const coachingStore = useCoachingStore()
      coachingStore.clearCache()
    })
    
    import('./shows').then(({ useShowsStore }) => {
      const showsStore = useShowsStore()
      showsStore.clearCache()
    })
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      // Hash the password with bcrypt
      const hashedPassword = await hashPassword(password)
      
      const newUser = {
        name,
        email,
        password_hash: hashedPassword, // Store the hashed password
        role: 'member' as const,
        team: null,
        is_captain: false
      }

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (data) {
        user.value = data
        isAuthenticated.value = true
        saveAuthState(data) // Save authentication state
        return { success: true, user: data }
      }

      return { success: false, error: 'Registration failed' }
    } catch (error) {
      return { success: false, error: 'Registration failed' }
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user.value) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (data) {
        user.value = data
        saveAuthState(data) // Update saved authentication state
        return { success: true, user: data }
      }

      return { success: false, error: 'Update failed' }
    } catch (error) {
      return { success: false, error: 'Update failed' }
    }
  }

  const assignTeam = async (userId: string, team: 'Samurai' | 'Gladiator' | 'Viking') => {
    if (!user.value || (!isAdmin.value && !(isCaptain.value && user.value.team === team))) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ team })
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Assignment failed' }
    }
  }

  const assignCaptainRole = async (userId: string, isCaptain: boolean) => {
    if (!isAdmin.value) {
      return { success: false, error: 'Only admins can assign captain role' }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          is_captain: isCaptain 
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Update local state
      const index = allUsers.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        allUsers.value[index] = data
      }

      // Update current user if it's the same user
      if (user.value?.id === userId) {
        user.value = data
        saveAuthState(data) // Update saved authentication state
      }

      return { success: true, user: data }
    } catch (error) {
      return { success: false, error: 'Role assignment failed' }
    }
  }

  const getUsersByTeam = async (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('team', team)

      if (error) {
        return { success: false, error: error.message, users: [] }
      }

      return { success: true, users: data || [] }
    } catch (error) {
      return { success: false, error: 'Failed to fetch users', users: [] }
    }
  }

  const getAllUsers = async () => {
    if (!isAdmin.value) {
      return { success: false, error: 'Only admins can view all users', users: [] }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) {
        return { success: false, error: error.message, users: [] }
      }

      allUsers.value = data || []
      return { success: true, users: data || [] }
    } catch (error) {
      return { success: false, error: 'Failed to fetch users', users: [] }
    }
  }



  const updateUserRole = async (userId: string, role: 'admin' | 'captain' | 'member') => {
    if (!isAdmin.value) {
      return { success: false, error: 'Only admins can update user roles' }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Update local state
      const index = allUsers.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        allUsers.value[index] = data
      }

      // Update current user if it's the same user
      if (user.value?.id === userId) {
        user.value = data
        saveAuthState(data) // Update saved authentication state
      }

      return { success: true, user: data }
    } catch (error) {
      return { success: false, error: 'Failed to update user role' }
    }
  }

  const deleteUser = async (userId: string) => {
    if (!isAdmin.value) {
      return { success: false, error: 'Only admins can delete users' }
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Remove from local state
      allUsers.value = allUsers.value.filter(u => u.id !== userId)

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to delete user' }
    }
  }

  return {
    // State
    user,
    isAuthenticated,
    allUsers,
    
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
    assignCaptainRole,
    getUsersByTeam,
    getAllUsers,
    updateUserRole,
    deleteUser,
    
    // Persistent auth
    loadAuthState
  }
}) 