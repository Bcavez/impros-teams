import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { MAX_CAST_SIZE } from '@/lib/shows'
import { isPastDate } from '@/lib/permissions'
import type { Team } from '@/lib/teams'
import { queryClient } from '@/lib/query-client'
import {
  showsKey,
  showAssignmentsKey,
  showAvailabilityKey,
  fetchShows as fetchShowsData,
  fetchShowAssignments as fetchShowAssignmentsData,
  fetchShowAvailability as fetchShowAvailabilityData,
} from '@/queries/shows'
import { teamMembersKey, fetchTeamMembers } from '@/queries/profiles'

type Show = Database['public']['Tables']['shows']['Row']
type ShowAvailability = Database['public']['Tables']['show_availability']['Row']
type ShowAssignment = Database['public']['Tables']['show_assignments']['Row']
type AttendanceStatus = 'absent' | 'present' | 'undecided'

export const useShowsStore = defineStore('shows', () => {
  const shows = ref<Show[]>([])
  const availabilityRecords = ref<ShowAvailability[]>([])
  const showAssignments = ref<ShowAssignment[]>([])

  // Computed properties
  const showsByTeam = computed(() => (team: Team) => {
    return shows.value.filter((show) => show.team === team)
  })

  const getAvailabilityForUser = computed(() => (userId: string, showId: string): AttendanceStatus => {
    const record = availabilityRecords.value.find((r) => r.user_id === userId && r.show_id === showId)
    return record?.status ?? 'undecided'
  })

  const getShowById = computed(() => (showId: string) => {
    return shows.value.find((show) => show.id === showId)
  })

  const getAssignedMembers = computed(() => (showId: string) => {
    return showAssignments.value.filter((assignment) => assignment.show_id === showId).map((a) => a.user_id)
  })

  /**
   * Reads go through the shared `queryClient` (spec.md Stage 3): `fetchQuery` returns cached
   * data when still fresh and only hits Supabase when stale or force-refreshed, replacing the
   * hand-rolled sessionStorage timestamp bookkeeping this used to carry.
   */
  const fetchShows = async (team?: Team, forceRefresh = false) => {
    try {
      const key = showsKey(team)
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: key, exact: true })
      }
      const data = await queryClient.fetchQuery({ queryKey: key, queryFn: () => fetchShowsData(team) })
      shows.value = data
      return { success: true, shows: data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch shows' }
    }
  }

  const fetchShowAssignments = async (forceRefresh = false) => {
    try {
      const key = showAssignmentsKey()
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: key, exact: true })
      }
      const data = await queryClient.fetchQuery({ queryKey: key, queryFn: fetchShowAssignmentsData })
      showAssignments.value = data
      return { success: true, showAssignments: data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch show assignments' }
    }
  }

  const fetchShowAvailability = async (forceRefresh = false) => {
    try {
      const key = showAvailabilityKey()
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: key, exact: true })
      }
      const data = await queryClient.fetchQuery({ queryKey: key, queryFn: fetchShowAvailabilityData })
      availabilityRecords.value = data
      return { success: true, availabilityRecords: data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch show availability' }
    }
  }

  // Actions
  const createShow = async (name: string, team: Team, date: string, createdBy: string) => {
    const { data, error } = await supabase
      .from('shows')
      .insert({ name, team, date, max_cast: MAX_CAST_SIZE, created_by: createdBy })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    if (!data) {
      return { success: false, error: 'Failed to create show' }
    }

    shows.value.push(data)

    try {
      const teamMembers = await queryClient.fetchQuery({
        queryKey: teamMembersKey(team),
        queryFn: () => fetchTeamMembers(team),
      })

      if (teamMembers.length > 0) {
        const newAvailabilityRecords = teamMembers.map((member) => ({
          user_id: member.id,
          show_id: data.id,
          status: 'undecided' as const,
        }))

        const { data: availabilityData, error: availabilityError } = await supabase
          .from('show_availability')
          .insert(newAvailabilityRecords)
          .select('*')

        if (!availabilityError && availabilityData) {
          availabilityRecords.value.push(...availabilityData)
        }
      }
    } catch (err) {
      console.error('Failed to create default availability records:', err)
    }

    await queryClient.invalidateQueries({ queryKey: ['shows'] })
    await queryClient.invalidateQueries({ queryKey: showAvailabilityKey() })

    return { success: true, show: data }
  }

  const updateShow = async (showId: string, updates: { name?: string; date?: string }) => {
    const { data, error } = await supabase.from('shows').update(updates).eq('id', showId).select('*').single()
    if (error) {
      return { success: false, error: error.message }
    }
    if (data) {
      const index = shows.value.findIndex((s) => s.id === showId)
      if (index !== -1) shows.value[index] = data
      await queryClient.invalidateQueries({ queryKey: ['shows'] })
      return { success: true, show: data }
    }
    return { success: false, error: 'Show not found' }
  }

  const deleteShow = async (showId: string) => {
    const { error } = await supabase.from('shows').delete().eq('id', showId)
    if (error) {
      return { success: false, error: error.message }
    }

    shows.value = shows.value.filter((s) => s.id !== showId)
    showAssignments.value = showAssignments.value.filter((a) => a.show_id !== showId)
    availabilityRecords.value = availabilityRecords.value.filter((r) => r.show_id !== showId)

    await queryClient.invalidateQueries({ queryKey: ['shows'] })
    await queryClient.invalidateQueries({ queryKey: showAssignmentsKey() })
    await queryClient.invalidateQueries({ queryKey: showAvailabilityKey() })

    return { success: true }
  }

  const assignMemberToShow = async (showId: string, userId: string) => {
    const existingAssignment = showAssignments.value.find((a) => a.show_id === showId && a.user_id === userId)
    if (existingAssignment) {
      return { success: false, error: 'Membre déjà assigné' }
    }

    const show = shows.value.find((s) => s.id === showId)
    if (!show) {
      return { success: false, error: 'Spectacle introuvable' }
    }

    const currentAssignments = showAssignments.value.filter((a) => a.show_id === showId)
    if (currentAssignments.length >= show.max_cast) {
      return { success: false, error: 'Nombre maximum de membres déjà atteint' }
    }

    const { data, error } = await supabase
      .from('show_assignments')
      .insert({ show_id: showId, user_id: userId })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    if (data) {
      showAssignments.value.push(data)
      await queryClient.invalidateQueries({ queryKey: showAssignmentsKey() })
      return { success: true }
    }
    return { success: false, error: "Échec de l'assignation" }
  }

  const removeMemberFromShow = async (showId: string, userId: string) => {
    const { error } = await supabase.from('show_assignments').delete().eq('show_id', showId).eq('user_id', userId)
    if (error) {
      return { success: false, error: error.message }
    }

    const index = showAssignments.value.findIndex((a) => a.show_id === showId && a.user_id === userId)
    if (index !== -1) showAssignments.value.splice(index, 1)

    await queryClient.invalidateQueries({ queryKey: showAssignmentsKey() })

    return { success: true }
  }

  /**
   * Real upsert on the (user_id, show_id) unique key (improvements.md #12) — two concurrent
   * first-time updates for the same pair both succeed instead of racing a find-then-insert.
   * The past-event lock (spec.md §7.2) applies regardless of whether a role is supplied.
   */
  const updateAvailability = async (
    userId: string,
    showId: string,
    status: AttendanceStatus,
    currentUserRole?: string,
  ) => {
    const show = shows.value.find((s) => s.id === showId)
    if (show && isPastDate(show.date) && currentUserRole !== 'captain') {
      return { success: false, error: 'Seuls les capitaines peuvent modifier un spectacle passé' }
    }

    const { data, error } = await supabase
      .from('show_availability')
      .upsert({ user_id: userId, show_id: showId, status, updated_at: new Date().toISOString() }, { onConflict: 'user_id,show_id' })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const index = availabilityRecords.value.findIndex((r) => r.user_id === userId && r.show_id === showId)
    if (index !== -1) {
      availabilityRecords.value[index] = data
    } else if (data) {
      availabilityRecords.value.push(data)
    }

    await queryClient.invalidateQueries({ queryKey: showAvailabilityKey() })

    return { success: true }
  }

  /**
   * Matrix derivation over the store's already-fetched shows, with team members sourced from
   * the shared query cache instead of a bespoke local cache (spec.md Stage 3).
   */
  const getAvailabilityMatrix = async (team: Team) => {
    const teamShows = showsByTeam.value(team)

    const teamMembers = await queryClient.fetchQuery({
      queryKey: teamMembersKey(team),
      queryFn: () => fetchTeamMembers(team),
    })

    const matrix = teamMembers.map((member) => ({
      userId: member.id,
      userName: member.name,
      team: member.team,
      shows: teamShows.map((show) => ({
        showId: show.id,
        showName: show.name,
        date: show.date,
        status: getAvailabilityForUser.value(member.id, show.id),
      })),
    }))

    return { success: true, matrix }
  }

  const refreshData = async () => {
    try {
      await Promise.all([fetchShows(undefined, true), fetchShowAssignments(true), fetchShowAvailability(true)])
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to refresh data' }
    }
  }

  const clearCache = () => {
    queryClient.invalidateQueries({ queryKey: ['shows'] })
    queryClient.invalidateQueries({ queryKey: showAssignmentsKey() })
    queryClient.invalidateQueries({ queryKey: showAvailabilityKey() })
    queryClient.invalidateQueries({ queryKey: ['team-members'] })
  }

  return {
    // State
    shows,
    availabilityRecords,
    showAssignments,

    // Computed
    showsByTeam,
    getAvailabilityForUser,
    getShowById,
    getAssignedMembers,

    // Actions
    fetchShows,
    fetchShowAssignments,
    fetchShowAvailability,
    createShow,
    updateShow,
    deleteShow,
    assignMemberToShow,
    removeMemberFromShow,
    updateAvailability,
    refreshData,
    clearCache,
    getAvailabilityMatrix,
  }
})
