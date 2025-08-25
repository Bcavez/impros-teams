import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type CoachingSession = Database['public']['Tables']['coaching_sessions']['Row']
type AttendanceStatus = Database['public']['Tables']['attendance_records']['Row']

export interface AttendanceRecord {
  userId: string
  userName: string
  team: 'Samurai' | 'Gladiator' | 'Viking'
  sessions: { [sessionId: string]: 'absent' | 'present' | 'undecided' }
}

export const useCoachingStore = defineStore('coaching', () => {
  const coachingSessions = ref<CoachingSession[]>([])
  const attendanceRecords = ref<AttendanceStatus[]>([])

  // Computed properties
  const sessionsByTeam = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    return coachingSessions.value.filter(session => session.team === team)
  })

  const attendanceBySession = computed(() => (sessionId: string) => {
    return attendanceRecords.value.filter(record => record.session_id === sessionId)
  })

  const getAttendanceForUser = computed(() => (userId: string, sessionId: string) => {
    const record = attendanceRecords.value.find(
      r => r.user_id === userId && r.session_id === sessionId
    )
    return record?.status || 'absent'
  })

  // Actions
  const fetchCoachingSessions = async (team?: 'Samurai' | 'Gladiator' | 'Viking') => {
    try {
      let query = supabase
        .from('coaching_sessions')
        .select('*')
        .order('date', { ascending: false })

      if (team) {
        query = query.eq('team', team)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching coaching sessions:', error)
        return { success: false, error: error.message }
      }

      coachingSessions.value = data || []
      return { success: true, sessions: data || [] }
    } catch (error) {
      console.error('Error fetching coaching sessions:', error)
      return { success: false, error: 'Failed to fetch coaching sessions' }
    }
  }

  const fetchAttendanceRecords = async (sessionId?: string) => {
    try {
      let query = supabase
        .from('attendance_records')
        .select('*')

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching attendance records:', error)
        return { success: false, error: error.message }
      }

      attendanceRecords.value = data || []
      return { success: true, records: data || [] }
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      return { success: false, error: 'Failed to fetch attendance records' }
    }
  }

  const createCoachingSession = async (date: string, team: 'Samurai' | 'Gladiator' | 'Viking', coach: string, createdBy: string) => {
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
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (data) {
        coachingSessions.value.unshift(data)
        return { success: true, session: data }
      }

      return { success: false, error: 'Failed to create session' }
    } catch (error) {
      return { success: false, error: 'Failed to create session' }
    }
  }

  const updateAttendance = async (userId: string, sessionId: string, status: 'absent' | 'present' | 'undecided') => {
    try {
      const existingRecord = attendanceRecords.value.find(
        r => r.user_id === userId && r.session_id === sessionId
      )

      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('attendance_records')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existingRecord.id)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        if (data) {
          const index = attendanceRecords.value.findIndex(r => r.id === existingRecord.id)
          if (index !== -1) {
            attendanceRecords.value[index] = data
          }
          return { success: true }
        }
      } else {
        // Create new record
        const newRecord = {
          user_id: userId,
          session_id: sessionId,
          status
        }

        const { data, error } = await supabase
          .from('attendance_records')
          .insert(newRecord)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        if (data) {
          attendanceRecords.value.push(data)
          return { success: true }
        }
      }

      return { success: false, error: 'Failed to update attendance' }
    } catch (error) {
      return { success: false, error: 'Failed to update attendance' }
    }
  }

  const deleteCoachingSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('coaching_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Remove from local state
      coachingSessions.value = coachingSessions.value.filter(s => s.id !== sessionId)
      attendanceRecords.value = attendanceRecords.value.filter(r => r.session_id !== sessionId)

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to delete session' }
    }
  }

  const getAttendanceMatrix = computed(() => async (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    try {
      // Fetch team members
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, team')
        .eq('team', team)

      if (usersError) {
        return { success: false, error: usersError.message, matrix: [] }
      }

      // Fetch team sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('team', team)
        .order('date')

      if (sessionsError) {
        return { success: false, error: sessionsError.message, matrix: [] }
      }

      // Fetch attendance records for this team
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .in('session_id', sessions.map(s => s.id))

      if (attendanceError) {
        return { success: false, error: attendanceError.message, matrix: [] }
      }

      // Build matrix
      const matrix = users.map(user => {
        const userSessions = sessions.map(session => {
          const record = attendance.find(a => a.user_id === user.id && a.session_id === session.id)
          return {
            sessionId: session.id,
            date: session.date,
            status: record?.status || 'absent'
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
    } catch (error) {
      return { success: false, error: 'Failed to build attendance matrix', matrix: [] }
    }
  })

  // Initialize store
  const initializeStore = async () => {
    await fetchCoachingSessions()
    await fetchAttendanceRecords()
  }

  return {
    // State
    coachingSessions,
    attendanceRecords,
    
    // Computed
    sessionsByTeam,
    attendanceBySession,
    getAttendanceForUser,
    getAttendanceMatrix,
    
    // Actions
    fetchCoachingSessions,
    fetchAttendanceRecords,
    createCoachingSession,
    updateAttendance,
    deleteCoachingSession,
    initializeStore
  }
}) 