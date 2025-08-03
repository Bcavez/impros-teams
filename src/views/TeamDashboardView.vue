<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="header-content">
        <h1>Team Dashboard</h1>
        <div class="user-info">
          <span>Welcome, {{ userStore.user?.name }}</span>
          <span class="team-badge">{{ userStore.currentTeam || 'No Team' }}</span>
          <button @click="handleLogout" class="logout-button">Logout</button>
        </div>
      </div>
    </header>

    <div class="dashboard-content">
      <div class="calendar-section">
        <h2>Calendar</h2>
        <div class="calendar-controls">
          <button @click="previousMonth" class="calendar-nav">‹</button>
          <h3>{{ currentMonthYear }}</h3>
          <button @click="nextMonth" class="calendar-nav">›</button>
        </div>

        <div class="calendar">
          <div class="calendar-header">
            <div v-for="day in weekDays" :key="day" class="calendar-day-header">
              {{ day }}
            </div>
          </div>
          
          <div class="calendar-grid">
            <div
              v-for="day in calendarDays"
              :key="day.date"
              :class="[
                'calendar-day',
                {
                  'other-month': !day.isCurrentMonth,
                  'today': day.isToday,
                  'has-coaching': day.hasCoaching,
                  'has-show': day.hasShow,
                  'coaching-present': day.coachingStatus === 'present',
                  'coaching-absent': day.coachingStatus === 'absent',
                  'coaching-undecided': day.coachingStatus === 'undecided',
                  'show-present': day.showStatus === 'present',
                  'show-absent': day.showStatus === 'absent',
                  'show-undecided': day.showStatus === 'undecided'
                }
              ]"
              @click="handleDayClick(day)"
            >
              <span class="day-number">{{ day.dayNumber }}</span>
              <div v-if="day.hasCoaching" class="event-indicator coaching">
                <span class="event-dot"></span>
                <span class="event-label">Coaching</span>
              </div>
              <div v-if="day.hasShow" class="event-indicator show">
                <span class="event-dot"></span>
                <span class="event-label">{{ day.showName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="status-legend">
        <h3>Status Legend</h3>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color present"></div>
            <span>Present</span>
          </div>
          <div class="legend-item">
            <div class="legend-color absent"></div>
            <span>Absent</span>
          </div>
          <div class="legend-item">
            <div class="legend-color undecided"></div>
            <span>Undecided</span>
          </div>
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO } from 'date-fns'

const router = useRouter()
const userStore = useUserStore()
const coachingStore = useCoachingStore()
const showsStore = useShowsStore()

const currentDate = ref(new Date())

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const currentMonthYear = computed(() => {
  return format(currentDate.value, 'MMMM yyyy')
})

const calendarDays = computed(() => {
  const start = startOfMonth(currentDate.value)
  const end = endOfMonth(currentDate.value)
  const days = eachDayOfInterval({ start, end })
  
  // Add days from previous month to fill first week
  const firstDayOfWeek = start.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = subMonths(start, 1)
    prevDate.setDate(start.getDate() - i - 1)
    days.unshift(prevDate)
  }
  
  // Add days from next month to fill last week
  const lastDayOfWeek = end.getDay()
  for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
    const nextDate = addMonths(end, 1)
    nextDate.setDate(end.getDate() + i)
    days.push(nextDate)
  }

  return days.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const isCurrentMonth = isSameMonth(date, currentDate.value)
    const isTodayDate = isToday(date)
    
    // Check for coaching sessions
    const coachingSession = coachingStore.coachingSessions.find(session => 
      session.date === dateStr && session.team === userStore.currentTeam
    )
    
    // Check for shows
    const showDate = showsStore.showDates.find(showDate => {
      const show = showsStore.shows.find(s => s.id === showDate.showId)
      return showDate.date === dateStr && show?.team === userStore.currentTeam
    })
    
    const show = showDate ? showsStore.shows.find(s => s.id === showDate.showId) : null

    // Get user's status for this date
    const coachingStatus = coachingSession ? 
      coachingStore.getAttendanceForUser(userStore.user?.id || '', coachingSession.id) : null
    
    const showStatus = showDate ? 
      showsStore.getAvailabilityForUser(userStore.user?.id || '', showDate.id) : null

    return {
      date: dateStr,
      dayNumber: format(date, 'd'),
      isCurrentMonth,
      isToday: isTodayDate,
      hasCoaching: !!coachingSession,
      hasShow: !!showDate,
      showName: show?.name || '',
      coachingStatus,
      showStatus
    }
  })
})

const previousMonth = () => {
  currentDate.value = subMonths(currentDate.value, 1)
}

const nextMonth = () => {
  currentDate.value = addMonths(currentDate.value, 1)
}

const handleDayClick = async (day: any) => {
  if (!day.isCurrentMonth) return

  if (day.hasCoaching) {
    const coachingSession = coachingStore.coachingSessions.find(session => 
      session.date === day.date && session.team === userStore.currentTeam
    )
    
    if (coachingSession) {
      const currentStatus = coachingStore.getAttendanceForUser(userStore.user?.id || '', coachingSession.id)
      const nextStatus = getNextStatus(currentStatus)
      await coachingStore.updateAttendance(userStore.user?.id || '', coachingSession.id, nextStatus)
    }
  }

  if (day.hasShow) {
    const showDate = showsStore.showDates.find(showDate => {
      const show = showsStore.shows.find(s => s.id === showDate.showId)
      return showDate.date === day.date && show?.team === userStore.currentTeam
    })
    
    if (showDate) {
      const currentStatus = showsStore.getAvailabilityForUser(userStore.user?.id || '', showDate.id)
      const nextStatus = getNextStatus(currentStatus)
      await showsStore.updateAvailability(userStore.user?.id || '', showDate.id, nextStatus)
    }
  }
}

const getNextStatus = (currentStatus: 'absent' | 'present' | 'undecided' | null) => {
  if (!currentStatus || currentStatus === 'absent') return 'present'
  if (currentStatus === 'present') return 'undecided'
  return 'absent'
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
  }
})
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

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.calendar-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.calendar-section h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
}

.calendar-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.calendar-nav {
  background: #667eea;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: background-color 0.3s ease;
}

.calendar-nav:hover {
  background: #5a6fd8;
}

.calendar-controls h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  min-width: 150px;
  text-align: center;
}

.calendar {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.calendar-day-header {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 100px;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  position: relative;
}

.calendar-day:hover {
  background: #f8f9fa;
}

.calendar-day.other-month {
  background: #f8f9fa;
  color: #adb5bd;
}

.calendar-day.today {
  background: #e3f2fd;
  font-weight: 600;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.event-indicator {
  margin-top: 4px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.event-indicator.coaching .event-dot {
  background: #28a745;
}

.event-indicator.show .event-dot {
  background: #007bff;
}

.event-label {
  color: #666;
  font-weight: 500;
}

/* Status colors */
.calendar-day.coaching-present {
  background: #d4edda;
}

.calendar-day.coaching-absent {
  background: #f8d7da;
}

.calendar-day.coaching-undecided {
  background: #fff3cd;
}

.calendar-day.show-present {
  background: #d1ecf1;
}

.calendar-day.show-absent {
  background: #f5c6cb;
}

.calendar-day.show-undecided {
  background: #ffeaa7;
}

.status-legend {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.status-legend h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.legend-items {
  display: flex;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.present {
  background: #28a745;
}

.legend-color.absent {
  background: #dc3545;
}

.legend-color.undecided {
  background: #ffc107;
}
</style> 