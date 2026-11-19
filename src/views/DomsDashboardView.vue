<template>
  <div class="doms-dashboard">
    <MainNavigation />

    <div class="dashboard-content">
      <div class="page-header">
        <h1>{{ DOMS_LABELS.title }}</h1>
      </div>

      <div v-if="isLoading" class="state-message">Chargement...</div>
      <div v-else-if="isError" class="state-message error">
        Échec du chargement des données.
        <button class="secondary-button" @click="refetchAll">Réessayer</button>
      </div>

      <template v-else>
        <div class="section">
          <button class="primary-button" data-test="create-show" @click="openCreateModal">
            {{ DOMS_LABELS.createShow }}
          </button>
        </div>

        <!-- Shows table -->
        <div class="section">
          <div class="section-header">
            <h2>Spectacles</h2>
            <button class="toggle-button" data-test="toggle-shows" @click="showAllShows = !showAllShows">
              {{ showAllShows ? DOMS_LABELS.showUpcomingOnly : DOMS_LABELS.showAll }}
            </button>
          </div>

          <p v-if="visibleShows.length === 0" class="empty-state">{{ EMPTY_STATES.noShows }}</p>
          <div v-else class="matrix-container">
            <table class="matrix-table" data-test="shows-table">
              <thead>
                <tr>
                  <th class="sticky-column">Membre</th>
                  <th
                    v-for="column in showColumns"
                    :key="column.key"
                    :class="['show-column-header', { 'past-column': isPast(column.date), 'column-doms': column.hasDoms }]"
                    :data-test="`show-column-${column.key}`"
                  >
                    <div class="show-date">
                      {{ formatDate(column.date) }}
                      <span v-if="isPast(column.date)" class="past-indicator">{{ DOMS_LABELS.past }}</span>
                    </div>
                    <div
                      v-for="show in column.shows"
                      :key="show.key"
                      :class="['show-card', show.kind]"
                      :data-test="`show-header-${show.key}`"
                    >
                      <div class="show-name">{{ show.name }}</div>
                      <div class="show-tags">
                        <span
                          v-for="team in show.teams"
                          :key="team"
                          :class="['team-pill', teamClass(team)]"
                        >{{ team }}</span>
                      </div>
                      <div v-if="show.kind === 'doms'" class="header-actions">
                        <button class="mini-button" data-test="edit-show" @click="openEditModal(show)">Modifier</button>
                        <button class="mini-button" data-test="assign-show" @click="openCastModal(show)">
                          Assigner
                        </button>
                        <button class="mini-button danger" data-test="delete-show" @click="deleteShow(show)">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groups" :key="group.team">
                  <tr class="group-row">
                    <td :colspan="showColumns.length + 1">
                      <span :class="['team-pill', teamClass(group.team)]">{{ group.team }}</span>
                    </td>
                  </tr>
                  <tr v-for="member in group.members" :key="member.id">
                    <td class="member-name sticky-cell">{{ member.name }}</td>
                    <td
                      v-for="column in showColumns"
                      :key="column.key"
                      :data-test="`column-cell-${member.id}-${column.key}`"
                      :class="['show-cell', { 'column-doms': column.hasDoms, 'past-column': isPast(column.date) }]"
                    >
                      <template v-if="columnCells(member.id, column).length > 0">
                        <div
                          v-for="cell in columnCells(member.id, column)"
                          :key="cell.showKey"
                          :data-test="`cell-${member.id}-${cell.showKey}`"
                          :class="[
                            'cell-chip',
                            `status-${cell.status}`,
                            { clickable: isCellClickable(cell), 'chip-doms': cell.kind === 'doms' },
                          ]"
                          @click="onCellClick(member.id, cell)"
                        >
                          {{ getStatusLabel(cell.status) }}<span v-if="cell.inCast" class="cast-star"> ★</span>
                        </div>
                      </template>
                      <div v-else class="cell-chip not-applicable">{{ DOMS_LABELS.notApplicable }}</div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Coaching table -->
        <div class="section">
          <div class="section-header">
            <h2>Présence au Coaching</h2>
            <button class="toggle-button" data-test="toggle-coaching" @click="showAllCoaching = !showAllCoaching">
              {{ showAllCoaching ? DOMS_LABELS.showUpcomingOnly : DOMS_LABELS.showAll }}
            </button>
          </div>

          <p v-if="visibleDates.length === 0" class="empty-state">{{ EMPTY_STATES.noCoachingSessions }}</p>
          <div v-else class="matrix-container">
            <table class="matrix-table" data-test="coaching-table">
              <thead>
                <tr>
                  <th class="sticky-column">Membre</th>
                  <th v-for="date in visibleDates" :key="date" :class="{ 'past-column': isPast(date) }">
                    {{ formatDate(date) }}
                    <span v-if="isPast(date)" class="past-indicator">{{ DOMS_LABELS.past }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groups" :key="group.team">
                  <tr class="group-row">
                    <td :colspan="visibleDates.length + 1">
                      <span :class="['team-pill', teamClass(group.team)]">{{ group.team }}</span>
                    </td>
                  </tr>
                  <tr v-for="member in group.members" :key="member.id">
                    <td class="member-name sticky-cell">
                      {{ member.name }}
                      <span class="attendance-summary">({{ coachingSummary(member.id) }})</span>
                    </td>
                    <td
                      v-for="cell in visibleCoachingCells(member.id)"
                      :key="cell.date"
                      :class="['matrix-cell', `status-${cell.status}`, { 'past-column': isPast(cell.date) }]"
                    >
                      {{ getStatusLabel(cell.status) }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- Create / edit modal -->
    <div v-if="showFormModal" class="modal-overlay" @click="closeFormModal">
      <div class="modal" @click.stop>
        <h3>{{ editingShowId ? 'Modifier le Spectacle' : DOMS_LABELS.createShow }}</h3>
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label for="doms-show-name">Nom du Spectacle</label>
            <input id="doms-show-name" v-model="form.name" type="text" required />
          </div>
          <div class="form-group">
            <label for="doms-show-date">Date</label>
            <input id="doms-show-date" v-model="form.date" type="date" required />
          </div>
          <div class="form-group">
            <label>Équipes</label>
            <label v-for="team in TEAMS" :key="team" class="checkbox-row">
              <input v-model="form.teams" type="checkbox" :value="team" :data-test="`team-${team}`" />
              {{ team }}
            </label>
          </div>
          <p v-if="formError" class="form-error" data-test="form-error">{{ formError }}</p>
          <div class="modal-actions">
            <button type="button" class="cancel-button" @click="closeFormModal">Annuler</button>
            <button type="submit" class="primary-button" data-test="submit-form">
              {{ editingShowId ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Cast modal -->
    <div v-if="castShow" class="modal-overlay" @click="castShow = null">
      <div class="modal cast-modal" @click.stop>
        <h3>Assigner Membres — {{ castShow.name }}</h3>
        <p class="cast-count" data-test="cast-count">{{ castSelection.length }} sélectionné(s)</p>
        <div class="members-list">
          <template v-for="group in castGroups" :key="group.team">
            <div class="cast-group">
              <span :class="['team-pill', teamClass(group.team)]">{{ group.team }}</span>
            </div>
            <div
              v-for="member in group.members"
              :key="member.id"
              :class="['member-item', { assigned: castSelection.includes(member.id) }]"
              @click="toggleCast(member.id)"
            >
              <span class="member-check">{{ castSelection.includes(member.id) ? '✓' : '' }}</span>
              <span class="member-label">{{ member.name }}</span>
              <span :class="['availability-chip', `availability-${castAvailability(member.id)}`]">
                {{ getStatusLabel(castAvailability(member.id)) }}
              </span>
            </div>
          </template>
        </div>
        <div class="modal-actions">
          <button type="button" class="cancel-button" @click="castShow = null">Annuler</button>
          <button type="button" class="primary-button" data-test="save-cast" @click="saveCast">
            Sauvegarder Assignations
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { format, parseISO } from 'date-fns'
import MainNavigation from '@/components/MainNavigation.vue'
import { queryClient } from '@/lib/query-client'
import { TEAMS, type Team } from '@/lib/teams'
import { isPastDate } from '@/lib/permissions'
import { ATTENDANCE_STATUS_LABELS, CONFIRM_MESSAGES, DOMS_LABELS, EMPTY_STATES } from '@/lib/strings'
import {
  buildDomsCoachingMatrix,
  buildDomsShowsMatrix,
  groupMembersByTeam,
  groupShowsByDate,
  mergeCoachingDates,
  toDomsViewShows,
  type AttendanceStatus,
  type ShowCell,
  type ShowColumn,
  type ViewShow,
} from '@/lib/doms'
import {
  domsShowsKey,
  domsShowTeamsKey,
  domsAvailabilityKey,
  domsAssignmentsKey,
  domsMembersKey,
  fetchDomsShows,
  fetchDomsShowTeams,
  fetchDomsAvailability,
  fetchDomsAssignments,
  fetchDomsMembers,
} from '@/queries/doms'
import { showsKey, showAssignmentsKey, showAvailabilityKey, fetchShows, fetchShowAssignments, fetchShowAvailability } from '@/queries/shows'
import { coachingSessionsKey, attendanceRecordsKey, fetchCoachingSessions, fetchAttendanceRecords } from '@/queries/coaching'
import { useDomsShowsStore } from '@/stores/domsShows'

const domsStore = useDomsShowsStore()

// --- Data (RLS returns every row to a doms) -------------------------------------------------
const members = useQuery({ queryKey: domsMembersKey(), queryFn: fetchDomsMembers }, queryClient)
const captainShows = useQuery({ queryKey: showsKey(null), queryFn: () => fetchShows() }, queryClient)
const captainAvailability = useQuery({ queryKey: showAvailabilityKey(), queryFn: fetchShowAvailability }, queryClient)
const captainAssignments = useQuery({ queryKey: showAssignmentsKey(), queryFn: fetchShowAssignments }, queryClient)
const domsShows = useQuery({ queryKey: domsShowsKey(null), queryFn: () => fetchDomsShows() }, queryClient)
const domsTeams = useQuery({ queryKey: domsShowTeamsKey(), queryFn: fetchDomsShowTeams }, queryClient)
const domsAvailability = useQuery({ queryKey: domsAvailabilityKey(), queryFn: fetchDomsAvailability }, queryClient)
const domsAssignments = useQuery({ queryKey: domsAssignmentsKey(), queryFn: fetchDomsAssignments }, queryClient)
const sessions = useQuery({ queryKey: coachingSessionsKey(null), queryFn: () => fetchCoachingSessions() }, queryClient)
const attendance = useQuery({ queryKey: attendanceRecordsKey(), queryFn: fetchAttendanceRecords }, queryClient)

const allQueries = [
  members, captainShows, captainAvailability, captainAssignments, domsShows, domsTeams,
  domsAvailability, domsAssignments, sessions, attendance,
]
const isLoading = computed(() => allQueries.some((q) => q.isLoading.value))
const isError = computed(() => allQueries.some((q) => q.isError.value))
const refetchAll = () => allQueries.forEach((q) => q.refetch())

// --- Derived data ---------------------------------------------------------------------------
const memberList = computed(() => members.data.value ?? [])
const groups = computed(() => groupMembersByTeam(memberList.value))

const viewShows = computed<ViewShow[]>(() =>
  toDomsViewShows(
    (captainShows.data.value ?? []) as { id: string; name: string; date: string; team: Team }[],
    domsShows.data.value ?? [],
    domsTeams.data.value ?? [],
  ),
)

const showsMatrix = computed(() => {
  const rows = buildDomsShowsMatrix(
    memberList.value,
    viewShows.value,
    { captain: captainAvailability.data.value ?? [], doms: domsAvailability.data.value ?? [] },
    { captain: captainAssignments.data.value ?? [], doms: domsAssignments.data.value ?? [] },
  )
  return new Map(rows.map((r) => [r.member.id, r.cells]))
})

const mergedDates = computed(() => mergeCoachingDates(sessions.data.value ?? []))
const coachingMatrix = computed(
  () =>
    new Map(
      buildDomsCoachingMatrix(memberList.value, mergedDates.value, attendance.data.value ?? []).map((r) => [
        r.member.id,
        r,
      ]),
    ),
)

// --- Upcoming-only toggles ------------------------------------------------------------------
const showAllShows = ref(false)
const showAllCoaching = ref(false)
const isPast = (date: string) => isPastDate(date)
const teamClass = (team: string) => `team-${team.toLowerCase()}`

const visibleShows = computed(() =>
  showAllShows.value ? viewShows.value : viewShows.value.filter((s) => !isPast(s.date)),
)
const showColumns = computed(() => groupShowsByDate(visibleShows.value))
/** The member's applicable shows for one date column (usually 0 or 1; N/A when empty). */
const columnCells = (memberId: string, column: ShowColumn): ShowCell[] => {
  const keys = new Set(column.shows.map((s) => s.key))
  return (showsMatrix.value.get(memberId) ?? []).filter((c) => keys.has(c.showKey) && c.applicable)
}

const visibleDates = computed(() =>
  mergedDates.value.map((d) => d.date).filter((d) => showAllCoaching.value || !isPast(d)),
)
const visibleCoachingCells = (memberId: string) =>
  (coachingMatrix.value.get(memberId)?.cells ?? []).filter((c) => visibleDates.value.includes(c.date))
// The summary covers ALL past merged dates, regardless of the toggle.
const coachingSummary = (memberId: string) => {
  const s = coachingMatrix.value.get(memberId)?.summary
  return `${s?.present ?? 0}/${s?.total ?? 0}`
}

// --- Formatting -----------------------------------------------------------------------------
const formatDate = (dateStr: string) => format(parseISO(dateStr), 'MMM dd, yyyy')
const getStatusLabel = (status: string) => ATTENDANCE_STATUS_LABELS[status] ?? ATTENDANCE_STATUS_LABELS.present

// --- Availability cycling (doms shows only) -------------------------------------------------
const nextStatus = (s: AttendanceStatus): AttendanceStatus =>
  s === 'absent' ? 'present' : s === 'present' ? 'undecided' : 'absent'

const isCellClickable = (cell: ShowCell) => cell.kind === 'doms' && cell.applicable

const onCellClick = async (memberId: string, cell: ShowCell) => {
  if (!isCellClickable(cell)) return
  const result = await domsStore.setDomsAvailability(memberId, cell.showId, nextStatus(cell.status))
  if (!result.success) alert(result.error)
}

// --- Create / edit modal --------------------------------------------------------------------
const showFormModal = ref(false)
const editingShowId = ref<string | null>(null)
const formError = ref('')
const form = ref<{ name: string; date: string; teams: Team[] }>({ name: '', date: '', teams: [] })

const openCreateModal = () => {
  editingShowId.value = null
  form.value = { name: '', date: '', teams: [] }
  formError.value = ''
  showFormModal.value = true
}

const openEditModal = (show: ViewShow) => {
  editingShowId.value = show.id
  form.value = { name: show.name, date: show.date, teams: [...show.teams] }
  formError.value = ''
  showFormModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
}

const submitForm = async () => {
  if (form.value.teams.length === 0) {
    formError.value = 'Sélectionnez au moins une équipe'
    return
  }

  if (editingShowId.value) {
    const current = viewShows.value.find((s) => s.kind === 'doms' && s.id === editingShowId.value)
    const removed = (current?.teams ?? []).filter((t) => !form.value.teams.includes(t))
    if (
      removed.length > 0 &&
      !confirm(
        `Retirer ${removed.join(', ')} supprimera la disponibilité et l'assignation des membres de ces équipes pour ce spectacle. Continuer ?`,
      )
    ) {
      return
    }
  }

  const result = editingShowId.value
    ? await domsStore.updateDomsShow(editingShowId.value, form.value.name, form.value.date, form.value.teams)
    : await domsStore.createDomsShow(form.value.name, form.value.date, form.value.teams)

  if (!result.success) {
    formError.value = result.error ?? 'Échec'
    return
  }
  showFormModal.value = false
}

const deleteShow = async (show: ViewShow) => {
  if (!confirm(CONFIRM_MESSAGES.deleteShow)) return
  const result = await domsStore.deleteDomsShow(show.id)
  if (!result.success) alert(result.error)
}

// --- Cast modal (uncapped; availability is advisory) ----------------------------------------
const castShow = ref<ViewShow | null>(null)
const castSelection = ref<string[]>([])

const currentCast = (showId: string) =>
  (domsAssignments.data.value ?? []).filter((a) => a.show_id === showId).map((a) => a.user_id)

const openCastModal = (show: ViewShow) => {
  castShow.value = show
  castSelection.value = currentCast(show.id)
}

const castGroups = computed(() =>
  castShow.value ? groups.value.filter((g) => castShow.value!.teams.includes(g.team)) : [],
)

const castAvailability = (memberId: string): AttendanceStatus => {
  if (!castShow.value) return 'undecided'
  return (
    (domsAvailability.data.value ?? []).find((a) => a.user_id === memberId && a.show_id === castShow.value!.id)
      ?.status ?? 'undecided'
  )
}

const toggleCast = (memberId: string) => {
  const i = castSelection.value.indexOf(memberId)
  if (i === -1) castSelection.value.push(memberId)
  else castSelection.value.splice(i, 1)
}

const saveCast = async () => {
  if (!castShow.value) return
  const result = await domsStore.saveCast(castShow.value.id, currentCast(castShow.value.id), castSelection.value)
  if (!result.success) {
    alert((result as { error?: string }).error)
    return
  }
  castShow.value = null
}
</script>

<style scoped>
.doms-dashboard {
  min-height: 100vh;
  background: #f8f9fa;
}
.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}
.page-header {
  text-align: center;
  margin-bottom: 30px;
}
.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}
.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}
.state-message {
  text-align: center;
  color: #666;
  padding: 40px;
}
.state-message.error {
  color: #721c24;
}
.empty-state {
  color: #666;
  text-align: center;
  padding: 20px;
}
.primary-button,
.secondary-button,
.cancel-button,
.toggle-button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  padding: 10px 20px;
}
.primary-button {
  background: #667eea;
  color: white;
}
.secondary-button,
.cancel-button {
  background: #6c757d;
  color: white;
}
.toggle-button {
  background: #e9ecef;
  color: #333;
}
.matrix-container {
  overflow-x: auto;
}
.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.matrix-table th,
.matrix-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e9ecef;
  text-align: left;
  vertical-align: top;
}
.matrix-table th {
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
  min-width: 140px;
}
.sticky-column,
.sticky-cell {
  position: sticky;
  left: 0;
  z-index: 5;
  border-right: 2px solid #dee2e6;
  min-width: 150px;
}
.sticky-column {
  background: #f8f9fa;
}
.sticky-cell {
  background: white;
  font-weight: 500;
}
.group-row td {
  background: #eef0f4;
  font-weight: 600;
  color: #333;
}
.matrix-cell {
  text-align: center;
  font-weight: 500;
}
.matrix-cell.clickable {
  cursor: pointer;
}
.matrix-cell.clickable:hover {
  filter: brightness(0.96);
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
.not-applicable {
  background: #f1f3f5;
  color: #adb5bd;
}
.cast-star {
  color: #b8860b;
}
.past-column {
  opacity: 0.7;
}
.past-indicator {
  font-size: 10px;
  font-weight: normal;
  color: #6c757d;
}
.attendance-summary {
  font-size: 12px;
  color: #666;
  margin-left: 5px;
}
.show-column-header {
  min-width: 180px;
  text-align: center !important;
}
.show-column-header.column-doms {
  min-width: 190px;
}
.show-date {
  font-size: 13px;
  font-weight: 600;
  color: #343a40;
  margin-bottom: 8px;
}
.show-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 6px;
}
.show-card.doms {
  background: linear-gradient(135deg, #f3ecff 0%, #e9ddff 100%);
  border-color: #b79df0;
  border-left: 4px solid #6f42c1;
}
.show-name {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  color: #212529;
  word-break: break-word;
}
.show-cell {
  text-align: center;
  vertical-align: middle !important;
  padding: 6px 8px !important;
}
.matrix-table th.column-doms,
.matrix-table td.column-doms {
  background-color: #f8f4ff;
}
.cell-chip {
  border-radius: 6px;
  padding: 6px 8px;
  font-weight: 500;
  font-size: 13px;
}
.cell-chip + .cell-chip {
  margin-top: 4px;
}
.cell-chip.chip-doms {
  border-left: 3px solid #6f42c1;
}
.cell-chip.clickable {
  cursor: pointer;
}
.cell-chip.clickable:hover {
  filter: brightness(0.95);
}
.show-tags {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.team-pill {
  display: inline-block;
  white-space: nowrap;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #667eea;
  color: white;
}
.team-pill.doms {
  background: #6f42c1;
}
.team-pill.team-samurai {
  background: #27ae60;
}
.team-pill.team-gladiator {
  background: #e74c3c;
}
.team-pill.team-viking {
  background: #3498db;
}
.header-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(111, 66, 193, 0.25);
}
.mini-button {
  box-shadow: 0 0 0 1px #ced4da inset;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  background: #e9ecef;
  color: #333;
}
.mini-button.danger {
  box-shadow: none;
  background: #dc3545;
  color: white;
}
.modal-overlay {
  position: fixed;
  inset: 0;
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
}
.form-group {
  margin-bottom: 16px;
}
.form-group > label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}
.form-group input[type='text'],
.form-group input[type='date'] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.checkbox-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}
.form-error {
  color: #721c24;
  font-size: 14px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.cast-modal {
  max-width: 480px;
}
.cast-count {
  margin: -10px 0 14px;
  font-size: 13px;
  color: #6c757d;
}
.members-list {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 10px;
}
.cast-group {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 14px;
  background: #f1f3f5;
  border-bottom: 1px solid #dee2e6;
}
.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: white;
  border-bottom: 1px solid #f1f3f5;
  cursor: pointer;
}
.member-item:hover {
  background: #f8f9fa;
}
.member-item.assigned {
  background: #eaf7ee;
}
.member-check {
  flex: none;
  width: 20px;
  height: 20px;
  border: 2px solid #ced4da;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  color: white;
}
.member-item.assigned .member-check {
  background: #28a745;
  border-color: #28a745;
}
.member-label {
  flex: 1;
  font-weight: 500;
  color: #212529;
}
.availability-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
.availability-chip.availability-present {
  background: #d4edda;
  color: #155724;
}
.availability-chip.availability-absent {
  background: #f8d7da;
  color: #721c24;
}
.availability-chip.availability-undecided {
  background: #fff3cd;
  color: #856404;
}</style>
