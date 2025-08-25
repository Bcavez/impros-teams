import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { format, parseISO } from 'date-fns'

export interface CoachingSession {
  id: string
  date: string
  team: 'Samurai' | 'Gladiator' | 'Viking'
  coach: string
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
      date: '2025-01-15',
      team: 'Samurai',
      coach: 'Coach Sarah',
      createdBy: '2',
      createdAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '2',
      date: '2025-01-20',
      team: 'Samurai',
      coach: 'Coach Mike',
      createdBy: '2',
      createdAt: '2024-01-12T10:00:00Z'
    },
    {
      id: '3',
      date: '2025-01-18',
      team: 'Gladiator',
      coach: 'Coach Alex',
      createdBy: '3',
      createdAt: '2024-01-11T10:00:00Z'
    },
    {
      id: '4',
      date: '2025-02-05',
      team: 'Samurai',
      coach: 'Coach Sarah',
      createdBy: '2',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '5',
      date: '2025-02-12',
      team: 'Gladiator',
      coach: 'Coach Alex',
      createdBy: '3',
      createdAt: '2024-01-18T10:00:00Z'
    },
    {
      id: '6',
      date: '2025-02-20',
      team: 'Viking',
      coach: 'Coach Erik',
      createdBy: '4',
      createdAt: '2024-01-20T10:00:00Z'
    },
    {
      id: '7',
      date: '2025-03-01',
      team: 'Samurai',
      coach: 'Coach Mike',
      createdBy: '2',
      createdAt: '2024-01-25T10:00:00Z'
    },
    {
      id: '8',
      date: '2025-03-08',
      team: 'Gladiator',
      coach: 'Coach Alex',
      createdBy: '3',
      createdAt: '2024-01-28T10:00:00Z'
    },
    {
      id: '9',
      date: '2025-03-15',
      team: 'Viking',
      coach: 'Coach Erik',
      createdBy: '4',
      createdAt: '2024-02-01T10:00:00Z'
    },
    {
      id: '10',
      date: '2025-04-05',
      team: 'Samurai',
      coach: 'Coach Sarah',
      createdBy: '2',
      createdAt: '2024-02-05T10:00:00Z'
    },
    {
      id: '11',
      date: '2024-12-10',
      team: 'Samurai',
      coach: 'Coach Sarah',
      createdBy: '2',
      createdAt: '2024-11-01T10:00:00Z'
    },
    {
      id: '12',
      date: '2024-11-25',
      team: 'Gladiator',
      coach: 'Coach Alex',
      createdBy: '3',
      createdAt: '2024-10-15T10:00:00Z'
    },
    {
      id: '13',
      date: '2024-12-05',
      team: 'Viking',
      coach: 'Coach Erik',
      createdBy: '4',
      createdAt: '2024-11-20T10:00:00Z'
    },
    {
      id: '14',
      date: '2025-05-10',
      team: 'Samurai',
      coach: 'Coach Sarah',
      createdBy: '2',
      createdAt: '2024-12-01T10:00:00Z'
    },
    {
      id: '15',
      date: '2025-05-15',
      team: 'Gladiator',
      coach: 'Coach Alex',
      createdBy: '3',
      createdAt: '2024-12-05T10:00:00Z'
    },
    {
      id: '16',
      date: '2025-05-22',
      team: 'Viking',
      coach: 'Coach Erik',
      createdBy: '4',
      createdAt: '2024-12-10T10:00:00Z'
    },
    {
      id: '17',
      date: '2025-06-03',
      team: 'Samurai',
      coach: 'Coach Mike',
      createdBy: '2',
      createdAt: '2024-12-15T10:00:00Z'
    },
    {
      id: '18',
      date: '2025-06-10',
      team: 'Gladiator',
      coach: 'Coach Alex',
      createdBy: '3',
      createdAt: '2024-12-20T10:00:00Z'
    },
    {
      id: '19',
      date: '2025-06-17',
      team: 'Viking',
      coach: 'Coach Erik',
      createdBy: '4',
      createdAt: '2024-12-25T10:00:00Z'
    },
    {
      id: '20',
      date: '2025-07-01',
      team: 'Samurai',
      coach: 'Coach Sarah',
      createdBy: '2',
      createdAt: '2024-12-30T10:00:00Z'
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
    },
    {
      userId: '6',
      sessionId: '1',
      status: 'present',
      updatedAt: '2024-01-14T16:00:00Z'
    },
    {
      userId: '6',
      sessionId: '2',
      status: 'absent',
      updatedAt: '2024-01-19T10:30:00Z'
    },
    {
      userId: '7',
      sessionId: '3',
      status: 'present',
      updatedAt: '2024-01-17T14:20:00Z'
    },
    {
      userId: '7',
      sessionId: '5',
      status: 'undecided',
      updatedAt: '2024-01-22T11:45:00Z'
    },
    {
      userId: '8',
      sessionId: '6',
      status: 'present',
      updatedAt: '2024-01-25T13:15:00Z'
    },
    {
      userId: '8',
      sessionId: '9',
      status: 'undecided',
      updatedAt: '2024-02-03T09:30:00Z'
    },
    {
      userId: '5',
      sessionId: '4',
      status: 'present',
      updatedAt: '2024-02-04T15:00:00Z'
    },
    {
      userId: '5',
      sessionId: '7',
      status: 'undecided',
      updatedAt: '2024-02-28T12:00:00Z'
    },
    {
      userId: '5',
      sessionId: '10',
      status: 'absent',
      updatedAt: '2024-03-30T10:00:00Z'
    },
    {
      userId: '5',
      sessionId: '11',
      status: 'present',
      updatedAt: '2024-12-09T15:30:00Z'
    },
    {
      userId: '6',
      sessionId: '11',
      status: 'present',
      updatedAt: '2024-12-09T16:00:00Z'
    },
    {
      userId: '7',
      sessionId: '12',
      status: 'absent',
      updatedAt: '2024-11-24T14:20:00Z'
    },
    {
      userId: '8',
      sessionId: '13',
      status: 'present',
      updatedAt: '2024-12-04T13:15:00Z'
    },
    {
      userId: '5',
      sessionId: '14',
      status: 'undecided',
      updatedAt: '2024-12-02T10:00:00Z'
    },
    {
      userId: '6',
      sessionId: '14',
      status: 'present',
      updatedAt: '2024-12-02T11:00:00Z'
    },
    {
      userId: '7',
      sessionId: '15',
      status: 'present',
      updatedAt: '2024-12-06T14:20:00Z'
    },
    {
      userId: '8',
      sessionId: '16',
      status: 'undecided',
      updatedAt: '2024-12-11T13:15:00Z'
    },
    {
      userId: '5',
      sessionId: '17',
      status: 'present',
      updatedAt: '2024-12-16T15:30:00Z'
    },
    {
      userId: '6',
      sessionId: '17',
      status: 'present',
      updatedAt: '2024-12-16T16:00:00Z'
    },
    {
      userId: '7',
      sessionId: '18',
      status: 'undecided',
      updatedAt: '2024-12-21T14:20:00Z'
    },
    {
      userId: '8',
      sessionId: '19',
      status: 'present',
      updatedAt: '2024-12-26T13:15:00Z'
    },
    {
      userId: '5',
      sessionId: '20',
      status: 'undecided',
      updatedAt: '2024-12-31T15:30:00Z'
    },
    {
      userId: '6',
      sessionId: '20',
      status: 'present',
      updatedAt: '2024-12-31T16:00:00Z'
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
  const createCoachingSession = async (date: string, team: 'Samurai' | 'Gladiator' | 'Viking', coach: string, createdBy: string) => {
    const newSession: CoachingSession = {
      id: Date.now().toString(),
      date,
      team,
      coach,
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