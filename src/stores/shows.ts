import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Show = Database['public']['Tables']['shows']['Row']
type ShowDate = Database['public']['Tables']['show_dates']['Row']
type ShowAvailability = Database['public']['Tables']['show_availability']['Row']
type ShowAssignment = Database['public']['Tables']['show_assignments']['Row']

export const useShowsStore = defineStore('shows', () => {
  const shows = ref<Show[]>([])
  const showDates = ref<ShowDate[]>([])
  const availabilityRecords = ref<ShowAvailability[]>([])
  const showAssignments = ref<ShowAssignment[]>([])
  
  // Separate cache timestamps for each data type - use sessionStorage for persistence
  const getCacheTimestamp = (key: string) => {
    const stored = sessionStorage.getItem(`shows_cache_${key}`)
    return stored ? parseInt(stored) : Date.now() - 6 * 60 * 1000 // Start expired if no cache
  }
  
  const setCacheTimestamp = (key: string, timestamp: number) => {
    sessionStorage.setItem(`shows_cache_${key}`, timestamp.toString())
  }
  
  const showsLastFetchTime = ref<number>(getCacheTimestamp('shows'))
  const showDatesLastFetchTime = ref<number>(getCacheTimestamp('showDates'))
  const assignmentsLastFetchTime = ref<number>(getCacheTimestamp('assignments'))
  const availabilityLastFetchTime = ref<number>(getCacheTimestamp('availability'))
  const cacheDuration = 5 * 60 * 1000 // 5 minutes in milliseconds
  


  // Initialize store - only update timestamps, don't fetch data
  const initializeStore = async () => {
    try {
      // Update cache timestamps from sessionStorage
      showsLastFetchTime.value = getCacheTimestamp('shows')
      showDatesLastFetchTime.value = getCacheTimestamp('showDates')
      assignmentsLastFetchTime.value = getCacheTimestamp('assignments')
      availabilityLastFetchTime.value = getCacheTimestamp('availability')
      
      // Don't fetch data automatically - let views request it when needed
    } catch (error) {
      console.error('Failed to initialize shows store:', error)
    }
  }

  // Fetch functions
  const fetchShows = async (forceRefresh = false) => {
    const timeSinceLastFetch = Date.now() - showsLastFetchTime.value
    
    // Check cache if not forcing refresh
    if (!forceRefresh && timeSinceLastFetch < cacheDuration) {
      return { success: true, shows: shows.value, cached: true }
    }

    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shows:', error)
      return { success: false, error: error.message }
    }

    shows.value = data || []
    const timestamp = Date.now()
    showsLastFetchTime.value = timestamp
    setCacheTimestamp('shows', timestamp)
    return { success: true, shows: data || [] }
  }

  const fetchShowDates = async (forceRefresh = false) => {
    // Check cache if not forcing refresh
    if (!forceRefresh && Date.now() - showDatesLastFetchTime.value < cacheDuration) {
      return { success: true, showDates: showDates.value, cached: true }
    }

    const { data, error } = await supabase
      .from('show_dates')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching show dates:', error)
      return { success: false, error: error.message }
    }

    showDates.value = data || []
    const timestamp = Date.now()
    showDatesLastFetchTime.value = timestamp
    setCacheTimestamp('showDates', timestamp)
    return { success: true, showDates: data || [] }
  }

  const fetchShowAssignments = async (forceRefresh = false) => {
    // Check cache if not forcing refresh
    if (!forceRefresh && Date.now() - assignmentsLastFetchTime.value < cacheDuration) {
      return { success: true, showAssignments: showAssignments.value, cached: true }
    }

    const { data, error } = await supabase
      .from('show_assignments')
      .select('*')

    if (error) {
      console.error('Error fetching show assignments:', error)
      return { success: false, error: error.message }
    }

    showAssignments.value = data || []
    const timestamp = Date.now()
    assignmentsLastFetchTime.value = timestamp
    setCacheTimestamp('assignments', timestamp)
    return { success: true, showAssignments: data || [] }
  }

  const fetchShowAvailability = async (forceRefresh = false) => {
    // Check cache if not forcing refresh
    if (!forceRefresh && Date.now() - availabilityLastFetchTime.value < cacheDuration) {
      return { success: true, availabilityRecords: availabilityRecords.value, cached: true }
    }

    const { data, error } = await supabase
      .from('show_availability')
      .select('*')

    if (error) {
      console.error('Error fetching show availability:', error)
      return { success: false, error: error.message }
    }

    availabilityRecords.value = data || []
    const timestamp = Date.now()
    availabilityLastFetchTime.value = timestamp
    setCacheTimestamp('availability', timestamp)
    return { success: true, availabilityRecords: data || [] }
  }

  // Computed properties
  const showsByTeam = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    return shows.value.filter(show => show.team === team)
  })

  const datesByShow = computed(() => (showId: string) => {
    return showDates.value.filter(date => date.show_id === showId)
  })

  const getAvailabilityForUser = computed(() => (userId: string, showDateId: string) => {
    const record = availabilityRecords.value.find(
      r => r.user_id === userId && r.show_date_id === showDateId
    )
    return record?.status || 'absent'
  })

  const getShowById = computed(() => (showId: string) => {
    return shows.value.find(show => show.id === showId)
  })

  const getShowDateById = computed(() => (showDateId: string) => {
    return showDates.value.find(date => date.id === showDateId)
  })

  // Helper function to get assigned members for a show date
  const getAssignedMembers = computed(() => (showDateId: string) => {
    return showAssignments.value
      .filter(assignment => assignment.show_date_id === showDateId)
      .map(assignment => assignment.user_id)
  })

  // Actions
  const createShow = async (name: string, team: 'Samurai' | 'Gladiator' | 'Viking', createdBy: string) => {
    const { data, error } = await supabase
      .from('shows')
      .insert({
        name,
        team,
        created_by: createdBy
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (data) {
      shows.value.unshift(data)
      return { success: true, show: data }
    }

    return { success: false, error: 'Failed to create show' }
  }

  const createShowDate = async (showId: string, date: string, createdBy: string) => {
    const { data, error } = await supabase
      .from('show_dates')
      .insert({
        show_id: showId,
        date,
        max_members: 5,
        created_by: createdBy
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (data) {
      showDates.value.push(data)
      return { success: true, showDate: data }
    }

    return { success: false, error: 'Failed to create show date' }
  }

  const assignMemberToShow = async (showDateId: string, userId: string) => {
    // Check if already assigned
    const existingAssignment = showAssignments.value.find(
      a => a.show_date_id === showDateId && a.user_id === userId
    )

    if (existingAssignment) {
      return { success: false, error: 'Member already assigned' }
    }

    // Check max members limit
    const showDate = showDates.value.find(d => d.id === showDateId)
    if (!showDate) {
      return { success: false, error: 'Show date not found' }
    }

    const currentAssignments = showAssignments.value.filter(a => a.show_date_id === showDateId)
    if (currentAssignments.length >= showDate.max_members) {
      return { success: false, error: 'Maximum members already assigned' }
    }

    const { data, error } = await supabase
      .from('show_assignments')
      .insert({
        show_date_id: showDateId,
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (data) {
      showAssignments.value.push(data)
      return { success: true }
    }

    return { success: false, error: 'Failed to assign member' }
  }

  const removeMemberFromShow = async (showDateId: string, userId: string) => {
    const { error } = await supabase
      .from('show_assignments')
      .delete()
      .eq('show_date_id', showDateId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Remove from local state
    const index = showAssignments.value.findIndex(
      a => a.show_date_id === showDateId && a.user_id === userId
    )
    if (index !== -1) {
      showAssignments.value.splice(index, 1)
    }

    return { success: true }
  }

  const updateAvailability = async (userId: string, showDateId: string, status: 'absent' | 'present' | 'undecided') => {
    const existingRecord = availabilityRecords.value.find(
      r => r.user_id === userId && r.show_date_id === showDateId
    )

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from('show_availability')
        .update({ status })
        .eq('id', existingRecord.id)

      if (error) {
        return { success: false, error: error.message }
      }

      existingRecord.status = status
      existingRecord.updated_at = new Date().toISOString()
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('show_availability')
        .insert({
          user_id: userId,
          show_date_id: showDateId,
          status
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (data) {
        availabilityRecords.value.push(data)
      }
    }

    return { success: true }
  }

  const deleteShow = async (showId: string) => {
    const { error } = await supabase
      .from('shows')
      .delete()
      .eq('id', showId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Remove from local state
    const index = shows.value.findIndex(s => s.id === showId)
    if (index !== -1) {
      shows.value.splice(index, 1)
    }

    // Also remove related show dates and availability records
    showDates.value = showDates.value.filter(d => d.show_id !== showId)
    availabilityRecords.value = availabilityRecords.value.filter(r => {
      const showDate = showDates.value.find(d => d.id === r.show_date_id)
      return showDate && showDate.show_id !== showId
    })

    return { success: true }
  }

  const deleteShowDate = async (showDateId: string) => {
    const { error } = await supabase
      .from('show_dates')
      .delete()
      .eq('id', showDateId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Remove from local state
    const index = showDates.value.findIndex(d => d.id === showDateId)
    if (index !== -1) {
      showDates.value.splice(index, 1)
    }

    // Also remove availability records
    availabilityRecords.value = availabilityRecords.value.filter(r => r.show_date_id !== showDateId)

    return { success: true }
  }

  const updateShowDate = async (showDateId: string, date: string, updatedBy: string) => {
    const { data, error } = await supabase
      .from('show_dates')
      .update({ date })
      .eq('id', showDateId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (data) {
      // Update local state
      const index = showDates.value.findIndex(d => d.id === showDateId)
      if (index !== -1) {
        showDates.value[index] = data
      }
      return { success: true, showDate: data }
    }

    return { success: false, error: 'Show date not found' }
  }

  const getAvailabilityMatrix = (team: 'Samurai' | 'Gladiator' | 'Viking') => {
    const teamShows = showsByTeam.value(team)
    const teamShowDates = showDates.value.filter(date => {
      const show = shows.value.find(s => s.id === date.show_id)
      return show && show.team === team
    })
    
    // This would need to be fetched from the user store
    // For now, return empty array - you'll need to integrate with user store
    const teamMembers: any[] = []

    return teamMembers.map(member => {
      const showDates = teamShowDates.map(showDate => ({
        showDateId: showDate.id,
        showId: showDate.show_id,
        showName: shows.value.find(s => s.id === showDate.show_id)?.name || 'Unknown Show',
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
  }

  const refreshData = async () => {
    try {
      await Promise.all([
        fetchShows(true),
        fetchShowDates(true),
        fetchShowAssignments(true),
        fetchShowAvailability(true)
      ])
      return { success: true }
    } catch (error) {
      console.error('Error refreshing shows data:', error)
      return { success: false, error: 'Failed to refresh data' }
    }
  }

  const clearCache = () => {
    sessionStorage.removeItem('shows_cache_shows')
    sessionStorage.removeItem('shows_cache_showDates')
    sessionStorage.removeItem('shows_cache_assignments')
    sessionStorage.removeItem('shows_cache_availability')
    showsLastFetchTime.value = Date.now() - 6 * 60 * 1000
    showDatesLastFetchTime.value = Date.now() - 6 * 60 * 1000
    assignmentsLastFetchTime.value = Date.now() - 6 * 60 * 1000
    availabilityLastFetchTime.value = Date.now() - 6 * 60 * 1000
  }

  return {
    // State
    shows,
    showDates,
    availabilityRecords,
    showAssignments,
    
    // Computed
    showsByTeam,
    datesByShow,
    getAvailabilityForUser,
    getShowById,
    getShowDateById,
    getAssignedMembers,
    
    // Actions
    initializeStore,
    fetchShows,
    fetchShowDates,
    fetchShowAssignments,
    fetchShowAvailability,
    createShow,
    createShowDate,
    assignMemberToShow,
    removeMemberFromShow,
    updateAvailability,
    deleteShow,
    deleteShowDate,
    updateShowDate,
    refreshData,
    clearCache,
    getAvailabilityMatrix
  }
}) 