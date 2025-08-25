import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type User = Database['public']['Tables']['users']['Row']

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)

  // Computed properties
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isCaptain = computed(() => user.value?.role === 'captain' || user.value?.is_captain)
  const canAccessAdmin = computed(() => isAdmin.value || isCaptain.value)
  const currentTeam = computed(() => user.value?.team)

  // Actions
  const login = async (email: string, password: string) => {
    try {
      // For now, we'll use a simple email lookup since we haven't set up auth yet
      // In a real implementation, you'd use Supabase Auth
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        return { success: false, error: 'Invalid credentials' }
      }

      if (data) {
        user.value = data
        isAuthenticated.value = true
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
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const newUser = {
        name,
        email,
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

  const assignCaptainRole = async (userId: string, team: 'Samurai' | 'Gladiator' | 'Viking') => {
    if (!isAdmin.value) {
      return { success: false, error: 'Only admins can assign captain role' }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: 'captain',
          team,
          is_captain: true 
        })
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
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
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) {
        return { success: false, error: error.message, users: [] }
      }

      return { success: true, users: data || [] }
    } catch (error) {
      return { success: false, error: 'Failed to fetch users', users: [] }
    }
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
    assignCaptainRole,
    getUsersByTeam,
    getAllUsers
  }
}) 