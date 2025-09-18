<template>
  <div id="app" :data-theme="theme">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <router-link class="navbar-brand" to="/">
          Prophet Web Interface
        </router-link>
        
        <!-- Mobile toggle button -->
        <button 
          class="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <!-- Navigation items -->
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <router-link class="nav-link" to="/" exact-active-class="active">
                Dashboard
              </router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/upload" active-class="active">
                Upload
              </router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/configure" active-class="active">
                Configure
              </router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/results" active-class="active">
                Results
              </router-link>
            </li>
          </ul>
          
          <!-- Right side items -->
          <div class="navbar-nav">
            <!-- API Status Indicator -->
            <div class="nav-item d-flex align-items-center me-3">
              <span 
                class="badge me-2"
                :class="isApiHealthy ? 'bg-success' : 'bg-danger'"
              >
                {{ isApiHealthy ? '●' : '●' }}
              </span>
              <small class="text-light">
                {{ isApiHealthy ? 'API Ready' : 'API Error' }}
              </small>
            </div>
            
            <!-- Theme Toggle -->
            <button 
              class="btn btn-outline-light btn-sm me-2"
              @click="toggleTheme"
              :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`"
            >
              {{ theme === 'light' ? '🌙' : '☀️' }}
            </button>
            
            <!-- Privacy Link -->
            <router-link class="nav-link" to="/privacy">
              <small>🔒 Privacy</small>
            </router-link>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- Notifications -->
    <div class="notifications-container">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="alert alert-dismissible fade show"
        :class="`alert-${getNotificationClass(notification.type)}`"
        role="alert"
      >
        {{ notification.message }}
        <button 
          type="button" 
          class="btn-close" 
          @click="removeNotification(notification.id)"
        ></button>
      </div>
    </div>
    
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Processing your data securely...</p>
      </div>
    </div>
    
    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>
    
    <!-- Footer -->
    <footer class="footer bg-light border-top">
      <div class="container">
        <div class="row py-3">
          <div class="col-md-6">
            <small class="text-muted">
              © 2024 Prophet Web Interface - Privacy-First Forecasting
            </small>
          </div>
          <div class="col-md-6 text-md-end">
            <small class="text-muted">
              Session: {{ sessionSummary.sessionId ? 'Active' : 'None' }} | 
              Data: {{ sessionSummary.hasData ? 'Loaded' : 'None' }}
            </small>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useAppStore } from './stores/app'
import { useUserPreferencesStore } from './stores/userPreferences'
import { useSessionStore } from './stores/session'
import { checkHealth } from './services/api'

export default {
  name: 'App',
  setup() {
    const appStore = useAppStore()
    const preferencesStore = useUserPreferencesStore()
    const sessionStore = useSessionStore()
    
    // Computed properties
    const theme = computed(() => preferencesStore.theme)
    const isLoading = computed(() => appStore.isLoading)
    const isApiHealthy = computed(() => appStore.isApiHealthy)
    const notifications = computed(() => appStore.notifications)
    const sessionSummary = computed(() => sessionStore.getSessionSummary())
    
    // Methods
    const toggleTheme = () => {
      const newTheme = theme.value === 'light' ? 'dark' : 'light'
      preferencesStore.updateTheme(newTheme)
    }
    
    const removeNotification = (id) => {
      appStore.removeNotification(id)
    }
    
    const getNotificationClass = (type) => {
      const classMap = {
        error: 'danger',
        warning: 'warning',
        success: 'success',
        info: 'info'
      }
      return classMap[type] || 'info'
    }
    
    const checkApiHealth = async () => {
      try {
        const health = await checkHealth()
        appStore.setApiStatus(health)
      } catch (error) {
        appStore.setApiStatus({
          healthy: false,
          environment: null,
          error: error.message
        })
      }
    }
    
    // Lifecycle
    onMounted(async () => {
      // Check API health on app start
      await checkApiHealth()
      
      // Set up periodic health checks (every 5 minutes)
      setInterval(checkApiHealth, 5 * 60 * 1000)
      
      // Initialize session if needed
      if (!sessionStore.sessionId) {
        sessionStore.generateSessionId()
      }
    })
    
    return {
      theme,
      isLoading,
      isApiHealthy,
      notifications,
      sessionSummary,
      toggleTheme,
      removeNotification,
      getNotificationClass
    }
  }
}
</script>

<style>
/* Theme variables */
:root {
  --bs-body-bg: #ffffff;
  --bs-body-color: #212529;
}

[data-theme="dark"] {
  --bs-body-bg: #212529;
  --bs-body-color: #ffffff;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bs-body-bg);
  color: var(--bs-body-color);
}

.main-content {
  flex: 1;
  padding: 2rem 0;
}

.notifications-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1050;
  max-width: 400px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  text-align: center;
  color: white;
}

.footer {
  margin-top: auto;
}

/* Dark theme styles */
[data-theme="dark"] .navbar-dark {
  background-color: #1a1a1a !important;
}

[data-theme="dark"] .bg-light {
  background-color: #2d2d2d !important;
  color: #ffffff;
}

[data-theme="dark"] .border-top {
  border-color: #444 !important;
}

[data-theme="dark"] .card {
  background-color: #2d2d2d;
  border-color: #444;
  color: #ffffff;
}

[data-theme="dark"] .text-muted {
  color: #adb5bd !important;
}

/* Responsive navigation */
@media (max-width: 768px) {
  .notifications-container {
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .main-content {
    padding: 1rem 0;
  }
}
</style>