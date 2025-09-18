<template>
  <div v-if="hasError" class="error-boundary-component">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="alert alert-danger" role="alert">
            <div class="d-flex align-items-center mb-3">
              <i class="bi bi-exclamation-triangle-fill me-2 fs-4"></i>
              <h4 class="mb-0">Oops! Something went wrong</h4>
            </div>
            
            <p class="mb-3">
              We encountered an unexpected error while processing your request. 
              Don't worry - your data remains private and secure.
            </p>
            
            <div class="privacy-assurance mb-3">
              <div class="d-flex align-items-start">
                <i class="bi bi-shield-check text-success me-2 mt-1"></i>
                <div>
                  <strong class="d-block">Your Privacy is Protected</strong>
                  <small class="text-muted">
                    No data was stored on our servers. All processing happens in your browser's memory only.
                  </small>
                </div>
              </div>
            </div>
            
            <div v-if="errorDetails && showDetails" class="error-details mb-3">
              <details>
                <summary class="btn btn-outline-secondary btn-sm">
                  <i class="bi bi-info-circle me-1"></i>
                  Technical Details
                </summary>
                <pre class="mt-2 p-2 bg-light border rounded"><code>{{ errorDetails }}</code></pre>
              </details>
            </div>
            
            <div class="d-flex flex-wrap gap-2">
              <button 
                class="btn btn-primary" 
                @click="retry"
              >
                <i class="bi bi-arrow-clockwise me-1"></i>
                Try Again
              </button>
              
              <button 
                class="btn btn-outline-secondary" 
                @click="goHome"
              >
                <i class="bi bi-house me-1"></i>
                Go to Dashboard
              </button>
              
              <button 
                class="btn btn-outline-info" 
                @click="clearAllData"
              >
                <i class="bi bi-trash me-1"></i>
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else>
    <slot />
  </div>
</template>

<script>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useSessionStore } from '../stores/session'

export default {
  name: 'ErrorBoundary',
  props: {
    showDetails: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { emit }) {
    const router = useRouter()
    const appStore = useAppStore()
    const sessionStore = useSessionStore()
    
    const hasError = ref(false)
    const errorDetails = ref('')
    
    // Capture Vue errors
    onErrorCaptured((error, instance, info) => {
      console.error('Error caught by boundary:', error)
      
      hasError.value = true
      errorDetails.value = `${error.message}\n\nComponent: ${info}\n\nStack: ${error.stack}`
      
      // Log error to app store (without user data)
      appStore.setError('An unexpected error occurred. Your data remains secure.')
      
      // Emit error event for parent components
      emit('error', { error, instance, info })
      
      // Prevent error from propagating
      return false
    })
    
    // Handle global JavaScript errors
    const handleGlobalError = (event) => {
      console.error('Global error caught:', event.error)
      
      hasError.value = true
      errorDetails.value = `${event.error.message}\n\nFile: ${event.filename}\nLine: ${event.lineno}\nColumn: ${event.colno}\n\nStack: ${event.error.stack}`
      
      appStore.setError('A JavaScript error occurred. Your data remains secure.')
    }
    
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      hasError.value = true
      errorDetails.value = `Unhandled Promise Rejection: ${event.reason}`
      
      appStore.setError('A network or processing error occurred. Your data remains secure.')
    }
    
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleGlobalError)
      window.addEventListener('unhandledrejection', handleUnhandledRejection)
    }
    
    const retry = () => {
      hasError.value = false
      errorDetails.value = ''
      appStore.clearError()
      
      // Emit retry event
      emit('retry')
    }
    
    const goHome = () => {
      hasError.value = false
      errorDetails.value = ''
      appStore.clearError()
      router.push('/')
    }
    
    const clearAllData = () => {
      // Clear all session data for a fresh start
      sessionStore.clearSession()
      appStore.clearError()
      appStore.clearAllNotifications()
      
      hasError.value = false
      errorDetails.value = ''
      
      // Show confirmation
      appStore.addNotification({
        type: 'success',
        message: 'All data cleared. You can start fresh with complete privacy.'
      })
      
      router.push('/')
    }
    
    return {
      hasError,
      errorDetails,
      retry,
      goHome,
      clearAllData
    }
  }
}
</script>

<style scoped>
.error-boundary-component {
  min-height: 50vh;
  display: flex;
  align-items: center;
  padding: 2rem 0;
}

.privacy-assurance {
  background-color: rgba(25, 135, 84, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
  border-left: 4px solid var(--success-color);
}

[data-theme="dark"] .privacy-assurance {
  background-color: rgba(102, 217, 102, 0.1);
  border-left-color: #66d966;
}

.error-details pre {
  font-size: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

[data-theme="dark"] .error-details pre {
  background-color: var(--bg-tertiary) !important;
  color: var(--text-primary);
  border-color: var(--border-color) !important;
}

@media (max-width: 576px) {
  .d-flex.gap-2 {
    flex-direction: column;
  }
  
  .d-flex.gap-2 .btn {
    width: 100%;
  }
}
</style>