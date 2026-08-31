import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { syntheticEmail } from '@/lib/auth-identity'
import { validatePassword } from '@/lib/password-policy'
import { isAdmin as checkIsAdmin, isCaptain as checkIsCaptain } from '@/lib/permissions'
import type { Team } from '@/lib/teams'

export interface Profile {
  id: string
  name: string
  slug: string
  roles: string[]
  team: Team | null
  must_change_password: boolean
  created_at: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<Profile | null>(null)
  const isAuthenticated = ref(false)
  const allUsers = ref<Profile[]>([])
  const authReady = ref(false)
  let authReadyPromise: Promise<void> | null = null

  const isAdmin = computed(() => (user.value ? checkIsAdmin(user.value) : false))
  const isCaptain = computed(() => (user.value ? checkIsCaptain(user.value) : false))
  const canAccessAdmin = computed(() => isAdmin.value)
  const currentTeam = computed(() => user.value?.team ?? null)

  const fetchProfile = async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error || !data) return null
    return data as unknown as Profile
  }

  /**
   * Restores the session from Supabase Auth's local storage (a fast local token read), then
   * fetches the matching profile. Never trusts anything about role/team from client storage —
   * see spec.md §4 and improvements.md P0 #5.
   */
  const restoreSession = async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getSession()
      const authUser = data.session?.user
      if (!authUser) return false

      const profile = await fetchProfile(authUser.id)
      if (!profile) return false

      user.value = profile
      isAuthenticated.value = true
      return true
    } catch {
      return false
    }
  }

  /**
   * Runs restoreSession() exactly once, memoized, so App.vue's loading gate and the router
   * guard can both await the same in-flight restore instead of racing two separate calls
   * (spec.md — replaces the sessionStorage `stores_initialized` hack).
   */
  const ensureAuthReady = (): Promise<void> => {
    if (!authReadyPromise) {
      authReadyPromise = restoreSession().then(
        () => {
          authReady.value = true
        },
        () => {
          authReady.value = true
        },
      )
    }
    return authReadyPromise
  }

  const login = async (name: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail(name),
        password,
      })

      if (error || !data.user) {
        return { success: false, error: 'Identifiants invalides' }
      }

      const profile = await fetchProfile(data.user.id)
      if (!profile) {
        return { success: false, error: 'Profil introuvable' }
      }

      user.value = profile
      isAuthenticated.value = true
      return { success: true, user: profile }
    } catch {
      return { success: false, error: 'Échec de la connexion' }
    }
  }

  const register = async (name: string, password: string) => {
    const validation = validatePassword(password)
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail(name),
        password,
        options: { data: { name: name.trim() } },
      })

      if (error) {
        return { success: false, error: error.message }
      }
      if (!data.user) {
        return { success: false, error: "Échec de l'inscription" }
      }

      const profile = await fetchProfile(data.user.id)
      if (!profile) {
        return { success: false, error: 'Profil introuvable après inscription' }
      }

      user.value = profile
      isAuthenticated.value = true
      return { success: true, user: profile }
    } catch {
      return { success: false, error: "Échec de l'inscription" }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
    isAuthenticated.value = false

    import('./coaching').then(({ useCoachingStore }) => useCoachingStore().clearCache())
    import('./shows').then(({ useShowsStore }) => useShowsStore().clearCache())
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user.value) {
      return { success: false, error: 'Aucun utilisateur connecté' }
    }

    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') }
    }

    // Re-authenticate with the current password before allowing the change.
    const reauth = await supabase.auth.signInWithPassword({
      email: syntheticEmail(user.value.name),
      password: currentPassword,
    })
    if (reauth.error) {
      return { success: false, error: 'Mot de passe actuel incorrect' }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      return { success: false, error: error.message }
    }

    if (user.value.must_change_password) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.value.id)
      user.value = { ...user.value, must_change_password: false }
    }

    return { success: true }
  }

  /** Admin-only: assigns a user to a team. Team assignment is never available to captains
   * (spec.md §3) — a captain moving members between teams was the "poaching" bug this closes. */
  const assignTeam = async (userId: string, team: Team) => {
    if (!isAdmin.value) {
      return { success: false, error: 'Seuls les administrateurs peuvent assigner une équipe' }
    }

    try {
      const { error } = await supabase.from('profiles').update({ team }).eq('id', userId)
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch {
      return { success: false, error: "Échec de l'assignation" }
    }
  }

  /**
   * Admin-only: sets a user's role to member or captain, preserving an existing `admin` role
   * if present (admin is never assignable from the UI — spec.md §10.4).
   */
  const setUserRole = async (userId: string, role: 'member' | 'captain') => {
    if (!isAdmin.value) {
      return { success: false, error: 'Seuls les administrateurs peuvent modifier les rôles' }
    }

    const target = allUsers.value.find((u) => u.id === userId) ?? (await fetchProfile(userId))
    if (role === 'captain' && !target?.team) {
      return {
        success: false,
        error: "Ce membre doit d'abord être assigné à une équipe avant de devenir capitaine",
      }
    }

    const preservedAdmin = target?.roles.includes('admin') ? ['admin'] : []
    const newRoles = role === 'captain' ? ['member', 'captain', ...preservedAdmin] : ['member', ...preservedAdmin]

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ roles: newRoles })
        .eq('id', userId)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const index = allUsers.value.findIndex((u) => u.id === userId)
      if (index !== -1) {
        allUsers.value[index] = data as unknown as Profile
      }
      if (user.value?.id === userId) {
        user.value = data as unknown as Profile
      }

      return { success: true, user: data }
    } catch {
      return { success: false, error: 'Échec de la modification du rôle' }
    }
  }

  const getUsersByTeam = async (team: Team) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('team', team)
      if (error) {
        return { success: false, error: error.message, users: [] }
      }
      return { success: true, users: (data ?? []) as unknown as Profile[] }
    } catch {
      return { success: false, error: 'Échec du chargement des membres', users: [] }
    }
  }

  const getAllUsers = async () => {
    if (!isAdmin.value) {
      return { success: false, error: 'Seuls les administrateurs peuvent voir tous les utilisateurs', users: [] }
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name')
      if (error) {
        return { success: false, error: error.message, users: [] }
      }
      allUsers.value = (data ?? []) as unknown as Profile[]
      return { success: true, users: allUsers.value }
    } catch {
      return { success: false, error: 'Échec du chargement des utilisateurs', users: [] }
    }
  }

  const refreshCurrentUser = async () => {
    if (!user.value?.id) {
      return { success: false, error: 'Aucun utilisateur connecté' }
    }

    const previousTeam = user.value.team
    const profile = await fetchProfile(user.value.id)
    if (!profile) {
      return { success: false, error: 'Échec du rafraîchissement du profil' }
    }

    user.value = profile

    if (previousTeam !== profile.team) {
      import('./coaching').then(({ useCoachingStore }) => useCoachingStore().clearCache())
      import('./shows').then(({ useShowsStore }) => useShowsStore().clearCache())
    }

    return { success: true, user: profile }
  }

  return {
    // State
    user,
    isAuthenticated,
    allUsers,
    authReady,

    // Computed
    isAdmin,
    isCaptain,
    canAccessAdmin,
    currentTeam,

    // Actions
    login,
    logout,
    register,
    changePassword,
    assignTeam,
    setUserRole,
    getUsersByTeam,
    getAllUsers,
    refreshCurrentUser,

    // Session bootstrap
    ensureAuthReady,
  }
})
