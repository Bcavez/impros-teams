import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { format, parseISO } from 'date-fns'

export interface CoachingSession {
  id: string
  date: string
  team: 'Samurai' | 'Gladiator' | 'Viking'
  createdBy: string
  createdAt: string
}

export interface AttendanceStatus {
  userId: string
  sessionId: string
  status: 'absent' | 'present' | 'undecided'
  updatedAt: string
}

export interface AttendanceRecord {
  userId: string
  userName: string
  team: 'Samurai' | 'Gladiator' | 'Viking'
  sessions: { [sessionId: string]: 'absent' | 'present' | 'undecided' }
}

export const useCoachingStore = defineStore('coaching', () => {
  const coachingSessions = ref<CoachingSession[]>([])
  const attendanceRecords = ref<AttendanceStatus[]>([])

  // Mock data for demo
  const mockSessions: CoachingSession[] = [
    {
      id: '1',
      date: '2024-01-15',
      team: 'Samurai',
      createdBy: '2',
      createdAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '2',
      date: '2024-01-20',
      team: 'Samurai',
      createdBy: '2',
      createdAt: '2024-01-12T10:00:00Z'
    },
    {
      id: '3',
      date: '2024-01-18',
      team: 'Gladiator',
      createdBy: '3',
      createdAt: '2024-01-11T10:00:00Z'
    }
  ]

  const mockAttendance: AttendanceStatus[] = [
    {
      userId: '5',
      sessionId: '1',
      status: 'present',
      updatedAt: '2024-01-14T15:30:00Z'
    },
    {
      userId: '5',
      sessionId: '2',
      status: 'undecided',
      updatedAt: '2024-01-13T09:15:00Z'
    }
  ]

  // Initialize with mock data
  coachingSessions.value = mockSessions
  attendanceRecords.value = mockAttendance

  // Computed properties
  const sessionsByTeam = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    return coachingSessions.value.filter(session => session.team === team)
  })

  const attendanceBySession = computed(() => (sessionId: string) => {
    return attendanceRecords.value.filter(record => record.sessionId === sessionId)
  })

  const getAttendanceForUser = computed(() => (userId: string, sessionId: string) => {
    const record = attendanceRecords.value.find(
      r => r.userId === userId && r.sessionId === sessionId
    )
    return record?.status || 'absent'
  })

  // Actions
  const createCoachingSession = async (date: string, team: 'Samurai' | 'Gladiator' | 'Viking', createdBy: string) => {
    const newSession: CoachingSession = {
      id: Date.now().toString(),
      date,
      team,
      createdBy,
      createdAt: new Date().toISOString()
    }

    coachingSessions.value.push(newSession)
    return { success: true, session: newSession }
  }

  const updateAttendance = async (userId: string, sessionId: string, status: 'absent' | 'present' | 'undecided') => {
    const existingRecord = attendanceRecords.value.find(
      r => r.userId === userId && r.sessionId === sessionId
    )

    if (existingRecord) {
      existingRecord.status = status
      existingRecord.updatedAt = new Date().toISOString()
    } else {
      const newRecord: AttendanceStatus = {
        userId,
        sessionId,
        status,
        updatedAt: new Date().toISOString()
      }
      attendanceRecords.value.push(newRecord)
    }

    return { success: true }
  }

  const deleteCoachingSession = async (sessionId: string) => {
    const index = coachingSessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      coachingSessions.value.splice(index, 1)
      // Also remove attendance records for this session
      attendanceRecords.value = attendanceRecords.value.filter(r => r.sessionId !== sessionId)
      return { success: true }
    }
    return { success: false, error: 'Session not found' }
  }

  const getAttendanceMatrix = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    const teamSessions = sessionsByTeam.value(team)
    const teamMembers = [
      { id: '5', name: 'Samurai Member', team: 'Samurai' },
      { id: '6', name: 'Samurai Member 2', team: 'Samurai' },
      { id: '7', name: 'Gladiator Member', team: 'Gladiator' },
      { id: '8', name: 'Viking Member', team: 'Viking' }
    ].filter(member => member.team === team)

    return teamMembers.map(member => {
      const sessions = teamSessions.map(session => ({
        sessionId: session.id,
        date: session.date,
        status: getAttendanceForUser.value(member.id, session.id)
      }))

      return {
        userId: member.id,
        userName: member.name,
        team: member.team,
        sessions
      }
    })
  })

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
    createCoachingSession,
    updateAttendance,
    deleteCoachingSession
  }
}) 