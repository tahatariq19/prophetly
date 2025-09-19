<template>
  <div class="session-result-manager">
    <!-- Session Status Overview -->
    <div class="card mb-4">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>
            Session Results
          </h5>
          <div class="d-flex align-items-center">
            <span class="badge bg-info me-2">Session: {{ sessionId?.slice(-8) || 'N/A' }}</span>
            <button 
              class="btn btn-outline-danger btn-sm"
              @click="showClearConfirmation = true"
              :disabled="!hasAnyResults"
              title="Clear all session data"
            >
              <i class="bi bi-trash3 me-1"></i>
              Clear Session
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-3">
            <div class="text-center">
              <div class="h4 mb-0" :class="hasResults ? 'text-success' : 'text-muted'">
                <i class="bi bi-graph-up"></i>
              </div>
              <small class="text-muted">Forecast Results</small>
              <div class="mt-1">
                <span class="badge" :class="hasResults ? 'bg-success' : 'bg-secondary'">
                  {{ hasResults ? 'Available' : 'None' }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <div class="h4 mb-0" :class="hasData ? 'text-primary' : 'text-muted'">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </div>
              <small class="text-muted">Data</small>
              <div class="mt-1">
                <span class="badge" :class="hasData ? 'bg-primary' : 'bg-secondary'">
                  {{ dataRows }} rows
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <div class="h4 mb-0" :class="hasConfig ? 'text-info' : 'text-muted'">
                <i class="bi bi-gear"></i>
              </div>
              <small class="text-muted">Configuration</small>
              <div class="mt-1">
                <span class="badge" :class="hasConfig ? 'bg-info' : 'bg-secondary'">
                  {{ hasConfig ? 'Set' : 'None' }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <div class="h4 mb-0" :class="sessionAge < maxSessionAge ? 'text-warning' : 'text-danger'">
                <i class="bi bi-hourglass-split"></i>
              </div>
              <small class="text-muted">Session Age</small>
              <div class="mt-1">
                <span class="badge" :class="sessionAge < maxSessionAge ? 'bg-warning' : 'bg-danger'">
                  {{ formatSessionAge(sessionAge) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Management -->
    <div class="card mb-4" v-if="hasResults">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-collection me-2"></i>
          Result Management
        </h5>
      </div>
      <div class="card-body">
        <!-- Result Summary -->
        <div class="row mb-3" v-if="forecastResults?.model_summary">
          <div class="col-md-6">
            <h6>Forecast Summary</h6>
            <ul class="list-unstyled">
              <li><strong>Configuration:</strong> {{ forecastResults.model_summary.config_name || 'Unnamed' }}</li>
              <li><strong>Horizon:</strong> {{ forecastResults.model_summary.horizon }} periods</li>
              <li><strong>Growth Mode:</strong> {{ forecastResults.model_summary.growth }}</li>
              <li><strong>Seasonality:</strong> {{ forecastResults.model_summary.seasonality_mode }}</li>
            </ul>
          </div>
          <div class="col-md-6">
            <h6>Data Summary</h6>
            <ul class="list-unstyled">
              <li><strong>Historical Points:</strong> {{ forecastResults.model_summary.data_points }}</li>
              <li><strong>Forecast Points:</strong> {{ forecastResults.model_summary.forecast_points }}</li>
              <li><strong>Custom Seasonalities:</strong> {{ forecastResults.model_summary.has_custom_seasonalities ? 'Yes' : 'No' }}</li>
              <li><strong>External Regressors:</strong> {{ forecastResults.model_summary.has_regressors ? 'Yes' : 'No' }}</li>
            </ul>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="mb-3" v-if="forecastResults?.performance_metrics">
          <h6>Performance Metrics</h6>
          <div class="row">
            <div class="col-md-3" v-if="forecastResults.performance_metrics.mae">
              <div class="text-center p-2 border rounded">
                <div class="h5 mb-0 text-primary">{{ forecastResults.performance_metrics.mae.toFixed(3) }}</div>
                <small class="text-muted">MAE</small>
              </div>
            </div>
            <div class="col-md-3" v-if="forecastResults.performance_metrics.rmse">
              <div class="text-center p-2 border rounded">
                <div class="h5 mb-0 text-success">{{ forecastResults.performance_metrics.rmse.toFixed(3) }}</div>
                <small class="text-muted">RMSE</small>
              </div>
            </div>
            <div class="col-md-3" v-if="forecastResults.performance_metrics.mape">
              <div class="text-center p-2 border rounded">
                <div class="h5 mb-0 text-info">{{ forecastResults.performance_metrics.mape.toFixed(2) }}%</div>
                <small class="text-muted">MAPE</small>
              </div>
            </div>
            <div class="col-md-3" v-if="forecastResults.performance_metrics.r2">
              <div class="text-center p-2 border rounded">
                <div class="h5 mb-0 text-warning">{{ forecastResults.performance_metrics.r2.toFixed(3) }}</div>
                <small class="text-muted">R²</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary" @click="viewResults">
            <i class="bi bi-graph-up me-2"></i>
            View Charts
          </button>
          <div class="btn-group">
            <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
              <i class="bi bi-download me-2"></i>
              Download
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#" @click="downloadResults('json')">
                <i class="bi bi-filetype-json me-2"></i>JSON Results
              </a></li>
              <li><a class="dropdown-item" href="#" @click="downloadResults('csv')">
                <i class="bi bi-filetype-csv me-2"></i>CSV Data
              </a></li>
              <li><a class="dropdown-item" href="#" @click="downloadResults('config')">
                <i class="bi bi-gear me-2"></i>Configuration
              </a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="#" @click="downloadResults('complete')">
                <i class="bi bi-archive me-2"></i>Complete Package
              </a></li>
            </ul>
          </div>
          <button class="btn btn-outline-info" @click="shareResults">
            <i class="bi bi-share me-2"></i>
            Share
          </button>
          <button class="btn btn-outline-warning" @click="duplicateSession">
            <i class="bi bi-copy me-2"></i>
            Duplicate
          </button>
        </div>
      </div>
    </div>

    <!-- Automatic Cleanup Notice -->
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-shield-check me-2"></i>
          Privacy & Data Management
        </h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-8">
            <h6>Automatic Cleanup Policy</h6>
            <p class="mb-2">
              Your session data is automatically managed for privacy compliance:
            </p>
            <ul class="mb-3">
              <li>All data is processed in server memory only</li>
              <li>Session expires after {{ Math.round(maxSessionAge / 60) }} minutes of inactivity</li>
              <li>Data is automatically purged when session expires</li>
              <li>No data is stored permanently on our servers</li>
            </ul>
            
            <div class="alert alert-info mb-0">
              <div class="d-flex align-items-center">
                <i class="bi bi-info-circle me-2"></i>
                <div>
                  <strong>Session expires in:</strong> {{ formatTimeRemaining(timeRemaining) }}
                  <br>
                  <small>Download your results before the session expires to keep them.</small>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <h6>Quick Actions</h6>
            <div class="d-grid gap-2">
              <button class="btn btn-outline-primary btn-sm" @click="extendSession" :disabled="!canExtendSession">
                <i class="bi bi-clock me-1"></i>
                Extend Session
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="downloadSessionData">
                <i class="bi bi-download me-1"></i>
                Backup Session
              </button>
              <button class="btn btn-outline-success btn-sm" @click="showUploadModal = true">
                <i class="bi bi-upload me-1"></i>
                Restore Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Clear Confirmation Modal -->
    <div class="modal fade" :class="{ show: showClearConfirmation }" :style="{ display: showClearConfirmation ? 'block' : 'none' }" v-if="showClearConfirmation">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Clear Session Data</h5>
            <button type="button" class="btn-close" @click="showClearConfirmation = false"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Warning:</strong> This will permanently delete all session data including:
            </div>
            <ul>
              <li>Uploaded data ({{ dataRows }} rows)</li>
              <li v-if="hasConfig">Forecast configuration</li>
              <li v-if="hasResults">Generated forecast results</li>
              <li>Processing history</li>
            </ul>
            <p class="mb-0">
              <strong>This action cannot be undone.</strong> Consider downloading your data first.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showClearConfirmation = false">
              Cancel
            </button>
            <button type="button" class="btn btn-outline-primary" @click="downloadBeforeClear">
              <i class="bi bi-download me-1"></i>
              Download First
            </button>
            <button type="button" class="btn btn-danger" @click="clearSession">
              <i class="bi bi-trash3 me-1"></i>
              Clear Session
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Upload Modal -->
    <div class="modal fade" :class="{ show: showUploadModal }" :style="{ display: showUploadModal ? 'block' : 'none' }" v-if="showUploadModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Restore Session Data</h5>
            <button type="button" class="btn-close" @click="showUploadModal = false"></button>
          </div>
          <div class="modal-body">
            <p>Upload a previously downloaded session file to restore your work:</p>
            <div class="mb-3">
              <input 
                type="file" 
                class="form-control" 
                accept=".json"
                @change="handleSessionFileUpload"
                ref="sessionFileInput"
              >
            </div>
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Only JSON files exported from this application are supported.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showUploadModal = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div class="modal-backdrop fade show" v-if="showClearConfirmation || showUploadModal" @click="closeModals"></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'

export default {
  name: 'SessionResultManager',
  emits: ['session-cleared', 'session-restored', 'session-extended'],
  setup(_, { emit }) {
    const router = useRouter()
    const sessionStore = useSessionStore()
    
    // Reactive state
    const showClearConfirmation = ref(false)
    const showUploadModal = ref(false)
    const sessionFileInput = ref(null)
    const sessionStartTime = ref(Date.now())
    const currentTime = ref(Date.now())
    const maxSessionAge = ref(2 * 60 * 60 * 1000) // 2 hours in milliseconds
    const timeUpdateInterval = ref(null)
    
    // Computed properties
    const sessionId = computed(() => sessionStore.sessionId)
    const hasResults = computed(() => sessionStore.hasResults)
    const hasData = computed(() => sessionStore.hasData)
    const hasConfig = computed(() => sessionStore.hasConfig)
    const forecastResults = computed(() => sessionStore.forecastResults)
    const dataRows = computed(() => sessionStore.uploadedData?.length || 0)
    
    const hasAnyResults = computed(() => {
      return hasResults.value || hasData.value || hasConfig.value
    })
    
    const sessionAge = computed(() => {
      return currentTime.value - sessionStartTime.value
    })
    
    const timeRemaining = computed(() => {
      return Math.max(0, maxSessionAge.value - sessionAge.value)
    })
    
    const canExtendSession = computed(() => {
      return timeRemaining.value < (30 * 60 * 1000) && hasAnyResults.value // Less than 30 minutes remaining
    })
    
    // Methods
    const formatSessionAge = (age) => {
      const minutes = Math.floor(age / (60 * 1000))
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      }
      return `${minutes}m`
    }
    
    const formatTimeRemaining = (remaining) => {
      if (remaining <= 0) return 'Expired'
      
      const minutes = Math.floor(remaining / (60 * 1000))
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      }
      return `${minutes}m`
    }
    
    const viewResults = () => {
      router.push('/results')
    }
    
    const downloadResults = (format) => {
      if (!hasResults.value) return
      
      const timestamp = new Date().toISOString().split('T')[0]
      let data, filename, mimeType
      
      switch (format) {
        case 'json':
          data = JSON.stringify(forecastResults.value, null, 2)
          filename = `forecast_results_${timestamp}.json`
          mimeType = 'application/json'
          break
          
        case 'csv':
          data = convertToCsv(forecastResults.value.forecast_data)
          filename = `forecast_data_${timestamp}.csv`
          mimeType = 'text/csv'
          break
          
        case 'config':
          data = JSON.stringify(sessionStore.forecastConfig, null, 2)
          filename = `forecast_config_${timestamp}.json`
          mimeType = 'application/json'
          break
          
        case 'complete':
          data = JSON.stringify({
            session_data: sessionStore.exportSessionData(),
            results: forecastResults.value,
            exported_at: new Date().toISOString()
          }, null, 2)
          filename = `complete_session_${timestamp}.json`
          mimeType = 'application/json'
          break
          
        default:
          return
      }
      
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    
    const convertToCsv = (forecastData) => {
      if (!forecastData || !Array.isArray(forecastData)) return ''
      
      const headers = ['date', 'forecast', 'lower_bound', 'upper_bound', 'actual']
      const rows = forecastData.map(point => [
        point.ds,
        point.yhat,
        point.yhat_lower,
        point.yhat_upper,
        point.y || ''
      ])
      
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }
    
    const shareResults = () => {
      // Create a shareable summary
      const summary = {
        forecast_summary: {
          horizon: forecastResults.value?.model_summary?.horizon,
          growth: forecastResults.value?.model_summary?.growth,
          data_points: forecastResults.value?.model_summary?.data_points,
          forecast_points: forecastResults.value?.model_summary?.forecast_points
        },
        performance_metrics: forecastResults.value?.performance_metrics,
        generated_at: new Date().toISOString(),
        note: 'Generated with Prophet Web Interface - Privacy-first forecasting'
      }
      
      const shareText = `Prophet Forecast Results:\n\nHorizon: ${summary.forecast_summary.horizon} periods\nData Points: ${summary.forecast_summary.data_points}\nForecast Points: ${summary.forecast_summary.forecast_points}\n\nGenerated: ${new Date().toLocaleDateString()}`
      
      if (navigator.share) {
        navigator.share({
          title: 'Prophet Forecast Results',
          text: shareText
        })
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Results summary copied to clipboard!')
        })
      }
    }
    
    const duplicateSession = () => {
      const sessionData = sessionStore.exportSessionData()
      if (sessionData) {
        // Create new session with same data
        sessionStore.clearSession()
        sessionStore.importSessionData(sessionData)
        sessionStore.generateSessionId()
        sessionStartTime.value = Date.now()
        
        alert('Session duplicated! You can now modify the configuration or data.')
      }
    }
    
    const extendSession = () => {
      sessionStartTime.value = Date.now()
      emit('session-extended')
      alert('Session extended for another 2 hours.')
    }
    
    const downloadSessionData = () => {
      const sessionData = sessionStore.exportSessionData()
      if (sessionData) {
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session_backup_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }
    
    const handleSessionFileUpload = (event) => {
      const file = event.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const sessionData = JSON.parse(e.target.result)
          sessionStore.importSessionData(sessionData)
          sessionStartTime.value = Date.now()
          showUploadModal.value = false
          emit('session-restored', sessionData)
          alert('Session restored successfully!')
        } catch (error) {
          alert('Invalid session file format.')
        }
      }
      reader.readAsText(file)
    }
    
    const downloadBeforeClear = () => {
      downloadSessionData()
      setTimeout(() => {
        clearSession()
      }, 1000)
    }
    
    const clearSession = () => {
      sessionStore.clearSession()
      showClearConfirmation.value = false
      sessionStartTime.value = Date.now()
      emit('session-cleared')
      router.push('/upload')
    }
    
    const closeModals = () => {
      showClearConfirmation.value = false
      showUploadModal.value = false
    }
    
    // Lifecycle
    onMounted(() => {
      // Update current time every minute
      timeUpdateInterval.value = setInterval(() => {
        currentTime.value = Date.now()
        
        // Auto-clear if session expired
        if (timeRemaining.value <= 0 && hasAnyResults.value) {
          alert('Session has expired. All data has been automatically cleared for privacy.')
          clearSession()
        }
      }, 60000) // Update every minute
    })
    
    onUnmounted(() => {
      if (timeUpdateInterval.value) {
        clearInterval(timeUpdateInterval.value)
      }
    })
    
    return {
      // State
      showClearConfirmation,
      showUploadModal,
      sessionFileInput,
      maxSessionAge,
      
      // Computed
      sessionId,
      hasResults,
      hasData,
      hasConfig,
      forecastResults,
      dataRows,
      hasAnyResults,
      sessionAge,
      timeRemaining,
      canExtendSession,
      
      // Methods
      formatSessionAge,
      formatTimeRemaining,
      viewResults,
      downloadResults,
      shareResults,
      duplicateSession,
      extendSession,
      downloadSessionData,
      handleSessionFileUpload,
      downloadBeforeClear,
      clearSession,
      closeModals
    }
  }
}
</script>

<style scoped>
.session-result-manager {
  max-width: 100%;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge {
  font-size: 0.75em;
}

.modal {
  z-index: 1050;
}

.modal-backdrop {
  z-index: 1040;
}

.btn-group .dropdown-menu {
  border-radius: 6px;
}

.alert {
  border-radius: 6px;
}

@media (max-width: 768px) {
  .d-flex.flex-wrap.gap-2 {
    flex-direction: column;
  }
  
  .btn-group {
    width: 100%;
  }
  
  .btn-group .btn {
    width: 100%;
  }
}
</style>