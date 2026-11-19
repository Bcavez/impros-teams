import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import { canEditPastDomsShow } from '@/lib/permissions'
import type { Team } from '@/lib/teams'
import { useUserStore } from '@/stores/user'
import {
  domsShowTeamsKey,
  domsAvailabilityKey,
  domsAssignmentsKey,
  domsCastKey,
} from '@/queries/doms'

type AttendanceStatus = 'absent' | 'present' | 'undecided'

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/**
 * Doms show mutations (spec-doms.md §3, §6). Stateless: reads go through `@/queries/doms` and the
 * shared query client. RLS and the SECURITY DEFINER RPCs are the real authorization boundary.
 */
export const useDomsShowsStore = defineStore('domsShows', () => {
  const invalidateShows = async () => {
    await queryClient.invalidateQueries({ queryKey: ['doms-shows'] })
    await queryClient.invalidateQueries({ queryKey: domsShowTeamsKey() })
    await queryClient.invalidateQueries({ queryKey: domsAvailabilityKey() })
    await queryClient.invalidateQueries({ queryKey: domsAssignmentsKey() })
  }

  const createDomsShow = async (name: string, date: string, teams: Team[]) => {
    if (!name.trim() || !date) return { success: false, error: 'Nom et date requis' }
    if (teams.length === 0) return { success: false, error: 'Sélectionnez au moins une équipe' }
    const { data, error } = await supabase.rpc('create_doms_show', { p_name: name, p_date: date, p_teams: teams })
    if (error) return { success: false, error: error.message }
    await invalidateShows()
    return { success: true, id: data as string }
  }

  const updateDomsShow = async (showId: string, name: string, date: string, teams: Team[]) => {
    if (!name.trim() || !date) return { success: false, error: 'Nom et date requis' }
    if (teams.length === 0) return { success: false, error: 'Sélectionnez au moins une équipe' }
    const { error } = await supabase.rpc('update_doms_show', {
      p_show_id: showId,
      p_name: name,
      p_date: date,
      p_teams: teams,
    })
    if (error) return { success: false, error: error.message }
    await invalidateShows()
    await queryClient.invalidateQueries({ queryKey: domsCastKey(showId) })
    return { success: true }
  }

  const deleteDomsShow = async (showId: string) => {
    const { error } = await supabase.from('doms_shows').delete().eq('id', showId)
    if (error) return { success: false, error: error.message }
    await invalidateShows()
    return { success: true }
  }

  /**
   * Upsert on the (user_id, show_id) unique key. Non-doms users are blocked on past shows
   * client-side (the RLS policy enforces the same rule server-side).
   */
  const setDomsAvailability = async (userId: string, showId: string, status: AttendanceStatus) => {
    const userStore = useUserStore()
    try {
      const { data: show, error: showError } = await supabase
        .from('doms_shows')
        .select('*')
        .eq('id', showId)
        .single()
      if (showError || !show) return { success: false, error: 'Spectacle introuvable' }

      if (userStore.user && !canEditPastDomsShow(userStore.user, show)) {
        return { success: false, error: 'Seuls les Doms peuvent modifier un spectacle passé' }
      }

      const { error } = await supabase
        .from('doms_show_availability')
        .upsert(
          { user_id: userId, show_id: showId, status, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,show_id' },
        )
        .select('*')
        .single()
      if (error) return { success: false, error: error.message }

      await queryClient.invalidateQueries({ queryKey: domsAvailabilityKey() })
      return { success: true }
    } catch (e) {
      return { success: false, error: errorMessage(e, "Échec de la mise à jour") }
    }
  }

  const assignToDomsShow = async (showId: string, userId: string) => {
    const { error } = await supabase.from('doms_show_assignments').insert({ show_id: showId, user_id: userId })
    if (error) return { success: false, error: error.message }
    await queryClient.invalidateQueries({ queryKey: domsAssignmentsKey() })
    await queryClient.invalidateQueries({ queryKey: domsCastKey(showId) })
    return { success: true }
  }

  const removeFromDomsShow = async (showId: string, userId: string) => {
    const { error } = await supabase
      .from('doms_show_assignments')
      .delete()
      .eq('show_id', showId)
      .eq('user_id', userId)
    if (error) return { success: false, error: error.message }
    await queryClient.invalidateQueries({ queryKey: domsAssignmentsKey() })
    await queryClient.invalidateQueries({ queryKey: domsCastKey(showId) })
    return { success: true }
  }

  /** Replaces a show's cast with `userIds` (diffed against `current`). */
  const saveCast = async (showId: string, current: string[], userIds: string[]) => {
    for (const id of current.filter((u) => !userIds.includes(u))) {
      const r = await removeFromDomsShow(showId, id)
      if (!r.success) return r
    }
    for (const id of userIds.filter((u) => !current.includes(u))) {
      const r = await assignToDomsShow(showId, id)
      if (!r.success) return r
    }
    return { success: true }
  }

  const clearCache = () => {
    queryClient.invalidateQueries({ queryKey: ['doms-shows'] })
    queryClient.invalidateQueries({ queryKey: domsShowTeamsKey() })
    queryClient.invalidateQueries({ queryKey: domsAvailabilityKey() })
    queryClient.invalidateQueries({ queryKey: domsAssignmentsKey() })
    queryClient.invalidateQueries({ queryKey: ['doms-members'] })
  }

  return {
    createDomsShow,
    updateDomsShow,
    deleteDomsShow,
    setDomsAvailability,
    assignToDomsShow,
    removeFromDomsShow,
    saveCast,
    clearCache,
  }
})
