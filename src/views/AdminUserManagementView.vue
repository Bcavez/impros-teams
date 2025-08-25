<template>
  <div class="admin-dashboard">
    <MainNavigation />
    
    <div class="admin-content">
      <div class="header">
        <div class="header-content">
          <div class="header-text">
            <h1>Admin Dashboard</h1>
            <p>Manage users, roles, and team assignments</p>
          </div>
          <router-link to="/dashboard" class="back-button">
            ← Back to Dashboard
          </router-link>
        </div>
      </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading users...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadUsers" class="btn btn-primary">Retry</button>
    </div>

    <!-- Users Management -->
    <div v-else class="users-management">
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Users</h3>
          <p class="stat-number">{{ users.length }}</p>
        </div>
        <div class="stat-card">
          <h3>Admins</h3>
          <p class="stat-number">{{ adminCount }}</p>
        </div>
        <div class="stat-card">
          <h3>Captains</h3>
          <p class="stat-number">{{ captainCount }}</p>
        </div>
        <div class="stat-card">
          <h3>Members</h3>
          <p class="stat-number">{{ memberCount }}</p>
        </div>
      </div>

      <!-- Users Table -->
      <div class="users-table-container">
        <h2>User Management</h2>
        
                 <!-- Search and Filter -->
         <div class="table-controls">
           <div class="search-box">
             <input 
               v-model="searchQuery" 
               type="text" 
               placeholder="Search users by name..."
               class="search-input"
             />
           </div>
          <div class="filter-controls">
            <select v-model="roleFilter" class="filter-select">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="captain">Captain</option>
              <option value="member">Member</option>
            </select>
            <select v-model="teamFilter" class="filter-select">
              <option value="">All Teams</option>
              <option value="Samurai">Samurai</option>
              <option value="Gladiator">Gladiator</option>
              <option value="Viking">Viking</option>
            </select>
          </div>
        </div>

        <!-- Users Table -->
        <div class="table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Captain</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="user-row">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <select 
                    v-model="user.role" 
                    @change="updateUserRole(user)"
                    :disabled="user.id === currentUser?.id"
                    class="role-select"
                  >
                    <option value="member">Member</option>
                    <option value="captain">Captain</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <select 
                    v-model="user.team" 
                    @change="updateUserTeam(user)"
                    class="team-select"
                  >
                    <option value="">No Team</option>
                    <option value="Samurai">Samurai</option>
                    <option value="Gladiator">Gladiator</option>
                    <option value="Viking">Viking</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="checkbox" 
                    v-model="user.is_captain"
                    @change="updateUserCaptain(user)"
                    :disabled="user.role !== 'captain'"
                    class="captain-checkbox"
                  />
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <button 
                    @click="deleteUser(user)"
                    :disabled="user.id === currentUser?.id"
                    class="btn btn-danger btn-small"
                    title="Delete user"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredUsers.length === 0" class="empty-state">
          <p>No users found matching your criteria.</p>
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
import { useUserStore } from '@/stores/user'
import { format } from 'date-fns'
import MainNavigation from '@/components/MainNavigation.vue'

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

const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)
const captainCount = computed(() => users.value.filter(u => u.role === 'captain').length)
const memberCount = computed(() => users.value.filter(u => u.role === 'member').length)

const filteredUsers = computed(() => {
  let filtered = users.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.name.toLowerCase().includes(query)
    )
  }

  // Role filter
  if (roleFilter.value) {
    filtered = filtered.filter(user => user.role === roleFilter.value)
  }

  // Team filter
  if (teamFilter.value) {
    filtered = filtered.filter(user => user.team === teamFilter.value)
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

// Methods
const loadUsers = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const result = await userStore.getAllUsers()
    if (!result.success) {
      error.value = result.error || 'Failed to load users'
    }
  } catch (err) {
    error.value = 'An error occurred while loading users'
  } finally {
    loading.value = false
  }
}

const updateUserRole = async (user: any) => {
  try {
    const result = await userStore.updateUserRole(user.id, user.role)
    if (result.success) {
      showMessage('User role updated successfully', 'success')
    } else {
      showMessage(result.error || 'Failed to update user role', 'error')
      // Revert the change
      await loadUsers()
    }
  } catch (err) {
    showMessage('An error occurred while updating user role', 'error')
    await loadUsers()
  }
}

const updateUserTeam = async (user: any) => {
  try {
    const result = await userStore.assignTeam(user.id, user.team)
    if (result.success) {
      showMessage('User team updated successfully', 'success')
    } else {
      showMessage(result.error || 'Failed to update user team', 'error')
      // Revert the change
      await loadUsers()
    }
  } catch (err) {
    showMessage('An error occurred while updating user team', 'error')
    await loadUsers()
  }
}

const updateUserCaptain = async (user: any) => {
  try {
    const result = await userStore.assignCaptainRole(user.id, user.is_captain)
    if (result.success) {
      showMessage('User captain status updated successfully', 'success')
    } else {
      showMessage(result.error || 'Failed to update user captain status', 'error')
      // Revert the change
      await loadUsers()
    }
  } catch (err) {
    showMessage('An error occurred while updating user captain status', 'error')
    await loadUsers()
  }
}

const deleteUser = async (user: any) => {
  if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
    return
  }

  try {
    const result = await userStore.deleteUser(user.id)
    if (result.success) {
      showMessage('User deleted successfully', 'success')
      await loadUsers()
    } else {
      showMessage(result.error || 'Failed to delete user', 'error')
    }
  } catch (err) {
    showMessage('An error occurred while deleting user', 'error')
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
    return 'Unknown'
  }
}

// Lifecycle
onMounted(() => {
  loadUsers()
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

.captain-checkbox {
  width: 18px;
  height: 18px;
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

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
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
