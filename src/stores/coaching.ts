import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { isPastDate } from '@/lib/permissions'
import type { Team } from '@/lib/teams'
import { queryClient } from '@/lib/query-client'
import { coachingSessionsKey, attendanceRecordsKey, fetchCoachingSessions as fetchCoachingSessionsData, fetchAttendanceRecords as fetchAttendanceRecordsData } from '@/queries/coaching'
import { teamMembersKey, fetchTeamMembers } from '@/queries/profiles'

type CoachingSession = Database['public']['Tables']['coaching_sessions']['Row']
type AttendanceRow = Database['public']['Tables']['attendance_records']['Row']
type AttendanceStatus = 'absent' | 'present' | 'undecided'

export interface AttendanceRecord {
  userId: string
  userName: string
  team: Team
  sessions: { [sessionId: string]: AttendanceStatus }
}

export const useCoachingStore = defineStore('coaching', () => {
  const coachingSessions = ref<CoachingSession[]>([])
  const attendanceRecords = ref<AttendanceRow[]>([])

  // Computed properties
  const sessionsByTeam = computed(() => (team: Team) => {
    return coachingSessions.value.filter(session => session.team === team)
  })

  const attendanceBySession = computed(() => (sessionId: string) => {
    return attendanceRecords.value.filter(record => record.session_id === sessionId)
  })

  const getAttendanceForUser = computed(() => (userId: string, sessionId: string) => {
    const record = attendanceRecords.value.find(
      r => r.user_id === userId && r.session_id === sessionId
    )
    return record?.status || 'present'
  })

  /**
   * Reads go through the shared `queryClient` (spec.md Stage 3): `fetchQuery` returns cached
   * data when it's still fresh and only hits Supabase when stale or force-refreshed, replacing
   * the hand-rolled sessionStorage timestamp bookkeeping this used to carry.
   */
  const fetchCoachingSessions = async (team?: Team, forceRefresh = false) => {
    try {
      const key = coachingSessionsKey(team)
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: key, exact: true })
      }
      const data = await queryClient.fetchQuery({ queryKey: key, queryFn: () => fetchCoachingSessionsData(team) })
      coachingSessions.value = data
      return { success: true, sessions: data }
    } catch (error) {
      console.error('Error fetching coaching sessions:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch coaching sessions' }
    }
  }

  const fetchAttendanceRecords = async (_sessionId?: string, forceRefresh = false) => {
    try {
      const key = attendanceRecordsKey()
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: key, exact: true })
      }
      const data = await queryClient.fetchQuery({ queryKey: key, queryFn: fetchAttendanceRecordsData })
      attendanceRecords.value = data
      return { success: true, records: data }
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch attendance records' }
    }
  }

  const createCoachingSession = async (date: string, team: Team, coach: string, createdBy: string) => {
    try {
      const newSession = {
        date,
        team,
        coach,
        created_by: createdBy
      }

      const { data, error } = await supabase
        .from('coaching_sessions')
        .insert(newSession)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (data) {
        coachingSessions.value.unshift(data)

        // Create default "present" attendance records for all team members
        try {
          const teamMembers = await queryClient.fetchQuery({
            queryKey: teamMembersKey(team),
            queryFn: () => fetchTeamMembers(team),
          })

          if (teamMembers.length > 0) {
            const newAttendanceRecords = teamMembers.map(member => ({
              user_id: member.id,
              session_id: data.id,
              status: 'present' as const
            }))

            const { data: attendanceData, error: attendanceError } = await supabase
              .from('attendance_records')
              .insert(newAttendanceRecords)
              .select('*')

            if (!attendanceError && attendanceData) {
              attendanceRecords.value.push(...attendanceData)
            }
          }
        } catch (attendanceError) {
          console.error('Failed to create default attendance records:', attendanceError)
          // Don't fail the whole operation if attendance records fail
        }

        await queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] })
        await queryClient.invalidateQueries({ queryKey: attendanceRecordsKey() })

        return { success: true, session: data }
      }

      return { success: false, error: 'Failed to create session' }
    } catch {
      return { success: false, error: 'Failed to create session' }
    }
  }

  /**
   * Real upsert on the (user_id, session_id) unique key (improvements.md #12) — two concurrent
   * first-time updates for the same pair both succeed instead of racing a find-then-insert.
   *
   * Past-event lock (spec.md §7.2, improvements.md #7): the caller-supplied role is a UX hint
   * only, never trusted as an override by default — if it isn't exactly 'captain', a past
   * session is locked, regardless of whether the argument was even supplied.
   */
  const updateAttendance = async (
    userId: string,
    sessionId: string,
    status: AttendanceStatus,
    currentUserRole?: string,
  ) => {
    try {
      const session = coachingSessions.value.find((s) => s.id === sessionId)
      if (session && isPastDate(session.date) && currentUserRole !== 'captain') {
        return { success: false, error: "Seuls les capitaines peuvent modifier une séance passée" }
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(
          { user_id: userId, session_id: sessionId, status, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,session_id' },
        )
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const index = attendanceRecords.value.findIndex((r) => r.user_id === userId && r.session_id === sessionId)
      if (index !== -1) {
        attendanceRecords.value[index] = data
      } else if (data) {
        attendanceRecords.value.push(data)
      }

      await queryClient.invalidateQueries({ queryKey: attendanceRecordsKey() })

      return { success: true }
    } catch {
      return { success: false, error: "Échec de la mise à jour de la présence" }
    }
  }

  const updateCoachingSession = async (sessionId: string, coach: string) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .update({ coach })
        .eq('id', sessionId)
        .select('*')

      if (error) {
        console.error('Update coaching session error:', error)
        return { success: false, error: error.message }
      }

      if (data && data.length > 0) {
        const updatedSession = data[0]
        const index = coachingSessions.value.findIndex(s => s.id === sessionId)
        if (index !== -1) {
          coachingSessions.value[index] = updatedSession
        }
        await queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] })
        return { success: true, session: updatedSession }
      }

      return { success: false, error: 'No coaching session found with that ID' }
    } catch (error) {
      console.error('Update coaching session error:', error)
      return { success: false, error: 'Failed to update session' }
    }
  }

  const deleteCoachingSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('coaching_sessions')
        .delete()
        .eq('id', sessionId)
        .select('*')

      if (error) {
        console.error('Delete coaching session error:', error)
        return { success: false, error: error.message }
      }

      coachingSessions.value = coachingSessions.value.filter(s => s.id !== sessionId)
      attendanceRecords.value = attendanceRecords.value.filter(r => r.session_id !== sessionId)

      await queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] })
      await queryClient.invalidateQueries({ queryKey: attendanceRecordsKey() })

      return { success: true }
    } catch (error) {
      console.error('Delete coaching session error:', error)
      return { success: false, error: 'Failed to delete session' }
    }
  }

  /**
   * Matrix derivation over the store's already-fetched sessions/attendance, with team members
   * sourced from the shared query cache (`fetchQuery`) instead of a bespoke local cache —
   * `data` (spec.md Stage 3), which is what makes the previous staleness bug structurally
   * impossible: there is exactly one cache for team members, shared by every consumer.
   */
  const getAttendanceMatrix = async (team: Team) => {
    try {
      const teamSessions = coachingSessions.value
        .filter(session => session.team === team)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const sessionIds = teamSessions.map(s => s.id)

      const teamAttendance = attendanceRecords.value.filter(record =>
        sessionIds.includes(record.session_id)
      )

      const teamMembers = await queryClient.fetchQuery({
        queryKey: teamMembersKey(team),
        queryFn: () => fetchTeamMembers(team),
      })

      const matrix = teamMembers.map(user => {
        const userSessions = teamSessions.map(session => {
          const record = teamAttendance.find(a => a.user_id === user.id && a.session_id === session.id)
          return {
            sessionId: session.id,
            date: session.date,
            status: record?.status || 'present'
          }
        })

        return {
          userId: user.id,
          userName: user.name,
          team: user.team,
          sessions: userSessions
        }
      })

      return { success: true, matrix }
    } catch {
      return { success: false, error: 'Failed to build attendance matrix', matrix: [] }
    }
  }

  const refreshData = async () => {
    try {
      await Promise.all([
        fetchCoachingSessions(undefined, true),
        fetchAttendanceRecords(undefined, true)
      ])
      return { success: true }
    } catch (error) {
      console.error('Error refreshing coaching data:', error)
      return { success: false, error: 'Failed to refresh data' }
    }
  }

  const clearCache = () => {
    queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] })
    queryClient.invalidateQueries({ queryKey: attendanceRecordsKey() })
    queryClient.invalidateQueries({ queryKey: ['team-members'] })
  }

  return {
    // State
    coachingSessions,
    attendanceRecords,

    // Computed
    sessionsByTeam,
    attendanceBySession,
    getAttendanceForUser,

    // Actions
    fetchCoachingSessions,
    fetchAttendanceRecords,
    createCoachingSession,
    updateCoachingSession,
    updateAttendance,
    deleteCoachingSession,
    refreshData,
    clearCache,
    getAttendanceMatrix
  }
})
