<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">Team Management Dashboard</h1>
      
      <div class="auth-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          Login
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          Register
        </button>
      </div>

      <!-- Login Form -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="login-name">Name</label>
          <input
            id="login-name"
            v-model="loginForm.name"
            type="text"
            required
            placeholder="Enter your name"
          />
        </div>
        
        <div class="form-group">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>

        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
      </form>

      <!-- Register Form -->
      <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label for="register-name">Name</label>
          <input
            id="register-name"
            v-model="registerForm.name"
            type="text"
            required
            placeholder="Enter your name"
          />
        </div>

        <div class="form-group">
          <label for="register-email">Email</label>
          <input
            id="register-email"
            v-model="registerForm.email"
            type="email"
            required
            placeholder="Enter your email"
          />
        </div>
        
        <div class="form-group">
          <label for="register-password">Password</label>
          <input
            id="register-password"
            v-model="registerForm.password"
            type="password"
            required
            placeholder="Enter your password"
          />
        </div>

        <div class="form-group">
          <label for="register-confirm-password">Confirm Password</label>
          <input
            id="register-confirm-password"
            v-model="registerForm.confirmPassword"
            type="password"
            required
            placeholder="Confirm your password"
          />
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading">
          {{ isLoading ? 'Registering...' : 'Register' }}
        </button>

        <div v-if="registerError" class="error-message">
          {{ registerError }}
        </div>
      </form>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

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
  confirmPassword: ''
})

const handleLogin = async () => {
  isLoading.value = true
  loginError.value = ''

  try {
    const result = await userStore.login(loginForm.name, loginForm.password)
    
    if (result.success) {
      router.push('/dashboard')
    } else {
      loginError.value = result.error || 'Login failed'
    }
  } catch (error) {
    loginError.value = 'An error occurred during login'
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  if (registerForm.password !== registerForm.confirmPassword) {
    registerError.value = 'Passwords do not match'
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
      router.push('/dashboard')
         } else {
       registerError.value = 'Registration failed'
     }
  } catch (error) {
    registerError.value = 'An error occurred during registration'
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

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #fdf2f2;
  border-radius: 4px;
  border: 1px solid #fecaca;
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