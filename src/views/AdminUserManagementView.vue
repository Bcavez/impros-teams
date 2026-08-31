<template>
  <div class="admin-dashboard">
    <MainNavigation />

    <div class="admin-content">
      <div class="header">
        <div class="header-content">
          <div class="header-text">
            <h1>Administration des Utilisateurs</h1>
            <p>Gérer les utilisateurs, rôles et affectations d'équipe</p>
          </div>
          <router-link to="/dashboard" class="back-button"> ← Retour au Tableau de Bord </router-link>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadUsers" class="btn btn-primary">Réessayer</button>
      </div>

      <!-- Users Management -->
      <div v-else class="users-management">
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Utilisateurs</h3>
            <p class="stat-number">{{ users.length }}</p>
          </div>
          <div class="stat-card">
            <h3>Admins</h3>
            <p class="stat-number">{{ adminCount }}</p>
          </div>
          <div class="stat-card">
            <h3>Capitaines</h3>
            <p class="stat-number">{{ captainCount }}</p>
          </div>
          <div class="stat-card">
            <h3>Membres</h3>
            <p class="stat-number">{{ memberCount }}</p>
          </div>
        </div>

        <!-- Users Table -->
        <div class="users-table-container">
          <h2>Gestion des Utilisateurs</h2>

          <!-- Search and Filter -->
          <div class="table-controls">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher un utilisateur par nom..."
                class="search-input"
              />
            </div>
            <div class="filter-controls">
              <select v-model="roleFilter" class="filter-select">
                <option value="">Tous les rôles</option>
                <option value="admin">Admin</option>
                <option value="captain">Capitaine</option>
                <option value="member">Membre</option>
              </select>
              <select v-model="teamFilter" class="filter-select">
                <option value="">Toutes les équipes</option>
                <option v-for="team in TEAMS" :key="team" :value="team">{{ team }}</option>
              </select>
            </div>
          </div>

          <!-- Users Table -->
          <div class="table-wrapper">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Équipe</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id" class="user-row">
                  <td>{{ user.name }}</td>
                  <td>
                    <select
                      :value="roleOf(user)"
                      @change="updateUserRole(user, ($event.target as HTMLSelectElement).value as 'member' | 'captain')"
                      :disabled="user.id === currentUser?.id"
                      class="role-select"
                    >
                      <option value="member">Membre</option>
                      <option value="captain">Capitaine</option>
                    </select>
                  </td>
                  <td>
                    <select
                      :value="user.team ?? ''"
                      @change="updateUserTeam(user, ($event.target as HTMLSelectElement).value)"
                      class="team-select"
                    >
                      <option value="">Aucune équipe</option>
                      <option v-for="team in TEAMS" :key="team" :value="team">{{ team }}</option>
                    </select>
                  </td>
                  <td>{{ formatDate(user.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <p>Aucun utilisateur ne correspond à vos critères.</p>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
        <button @click="clearMessage" class="message-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, type Profile } from '@/stores/user'
import { format } from 'date-fns'
import { TEAMS, type Team } from '@/lib/teams'
import MainNavigation from '@/components/MainNavigation.vue'

const router = useRouter()
const userStore = useUserStore()

// State
const loading = ref(false)
const error = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const searchQuery = ref('')
const roleFilter = ref('')
const teamFilter = ref('')

// Computed
const users = computed(() => userStore.allUsers)
const currentUser = computed(() => userStore.user)

const roleOf = (user: Profile): 'admin' | 'captain' | 'member' => {
  if (user.roles.includes('admin')) return 'admin'
  if (user.roles.includes('captain')) return 'captain'
  return 'member'
}

const adminCount = computed(() => users.value.filter((u) => u.roles.includes('admin')).length)
const captainCount = computed(() => users.value.filter((u) => u.roles.includes('captain')).length)
const memberCount = computed(() => users.value.filter((u) => !u.roles.includes('captain') && !u.roles.includes('admin')).length)

const filteredUsers = computed(() => {
  let filtered = users.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((user) => user.name.toLowerCase().includes(query))
  }

  if (roleFilter.value) {
    filtered = filtered.filter((user) => roleOf(user) === roleFilter.value)
  }

  if (teamFilter.value) {
    filtered = filtered.filter((user) => user.team === teamFilter.value)
  }

  return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
})

// Methods
const loadUsers = async () => {
  loading.value = true
  error.value = ''

  try {
    const result = await userStore.getAllUsers()
    if (!result.success) {
      error.value = result.error || 'Échec du chargement des utilisateurs'
    }
  } catch {
    error.value = "Une erreur s'est produite lors du chargement des utilisateurs"
  } finally {
    loading.value = false
  }
}

/**
 * Only commits after the API confirms — never optimistically mutates a v-model bound directly
 * to the store row (improvements.md #14), so a rejected change (e.g. captain requires a team)
 * doesn't leave the UI showing a role that was never actually saved.
 */
const updateUserRole = async (user: Profile, role: 'member' | 'captain') => {
  const result = await userStore.setUserRole(user.id, role)
  if (result.success) {
    showMessage('Rôle mis à jour avec succès', 'success')
    await loadUsers()
  } else {
    showMessage(result.error || 'Échec de la mise à jour du rôle', 'error')
  }
}

const updateUserTeam = async (user: Profile, team: string) => {
  if (!team) {
    showMessage("Impossible de retirer une équipe depuis cet écran", 'error')
    await loadUsers()
    return
  }

  const result = await userStore.assignTeam(user.id, team as Team)
  if (result.success) {
    showMessage("Équipe mise à jour avec succès", 'success')
    await loadUsers()
  } else {
    showMessage(result.error || "Échec de la mise à jour de l'équipe", 'error')
    await loadUsers()
  }
}

const showMessage = (msg: string, type: 'success' | 'error') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    clearMessage()
  }, 5000)
}

const clearMessage = () => {
  message.value = ''
}

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy')
  } catch {
    return 'Inconnu'
  }
}

// Lifecycle
onMounted(async () => {
  if (!userStore.isAuthenticated || !userStore.isAdmin) {
    router.push('/login')
    return
  }

  await loadUsers()
})
</script>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header-text {
  text-align: left;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
  font-size: 1.1em;
}

.back-button {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  background: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  transition: background-color 0.2s, transform 0.1s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.back-button:hover {
  background: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .header-text {
    text-align: center;
  }

  .back-button {
    align-self: center;
  }
}

/* Loading State */
.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #7f8c8d;
  font-size: 0.9em;
  text-transform: uppercase;
}

.stat-number {
  font-size: 2em;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

/* Users Table */
.users-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.users-table-container h2 {
  margin: 0;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
  color: #2c3e50;
}

/* Table Controls */
.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
  gap: 20px;
}

.search-box {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.filter-select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

.users-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.user-row:hover {
  background: #f8f9fa;
}

/* Form Controls */
.role-select,
.team-select {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  min-width: 100px;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

/* Messages */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
}

.message.success {
  background: #27ae60;
}

.message.error {
  background: #e74c3c;
}

.message-close {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-controls {
    justify-content: space-between;
  }

  .users-table {
    font-size: 14px;
  }

  .users-table th,
  .users-table td {
    padding: 8px;
  }
}
</style>
