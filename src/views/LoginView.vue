<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">Tableau de Bord de Gestion d'Équipe</h1>
      
      <div class="auth-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          Connexion
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          Inscription
        </button>
      </div>

      <!-- Login Form -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="login-name">Nom</label>
          <input
            id="login-name"
            v-model="loginForm.name"
            type="text"
            required
            placeholder="Entrez votre nom"
          />
        </div>
        
        <div class="form-group">
          <label for="login-password">Mot de passe</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            required
            placeholder="Entrez votre mot de passe"
          />
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading">
          {{ isLoading ? 'Connexion...' : 'Se connecter' }}
        </button>

        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
      </form>

      <!-- Register Form -->
      <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label for="register-name">Nom</label>
          <input
            id="register-name"
            v-model="registerForm.name"
            type="text"
            required
            placeholder="Entrez votre nom"
          />
        </div>

        <div class="form-group">
          <label for="register-email">Email</label>
          <input
            id="register-email"
            v-model="registerForm.email"
            type="email"
            required
            placeholder="Entrez votre email"
          />
        </div>
        
        <div class="form-group">
          <label for="register-password">Mot de passe</label>
          <input
            id="register-password"
            v-model="registerForm.password"
            type="password"
            required
            placeholder="Entrez votre mot de passe"
          />
        </div>

        <div class="form-group">
          <label for="register-confirm-password">Confirmer le mot de passe</label>
          <input
            id="register-confirm-password"
            v-model="registerForm.confirmPassword"
            type="password"
            required
            placeholder="Confirmez votre mot de passe"
          />
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="registerForm.acceptTerms"
              required
            />
            <span class="checkbox-text">Je suis d'accord avec l'utilisation qui est faite de mes données personnelles. Voir ci-dessous pour plus de détails.</span>
          </label>
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading || !registerForm.acceptTerms">
          {{ isLoading ? 'Inscription...' : 'S\'inscrire' }}
        </button>

        <div v-if="registerError" class="error-message">
          {{ registerError }}
        </div>
      </form>

      <!-- GDPR Information -->
      <div class="gdpr-info" v-if="activeTab === 'register'">
        <h3>INFORMATION SUR LA PROTECTION DES DONNÉES PERSONNELLES</h3>
        
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), nous vous informons que les données personnelles collectées lors de votre inscription sont traitées dans le cadre de la gestion de votre compte utilisateur et de l'utilisation de notre plateforme de gestion d'équipe.</p>

        <p><strong>Données collectées :</strong> Nom, adresse e-mail, mot de passe (haché), équipe d'appartenance, rôle dans l'équipe, présence aux entraînements, présence aux spectacles.</p>

        <p><strong>Finalités du traitement :</strong> Gestion de votre compte, authentification, communication au sein de l'équipe, organisation des entraînements et événements.</p>

        <p><strong>Base légale :</strong> Exécution du contrat d'utilisation de la plateforme (article 6.1.b du RGPD).</p>

        <p><strong>Durée de conservation :</strong> Vos données sont conservées pendant toute la durée de votre compte utilisateur et supprimées dans un délai de 30 jours après la fermeture de votre compte. Vos données de présence aux entraînements et spectacles sont conservées pendant maximum 1 an et seront supprimées à la fin de la saison.</p>

        <p><strong>Destinataires :</strong> Vos données sont accessibles uniquement aux membres autorisés de votre équipe et aux administrateurs de la plateforme.</p>

        <p><strong>Vos droits :</strong> Vous disposez d'un droit d'accès, de rectification, de suppression, de limitation du traitement, de portabilité et d'opposition. Pour exercer ces droits, contactez-nous.</p>

        <p><strong>Sécurité :</strong> Vos données sont protégées par des mesures techniques et organisationnelles appropriées, notamment le chiffrement des mots de passe.</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCoachingStore } from '@/stores/coaching'
import { useShowsStore } from '@/stores/shows'

const router = useRouter()
const userStore = useUserStore()
const coachingStore = useCoachingStore()
const showsStore = useShowsStore()

const activeTab = ref<'login' | 'register'>('login')
const isLoading = ref(false)
const loginError = ref('')
const registerError = ref('')

const loginForm = reactive({
  name: '',
  password: ''
})

const registerForm = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const handleLogin = async () => {
  isLoading.value = true
  loginError.value = ''

  try {
    const result = await userStore.login(loginForm.name, loginForm.password)
    
    if (result.success) {
      // Initialize stores after successful login
      console.log('🔄 Initializing stores after login...')
      await Promise.all([
        coachingStore.fetchCoachingSessions(undefined, true),
        coachingStore.fetchAttendanceRecords(undefined, true),
        showsStore.fetchShows(true),
        showsStore.fetchShowDates(true),
        showsStore.fetchShowAssignments(true),
        showsStore.fetchShowAvailability(true)
      ])
      
      // Cache team members for the user's team
      const teamMembersResult = await userStore.getUsersByTeam(userStore.currentTeam || 'Samurai')
      if (teamMembersResult.success) {
        const teamMembersCacheKey = `team_members_${userStore.currentTeam}`
        sessionStorage.setItem(teamMembersCacheKey, JSON.stringify(teamMembersResult.users))
      }
      
      sessionStorage.setItem('stores_initialized', 'true')
      
      router.push('/dashboard')
    } else {
      loginError.value = result.error || 'Échec de la connexion'
    }
  } catch (error) {
    loginError.value = 'Une erreur s\'est produite lors de la connexion'
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  if (registerForm.password !== registerForm.confirmPassword) {
    registerError.value = 'Les mots de passe ne correspondent pas'
    return
  }

  isLoading.value = true
  registerError.value = ''

  try {
    const result = await userStore.register(
      registerForm.name,
      registerForm.email,
      registerForm.password
    )
    
    if (result.success) {
      // Initialize stores after successful registration
      console.log('🔄 Initializing stores after registration...')
      await Promise.all([
        coachingStore.fetchCoachingSessions(undefined, true),
        coachingStore.fetchAttendanceRecords(undefined, true),
        showsStore.fetchShows(true),
        showsStore.fetchShowDates(true),
        showsStore.fetchShowAssignments(true),
        showsStore.fetchShowAvailability(true)
      ])
      
      // Cache team members for the user's team
      const teamMembersResult = await userStore.getUsersByTeam(userStore.currentTeam || 'Samurai')
      if (teamMembersResult.success) {
        const teamMembersCacheKey = `team_members_${userStore.currentTeam}`
        sessionStorage.setItem(teamMembersCacheKey, JSON.stringify(teamMembersResult.users))
      }
      
      sessionStorage.setItem('stores_initialized', 'true')
      
      router.push('/dashboard')
    } else {
      registerError.value = 'Échec de l\'inscription'
    }
  } catch (error) {
    registerError.value = 'Une erreur s\'est produite lors de l\'inscription'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

@media (max-width: 768px) {
  .login-container {
    min-height: 100vh;
    padding: 20px 10px;
  }
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 30px;
  width: 100%;
  max-width: 400px;
}

.login-title {
  text-align: center;
  color: #333;
  margin-bottom: 25px;
  font-size: 24px;
  font-weight: 600;
}

.auth-tabs {
  display: flex;
  margin-bottom: 25px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.tab-button {
  flex: 1;
  padding: 12px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
}

.tab-button.active {
  background: #667eea;
  color: white;
}

.tab-button:hover:not(.active) {
  background: #e8e8e8;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.submit-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background: #5a6fd8;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.checkbox-group {
  margin: 15px 0;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.4;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.checkbox-text {
  color: #333;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #fdf2f2;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.gdpr-info {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  font-size: 12px;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
}

.gdpr-info h3 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #495057;
  font-weight: 600;
}

.gdpr-info p {
  margin: 8px 0;
  color: #6c757d;
}

.gdpr-info strong {
  color: #495057;
  font-weight: 600;
}



/* Mobile responsive styles */
@media (max-width: 768px) {
  .login-container {
    padding: 10px;
  }
  
  .login-card {
    padding: 30px 20px;
  }
  
  .login-title {
    font-size: 20px;
  }
  
  .auth-form {
    gap: 15px;
  }
  
  .form-group input {
    padding: 10px;
    font-size: 13px;
  }
  
  .submit-button {
    padding: 10px;
    font-size: 14px;
  }
  

}

@media (max-width: 480px) {
  .login-card {
    padding: 25px 15px;
  }
  
  .login-title {
    font-size: 18px;
  }
  
  .auth-tabs {
    margin-bottom: 20px;
  }
  
  .tab-button {
    padding: 10px;
    font-size: 13px;
  }
  
  .form-group label {
    font-size: 13px;
  }
  
  .form-group input {
    padding: 8px;
    font-size: 12px;
  }
  
  .submit-button {
    padding: 8px;
    font-size: 13px;
  }
  

}
</style> 