<template>
  <div class="dashboard-container">
    <MainNavigation />
    
    <div class="dashboard-content">
      <div class="dashboard-header">
        <h1>Tableau de Bord d'Équipe</h1>
        <p>Bienvenue sur votre tableau de bord de gestion d'équipe</p>
      </div>
      <!-- Shows Section -->
      <div class="shows-section">
        <div class="section-header">
          <h2>Spectacles</h2>
          <button @click="toggleShowAll" class="toggle-button desktop-toggle">
            {{ showAllShows ? 'Voir Moins' : 'Voir Tout' }}
          </button>
        </div>
        
        <div class="shows-list">
          <div 
            v-for="showDate in displayedShows" 
            :key="showDate.id" 
            :class="['show-card', { 'past-event': isPastEvent(showDate.date) }]"
            @click="openShowModal(showDate)"
          >
            <div class="show-info">
                          <h3>{{ getShowName(showDate.show_id) }}</h3>
            <p class="show-date">{{ formatDate(showDate.date) }}</p>
            <p class="show-members">
              <span class="members-label">Assignés : </span>
              <span v-if="getAssignedMembers(showDate.id).length > 0">
                {{ getMemberNames(getAssignedMembers(showDate.id)).join(', ') }}
              </span>
              <span v-else class="no-members">Aucun membre assigné</span>
              <span class="member-count">({{ getAssignedMembers(showDate.id).length }}/5)</span>
            </p>
            </div>
            <div class="show-status">
              <span :class="['status-badge', `status-${getShowStatus(showDate.id)}`]">
                {{ getStatusLabel(getShowStatus(showDate.id)) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="mobile-toggle-container">
          <button @click="toggleShowAll" class="toggle-button mobile-toggle">
            {{ showAllShows ? 'Voir Moins' : 'Voir Tout' }}
          </button>
        </div>
      </div>

      <!-- Coaching Section -->
      <div class="coaching-section">
        <div class="section-header">
          <h2>Sessions de Coaching</h2>
          <button @click="toggleCoachingAll" class="toggle-button desktop-toggle">
            {{ showAllCoaching ? 'Voir Moins' : 'Voir Plus' }}
          </button>
        </div>
        
        <div class="coaching-list">
          <div 
            v-for="session in displayedCoaching" 
            :key="session.id" 
            :class="['coaching-card', { 'past-event': isPastEvent(session.date) }]"
            @click="openCoachingModal(session)"
          >
            <div class="coaching-info">
              <h3>{{ formatDate(session.date) }}</h3>
              <p class="coaching-coach">{{ session.coach }}</p>
            </div>
            <div class="coaching-status">
              <span :class="['status-badge', `status-${getCoachingStatus(session.id)}`]">
                {{ getStatusLabel(getCoachingStatus(session.id)) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="mobile-toggle-container">
          <button @click="toggleCoachingAll" class="toggle-button mobile-toggle">
            {{ showAllCoaching ? 'Voir Moins' : 'Voir Plus' }}
          </button>
        </div>
      </div>

      <!-- Next Coaching Attendance Matrix -->
      <div v-if="nextCoachingSession" class="attendance-matrix-section">
        <div class="section-header">
          <h2>Présence - Prochaine Session de Coaching ({{ attendanceCount }})</h2>
          <p class="session-info">
            {{ formatDate(nextCoachingSession.date) }} - {{ nextCoachingSession.coach }}
          </p>
        </div>
        
        <div class="attendance-matrix">
          <div class="matrix-container">
            <table class="attendance-table">
              <thead>
                <tr>
                  <th>Membre d'Équipe</th>
                  <th>Statut de Présence</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in attendanceMatrixForNextSession" :key="member.userId">
                  <td class="member-name">{{ member.userName }}</td>
                  <td 
                    :class="[
                      'attendance-cell',
                      `status-${member.status}`
                    ]"
                  >
                    {{ getStatusLabel(member.status) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Status Modal -->
      <div v-if="showStatusModal" class="modal-overlay" @click="closeStatusModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Mettre à Jour la Disponibilité</h3>
            <button @click="closeStatusModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-date">{{ formatModalDate(selectedEvent?.date) }}</p>
            <p class="modal-title">{{ selectedEvent?.title }}</p>
            
            <div v-if="selectedEvent?.type === 'coaching'" class="status-section">
              <h4>Session de Coaching</h4>
              <div class="status-buttons">
                <button 
                  :class="['status-button', { active: selectedCoachingStatus === 'present' }]"
                  @click="selectedCoachingStatus = 'present'"
                >
                  Présent
                </button>
                <button 
                  :class="['status-button', { active: selectedCoachingStatus === 'absent' }]"
                  @click="selectedCoachingStatus = 'absent'"
                >
                  Absent
                </button>
                <button 
                  :class="['status-button', { active: selectedCoachingStatus === 'undecided' }]"
                  @click="selectedCoachingStatus = 'undecided'"
                >
                  Indécis
                </button>
              </div>
            </div>
            
            <div v-if="selectedEvent?.type === 'show'" class="status-section">
              <h4>Spectacle</h4>
              <div class="status-buttons">
                <button 
                  :class="['status-button', { active: selectedShowStatus === 'present' }]"
                  @click="selectedShowStatus = 'present'"
                >
                  Disponible
                </button>
                <button 
                  :class="['status-button', { active: selectedShowStatus === 'absent' }]"
                  @click="selectedShowStatus = 'absent'"
                >
                  Indisponible
                </button>
                <button 
                  :class="['status-button', { active: selectedShowStatus === 'undecided' }]"
                  @click="selectedShowStatus = 'undecided'"
                >
                  Indécis
                </button>
              </div>
            </div>
            
            <div class="modal-actions">
              <button @click="closeStatusModal" class="cancel-button">Annuler</button>
              <button @click="confirmStatusUpdate" class="confirm-button">Confirmer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCoachingStore } from '@/stores/coaching'
import { useShowsStore } from '@/stores/shows'
import { format, parseISO, isAfter, isBefore } from 'date-fns'
import MainNavigation from '@/components/MainNavigation.vue'

const router = useRouter()
const userStore = useUserStore()
const coachingStore = useCoachingStore()
const showsStore = useShowsStore()

// Toggle states
const showAllShows = ref(false)
const showAllCoaching = ref(false)

// Modal state
const showStatusModal = ref(false)
const selectedEvent = ref<any>(null)
const selectedCoachingStatus = ref<'present' | 'absent' | 'undecided'>('present')
const selectedShowStatus = ref<'present' | 'absent' | 'undecided'>('present')

// Get upcoming shows (include today and future dates)
const upcomingShows = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return showsStore.showDates
    .filter(showDate => {
      const show = showsStore.shows.find(s => s.id === showDate.show_id)
      return show?.team === userStore.currentTeam && !isBefore(parseISO(showDate.date), today)
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
})

// Get all shows for the team (both past and future)
const allShows = computed(() => {
  return showsStore.showDates
    .filter(showDate => {
      const show = showsStore.shows.find(s => s.id === showDate.show_id)
      return show?.team === userStore.currentTeam
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
})

// Get upcoming coaching sessions (include today and future dates)
const upcomingCoaching = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return coachingStore.coachingSessions
    .filter(session => session.team === userStore.currentTeam && !isBefore(parseISO(session.date), today))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
})

// Get all coaching sessions for the team (both past and future)
const allCoaching = computed(() => {
  return coachingStore.coachingSessions
    .filter(session => session.team === userStore.currentTeam)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
})

// Displayed shows (2 upcoming by default, all if showAllShows is true)
const displayedShows = computed(() => {
  return showAllShows.value ? allShows.value : upcomingShows.value.slice(0, 2)
})

// Displayed coaching (4 upcoming by default, all if showAllCoaching is true)
const displayedCoaching = computed(() => {
  return showAllCoaching.value ? allCoaching.value : upcomingCoaching.value.slice(0, 4)
})

// Get the next coaching session (first upcoming session)
const nextCoachingSession = computed(() => {
  return upcomingCoaching.value[0] || null
})

// Get attendance matrix for the next coaching session
const attendanceMatrixForNextSession = ref<any[]>([])

const updateAttendanceMatrix = async () => {
  if (!nextCoachingSession.value) {
    attendanceMatrixForNextSession.value = []
    return
  }
  
  // Get all team members using the user store method
  const teamMembersResult = await userStore.getUsersByTeam(userStore.currentTeam || 'Samurai')
  
  if (!teamMembersResult.success) {
    attendanceMatrixForNextSession.value = []
    return
  }
  
  attendanceMatrixForNextSession.value = teamMembersResult.users.map(member => {
    const attendanceStatus = coachingStore.getAttendanceForUser(member.id, nextCoachingSession.value.id)
    return {
      userId: member.id,
      userName: member.name,
      status: attendanceStatus
    }
  })
}

// Computed property for attendance count
const attendanceCount = computed(() => {
  const total = attendanceMatrixForNextSession.value.length
  const present = attendanceMatrixForNextSession.value.filter(member => member.status === 'present').length
  return `${present}/${total}`
})

// Toggle functions
const toggleShowAll = () => {
  showAllShows.value = !showAllShows.value
}

const toggleCoachingAll = () => {
  showAllCoaching.value = !showAllCoaching.value
}

// Utility functions
const formatDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'MMM dd, yyyy')
}

const isPastEvent = (dateStr: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return isBefore(parseISO(dateStr), today)
}

const getShowName = (showId: string) => {
  const show = showsStore.shows.find(s => s.id === showId)
  return show?.name || 'Unknown Show'
}

const getAssignedMembers = (showDateId: string) => {
  const members = showsStore.getAssignedMembers(showDateId)
  return members || []
}

const teamMembers = ref<any[]>([])

const loadTeamMembers = async () => {
  // Check if team members are cached for this team
  const teamMembersCacheKey = `team_members_${userStore.currentTeam}`
  const cachedTeamMembers = sessionStorage.getItem(teamMembersCacheKey)
  
  if (cachedTeamMembers) {
    teamMembers.value = JSON.parse(cachedTeamMembers)
    return
  }
  
  // Fetch team members if not cached
  const teamMembersResult = await userStore.getUsersByTeam(userStore.currentTeam || 'Samurai')
  if (teamMembersResult.success) {
    teamMembers.value = teamMembersResult.users
    // Cache the team members
    sessionStorage.setItem(teamMembersCacheKey, JSON.stringify(teamMembersResult.users))
  }
}

const checkStoresInitialized = () => {
  // Check if stores have been initialized in this session
  const storesInitialized = sessionStorage.getItem('stores_initialized')
  
  if (!storesInitialized) {
    console.warn('⚠️ Stores not initialized, redirecting to login...')
    router.push('/login')
    return false
  }
  
  return true
}

const getMemberNames = (memberIds: string[]) => {
  if (!memberIds || !Array.isArray(memberIds)) {
    return []
  }
  
  return memberIds.map(id => {
    const user = teamMembers.value.find(u => u.id === id)
    return user?.name || 'Unknown Member'
  })
}

const getShowStatus = (showDateId: string) => {
  return showsStore.getAvailabilityForUser(userStore.user?.id || '', showDateId)
}

const getCoachingStatus = (sessionId: string) => {
  return coachingStore.getAttendanceForUser(userStore.user?.id || '', sessionId)
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return 'Présent'
    case 'absent': return 'Absent'
    case 'undecided': return 'Indécis'
    default: return 'Absent'
  }
}

// Modal functions
const openShowModal = (showDate: any) => {
  const show = showsStore.shows.find(s => s.id === showDate.show_id)
  selectedEvent.value = {
    type: 'show',
    date: showDate.date,
    title: show?.name || 'Unknown Show',
    showDateId: showDate.id
  }
  selectedShowStatus.value = getShowStatus(showDate.id)
  showStatusModal.value = true
}

const openCoachingModal = (session: any) => {
  selectedEvent.value = {
    type: 'coaching',
    date: session.date,
    title: session.coach,
    sessionId: session.id
  }
  selectedCoachingStatus.value = getCoachingStatus(session.id)
  showStatusModal.value = true
}

const closeStatusModal = () => {
  showStatusModal.value = false
  selectedEvent.value = null
  selectedCoachingStatus.value = 'present'
  selectedShowStatus.value = 'present'
}

const confirmStatusUpdate = async () => {
  if (!selectedEvent.value) return

  // Prevent updates for past dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = parseISO(selectedEvent.value.date)
  if (isBefore(eventDate, today)) {
    alert('Cannot update availability for past dates.')
    closeStatusModal()
    return
  }

  if (selectedEvent.value.type === 'coaching') {
    const result = await coachingStore.updateAttendance(
      userStore.user?.id || '',
      selectedEvent.value.sessionId,
      selectedCoachingStatus.value,
      userStore.user?.role
    )
    
    if (!result.success) {
      alert(result.error)
      return
    }
  } else if (selectedEvent.value.type === 'show') {
    await showsStore.updateAvailability(
      userStore.user?.id || '',
      selectedEvent.value.showDateId,
      selectedShowStatus.value
    )
  }

  closeStatusModal()
}

const formatModalDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'EEEE, MMMM dd, yyyy')
}



onMounted(async () => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }

  try {
    // Check if stores are initialized
    if (!checkStoresInitialized()) {
      return
    }
    
    // Load team members separately to avoid blocking the main data
    await loadTeamMembers()
    
    // Update attendance matrix for next coaching session
    await updateAttendanceMatrix()
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
})

// Watch for changes in the next coaching session and update the attendance matrix
watch(nextCoachingSession, async () => {
  await updateAttendanceMatrix()
}, { immediate: false })
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f8f9fa;
}

.dashboard-header {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.team-badge {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.logout-button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background: #c0392b;
}

.admin-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.admin-button:hover {
  background: #218838;
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* Section styles */
.shows-section,
.coaching-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.toggle-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.toggle-button:hover {
  background: #5a6fd8;
}

/* Card styles */
.shows-list,
.coaching-list {
  display: grid;
  gap: 15px;
}

.show-card,
.coaching-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative; /* Added for past event badge positioning */
}

.show-card:hover,
.coaching-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Past event styling */
.show-card.past-event,
.coaching-card.past-event {
  opacity: 0.7;
  background: #f8f9fa;
  border-color: #dee2e6;
}

.show-card.past-event:hover,
.coaching-card.past-event:hover {
  background: #e9ecef;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.show-card.past-event::before,
.coaching-card.past-event::before {
  content: 'Past';
  position: absolute;
  top: 8px;
  right: 8px;
  background: #6c757d;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.show-info h3,
.coaching-info h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.show-date,
.coaching-coach {
  margin: 0 0 3px 0;
  color: #666;
  font-size: 14px;
}

.show-members {
  margin: 0;
  color: #666;
  font-size: 12px;
  line-height: 1.4;
}

.members-label {
  font-weight: 500;
  color: #333;
}

.no-members {
  color: #999;
  font-style: italic;
}

.member-count {
  color: #888;
  font-size: 11px;
  margin-left: 5px;
}

/* Status badge styles */
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-present {
  background: #d4edda;
  color: #155724;
}

.status-badge.status-absent {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.status-undecided {
  background: #fff3cd;
  color: #856404;
}

/* Attendance Matrix Styles */
.attendance-matrix-section {
  margin-top: 30px;
}

.session-info {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: normal;
}

.attendance-matrix {
  margin-top: 20px;
}

.matrix-container {
  overflow-x: auto;
}

.attendance-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.attendance-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 1px solid #e9ecef;
}

.attendance-table td {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
}

.member-name {
  font-weight: 500;
  color: #333;
}

.attendance-cell {
  text-align: center;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
}

.status-present {
  background: #d4edda;
  color: #155724;
}

.status-absent {
  background: #f8d7da;
  color: #721c24;
}

.status-undecided {
  background: #fff3cd;
  color: #856404;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-date {
  font-size: 16px;
  color: #666;
  margin: 0 0 10px 0;
}

.modal-title {
  font-size: 18px;
  color: #333;
  margin: 0 0 20px 0;
  font-weight: 500;
}

.status-section {
  margin-bottom: 20px;
}

.status-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.status-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.status-button {
  padding: 10px 20px;
  border: 2px solid #ddd;
  background: white;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.status-button:hover {
  border-color: #667eea;
  color: #667eea;
}

.status-button.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
}

.cancel-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.cancel-button:hover {
  background: #5a6268;
}

.confirm-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.confirm-button:hover {
  background: #5a6fd8;
}

/* Mobile toggle container styles */
.mobile-toggle-container {
  display: none;
  margin-top: 20px;
  text-align: center;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .dashboard-content {
    padding: 20px 10px;
  }
  
  /* Hide desktop toggle buttons on mobile */
  .desktop-toggle {
    display: none;
  }
  
  /* Show mobile toggle buttons */
  .mobile-toggle-container {
    display: block;
  }
  
  .mobile-toggle {
    width: 100%;
    max-width: 200px;
  }

  .header-content {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .user-info {
    flex-wrap: wrap;
    justify-content: center;
  }

  .shows-section,
  .coaching-section {
    padding: 20px 15px;
  }

  .section-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .toggle-button {
    width: 100%;
  }

  .show-card,
  .coaching-card {
    padding: 15px;
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .show-info,
  .coaching-info {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .dashboard-content {
    padding: 15px 5px;
  }

  .header-content h1 {
    font-size: 20px;
  }

  .user-info {
    font-size: 14px;
  }

  .team-badge {
    font-size: 11px;
    padding: 3px 8px;
  }

  .logout-button,
  .admin-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .shows-section,
  .coaching-section {
    padding: 15px 10px;
  }

  .show-card,
  .coaching-card {
    padding: 12px;
  }

  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .modal-header {
    padding: 15px 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .status-buttons {
    flex-direction: column;
  }

  .status-button {
    width: 100%;
    text-align: center;
  }

  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }

  .cancel-button,
  .confirm-button {
    width: 100%;
  }
}
</style> 