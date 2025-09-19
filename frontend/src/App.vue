<template>
  <div id="app" :data-theme="theme">
    <!-- Skip link for accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
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
              <router-link 
                class="nav-link" 
                to="/" 
                exact-active-class="active"
                @click="closeNavbarOnMobile"
              >
                <i class="bi bi-house-door me-1 d-md-none"></i>
                Dashboard
              </router-link>
            </li>
            <li class="nav-item">
              <router-link 
                class="nav-link" 
                to="/upload" 
                active-class="active"
                @click="closeNavbarOnMobile"
              >
                <i class="bi bi-cloud-upload me-1 d-md-none"></i>
                Upload
              </router-link>
            </li>
            <li class="nav-item">
              <router-link 
                class="nav-link" 
                to="/data" 
                active-class="active"
                @click="closeNavbarOnMobile"
              >
                <i class="bi bi-table me-1 d-md-none"></i>
                Data
              </router-link>
            </li>
            <li class="nav-item">
              <router-link 
                class="nav-link" 
                to="/configure" 
                active-class="active"
                @click="closeNavbarOnMobile"
              >
                <i class="bi bi-gear me-1 d-md-none"></i>
                Configure
              </router-link>
            </li>
            <li class="nav-item">
              <router-link 
                class="nav-link" 
                to="/results" 
                active-class="active"
                @click="closeNavbarOnMobile"
              >
                <i class="bi bi-graph-up me-1 d-md-none"></i>
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
                :title="isApiHealthy ? 'API is healthy and ready' : 'API connection error'"
              >
                {{ isApiHealthy ? '●' : '●' }}
              </span>
              <small class="text-light d-none d-md-inline">
                {{ isApiHealthy ? 'API Ready' : 'API Error' }}
              </small>
            </div>
            
            <!-- Mobile Settings Dropdown -->
            <div class="nav-item dropdown d-md-none">
              <button 
                class="btn btn-outline-light btn-sm dropdown-toggle me-2" 
                type="button" 
                id="mobileSettingsDropdown" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
                title="Settings"
              >
                <i class="bi bi-gear"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="mobileSettingsDropdown">
                <li>
                  <button class="dropdown-item" @click="toggleTheme">
                    <i :class="theme === 'light' ? 'bi bi-moon' : 'bi bi-sun'" class="me-2"></i>
                    {{ theme === 'light' ? 'Dark Mode' : 'Light Mode' }}
                  </button>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li>
                  <router-link class="dropdown-item" to="/privacy" @click="closeNavbarOnMobile">
                    <i class="bi bi-shield-lock me-2"></i>
                    Privacy Policy
                  </router-link>
                </li>
                <li>
                  <button class="dropdown-item" @click="showPreferencesModal = true">
                    <i class="bi bi-sliders me-2"></i>
                    Preferences
                  </button>
                </li>
              </ul>
            </div>
            
            <!-- Desktop Theme Toggle -->
            <button 
              class="btn btn-outline-light btn-sm me-2 d-none d-md-inline-block"
              @click="toggleTheme"
              :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`"
            >
              <i :class="theme === 'light' ? 'bi bi-moon' : 'bi bi-sun'" class="me-1"></i>
              {{ theme === 'light' ? 'Dark' : 'Light' }}
            </button>
            
            <!-- Desktop Privacy Link -->
            <router-link class="nav-link d-none d-md-inline-block" to="/privacy">
              <i class="bi bi-shield-lock me-1"></i>
              <small>Privacy</small>
            </router-link>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- Notification Center -->
    <NotificationCenter @action="handleNotificationAction" />
    
    <!-- Privacy-Focused Error Boundary -->
    <div v-if="hasError && !isLoading" class="error-boundary">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="alert alert-danger" role="alert">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <h5 class="mb-0">Something went wrong</h5>
              </div>
              <p class="mb-2">{{ error }}</p>
              <div class="privacy-notice-small">
                <i class="bi bi-shield-check me-1"></i>
                <small>Your data remains private and was not stored on our servers.</small>
              </div>
              <div class="mt-3">
                <button class="btn btn-outline-danger btn-sm me-2" @click="clearError">
                  <i class="bi bi-arrow-clockwise me-1"></i>
                  Try Again
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="refreshPage">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay" role="status" aria-live="polite">
      <div class="loading-spinner">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="loading-content">
          <h5 class="text-white mb-2">{{ loadingMessage }}</h5>
          <div v-if="processingStatus.progress > 0" class="progress mb-2" style="width: 200px;">
            <div 
              class="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              :style="{ width: processingStatus.progress + '%' }"
              :aria-valuenow="processingStatus.progress"
              aria-valuemin="0" 
              aria-valuemax="100"
            ></div>
          </div>
          <p class="text-light mb-2">{{ processingStatus.message || 'Processing your data securely...' }}</p>
          <div class="privacy-notice-loading">
            <i class="bi bi-shield-lock me-1"></i>
            <small class="text-light">Your data is processed in memory only and never stored</small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <main id="main-content" class="main-content" :class="{ 'content-shifted': isLoading || hasError }">
      <div class="container-fluid">
        <ErrorBoundary 
          v-if="!hasError || isLoading"
          :show-details="false"
          @error="handleComponentError"
          @retry="handleRetry"
        >
          <router-view />
        </ErrorBoundary>
      </div>
    </main>

    <!-- User Preferences Modal -->
    <div 
      v-if="showPreferencesModal" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      aria-labelledby="preferencesModalLabel"
      aria-hidden="false"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="preferencesModalLabel">
              <i class="bi bi-sliders me-2"></i>
              User Preferences
            </h5>
            <button 
              type="button" 
              class="btn-close" 
              @click="showPreferencesModal = false"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="savePreferences">
              <!-- Theme Preference -->
              <div class="mb-3">
                <label class="form-label">Theme</label>
                <div class="btn-group w-100" role="group">
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="theme" 
                    id="theme-light" 
                    value="light"
                    v-model="tempPreferences.theme"
                  >
                  <label class="btn btn-outline-primary" for="theme-light">
                    <i class="bi bi-sun me-1"></i>Light
                  </label>
                  
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="theme" 
                    id="theme-dark" 
                    value="dark"
                    v-model="tempPreferences.theme"
                  >
                  <label class="btn btn-outline-primary" for="theme-dark">
                    <i class="bi bi-moon me-1"></i>Dark
                  </label>
                </div>
              </div>

              <!-- Default Forecast Horizon -->
              <div class="mb-3">
                <label for="defaultHorizon" class="form-label">Default Forecast Horizon (days)</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="defaultHorizon"
                  v-model.number="tempPreferences.defaultHorizon"
                  min="1" 
                  max="365"
                >
              </div>

              <!-- Preferred Mode -->
              <div class="mb-3">
                <label class="form-label">Preferred Configuration Mode</label>
                <div class="btn-group w-100" role="group">
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="mode" 
                    id="mode-simple" 
                    value="simple"
                    v-model="tempPreferences.preferredMode"
                  >
                  <label class="btn btn-outline-secondary" for="mode-simple">Simple</label>
                  
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="mode" 
                    id="mode-advanced" 
                    value="advanced"
                    v-model="tempPreferences.preferredMode"
                  >
                  <label class="btn btn-outline-secondary" for="mode-advanced">Advanced</label>
                </div>
              </div>

              <!-- Notification Settings -->
              <div class="mb-3">
                <label class="form-label">Notifications</label>
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="showProgress"
                    v-model="tempPreferences.notificationSettings.showProgressNotifications"
                  >
                  <label class="form-check-label" for="showProgress">
                    Show progress notifications
                  </label>
                </div>
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="autoHide"
                    v-model="tempPreferences.notificationSettings.autoHideNotifications"
                  >
                  <label class="form-check-label" for="autoHide">
                    Auto-hide notifications
                  </label>
                </div>
              </div>

              <!-- Privacy Notice -->
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                <small>
                  Preferences are stored locally in your browser cookies and never sent to our servers.
                </small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary" 
              @click="cancelPreferences"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              @click="savePreferences"
            >
              <i class="bi bi-check-lg me-1"></i>
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showPreferencesModal" class="modal-backdrop fade show"></div>
    
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from './stores/app'
import { useUserPreferencesStore } from './stores/userPreferences'
import { useSessionStore } from './stores/session'
import { checkHealth } from './services/api'
import ErrorBoundary from './components/ErrorBoundary.vue'
import NotificationCenter from './components/NotificationCenter.vue'
import { notificationService } from './services/notifications'

export default {
  name: 'App',
  components: {
    ErrorBoundary,
    NotificationCenter
  },
  setup() {
    const router = useRouter()
    const appStore = useAppStore()
    const preferencesStore = useUserPreferencesStore()
    const sessionStore = useSessionStore()
    
    // Local state
    const showPreferencesModal = ref(false)
    const tempPreferences = ref({})
    
    // Computed properties
    const theme = computed(() => preferencesStore.theme)
    const isLoading = computed(() => appStore.isLoading || sessionStore.isProcessing)
    const isApiHealthy = computed(() => appStore.isApiHealthy)
    const notifications = computed(() => appStore.notifications)
    const sessionSummary = computed(() => sessionStore.getSessionSummary())
    const hasError = computed(() => appStore.hasError)
    const error = computed(() => appStore.error)
    const processingStatus = computed(() => sessionStore.processingStatus)
    
    // Dynamic loading message based on processing stage
    const loadingMessage = computed(() => {
      if (processingStatus.value.stage) {
        return processingStatus.value.stage
      }
      return 'Processing...'
    })
    
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

    // Mobile navigation handling
    const closeNavbarOnMobile = () => {
      // Close Bootstrap navbar collapse on mobile after navigation
      const navbarCollapse = document.getElementById('navbarNav')
      if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = new window.bootstrap.Collapse(navbarCollapse)
        bsCollapse.hide()
      }
    }

    // Error handling
    const clearError = () => {
      appStore.clearError()
    }

    const refreshPage = () => {
      window.location.reload()
    }

    // Preferences modal handling
    const openPreferencesModal = () => {
      tempPreferences.value = {
        theme: preferencesStore.theme,
        defaultHorizon: preferencesStore.defaultHorizon,
        preferredMode: preferencesStore.preferredMode,
        notificationSettings: { ...preferencesStore.notificationSettings }
      }
      showPreferencesModal.value = true
    }

    const savePreferences = () => {
      preferencesStore.updateTheme(tempPreferences.value.theme)
      preferencesStore.updateDefaultHorizon(tempPreferences.value.defaultHorizon)
      preferencesStore.updatePreferredMode(tempPreferences.value.preferredMode)
      preferencesStore.updateNotificationSettings(tempPreferences.value.notificationSettings)
      
      showPreferencesModal.value = false
      
      appStore.addNotification({
        type: 'success',
        message: 'Preferences saved successfully'
      })
    }

    const cancelPreferences = () => {
      showPreferencesModal.value = false
      tempPreferences.value = {}
    }

    // Error boundary handlers
    const handleComponentError = (errorInfo) => {
      console.error('Component error handled by App:', errorInfo)
      
      // Add privacy-focused notification
      appStore.addNotification({
        type: 'error',
        message: 'A component error occurred. Your data remains secure and private.'
      })
    }

    const handleRetry = () => {
      // Clear any loading states and errors
      appStore.setLoading(false)
      appStore.clearError()
      sessionStore.stopProcessing()
    }

    // Handle notification actions
    const handleNotificationAction = (actionData) => {
      const { action } = actionData
      
      switch (action) {
        case 'download-results':
          // Navigate to results page for download
          router.push('/results')
          break
          
        case 'extend-session':
          // Extend session (handled by SessionResultManager)
          notificationService.addNotification({
            type: 'success',
            title: 'Session Extended',
            message: 'Your session has been extended for another 2 hours.',
            icon: 'bi-clock-history'
          })
          break
          
        case 'new-session':
          // Clear session and navigate to upload
          sessionStore.clearSession()
          router.push('/upload')
          break
          
        case 'view-results':
          router.push('/results')
          break
          
        case 'retry-forecast':
          // This would be handled by the forecast component
          break
          
        case 'retry-request':
          // Retry last failed request
          window.location.reload()
          break
          
        default:
          console.log('Unhandled notification action:', action)
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

      // Initialize Bootstrap components
      if (window.bootstrap) {
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new window.bootstrap.Tooltip(tooltipTriggerEl)
        })
      }

      // Handle responsive navigation
      const handleResize = () => {
        const navbar = document.querySelector('.navbar-collapse')
        if (window.innerWidth >= 768 && navbar && navbar.classList.contains('show')) {
          const bsCollapse = new window.bootstrap.Collapse(navbar)
          bsCollapse.hide()
        }
      }

      window.addEventListener('resize', handleResize)
      
      // Cleanup on unmount
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    })

    // Watch for theme changes and update Bootstrap
    watch(theme, (newTheme) => {
      document.documentElement.setAttribute('data-bs-theme', newTheme)
    }, { immediate: true })
    
    return {
      // State
      showPreferencesModal,
      tempPreferences,
      
      // Computed
      theme,
      isLoading,
      isApiHealthy,
      notifications,
      sessionSummary,
      hasError,
      error,
      processingStatus,
      loadingMessage,
      
      // Methods
      toggleTheme,
      removeNotification,
      getNotificationClass,
      closeNavbarOnMobile,
      clearError,
      refreshPage,
      openPreferencesModal,
      savePreferences,
      cancelPreferences,
      handleComponentError,
      handleRetry,
      handleNotificationAction
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

/* Error Boundary Styles */
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(248, 249, 250, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  padding: 1rem;
}

[data-theme="dark"] .error-boundary {
  background-color: rgba(33, 37, 41, 0.95);
}

.privacy-notice-small {
  background-color: rgba(13, 202, 240, 0.1);
  border-radius: 0.25rem;
  padding: 0.5rem;
  border-left: 3px solid var(--info-color);
}

.privacy-notice-loading {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  padding: 0.5rem;
  margin-top: 1rem;
}

/* Enhanced Loading Styles */
.loading-content {
  text-align: center;
  max-width: 300px;
}

.content-shifted {
  filter: blur(2px);
  pointer-events: none;
}

/* Mobile Navigation Enhancements */
.navbar-toggler {
  border: none;
  padding: 0.25rem 0.5rem;
}

.navbar-toggler:focus {
  box-shadow: none;
  outline: 2px solid rgba(255, 255, 255, 0.5);
}

.dropdown-menu {
  border: none;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  border-radius: 0.5rem;
}

[data-theme="dark"] .dropdown-menu {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

[data-theme="dark"] .dropdown-item {
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Modal Enhancements */
.modal-content {
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175);
}

[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header {
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] .modal-footer {
  border-top-color: var(--border-color);
}

/* Responsive navigation */
@media (max-width: 768px) {
  .notifications-container {
    right: 10px;
    left: 10px;
    max-width: none;
    top: 70px;
  }
  
  .main-content {
    padding: 1rem 0;
  }

  .navbar-brand {
    font-size: 1.1rem;
  }

  .navbar-nav .nav-link {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .navbar-nav .nav-link:last-child {
    border-bottom: none;
  }

  .navbar-nav .nav-link i {
    width: 1.2rem;
  }

  .loading-content {
    padding: 0 1rem;
  }

  .error-boundary .container {
    padding: 0 1rem;
  }
}

@media (max-width: 576px) {
  .navbar {
    padding: 0.5rem 1rem;
  }

  .loading-spinner {
    padding: 1rem;
  }

  .modal-dialog {
    margin: 0.5rem;
  }

  .btn-group .btn {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }
}
</style>