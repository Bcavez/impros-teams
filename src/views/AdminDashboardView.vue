<template>
  <div class="admin-dashboard">
    <header class="dashboard-header">
      <div class="header-content">
        <h1>Admin Dashboard</h1>
        <div class="user-info">
          <span>Welcome, {{ userStore.user?.name }}</span>
          <span class="role-badge">{{ userStore.user?.role }}</span>
          <span v-if="userStore.currentTeam" class="team-badge">{{ userStore.currentTeam }}</span>
          <button @click="handleLogout" class="logout-button">Logout</button>
        </div>
      </div>
    </header>

    <div class="dashboard-content">
      <div class="navigation-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'coaching' }]"
          @click="activeTab = 'coaching'"
        >
          Coaching Management
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'shows' }]"
          @click="activeTab = 'shows'"
        >
          Show Management
        </button>
      </div>

      <!-- Coaching Management -->
      <div v-if="activeTab === 'coaching'" class="tab-content">
        <div class="section-header">
          <h2>Coaching Sessions</h2>
          <button @click="showCreateCoachingModal = true" class="primary-button">
            Create Coaching Session
          </button>
        </div>

        <div class="coaching-sessions">
          <div v-for="session in teamCoachingSessions" :key="session.id" class="session-card">
            <div class="session-info">
              <h3>{{ formatDate(session.date) }}</h3>
              <p class="session-team">{{ session.team }}</p>
            </div>
            <div class="session-actions">
              <button @click="deleteCoachingSession(session.id)" class="delete-button">
                Delete
              </button>
            </div>
          </div>
        </div>

        <div class="attendance-matrix">
          <h3>Attendance Matrix</h3>
          <div class="matrix-container">
            <table class="attendance-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th v-for="session in teamCoachingSessions" :key="session.id">
                    {{ formatDate(session.date) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in attendanceMatrix" :key="member.userId">
                  <td class="member-name">{{ member.userName }}</td>
                  <td 
                    v-for="session in member.sessions" 
                    :key="session.sessionId"
                    :class="[
                      'attendance-cell',
                      `status-${session.status}`
                    ]"
                    @click="toggleAttendance(member.userId, session.sessionId, session.status)"
                  >
                    {{ getStatusLabel(session.status) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Show Management -->
      <div v-if="activeTab === 'shows'" class="tab-content">
        <div class="section-header">
          <h2>Shows</h2>
          <button @click="showCreateShowModal = true" class="primary-button">
            Create Show
          </button>
        </div>

        <div class="shows-list">
          <div v-for="show in teamShows" :key="show.id" class="show-card">
            <div class="show-info">
              <h3>{{ show.name }}</h3>
              <p>{{ show.description }}</p>
            </div>
            <div class="show-actions">
              <button @click="showCreateShowDateModal = true; selectedShow = show" class="secondary-button">
                Add Date
              </button>
              <button @click="deleteShow(show.id)" class="delete-button">
                Delete
              </button>
            </div>
          </div>
        </div>

        <div class="show-dates">
          <h3>Show Dates</h3>
          <div v-for="show in teamShows" :key="show.id" class="show-dates-section">
            <h4>{{ show.name }}</h4>
            <div v-for="showDate in getShowDates(show.id)" :key="showDate.id" class="show-date-card">
              <div class="show-date-info">
                <span class="date">{{ formatDate(showDate.date) }}</span>
                <span class="members">{{ showDate.assignedMembers.length }}/{{ showDate.maxMembers }} members</span>
              </div>
              <div class="show-date-actions">
                <button @click="showAssignMembersModal = true; selectedShowDate = showDate" class="secondary-button">
                  Assign Members
                </button>
                <button @click="deleteShowDate(showDate.id)" class="delete-button">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="availability-matrix">
          <h3>Availability Matrix</h3>
          <div class="matrix-container">
            <table class="attendance-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th v-for="showDate in allTeamShowDates" :key="showDate.id">
                    {{ getShowName(showDate.showId) }} - {{ formatDate(showDate.date) }}
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
      </div>
    </div>

    <!-- Create Coaching Modal -->
    <div v-if="showCreateCoachingModal" class="modal-overlay" @click="showCreateCoachingModal = false">
      <div class="modal" @click.stop>
        <h3>Create Coaching Session</h3>
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
          <div class="modal-actions">
            <button type="button" @click="showCreateCoachingModal = false" class="cancel-button">
              Cancel
            </button>
            <button type="submit" class="primary-button">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Show Modal -->
    <div v-if="showCreateShowModal" class="modal-overlay" @click="showCreateShowModal = false">
      <div class="modal" @click.stop>
        <h3>Create Show</h3>
        <form @submit.prevent="createShow">
          <div class="form-group">
            <label for="show-name">Show Name</label>
            <input
              id="show-name"
              v-model="newShow.name"
              type="text"
              required
              placeholder="Enter show name"
            />
          </div>
          <div class="form-group">
            <label for="show-description">Description</label>
            <textarea
              id="show-description"
              v-model="newShow.description"
              required
              placeholder="Enter show description"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showCreateShowModal = false" class="cancel-button">
              Cancel
            </button>
            <button type="submit" class="primary-button">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Show Date Modal -->
    <div v-if="showCreateShowDateModal" class="modal-overlay" @click="showCreateShowDateModal = false">
      <div class="modal" @click.stop>
        <h3>Add Show Date</h3>
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
          <div class="form-group">
            <label for="max-members">Max Members</label>
            <input
              id="max-members"
              v-model="newShowDate.maxMembers"
              type="number"
              min="1"
              max="5"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showCreateShowDateModal = false" class="cancel-button">
              Cancel
            </button>
            <button type="submit" class="primary-button">
              Create
            </button>
          </div>
        </form>
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

const router = useRouter()
const userStore = useUserStore()
const coachingStore = useCoachingStore()
const showsStore = useShowsStore()

const activeTab = ref<'coaching' | 'shows'>('coaching')

// Modal states
const showCreateCoachingModal = ref(false)
const showCreateShowModal = ref(false)
const showCreateShowDateModal = ref(false)
const showAssignMembersModal = ref(false)

// Form data
const newCoachingDate = ref('')
const newShow = ref({
  name: '',
  description: ''
})
const newShowDate = ref({
  date: '',
  maxMembers: 5
})

const selectedShow = ref<any>(null)
const selectedShowDate = ref<any>(null)

// Computed properties
const teamCoachingSessions = computed(() => {
  return coachingStore.sessionsByTeam(userStore.currentTeam || 'Samurai')
})

const teamShows = computed(() => {
  return showsStore.showsByTeam(userStore.currentTeam || 'Samurai')
})

const allTeamShowDates = computed(() => {
  return showsStore.showDates.filter(showDate => {
    const show = showsStore.shows.find(s => s.id === showDate.showId)
    return show && show.team === userStore.currentTeam
  })
})

const attendanceMatrix = computed(() => {
  return coachingStore.getAttendanceMatrix(userStore.currentTeam || 'Samurai')
})

const availabilityMatrix = computed(() => {
  return showsStore.getAvailabilityMatrix(userStore.currentTeam || 'Samurai')
})

// Methods
const formatDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'MMM dd, yyyy')
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return 'Present'
    case 'absent': return 'Absent'
    case 'undecided': return 'Undecided'
    default: return 'Absent'
  }
}

const getShowDates = (showId: string) => {
  return showsStore.datesByShow(showId)
}

const getShowName = (showId: string) => {
  const show = showsStore.shows.find(s => s.id === showId)
  return show?.name || 'Unknown Show'
}

const createCoachingSession = async () => {
  if (!newCoachingDate.value) return
  
  await coachingStore.createCoachingSession(
    newCoachingDate.value,
    userStore.currentTeam || 'Samurai',
    userStore.user?.id || ''
  )
  
  newCoachingDate.value = ''
  showCreateCoachingModal.value = false
}

const createShow = async () => {
  if (!newShow.value.name || !newShow.value.description) return
  
  await showsStore.createShow(
    newShow.value.name,
    newShow.value.description,
    userStore.currentTeam || 'Samurai',
    userStore.user?.id || ''
  )
  
  newShow.value = { name: '', description: '' }
  showCreateShowModal.value = false
}

const createShowDate = async () => {
  if (!newShowDate.value.date || !selectedShow.value) return
  
  await showsStore.createShowDate(
    selectedShow.value?.id || '',
    newShowDate.value.date,
    newShowDate.value.maxMembers,
    userStore.user?.id || ''
  )
  
  newShowDate.value = { date: '', maxMembers: 5 }
  selectedShow.value = null
  showCreateShowDateModal.value = false
}

const deleteCoachingSession = async (sessionId: string) => {
  if (confirm('Are you sure you want to delete this coaching session?')) {
    await coachingStore.deleteCoachingSession(sessionId)
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
  }
}

const toggleAttendance = async (userId: string, sessionId: string, currentStatus: string) => {
  const nextStatus = getNextStatus(currentStatus)
  await coachingStore.updateAttendance(userId, sessionId, nextStatus)
}

const toggleShowAvailability = async (userId: string, showDateId: string, currentStatus: string) => {
  const nextStatus = getNextStatus(currentStatus)
  await showsStore.updateAvailability(userId, showDateId, nextStatus)
}

const getNextStatus = (currentStatus: string) => {
  if (currentStatus === 'absent') return 'present'
  if (currentStatus === 'present') return 'undecided'
  return 'absent'
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  if (!userStore.isAuthenticated || !userStore.canAccessAdmin) {
    router.push('/login')
  }
})
</script>

<style scoped>
.admin-dashboard {
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

.role-badge {
  background: #28a745;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
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

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
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

.session-team {
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
}

.attendance-matrix h3, .availability-matrix h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
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
</style> 