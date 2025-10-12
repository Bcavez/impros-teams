<template>
  <div class="admin-dashboard">
    <MainNavigation />
    
    <div class="dashboard-content">
      <div class="page-header">
        <h1>Tableau de Bord Capitaine</h1>
        <p>Gérez les sessions de coaching et spectacles pour votre équipe</p>
      </div>
      
      <div class="navigation-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'coaching' }]"
          @click="activeTab = 'coaching'"
        >
          Gestion Coaching
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'shows' }]"
          @click="activeTab = 'shows'"
        >
          Gestion Spectacles
        </button>
      </div>

      <!-- Coaching Management -->
      <div v-if="activeTab === 'coaching'" class="tab-content">
        <div class="attendance-matrix">
          <h3>Matrice de Présence</h3>
          <div class="matrix-container">
            <table class="attendance-table">
              <thead>
                <tr>
                  <th class="sticky-column">Membre</th>
                  <th v-for="session in teamCoachingSessions" :key="session.id" :class="{ 'past-session': isSessionInPast(session.date) }">
                    {{ formatDate(session.date) }}
                    <span v-if="isSessionInPast(session.date)" class="past-indicator">(Passé)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in attendanceMatrix" :key="member.userId">
                  <td class="member-name">
                    {{ member.userName }}
                    <span class="attendance-summary">({{ getAttendanceSummary(member.userId) }})</span>
                  </td>
                  <td 
                    v-for="session in member.sessions" 
                    :key="session.sessionId"
                    :class="[
                      'attendance-cell',
                      `status-${session.status}`,
                      { 'past-session': isSessionInPast(session.date) }
                    ]"
                    @click="openAttendanceModal(member.userId, session.sessionId, session.status, session.date, member.userName)"
                  >
                    {{ getStatusLabel(session.status) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-header">
          <h2>Sessions de Coaching</h2>
          <button @click="showCreateCoachingModal = true" class="primary-button">
            Créer Session de Coaching
          </button>
        </div>

        <div class="coaching-sessions">
          <div v-for="session in teamCoachingSessions" :key="session.id" class="session-card">
            <div class="session-info">
              <h3>{{ formatDate(session.date) }}</h3>
              <p class="session-coach">{{ session.coach }}</p>
            </div>
            <div class="session-actions">
              <button 
                @click="openEditCoachModal(session)" 
                class="edit-button"
              >
                Modifier Coach
              </button>
              <button @click="deleteCoachingSession(session.id)" class="delete-button">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Show Management -->
      <div v-if="activeTab === 'shows'" class="tab-content">
        <div class="availability-matrix">
          <h3>Matrice de Disponibilité</h3>
          <div class="matrix-container">
            <table class="attendance-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th v-for="showDate in allTeamShowDates" :key="showDate.id">
                    {{ getShowName(showDate.show_id) }} - {{ formatDate(showDate.date) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in availabilityMatrix" :key="member.userId">
                  <td class="member-name">{{ member.userName }}</td>
                  <td 
                    v-for="showDate in member.showDates" 
                    :key="showDate.showDateId"
                    :class="[
                      'attendance-cell',
                      `status-${showDate.status}`
                    ]"
                    @click="toggleShowAvailability(member.userId, showDate.showDateId, showDate.status)"
                  >
                    {{ getStatusLabel(showDate.status) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-header">
          <h2>Spectacles</h2>
          <button @click="showCreateShowModal = true" class="primary-button">
            Créer Spectacle
          </button>
        </div>

        <div class="shows-list">
          <div v-for="show in teamShows" :key="show.id" class="show-card">
            <div class="show-info">
              <h3>{{ show.name }}</h3>
              <div v-for="showDate in getShowDates(show.id)" :key="showDate.id" class="show-date-info">
                <span class="date">{{ formatDate(showDate.date) }}</span>
                <span class="members">{{ getAssignedMembers(showDate.id).length }}/5 membres</span>
              </div>
            </div>
            <div class="show-actions">
              <button 
                v-if="!getShowDates(show.id).length" 
                @click="showCreateShowDateModal = true; selectedShow = show" 
                class="secondary-button"
              >
                Ajouter Date
              </button>
              <button 
                v-else 
                @click="openUpdateShowDateModal(show)" 
                class="secondary-button"
              >
                Modifier Date
              </button>
              <button @click="openAssignMembersModal(getShowDates(show.id)[0])" class="secondary-button">
                Assigner Membres
              </button>
              <button @click="confirmDeleteShow(show.id)" class="delete-button">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Coaching Modal -->
    <div v-if="showCreateCoachingModal" class="modal-overlay" @click="showCreateCoachingModal = false">
      <div class="modal" @click.stop>
        <h3>Créer Session de Coaching</h3>
        <form @submit.prevent="createCoachingSession">
          <div class="form-group">
            <label for="coaching-date">Date</label>
            <input
              id="coaching-date"
              v-model="newCoachingDate"
              type="date"
              required
            />
          </div>
          <div class="form-group">
            <label for="coaching-coach">Coach</label>
            <input
              id="coaching-coach"
              v-model="newCoachingCoach"
              type="text"
              required
              placeholder="Entrez le nom du coach"
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showCreateCoachingModal = false" class="cancel-button">
              Annuler
            </button>
            <button type="submit" class="primary-button">
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Show Modal -->
    <div v-if="showCreateShowModal" class="modal-overlay" @click="showCreateShowModal = false">
      <div class="modal" @click.stop>
        <h3>Créer Spectacle</h3>
        <form @submit.prevent="createShow">
          <div class="form-group">
            <label for="show-name">Nom du Spectacle</label>
            <input
              id="show-name"
              v-model="newShow.name"
              type="text"
              required
              placeholder="Entrez le nom du spectacle"
            />
          </div>

          <div class="modal-actions">
            <button type="button" @click="showCreateShowModal = false" class="cancel-button">
              Annuler
            </button>
            <button type="submit" class="primary-button">
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>

         <!-- Create Show Date Modal -->
     <div v-if="showCreateShowDateModal" class="modal-overlay" @click="showCreateShowDateModal = false">
       <div class="modal" @click.stop>
         <h3>Ajouter Date de Spectacle</h3>
         <form @submit.prevent="createShowDate">
           <div class="form-group">
             <label for="show-date">Date</label>
             <input
               id="show-date"
               v-model="newShowDate.date"
               type="date"
               required
             />
           </div>
           <div class="modal-actions">
             <button type="button" @click="showCreateShowDateModal = false" class="cancel-button">
               Annuler
             </button>
             <button type="submit" class="primary-button">
               Créer
             </button>
           </div>
         </form>
       </div>
     </div>

           <!-- Update Show Date Modal -->
      <div v-if="showUpdateShowDateModal" class="modal-overlay" @click="showUpdateShowDateModal = false">
        <div class="modal" @click.stop>
          <h3>Modifier Date de Spectacle</h3>
          <form @submit.prevent="updateShowDate">
            <div class="form-group">
              <label for="update-show-date">Date</label>
              <input
                id="update-show-date"
                v-model="updateShowDateData.date"
                type="date"
                required
              />
            </div>
            <div class="modal-actions">
              <button type="button" @click="showUpdateShowDateModal = false" class="cancel-button">
                Annuler
              </button>
              <button type="submit" class="primary-button">
                Mettre à Jour
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Assign Members Modal -->
      <div v-if="showAssignMembersModal" class="modal-overlay" @click="showAssignMembersModal = false">
        <div class="modal" @click.stop>
          <h3>Assigner Membres au Spectacle</h3>
          <div class="form-group">
            <label>Membres Disponibles</label>
            <div class="members-list">
                             <div 
                 v-for="member in availableMembersForShow" 
                 :key="member.id" 
                 class="member-item"
                 :class="{ 
                   'assigned': selectedMembers.includes(member.id),
                   'available': member.availability === 'present',
                   'unavailable': member.availability === 'absent',
                   'undecided': member.availability === 'undecided'
                 }"
                 @click="toggleMemberAssignment(member.id)"
               >
                <span class="member-name">{{ member.name }}</span>
                <span class="member-status">
                  {{ selectedMembers.includes(member.id) ? 'Sélectionné' : 
                     member.availability === 'absent' ? 'Indisponible' : 
                     member.availability === 'present' ? 'Disponible' : 'Indécis' }}
                </span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAssignMembersModal = false" class="cancel-button">
              Annuler
            </button>
            <button type="button" @click="saveMemberAssignments" class="primary-button">
              Sauvegarder Assignations
            </button>
          </div>
        </div>
      </div>

      <!-- Status Modal -->
      <div v-if="showStatusModal" class="modal-overlay" @click="closeStatusModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Mettre à Jour la Présence</h3>
            <button @click="closeStatusModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-date">{{ formatModalDate(selectedEvent?.date) }}</p>
            <p class="modal-title">{{ selectedEvent?.title }}</p>
            
            <div class="status-section">
              <h4>Session de Coaching</h4>
              <div class="status-buttons">
                <button 
                  :class="['status-button', { active: selectedAttendanceStatus === 'present' }]"
                  @click="selectedAttendanceStatus = 'present'"
                >
                  Présent
                </button>
                <button 
                  :class="['status-button', { active: selectedAttendanceStatus === 'absent' }]"
                  @click="selectedAttendanceStatus = 'absent'"
                >
                  Absent
                </button>
                <button 
                  :class="['status-button', { active: selectedAttendanceStatus === 'undecided' }]"
                  @click="selectedAttendanceStatus = 'undecided'"
                >
                  Indécis
                </button>
              </div>
            </div>
            
            <div class="modal-actions">
              <button @click="closeStatusModal" class="cancel-button">Annuler</button>
              <button @click="confirmAttendanceUpdate" class="confirm-button">Confirmer</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Coach Modal -->
      <div v-if="showEditCoachModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Modifier Coach</h2>
            <button @click="showEditCoachModal = false" class="close-button">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="edit-coach">Nom du Coach :</label>
              <input
                id="edit-coach"
                v-model="editingCoach"
                type="text"
                placeholder="Entrez le nom du coach"
                class="form-input"
                @keyup.enter="updateCoachingSessionCoach"
              />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showEditCoachModal = false" class="cancel-button">
              Annuler
            </button>
            <button type="button" @click="updateCoachingSessionCoach" class="primary-button">
              Mettre à Jour Coach
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCoachingStore } from '@/stores/coaching'
import { useShowsStore } from '@/stores/shows'
import { format, parseISO } from 'date-fns'
import MainNavigation from '@/components/MainNavigation.vue'

const router = useRouter()
const userStore = useUserStore()
const coachingStore = useCoachingStore()
const showsStore = useShowsStore()

const activeTab = ref<'coaching' | 'shows'>('coaching')

// Modal states
const showCreateCoachingModal = ref(false)
const showCreateShowModal = ref(false)
const showCreateShowDateModal = ref(false)
const showUpdateShowDateModal = ref(false)
const showAssignMembersModal = ref(false)
const showStatusModal = ref(false)
const selectedEvent = ref<any>(null)
const selectedAttendanceStatus = ref<'present' | 'absent' | 'undecided'>('present')

// Coaching session editing
const editingSessionId = ref<string | null>(null)
const editingCoach = ref('')
const showEditCoachModal = ref(false)

// Form data
const newCoachingDate = ref('')
const newCoachingCoach = ref('')
const newShow = ref({
  name: ''
})
const newShowDate = ref({
  date: ''
})

const updateShowDateData = ref({
  date: ''
})

const selectedShow = ref<any>(null)
const selectedShowDate = ref<any>(null)

// Computed properties
const teamCoachingSessions = computed(() => {
  const sessions = coachingStore.sessionsByTeam(userStore.currentTeam || 'Samurai')
  return sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date, oldest first
})

const teamShows = computed(() => {
  return showsStore.showsByTeam(userStore.currentTeam || 'Samurai')
})

const allTeamShowDates = computed(() => {
  return showsStore.showDates.filter(showDate => {
    const show = showsStore.shows.find(s => s.id === showDate.show_id)
    return show && show.team === userStore.currentTeam
  })
})

const isSessionInPast = (sessionDate: string) => {
  const session = new Date(sessionDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return session < today // Only sessions before today are considered "past"
}

const attendanceMatrix = ref<any[]>([])
const availabilityMatrix = ref<any[]>([])

// Load matrix data with caching
const matrixCache = ref<{ attendance: any[], availability: any[], timestamp: number } | null>(null)
const matrixCacheDuration = 5 * 60 * 1000 // 5 minutes

const loadMatrixData = async () => {
  try {
    // Check if we have cached matrix data
    if (matrixCache.value && (Date.now() - matrixCache.value.timestamp) < matrixCacheDuration) {
      attendanceMatrix.value = matrixCache.value.attendance
      availabilityMatrix.value = matrixCache.value.availability
      return
    }
    
    // Use cached store data - don't force refresh
    const [attendanceResult, availabilityResult] = await Promise.all([
      coachingStore.getAttendanceMatrix(userStore.currentTeam || 'Samurai'),
      showsStore.getAvailabilityMatrix(userStore.currentTeam || 'Samurai')
    ])
    
    if (attendanceResult.success) {
      // Sort the matrix data by session date (oldest first)
      attendanceMatrix.value = attendanceResult.matrix.map(member => ({
        ...member,
        sessions: member.sessions.sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      }))
    }
    
    if (availabilityResult.success) {
      availabilityMatrix.value = availabilityResult.matrix
    }
    
    // Cache the matrix data
    matrixCache.value = {
      attendance: attendanceMatrix.value,
      availability: availabilityMatrix.value,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Error loading matrix data:', error)
  }
}

// Refresh matrix data (for manual refresh)
const refreshMatrixData = async () => {
  // Clear matrix cache to force fresh data
  matrixCache.value = null
  await loadMatrixData()
}

const availableMembers = ref<any[]>([])

const loadTeamMembers = async () => {
  // Check if team members are cached for this team
  const teamMembersCacheKey = `team_members_${userStore.currentTeam}`
  const cachedTeamMembers = sessionStorage.getItem(teamMembersCacheKey)
  
  if (cachedTeamMembers) {
    availableMembers.value = JSON.parse(cachedTeamMembers)
    return
  }
  
  // Fetch team members if not cached
  const teamMembersResult = await userStore.getUsersByTeam(userStore.currentTeam || 'Samurai')
  if (teamMembersResult.success) {
    availableMembers.value = teamMembersResult.users
    // Cache the team members
    sessionStorage.setItem(teamMembersCacheKey, JSON.stringify(teamMembersResult.users))
  }
}

const availableMembersForShow = computed(() => {
  if (!selectedShowDate.value) return []
  
  return availableMembers.value.map(member => {
    const availability = showsStore.getAvailabilityForUser(member.id, selectedShowDate.value.id)
    return {
      ...member,
      availability
    }
  })
})

const selectedMembers = ref<string[]>([])

// Methods
const formatDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'MMM dd, yyyy')
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return 'Présent'
    case 'absent': return 'Absent'
    case 'undecided': return 'Indécis'
    default: return 'Absent'
  }
}

const getAttendanceSummary = (memberId: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Find the member in the attendance matrix
  const member = attendanceMatrix.value.find(m => m.userId === memberId)
  
  if (!member) {
    return '0/0'
  }
  
  // Get all sessions up until today
  const sessionsUpToToday = member.sessions.filter(session => {
    const sessionDate = parseISO(session.date)
    return sessionDate <= today
  })
  
  // Count sessions where member was present
  const presentCount = sessionsUpToToday.filter(session => {
    return session.status === 'present'
  }).length
  
  return `${presentCount}/${sessionsUpToToday.length}`
}

const getShowDates = (showId: string) => {
  return showsStore.datesByShow(showId)
}

const getAssignedMembers = (showDateId: string) => {
  const members = showsStore.getAssignedMembers(showDateId)
  return members || []
}

const getShowName = (showId: string) => {
  const show = showsStore.shows.find(s => s.id === showId)
  return show?.name || 'Unknown Show'
}

const createCoachingSession = async () => {
  if (!newCoachingDate.value || !newCoachingCoach.value) return
  
  await coachingStore.createCoachingSession(
    newCoachingDate.value,
    userStore.currentTeam || 'Samurai',
    newCoachingCoach.value,
    userStore.user?.id || ''
  )
  
  newCoachingDate.value = ''
  newCoachingCoach.value = ''
  showCreateCoachingModal.value = false
}

const createShow = async () => {
  if (!newShow.value.name) return
  
  await showsStore.createShow(
    newShow.value.name,
    userStore.currentTeam || 'Samurai',
    userStore.user?.id || ''
  )
  
  newShow.value = { name: '' }
  showCreateShowModal.value = false
}

const createShowDate = async () => {
  if (!newShowDate.value.date || !selectedShow.value) return
  
  await showsStore.createShowDate(
    selectedShow.value?.id || '',
    newShowDate.value.date,
    userStore.user?.id || ''
  )
  
  // Refresh matrix data to reflect the new show date
  await refreshMatrixData()
  
  newShowDate.value = { date: '' }
  selectedShow.value = null
  showCreateShowDateModal.value = false
}

const openUpdateShowDateModal = (show: any) => {
  const showDate = getShowDates(show.id)[0]
  if (showDate) {
    selectedShow.value = show
    selectedShowDate.value = showDate
    updateShowDateData.value = {
      date: showDate.date
    }
    showUpdateShowDateModal.value = true
  }
}

const updateShowDate = async () => {
  if (!updateShowDateData.value.date || !selectedShowDate.value) return
  
  await showsStore.updateShowDate(
    selectedShowDate.value?.id || '',
    updateShowDateData.value.date,
    userStore.user?.id || ''
  )
  
  // Refresh matrix data to reflect the update
  await refreshMatrixData()
  
  updateShowDateData.value = { date: '' }
  selectedShow.value = null
  selectedShowDate.value = null
  showUpdateShowDateModal.value = false
}

const deleteCoachingSession = async (sessionId: string) => {
  if (confirm('Are you sure you want to delete this coaching session?')) {
    const result = await coachingStore.deleteCoachingSession(sessionId)
    
    if (!result.success) {
      alert('Failed to delete coaching session: ' + result.error)
    }
  }
}

const openEditCoachModal = (session: any) => {
  editingSessionId.value = session.id
  editingCoach.value = session.coach
  showEditCoachModal.value = true
}

const updateCoachingSessionCoach = async () => {
  if (!editingSessionId.value || !editingCoach.value.trim()) return
  
  const result = await coachingStore.updateCoachingSession(editingSessionId.value, editingCoach.value.trim())
  
  if (result.success) {
    editingSessionId.value = null
    editingCoach.value = ''
    showEditCoachModal.value = false
  } else {
    alert('Failed to update coach: ' + result.error)
  }
}

const confirmDeleteShow = async (showId: string) => {
  if (confirm('Are you sure you want to delete this show?')) {
    await showsStore.deleteShow(showId)
  }
}

const deleteShow = async (showId: string) => {
  if (confirm('Are you sure you want to delete this show?')) {
    await showsStore.deleteShow(showId)
  }
}

const deleteShowDate = async (showDateId: string) => {
  if (confirm('Are you sure you want to delete this show date?')) {
    await showsStore.deleteShowDate(showDateId)
    // Refresh matrix data to reflect the deleted show date
    await refreshMatrixData()
  }
}

const openAttendanceModal = (userId: string, sessionId: string, currentStatus: string, sessionDate: string, memberName: string) => {
  selectedEvent.value = {
    type: 'coaching',
    date: sessionDate,
    title: `Coaching Session - ${memberName}`,
    userId,
    sessionId
  }
  selectedAttendanceStatus.value = currentStatus as 'present' | 'absent' | 'undecided'
  showStatusModal.value = true
}

const closeStatusModal = () => {
  showStatusModal.value = false
  selectedEvent.value = null
  selectedAttendanceStatus.value = 'present'
}

const confirmAttendanceUpdate = async () => {
  if (!selectedEvent.value) return

  const result = await coachingStore.updateAttendance(
    selectedEvent.value.userId,
    selectedEvent.value.sessionId,
    selectedAttendanceStatus.value,
    userStore.user?.role
  )
  
  if (!result.success) {
    alert(result.error)
    return
  }

  // Force refresh attendance records and matrix data
  await coachingStore.fetchAttendanceRecords(undefined, true)
  await refreshMatrixData()
  
  closeStatusModal()
}

const formatModalDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'EEEE, MMMM dd, yyyy')
}

const toggleAttendance = async (userId: string, sessionId: string, currentStatus: string) => {
  const nextStatus = getNextStatus(currentStatus)
  const result = await coachingStore.updateAttendance(userId, sessionId, nextStatus, userStore.user?.role)
  
  if (!result.success) {
    alert(result.error)
  }
}

const toggleShowAvailability = async (userId: string, showDateId: string, currentStatus: string) => {
  const nextStatus = getNextStatus(currentStatus)
  await showsStore.updateAvailability(userId, showDateId, nextStatus)
  // Refresh matrix data to reflect the availability update
  await refreshMatrixData()
}

const getNextStatus = (currentStatus: string) => {
  if (currentStatus === 'absent') return 'present'
  if (currentStatus === 'present') return 'undecided'
  return 'absent'
}



const isMemberAssigned = (memberId: string) => {
  if (!selectedShowDate.value) return false
  const assignedMembers = getAssignedMembers(selectedShowDate.value.id)
  return assignedMembers.includes(memberId)
}

const toggleMemberAssignment = (memberId: string) => {
  const index = selectedMembers.value.indexOf(memberId)
  if (index === -1) {
    selectedMembers.value.push(memberId)
  } else {
    selectedMembers.value.splice(index, 1)
  }
}

const openAssignMembersModal = (showDate: any) => {
  selectedShowDate.value = showDate
  initializeSelectedMembers()
  showAssignMembersModal.value = true
}

const initializeSelectedMembers = () => {
  if (selectedShowDate.value) {
    const assignedMembers = getAssignedMembers(selectedShowDate.value.id)
    selectedMembers.value = [...assignedMembers]
  }
}

const saveMemberAssignments = async () => {
  if (!selectedShowDate.value) return
  
  // Get current assignments
  const currentAssignments = getAssignedMembers(selectedShowDate.value.id)
  
  // Remove members that are no longer selected
  for (const memberId of currentAssignments) {
    if (!selectedMembers.value.includes(memberId)) {
      await showsStore.removeMemberFromShow(selectedShowDate.value.id, memberId)
    }
  }
  
  // Add new assignments
  for (const memberId of selectedMembers.value) {
    if (!currentAssignments.includes(memberId)) {
      await showsStore.assignMemberToShow(selectedShowDate.value.id, memberId)
    }
  }
  
  selectedMembers.value = []
  showAssignMembersModal.value = false
}

onMounted(async () => {
  if (!userStore.isAuthenticated || !userStore.isCaptain) {
    router.push('/login')
    return
  }

  // Check if stores have been initialized in this session
  const storesInitialized = sessionStorage.getItem('stores_initialized')
  
  if (!storesInitialized) {
    console.warn('⚠️ Stores not initialized, redirecting to login...')
    router.push('/login')
    return
  }
  
  // Load team members and matrix data
  await Promise.all([
    loadTeamMembers(),
    loadMatrixData()
  ])
})
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background: #f8f9fa;
}





.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.navigation-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

.tab-button {
  padding: 12px 24px;
  border: none;
  background: #f8f9fa;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tab-button.active {
  background: #667eea;
  color: white;
}

.tab-button:hover:not(.active) {
  background: #e9ecef;
}

.tab-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.section-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.primary-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.primary-button:hover {
  background: #5a6fd8;
}

.secondary-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s ease;
}

.secondary-button:hover {
  background: #5a6268;
}

.delete-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s ease;
}

.delete-button:hover {
  background: #c82333;
}

.edit-button {
  background: #ffc107;
  color: #212529;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s ease;
}

.edit-button:hover {
  background: #e0a800;
}

.coaching-sessions, .shows-list {
  display: grid;
  gap: 15px;
  margin-bottom: 30px;
}

.session-card, .show-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.session-info h3, .show-info h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.session-coach {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.show-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.session-actions, .show-actions {
  display: flex;
  gap: 10px;
}

.attendance-matrix, .availability-matrix {
  margin-top: 30px;
  margin-bottom: 40px;
}

.attendance-matrix h3, .availability-matrix h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
}

.matrix-container {
  overflow-x: auto;
  overflow-y: visible;
  position: relative;
}

.attendance-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
}

.attendance-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 1px solid #e9ecef;
}

.attendance-table :deep(.sticky-column),
.attendance-table th.sticky-column {
  position: sticky !important;
  left: 0 !important;
  z-index: 10 !important;
  background: #f8f9fa !important;
  border-right: 2px solid #dee2e6 !important;
  min-width: 150px;
}

.attendance-table td {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
}

.attendance-table :deep(.member-name),
.attendance-table td.member-name {
  font-weight: 500;
  color: #333;
  position: sticky !important;
  left: 0 !important;
  z-index: 9 !important;
  background: white !important;
  border-right: 2px solid #dee2e6 !important;
  min-width: 150px;
}

.attendance-summary {
  font-size: 12px;
  color: #666;
  margin-left: 5px;
}

.attendance-cell {
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-align: center;
  font-weight: 500;
}

.attendance-cell:hover {
  background: #f8f9fa;
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

.past-session {
  opacity: 0.7;
  /* Keep the original status colors, just reduce opacity */
}

.past-indicator {
  font-size: 10px;
  font-weight: normal;
  color: #6c757d;
}

.show-dates {
  margin-top: 30px;
}

.show-dates h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
}

.show-dates-section {
  margin-bottom: 30px;
}

.show-dates-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.show-date-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid #e9ecef;
}

.show-date-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.show-date-info .date {
  font-weight: 500;
  color: #333;
}

.show-date-info .members {
  font-size: 12px;
  color: #666;
}

.show-date-actions {
  display: flex;
  gap: 10px;
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

.modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
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

.members-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f9fa;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.member-item:hover {
  background: #e9ecef;
}

.member-item.assigned,
.member-item.assigned.unavailable,
.member-item.assigned.available,
.member-item.assigned.undecided {
  background: #d4edda;
  color: #155724;
}

.member-item.assigned:hover,
.member-item.assigned.unavailable:hover,
.member-item.assigned.available:hover,
.member-item.assigned.undecided:hover {
  background: #c3e6cb;
}

.member-name {
  font-weight: 500;
}

.member-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #6c757d;
  color: white;
}

.member-item.assigned .member-status {
  background: #28a745;
}

.member-item.unavailable {
  background: #f8d7da;
  color: #721c24;
}

.member-item.unavailable:hover {
  background: #f5c6cb;
}

.member-item.unavailable .member-status {
  background: #dc3545;
}

/* Status Modal Styles */
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
  padding: 20px 30px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-button {
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
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.close-button:hover {
  background: #f8f9fa;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 30px;
}

.modal-date {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.modal-title {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 16px;
  font-weight: 500;
}

.status-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.status-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.status-button {
  padding: 10px 20px;
  border: 2px solid #e9ecef;
  background: white;
  color: #333;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.status-button:hover {
  border-color: #007bff;
}

.status-button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.confirm-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.confirm-button:hover {
  background: #218838;
}

.member-item.undecided {
  background: #fff3cd;
  color: #856404;
}

.member-item.undecided:hover {
  background: #ffeaa7;
}

.member-item.undecided .member-status {
  background: #ffc107;
}

.member-item.available {
  background: #d4edda;
  color: #155724;
}

.member-item.available:hover {
  background: #c3e6cb;
}

.member-item.available .member-status {
  background: #28a745;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .dashboard-content {
    padding: 20px 10px;
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
  
  .navigation-tabs {
    flex-direction: column;
    gap: 10px;
  }
  
  .tab-button {
    width: 100%;
  }
  
  .section-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .primary-button {
    width: 100%;
  }
  
  .coaching-sessions,
  .shows-list {
    gap: 15px;
  }
  
  .session-card,
  .show-card {
    padding: 15px;
  }
  
  .session-actions,
  .show-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-button {
    width: 100%;
    text-align: center;
  }
  
  .attendance-matrix,
  .availability-matrix {
    overflow-x: auto;
  }
  
  .matrix-table {
    min-width: 600px;
  }
  
  .modal-content {
    width: 95%;
    max-width: none;
    margin: 10px;
  }
  
  .modal-header {
    padding: 15px 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .cancel-button,
  .primary-button {
    width: 100%;
  }
  
  .members-list {
    max-height: 200px;
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
  
  .role-badge,
  .team-badge {
    font-size: 11px;
    padding: 3px 8px;
  }
  
  .logout-button,
  .team-dashboard-button {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .session-card,
  .show-card {
    padding: 12px;
  }
  
  .modal-content {
    width: 98%;
    margin: 5px;
  }
  
  .modal-header {
    padding: 12px 15px;
  }
  
  .modal-body {
    padding: 15px;
  }
  
  .form-group input,
  .form-group textarea {
    padding: 10px;
    font-size: 13px;
  }
  
  .members-list {
    max-height: 150px;
  }
  
  .member-item {
    padding: 10px;
  }
}
</style> 