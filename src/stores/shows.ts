import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Show {
  id: string
  name: string
  createdBy: string
  createdAt: string
  team: 'Samurai' | 'Gladiator' | 'Viking'
}

export interface ShowDate {
  id: string
  showId: string
  date: string
  assignedMembers: string[]
  maxMembers: number
  createdBy: string
  createdAt: string
}

export interface ShowAvailability {
  userId: string
  showDateId: string
  status: 'absent' | 'present' | 'undecided'
  updatedAt: string
}

export const useShowsStore = defineStore('shows', () => {
  const shows = ref<Show[]>([])
  const showDates = ref<ShowDate[]>([])
  const availabilityRecords = ref<ShowAvailability[]>([])

  // Mock data for demo
  const mockShows: Show[] = [
    {
      id: '1',
      name: 'Winter Performance',
      createdBy: '2',
      createdAt: '2024-01-01T10:00:00Z',
      team: 'Samurai'
    },
    {
      id: '2',
      name: 'Spring Festival',
      createdBy: '3',
      createdAt: '2024-01-05T10:00:00Z',
      team: 'Gladiator'
    },
    {
      id: '3',
      name: 'Summer Spectacular',
      createdBy: '2',
      createdAt: '2024-01-15T10:00:00Z',
      team: 'Samurai'
    },
    {
      id: '4',
      name: 'Autumn Showcase',
      createdBy: '3',
      createdAt: '2024-01-20T10:00:00Z',
      team: 'Gladiator'
    },
    {
      id: '5',
      name: 'Viking Conquest',
      createdBy: '4',
      createdAt: '2024-01-25T10:00:00Z',
      team: 'Viking'
    },
    {
      id: '6',
      name: 'Holiday Special',
      createdBy: '2',
      createdAt: '2024-02-01T10:00:00Z',
      team: 'Samurai'
    }
  ]

  const mockShowDates: ShowDate[] = [
    {
      id: '1',
      showId: '1',
      date: '2025-02-15',
      assignedMembers: ['5', '6'],
      maxMembers: 5,
      createdBy: '2',
      createdAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '2',
      showId: '2',
      date: '2025-03-20',
      assignedMembers: ['7'],
      maxMembers: 5,
      createdBy: '3',
      createdAt: '2024-01-12T10:00:00Z'
    },
    {
      id: '3',
      showId: '3',
      date: '2025-06-15',
      assignedMembers: ['5'],
      maxMembers: 5,
      createdBy: '2',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '4',
      showId: '4',
      date: '2025-09-10',
      assignedMembers: ['7'],
      maxMembers: 5,
      createdBy: '3',
      createdAt: '2024-01-20T10:00:00Z'
    },
    {
      id: '5',
      showId: '5',
      date: '2025-07-04',
      assignedMembers: ['8'],
      maxMembers: 5,
      createdBy: '4',
      createdAt: '2024-01-25T10:00:00Z'
    },
    {
      id: '6',
      showId: '6',
      date: '2025-12-20',
      assignedMembers: ['5', '6'],
      maxMembers: 5,
      createdBy: '2',
      createdAt: '2024-02-01T10:00:00Z'
    },
    {
      id: '7',
      showId: '1',
      date: '2024-12-15',
      assignedMembers: ['5', '6'],
      maxMembers: 5,
      createdBy: '2',
      createdAt: '2024-11-10T10:00:00Z'
    },
    {
      id: '8',
      showId: '2',
      date: '2024-11-20',
      assignedMembers: ['7'],
      maxMembers: 5,
      createdBy: '3',
      createdAt: '2024-10-12T10:00:00Z'
    }
  ]

  const mockAvailability: ShowAvailability[] = [
    {
      userId: '5',
      showDateId: '1',
      status: 'present',
      updatedAt: '2024-01-14T15:30:00Z'
    },
    {
      userId: '6',
      showDateId: '1',
      status: 'undecided',
      updatedAt: '2024-01-13T09:15:00Z'
    },
    {
      userId: '7',
      showDateId: '2',
      status: 'present',
      updatedAt: '2024-01-16T14:20:00Z'
    },
    {
      userId: '5',
      showDateId: '3',
      status: 'absent',
      updatedAt: '2024-01-18T11:45:00Z'
    },
    {
      userId: '7',
      showDateId: '4',
      status: 'undecided',
      updatedAt: '2024-01-22T16:30:00Z'
    },
    {
      userId: '8',
      showDateId: '5',
      status: 'present',
      updatedAt: '2024-01-26T13:15:00Z'
    },
    {
      userId: '5',
      showDateId: '6',
      status: 'present',
      updatedAt: '2024-02-03T10:00:00Z'
    },
    {
      userId: '6',
      showDateId: '6',
      status: 'undecided',
      updatedAt: '2024-02-03T10:30:00Z'
    },
    {
      userId: '5',
      showDateId: '7',
      status: 'present',
      updatedAt: '2024-12-14T15:30:00Z'
    },
    {
      userId: '6',
      showDateId: '7',
      status: 'present',
      updatedAt: '2024-12-14T16:00:00Z'
    },
    {
      userId: '7',
      showDateId: '8',
      status: 'absent',
      updatedAt: '2024-11-19T14:20:00Z'
    }
  ]

  // Initialize with mock data
  shows.value = mockShows
  showDates.value = mockShowDates
  availabilityRecords.value = mockAvailability

  // Computed properties
  const showsByTeam = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    return shows.value.filter(show => show.team === team)
  })

  const datesByShow = computed(() => (showId: string) => {
    return showDates.value.filter(date => date.showId === showId)
  })

  const getAvailabilityForUser = computed(() => (userId: string, showDateId: string) => {
    const record = availabilityRecords.value.find(
      r => r.userId === userId && r.showDateId === showDateId
    )
    return record?.status || 'absent'
  })

  const getShowById = computed(() => (showId: string) => {
    return shows.value.find(show => show.id === showId)
  })

  const getShowDateById = computed(() => (showDateId: string) => {
    return showDates.value.find(date => date.id === showDateId)
  })

  // Actions
  const createShow = async (name: string, team: 'Samurai' | 'Gladiator' | 'Viking', createdBy: string) => {
    const newShow: Show = {
      id: Date.now().toString(),
      name,
      team,
      createdBy,
      createdAt: new Date().toISOString()
    }

    shows.value.push(newShow)
    return { success: true, show: newShow }
  }

  const createShowDate = async (showId: string, date: string, createdBy: string) => {
    const newShowDate: ShowDate = {
      id: Date.now().toString(),
      showId,
      date,
      assignedMembers: [],
      maxMembers: 5,
      createdBy,
      createdAt: new Date().toISOString()
    }

    showDates.value.push(newShowDate)
    return { success: true, showDate: newShowDate }
  }

  const assignMemberToShow = async (showDateId: string, userId: string) => {
    const showDate = showDates.value.find(d => d.id === showDateId)
    if (!showDate) {
      return { success: false, error: 'Show date not found' }
    }

    if (showDate.assignedMembers.length >= showDate.maxMembers) {
      return { success: false, error: 'Maximum members already assigned' }
    }

    if (!showDate.assignedMembers.includes(userId)) {
      showDate.assignedMembers.push(userId)
    }

    return { success: true }
  }

  const removeMemberFromShow = async (showDateId: string, userId: string) => {
    const showDate = showDates.value.find(d => d.id === showDateId)
    if (!showDate) {
      return { success: false, error: 'Show date not found' }
    }

    const index = showDate.assignedMembers.indexOf(userId)
    if (index !== -1) {
      showDate.assignedMembers.splice(index, 1)
    }

    return { success: true }
  }

  const updateAvailability = async (userId: string, showDateId: string, status: 'absent' | 'present' | 'undecided') => {
    const existingRecord = availabilityRecords.value.find(
      r => r.userId === userId && r.showDateId === showDateId
    )

    if (existingRecord) {
      existingRecord.status = status
      existingRecord.updatedAt = new Date().toISOString()
    } else {
      const newRecord: ShowAvailability = {
        userId,
        showDateId,
        status,
        updatedAt: new Date().toISOString()
      }
      availabilityRecords.value.push(newRecord)
    }

    return { success: true }
  }

  const deleteShow = async (showId: string) => {
    const index = shows.value.findIndex(s => s.id === showId)
    if (index !== -1) {
      shows.value.splice(index, 1)
      // Also remove show dates and availability records
      showDates.value = showDates.value.filter(d => d.showId !== showId)
      availabilityRecords.value = availabilityRecords.value.filter(r => {
        const showDate = showDates.value.find(d => d.id === r.showDateId)
        return showDate && showDate.showId !== showId
      })
      return { success: true }
    }
    return { success: false, error: 'Show not found' }
  }

  const deleteShowDate = async (showDateId: string) => {
    const index = showDates.value.findIndex(d => d.id === showDateId)
    if (index !== -1) {
      showDates.value.splice(index, 1)
      // Also remove availability records
      availabilityRecords.value = availabilityRecords.value.filter(r => r.showDateId !== showDateId)
      return { success: true }
    }
    return { success: false, error: 'Show date not found' }
  }

  const updateShowDate = async (showDateId: string, date: string, updatedBy: string) => {
    const showDate = showDates.value.find(d => d.id === showDateId)
    if (!showDate) {
      return { success: false, error: 'Show date not found' }
    }

    showDate.date = date
    showDate.maxMembers = 5

    return { success: true, showDate }
  }

  const getAvailabilityMatrix = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    const teamShows = showsByTeam.value(team)
    const teamShowDates = showDates.value.filter(date => {
      const show = shows.value.find(s => s.id === date.showId)
      return show && show.team === team
    })
    
    const teamMembers = [
      { id: '5', name: 'Samurai Member', team: 'Samurai' },
      { id: '6', name: 'Samurai Member 2', team: 'Samurai' },
      { id: '7', name: 'Gladiator Member', team: 'Gladiator' },
      { id: '8', name: 'Viking Member', team: 'Viking' }
    ].filter(member => member.team === team)

    return teamMembers.map(member => {
      const showDates = teamShowDates.map(showDate => ({
        showDateId: showDate.id,
        showId: showDate.showId,
        showName: shows.value.find(s => s.id === showDate.showId)?.name || 'Unknown Show',
        date: showDate.date,
        status: getAvailabilityForUser.value(member.id, showDate.id)
      }))

      return {
        userId: member.id,
        userName: member.name,
        team: member.team,
        showDates
      }
    })
  })

  return {
    // State
    shows,
    showDates,
    availabilityRecords,
    
    // Computed
    showsByTeam,
    datesByShow,
    getAvailabilityForUser,
    getShowById,
    getShowDateById,
    getAvailabilityMatrix,
    
    // Actions
    createShow,
    createShowDate,
    assignMemberToShow,
    removeMemberFromShow,
    updateAvailability,
    deleteShow,
    deleteShowDate,
    updateShowDate
  }
}) 