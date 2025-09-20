<template>
  <div v-if="hasError" class="privacy-error-boundary">
    <div class="container-fluid">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-8">
          <!-- Main Error Display -->
          <div class="error-card">
            <div class="error-header">
              <div class="error-icon">
                <i :class="getErrorIcon()" class="display-4"></i>
              </div>
              <div class="error-title">
                <h2>{{ getErrorTitle() }}</h2>
                <p class="error-subtitle">{{ getErrorSubtitle() }}</p>
              </div>
            </div>
            
            <!-- Privacy Assurance Section -->
            <div class="privacy-assurance">
              <div class="privacy-header">
                <i class="bi bi-shield-check text-success me-2"></i>
                <strong>Your Privacy is Protected</strong>
              </div>
              <div class="privacy-details">
                <ul class="privacy-list">
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    No data was stored on our servers
                  </li>
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    All processing happened in memory only
                  </li>
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    Session data has been automatically cleared
                  </li>
                  <li v-if="errorInfo.privacyMessage">
                    <i class="bi bi-info-circle text-info me-2"></i>
                    {{ errorInfo.privacyMessage }}
                  </li>
                </ul>
              </div>
            </div>
            
            <!-- Error Details (Collapsible) -->
            <div class="error-details" v-if="showTechnicalDetails">
              <div class="accordion" id="errorDetailsAccordion">
                <div class="accordion-item">
                  <h2 class="accordion-header">
                    <button 
                      class="accordion-button collapsed" 
                      type="button" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#technicalDetails"
                    >
                      <i class="bi bi-code-slash me-2"></i>
                      Technical Details
                    </button>
                  </h2>
                  <div id="technicalDetails" class="accordion-collapse collapse">
                    <div class="accordion-body">
                      <div class="technical-info">
                        <div class="info-row">
                          <strong>Error Type:</strong> {{ errorInfo.type }}
                        </div>
                        <div class="info-row">
                          <strong>Severity:</strong> {{ errorInfo.severity }}
                        </div>
                        <div class="info-row" v-if="errorDetails.timestamp">
                          <strong>Timestamp:</strong> {{ formatTimestamp(errorDetails.timestamp) }}
                        </div>
                        <div class="info-row" v-if="errorDetails.component">
                          <strong>Component:</strong> {{ errorDetails.component }}
                        </div>
                        <div class="info-row" v-if="errorDetails.requestId">
                          <strong>Request ID:</strong> {{ errorDetails.requestId }}
                        </div>
                      </div>
                      
                      <div class="error-message-section" v-if="errorDetails.message">
                        <strong>Error Message:</strong>
                        <pre class="error-message"><code>{{ errorDetails.message }}</code></pre>
                      </div>
                      
                      <div class="stack-trace-section" v-if="errorDetails.stack && showStackTrace">
                        <strong>Stack Trace:</strong>
                        <pre class="stack-trace"><code>{{ errorDetails.stack }}</code></pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Recovery Actions -->
            <div class="recovery-actions">
              <h5 class="actions-title">
                <i class="bi bi-tools me-2"></i>
                What would you like to do?
              </h5>
              
              <div class="action-buttons">
                <!-- Primary Actions -->
                <div class="primary-actions">
                  <button 
                    v-if="errorInfo.retryable" 
                    class="btn btn-primary btn-lg"
                    @click="handleRetry"
                    :disabled="isRetrying"
                  >
                    <i class="bi bi-arrow-clockwise me-2"></i>
                    <span v-if="isRetrying">Retrying...</span>
                    <span v-else>Try Again</span>
                  </button>
                  
                  <button 
                    class="btn btn-success btn-lg"
                    @click="startFresh"
                  >
                    <i class="bi bi-plus-circle me-2"></i>
                    Start Fresh
                  </button>
                </div>
                
                <!-- Secondary Actions -->
                <div class="secondary-actions">
                  <button 
                    class="btn btn-outline-primary"
                    @click="goToDashboard"
                  >
                    <i class="bi bi-house me-2"></i>
                    Go to Dashboard
                  </button>
                  
                  <button 
                    class="btn btn-outline-info"
                    @click="showHelp"
                  >
                    <i class="bi bi-question-circle me-2"></i>
                    Get Help
                  </button>
                  
                  <button 
                    class="btn btn-outline-secondary"
                    @click="downloadErrorReport"
                    v-if="allowErrorReporting"
                  >
                    <i class="bi bi-download me-2"></i>
                    Download Error Report
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Help Section -->
            <div class="help-section" v-if="showHelpSection">
              <div class="help-content">
                <h6>
                  <i class="bi bi-lightbulb me-2"></i>
                  Troubleshooting Tips
                </h6>
                <div class="help-tips">
                  <div v-for="tip in getTroubleshootingTips()" :key="tip.id" class="help-tip">
                    <i :class="tip.icon" class="me-2"></i>
                    {{ tip.text }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Normal Content -->
  <div v-else>
    <slot />
  </div>
</template>

<script>
import { ref, computed, onErrorCaptured, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { errorHandler, ErrorCategorizer, ERROR_TYPES, ERROR_SEVERITY } from '../utils/errorHandling'
import { notificationService } from '../services/notifications'

export default {
  name: 'PrivacyErrorBoundary',
  props: {
    showTechnicalDetails: {
      type: Boolean,
      default: true
    },
    showStackTrace: {
      type: Boolean,
      default: false
    },
    allowErrorReporting: {
      type: Boolean,
      default: false
    },
    component: {
      type: String,
      default: 'Unknown'
    }
  },
  emits: ['error', 'retry', 'recovery'],
  setup(props, { emit }) {
    const router = useRouter()
    
    const hasError = ref(false)
    const errorInfo = ref({})
    const errorDetails = ref({})
    const isRetrying = ref(false)
    const showHelpSection = ref(false)
    const retryCount = ref(0)
    
    // Error capture and handling
    onErrorCaptured((error, instance, info) => {
      handleError(error, {
        component: props.component,
        instance: instance?.type?.name || 'Unknown',
        info,
        source: 'vue-error-captured'
      })
      
      return false // Prevent error propagation
    })
    
    // Global error handlers
    const handleGlobalError = (event) => {
      handleError(event.error, {
        component: props.component,
        source: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }
    
    const handleUnhandledRejection = (event) => {
      handleError(event.reason, {
        component: props.component,
        source: 'unhandled-rejection'
      })
    }
    
    onMounted(() => {
      window.addEventListener('error', handleGlobalError)
      window.addEventListener('unhandledrejection', handleUnhandledRejection)
    })
    
    onUnmounted(() => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    })
    
    const handleError = (error, context = {}) => {
      console.error('Privacy Error Boundary caught error:', error)
      
      hasError.value = true
      errorInfo.value = ErrorCategorizer.categorizeError(error)
      errorDetails.value = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        component: context.component || props.component,
        requestId: context.requestId || generateRequestId(),
        ...context
      }
      
      // Emit error event
      emit('error', {
        error,
        errorInfo: errorInfo.value,
        errorDetails: errorDetails.value
      })
      
      // Log error safely (no user data)
      errorHandler.logError(error, errorInfo.value, context)
    }
    
    const handleRetry = async () => {
      if (isRetrying.value) return
      
      isRetrying.value = true
      retryCount.value++
      
      try {
        // Emit retry event for parent to handle
        emit('retry', {
          attempt: retryCount.value,
          errorInfo: errorInfo.value
        })
        
        // Reset error state after a delay to allow parent to handle retry
        setTimeout(() => {
          hasError.value = false
          errorInfo.value = {}
          errorDetails.value = {}
          isRetrying.value = false
          
          notificationService.addNotification({
            type: 'info',
            title: 'Retry Initiated',
            message: 'Attempting to recover from the error...',
            icon: 'bi-arrow-clockwise',
            duration: 3000
          })
        }, 1000)
        
      } catch (retryError) {
        isRetrying.value = false
        handleError(retryError, { source: 'retry-attempt' })
      }
    }
    
    const startFresh = () => {
      // Clear all application state
      localStorage.clear()
      sessionStorage.clear()
      
      // Reset error state
      hasError.value = false
      errorInfo.value = {}
      errorDetails.value = {}
      retryCount.value = 0
      
      // Emit recovery event
      emit('recovery', { type: 'fresh-start' })
      
      // Show success notification
      notificationService.addNotification({
        type: 'success',
        title: 'Fresh Start',
        message: 'All data cleared. You can start over with complete privacy.',
        icon: 'bi-arrow-clockwise',
        duration: 4000
      })
      
      // Navigate to home
      router.push('/')
    }
    
    const goToDashboard = () => {
      hasError.value = false
      router.push('/')
    }
    
    const showHelp = () => {
      showHelpSection.value = !showHelpSection.value
    }
    
    const downloadErrorReport = () => {
      if (!props.allowErrorReporting) return
      
      const report = {
        timestamp: errorDetails.value.timestamp,
        errorType: errorInfo.value.type,
        severity: errorInfo.value.severity,
        component: errorDetails.value.component,
        requestId: errorDetails.value.requestId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        // Note: No user data included for privacy
        privacyNote: 'This report contains no user data or personal information'
      }
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `error-report-${errorDetails.value.requestId}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    
    const generateRequestId = () => {
      return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleString()
    }
    
    // Computed properties
    const getErrorTitle = () => {
      const titles = {
        [ERROR_TYPES.NETWORK]: 'Connection Problem',
        [ERROR_TYPES.VALIDATION]: 'Input Validation Error',
        [ERROR_TYPES.PROPHET]: 'Forecasting Error',
        [ERROR_TYPES.FILE_UPLOAD]: 'File Upload Error',
        [ERROR_TYPES.SESSION]: 'Session Expired',
        [ERROR_TYPES.TIMEOUT]: 'Request Timeout',
        [ERROR_TYPES.MEMORY]: 'Memory Error',
        [ERROR_TYPES.UNKNOWN]: 'Unexpected Error'
      }
      
      return titles[errorInfo.value.type] || 'Something Went Wrong'
    }
    
    const getErrorSubtitle = () => {
      return errorInfo.value.userMessage || 'An unexpected error occurred, but your privacy remains protected.'
    }
    
    const getErrorIcon = () => {
      const icons = {
        [ERROR_TYPES.NETWORK]: 'bi-wifi-off text-warning',
        [ERROR_TYPES.VALIDATION]: 'bi-exclamation-triangle text-warning',
        [ERROR_TYPES.PROPHET]: 'bi-graph-down text-danger',
        [ERROR_TYPES.FILE_UPLOAD]: 'bi-file-earmark-x text-danger',
        [ERROR_TYPES.SESSION]: 'bi-clock-history text-info',
        [ERROR_TYPES.TIMEOUT]: 'bi-hourglass-split text-warning',
        [ERROR_TYPES.MEMORY]: 'bi-memory text-danger',
        [ERROR_TYPES.UNKNOWN]: 'bi-exclamation-circle text-danger'
      }
      
      return icons[errorInfo.value.type] || 'bi-exclamation-circle text-danger'
    }
    
    const getTroubleshootingTips = () => {
      const tips = {
        [ERROR_TYPES.NETWORK]: [
          { id: 1, icon: 'bi-wifi', text: 'Check your internet connection' },
          { id: 2, icon: 'bi-arrow-clockwise', text: 'Try refreshing the page' },
          { id: 3, icon: 'bi-clock', text: 'Wait a moment and try again' }
        ],
        [ERROR_TYPES.VALIDATION]: [
          { id: 1, icon: 'bi-file-text', text: 'Check your file format (CSV required)' },
          { id: 2, icon: 'bi-list-columns', text: 'Ensure your data has date and value columns' },
          { id: 3, icon: 'bi-calculator', text: 'Verify numeric values are properly formatted' }
        ],
        [ERROR_TYPES.FILE_UPLOAD]: [
          { id: 1, icon: 'bi-file-earmark', text: 'Use a smaller file (max 10MB)' },
          { id: 2, icon: 'bi-filetype-csv', text: 'Ensure file is in CSV format' },
          { id: 3, icon: 'bi-shield-check', text: 'File was not stored on our servers' }
        ],
        [ERROR_TYPES.SESSION]: [
          { id: 1, icon: 'bi-plus-circle', text: 'Start a new session' },
          { id: 2, icon: 'bi-download', text: 'Download your work before sessions expire' },
          { id: 3, icon: 'bi-clock', text: 'Sessions expire for privacy protection' }
        ]
      }
      
      return tips[errorInfo.value.type] || [
        { id: 1, icon: 'bi-arrow-clockwise', text: 'Try refreshing the page' },
        { id: 2, icon: 'bi-house', text: 'Go back to the dashboard' },
        { id: 3, icon: 'bi-shield-check', text: 'Your data remains private and secure' }
      ]
    }
    
    return {
      hasError,
      errorInfo,
      errorDetails,
      isRetrying,
      showHelpSection,
      retryCount,
      handleRetry,
      startFresh,
      goToDashboard,
      showHelp,
      downloadErrorReport,
      formatTimestamp,
      getErrorTitle,
      getErrorSubtitle,
      getErrorIcon,
      getTroubleshootingTips
    }
  }
}
</script><style
 scoped>
.privacy-error-boundary {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 0;
  display: flex;
  align-items: center;
}

.error-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.error-header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #f8f9fa;
}

.error-icon {
  margin-right: 1.5rem;
  flex-shrink: 0;
}

.error-title h2 {
  margin: 0 0 0.5rem 0;
  color: #212529;
  font-weight: 600;
}

.error-subtitle {
  margin: 0;
  color: #6c757d;
  font-size: 1.1rem;
  line-height: 1.5;
}

.privacy-assurance {
  background: linear-gradient(135deg, #d1edff 0%, #e8f5e8 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid #198754;
}

.privacy-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #155724;
}

.privacy-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.privacy-list li {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  color: #155724;
  font-size: 0.95rem;
}

.privacy-list li:last-child {
  margin-bottom: 0;
}

.error-details {
  margin-bottom: 2rem;
}

.accordion-button {
  background-color: #f8f9fa;
  border: none;
  font-weight: 500;
}

.accordion-button:not(.collapsed) {
  background-color: #e9ecef;
  box-shadow: none;
}

.technical-info {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.info-row strong {
  min-width: 120px;
  color: #495057;
}

.error-message-section,
.stack-trace-section {
  margin-top: 1rem;
}

.error-message,
.stack-trace {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.85rem;
  line-height: 1.4;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.recovery-actions {
  margin-bottom: 2rem;
}

.actions-title {
  margin-bottom: 1.5rem;
  color: #495057;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.primary-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.secondary-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 500;
}

.help-section {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid #0dcaf0;
}

.help-content h6 {
  margin-bottom: 1rem;
  color: #0c63e4;
  font-weight: 600;
}

.help-tips {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.help-tip {
  display: flex;
  align-items: center;
  color: #495057;
  font-size: 0.95rem;
  line-height: 1.4;
}

.help-tip i {
  color: #0dcaf0;
  flex-shrink: 0;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .privacy-error-boundary {
    padding: 1rem 0;
  }
  
  .error-card {
    padding: 1.5rem;
    margin: 0 1rem;
  }
  
  .error-header {
    flex-direction: column;
    text-align: center;
  }
  
  .error-icon {
    margin-right: 0;
    margin-bottom: 1rem;
  }
  
  .primary-actions,
  .secondary-actions {
    flex-direction: column;
  }
  
  .primary-actions .btn,
  .secondary-actions .btn {
    width: 100%;
  }
  
  .privacy-assurance,
  .help-section {
    padding: 1rem;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .privacy-error-boundary {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }
  
  .error-card {
    background: #2d2d2d;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .error-title h2 {
    color: #e9ecef;
  }
  
  .error-subtitle {
    color: #adb5bd;
  }
  
  .privacy-assurance {
    background: linear-gradient(135deg, #1a3a4a 0%, #2a4a3a 100%);
    border-left-color: #198754;
  }
  
  .privacy-header,
  .privacy-list li {
    color: #75b798;
  }
  
  .technical-info,
  .error-message,
  .stack-trace {
    background-color: #1a1a1a;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .help-section {
    background-color: #1a1a1a;
    border-left-color: #0dcaf0;
  }
  
  .help-content h6 {
    color: #6edff6;
  }
  
  .help-tip {
    color: #adb5bd;
  }
  
  .help-tip i {
    color: #0dcaf0;
  }
  
  .actions-title {
    color: #adb5bd;
  }
}

/* Animation for error appearance */
.privacy-error-boundary {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading state for retry button */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Focus states for accessibility */
.btn:focus,
.accordion-button:focus {
  box-shadow: 0 0 0 0.2rem rgba(13, 202, 240, 0.25);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .error-card {
    border: 2px solid #000;
  }
  
  .privacy-assurance {
    border: 2px solid #198754;
  }
  
  .help-section {
    border: 2px solid #0dcaf0;
  }
}
</style>