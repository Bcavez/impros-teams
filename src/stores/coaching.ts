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
  
  // Separate cache timestamps for each data type - use sessionStorage for persistence
  const getCacheTimestamp = (key: string) => {
    const stored = sessionStorage.getItem(`coaching_cache_${key}`)
    return stored ? parseInt(stored) : Date.now() - 6 * 60 * 1000 // Start expired if no cache
  }
  
  const setCacheTimestamp = (key: string, timestamp: number) => {
    sessionStorage.setItem(`coaching_cache_${key}`, timestamp.toString())
  }
  
  const sessionsLastFetchTime = ref<number>(getCacheTimestamp('sessions'))
  const attendanceLastFetchTime = ref<number>(getCacheTimestamp('attendance'))
  const cacheDuration = 5 * 60 * 1000 // 5 minutes in milliseconds
  


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
    return record?.status || 'present'
  })

  // Actions
  const fetchCoachingSessions = async (team?: 'Samurai' | 'Gladiator' | 'Viking', forceRefresh = false) => {
    const timeSinceLastFetch = Date.now() - sessionsLastFetchTime.value
    
    // Check cache if not forcing refresh
    if (!forceRefresh && timeSinceLastFetch < cacheDuration) {
      return { success: true, sessions: coachingSessions.value, cached: true }
    }

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
      const timestamp = Date.now()
      sessionsLastFetchTime.value = timestamp
      setCacheTimestamp('sessions', timestamp)
      return { success: true, sessions: data || [] }
    } catch (error) {
      console.error('Error fetching coaching sessions:', error)
      return { success: false, error: 'Failed to fetch coaching sessions' }
    }
  }

  const fetchAttendanceRecords = async (sessionId?: string, forceRefresh = false) => {
    const timeSinceLastFetch = Date.now() - attendanceLastFetchTime.value
    
    // Check cache if not forcing refresh
    if (!forceRefresh && timeSinceLastFetch < cacheDuration) {
      return { success: true, records: attendanceRecords.value, cached: true }
    }

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
      const timestamp = Date.now()
      attendanceLastFetchTime.value = timestamp
      setCacheTimestamp('attendance', timestamp)
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
        
        // Create default "undecided" attendance records for all team members
        try {
          // Get all team members
          const { useUserStore } = await import('./user')
          const userStore = useUserStore()
          const teamMembersResult = await userStore.getUsersByTeam(team)
          
          if (teamMembersResult.success && teamMembersResult.users) {
            // Create attendance records for each team member
            const newAttendanceRecords = teamMembersResult.users.map(member => ({
              user_id: member.id,
              session_id: data.id,
              status: 'present'
            }))

            // Insert all attendance records
            const { data: attendanceData, error: attendanceError } = await supabase
              .from('attendance_records')
              .insert(newAttendanceRecords)
              .select()

            if (!attendanceError && attendanceData) {
              // Add to local state
              attendanceRecords.value.push(...attendanceData)
            }
          }
        } catch (attendanceError) {
          console.error('Failed to create default attendance records:', attendanceError)
          // Don't fail the whole operation if attendance records fail
        }
        
        return { success: true, session: data }
      }

      return { success: false, error: 'Failed to create session' }
    } catch (error) {
      return { success: false, error: 'Failed to create session' }
    }
  }

  const updateAttendance = async (userId: string, sessionId: string, status: 'absent' | 'present' | 'undecided', currentUserRole?: string) => {
    try {
      // Check if the session is in the past and user is not a captain/admin
      const session = coachingSessions.value.find(s => s.id === sessionId)
      if (session) {
        const sessionDate = new Date(session.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // If session is before today (yesterday or earlier) and user is not captain/admin, deny update
        if (sessionDate < today && currentUserRole && !['captain', 'admin'].includes(currentUserRole)) {
          return { success: false, error: 'Only captains can update attendance for past coaching sessions' }
        }
      }

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

  const updateCoachingSession = async (sessionId: string, coach: string) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .update({ coach })
        .eq('id', sessionId)
        .select()

      if (error) {
        console.error('Update coaching session error:', error)
        return { success: false, error: error.message }
      }

      if (data && data.length > 0) {
        // Update local state
        const updatedSession = data[0]
        const index = coachingSessions.value.findIndex(s => s.id === sessionId)
        if (index !== -1) {
          coachingSessions.value[index] = updatedSession
        }
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
      const { data, error } = await supabase
        .from('coaching_sessions')
        .delete()
        .eq('id', sessionId)
        .select()

      if (error) {
        console.error('Delete coaching session error:', error)
        return { success: false, error: error.message }
      }

      // Remove from local state
      coachingSessions.value = coachingSessions.value.filter(s => s.id !== sessionId)
      attendanceRecords.value = attendanceRecords.value.filter(r => r.session_id !== sessionId)

      return { success: true }
    } catch (error) {
      console.error('Delete coaching session error:', error)
      return { success: false, error: 'Failed to delete session' }
    }
  }

  // Cache for team members
  const teamMembersCache = ref<{ [team: string]: { users: any[], timestamp: number } }>({})
  const teamMembersCacheDuration = 5 * 60 * 1000 // 5 minutes

  const getAttendanceMatrix = async (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    try {
      // Use cached data from the store instead of making new database calls
      const teamSessions = coachingSessions.value
        .filter(session => session.team === team)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date, oldest first
      
      const sessionIds = teamSessions.map(s => s.id)
      
      const teamAttendance = attendanceRecords.value.filter(record => 
        sessionIds.includes(record.session_id)
      )
      
      // Check if we have cached team members
      let teamMembers = teamMembersCache.value[team]?.users || []
      const teamMembersAge = teamMembersCache.value[team] ? 
        Date.now() - teamMembersCache.value[team].timestamp : Infinity
      
      // If no cached data or cache expired, fetch team members
      if (teamMembers.length === 0 || teamMembersAge > teamMembersCacheDuration) {
        const { useUserStore } = await import('./user')
        const userStore = useUserStore()
        
        const teamMembersResult = await userStore.getUsersByTeam(team)
        if (!teamMembersResult.success) {
          return { success: false, error: teamMembersResult.error, matrix: [] }
        }
        
        teamMembers = teamMembersResult.users
        
        // Cache the team members
        teamMembersCache.value[team] = {
          users: teamMembers,
          timestamp: Date.now()
        }
      }

      // Build matrix using cached data
      const matrix = teamMembers.map(user => {
        const userSessions = teamSessions.map(session => {
          const record = teamAttendance.find(a => a.user_id === user.id && a.session_id === session.id)
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
  }

  // Initialize store - only update timestamps, don't fetch data
  const initializeStore = async () => {
    // Update cache timestamps from sessionStorage
    sessionsLastFetchTime.value = getCacheTimestamp('sessions')
    attendanceLastFetchTime.value = getCacheTimestamp('attendance')
    
    // Don't fetch data automatically - let views request it when needed
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
    sessionStorage.removeItem('coaching_cache_sessions')
    sessionStorage.removeItem('coaching_cache_attendance')
    sessionsLastFetchTime.value = Date.now() - 6 * 60 * 1000
    attendanceLastFetchTime.value = Date.now() - 6 * 60 * 1000
    teamMembersCache.value = {} // Clear team members cache
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
    initializeStore,
    refreshData,
    clearCache,
    getAttendanceMatrix
  }
}) 