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

  // Initialize store with data from Supabase
  const initializeStore = async () => {
    try {
      await Promise.all([
        fetchShows(),
        fetchShowDates(),
        fetchShowAssignments(),
        fetchShowAvailability()
      ])
    } catch (error) {
      console.error('Failed to initialize shows store:', error)
    }
  }

  // Fetch functions
  const fetchShows = async () => {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shows:', error)
      return
    }

    shows.value = data || []
  }

  const fetchShowDates = async () => {
    const { data, error } = await supabase
      .from('show_dates')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching show dates:', error)
      return
    }

    showDates.value = data || []
  }

  const fetchShowAssignments = async () => {
    const { data, error } = await supabase
      .from('show_assignments')
      .select('*')

    if (error) {
      console.error('Error fetching show assignments:', error)
      return
    }

    showAssignments.value = data || []
  }

  const fetchShowAvailability = async () => {
    const { data, error } = await supabase
      .from('show_availability')
      .select('*')

    if (error) {
      console.error('Error fetching show availability:', error)
      return
    }

    availabilityRecords.value = data || []
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

  const getAvailabilityMatrix = computed(() => (team: 'Samurai' | 'Gladiator' | 'Viking') => {
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
  })

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
    getAvailabilityMatrix,
    getAssignedMembers,
    
    // Actions
    initializeStore,
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