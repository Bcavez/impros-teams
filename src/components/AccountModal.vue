<template>
  <div v-if="open || forceOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Mon compte</h2>
        <button v-if="!forceOpen" class="close-button" type="button" @click="close" aria-label="Fermer">
          ×
        </button>
      </div>

      <p v-if="forceOpen" class="force-notice">
        Vous devez changer votre mot de passe avant de continuer.
      </p>

      <form @submit.prevent="handleSubmit" class="account-form">
        <div class="form-group">
          <label for="account-name">Nom</label>
          <input id="account-name" :value="userStore.user?.name" type="text" disabled />
        </div>

        <div class="form-group">
          <label for="current-password">Mot de passe actuel</label>
          <input
            id="current-password"
            v-model="currentPassword"
            type="password"
            required
            placeholder="Entrez votre mot de passe actuel"
          />
        </div>

        <div class="form-group">
          <label for="new-password">Nouveau mot de passe</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            required
            placeholder="Entrez votre nouveau mot de passe"
          />
        </div>

        <div class="form-group">
          <label for="confirm-new-password">Confirmer le nouveau mot de passe</label>
          <input
            id="confirm-new-password"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Confirmez votre nouveau mot de passe"
          />
        </div>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

        <div class="modal-actions">
          <button v-if="!forceOpen" type="button" class="cancel-button" @click="close">
            Annuler
          </button>
          <button type="submit" class="submit-button" :disabled="isLoading">
            {{ isLoading ? 'Modification...' : 'Modifier le mot de passe' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { VALIDATION_MESSAGES } from '@/lib/strings'

const open = defineModel<boolean>('open', { default: false })

const userStore = useUserStore()

/** Forced open when the profile carries `must_change_password` (spec.md §7) — an admin
 * reset via the dashboard leaves the user with a temporary password they must change before
 * they can do anything else, so the modal ignores close attempts while this is true. */
const forceOpen = computed(() => userStore.user?.must_change_password === true)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

const reset = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

const close = () => {
  if (forceOpen.value) return
  reset()
  open.value = false
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = VALIDATION_MESSAGES.passwordsDoNotMatch
    return
  }

  isLoading.value = true
  try {
    const result = await userStore.changePassword(currentPassword.value, newPassword.value)

    if (result.success) {
      successMessage.value = 'Mot de passe modifié avec succès.'
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      if (!forceOpen.value) {
        setTimeout(close, 1200)
      }
    } else {
      errorMessage.value = result.error || 'Échec de la modification du mot de passe'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  padding: 25px;
  width: 100%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.modal-header h2 {
  font-size: 20px;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0 4px;
}

.close-button:hover {
  color: #2c3e50;
}

.force-notice {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 15px;
}

.account-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #7f8c8d;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  padding: 8px;
  background: #fdf2f2;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.success-message {
  color: #27ae60;
  font-size: 14px;
  padding: 8px;
  background: #eafaf1;
  border-radius: 4px;
  border: 1px solid #a3e4c7;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.submit-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.submit-button:hover:not(:disabled) {
  background: #5a6fd8;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-button {
  background: #f1f1f1;
  color: #333;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.cancel-button:hover {
  background: #e2e2e2;
}
</style>
