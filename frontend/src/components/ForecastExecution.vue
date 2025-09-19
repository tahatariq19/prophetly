<template>
  <div class="forecast-execution">
    <!-- Privacy Notice -->
    <div class="alert alert-info mb-4" v-if="!isProcessing">
      <div class="d-flex align-items-center">
        <i class="bi bi-shield-check me-2"></i>
        <div>
          <strong>Privacy Notice:</strong> Your data will be processed entirely in server memory and automatically discarded after completion. No data is stored on our servers.
        </div>
      </div>
    </div>

    <!-- Forecast Configuration Summary -->
    <div class="card mb-4" v-if="configSummary">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-gear me-2"></i>
          Forecast Configuration
        </h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <p><strong>Horizon:</strong> {{ configSummary.horizon }} periods</p>
            <p><strong>Growth:</strong> {{ configSummary.growth }}</p>
            <p><strong>Seasonality Mode:</strong> {{ configSummary.seasonality_mode }}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Data Points:</strong> {{ dataPoints }} rows</p>
            <p><strong>Confidence Interval:</strong> {{ Math.round((configSummary.interval_width || 0.8) * 100) }}%</p>
            <p><strong>MCMC Samples:</strong> {{ configSummary.mcmc_samples || 0 }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Controls -->
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-play-circle me-2"></i>
          Forecast Execution
        </h5>
      </div>
      <div class="card-body">
        <!-- Pre-execution validation -->
        <div v-if="!isProcessing && !hasResults" class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6>Ready to Generate Forecast</h6>
              <p class="text-muted mb-0">
                Estimated processing time: {{ estimatedTime }}
              </p>
            </div>
            <button 
              class="btn btn-primary btn-lg"
              @click="startForecast"
              :disabled="!canStartForecast"
            >
              <i class="bi bi-play-fill me-2"></i>
              Generate Forecast
            </button>
          </div>
          
          <!-- Validation warnings -->
          <div v-if="validationWarnings.length > 0" class="alert alert-warning">
            <h6><i class="bi bi-exclamation-triangle me-2"></i>Recommendations:</h6>
            <ul class="mb-0">
              <li v-for="warning in validationWarnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>
        </div>

        <!-- Progress Tracking -->
        <div v-if="isProcessing" class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">{{ currentStage }}</h6>
            <div class="d-flex align-items-center">
              <span class="text-muted me-3">{{ Math.round(progress) }}%</span>
              <button 
                class="btn btn-outline-danger btn-sm"
                @click="cancelForecast"
                :disabled="!canCancel"
              >
                <i class="bi bi-stop-fill me-1"></i>
                Cancel
              </button>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="progress mb-3" style="height: 8px;">
            <div 
              class="progress-bar progress-bar-striped progress-bar-animated"
              :class="progressBarClass"
              :style="{ width: progress + '%' }"
              role="progressbar"
              :aria-valuenow="progress"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          
          <!-- Current Status Message -->
          <div class="d-flex align-items-center text-muted">
            <div class="spinner-border spinner-border-sm me-2" role="status">
              <span class="visually-hidden">Processing...</span>
            </div>
            <small>{{ statusMessage }}</small>
          </div>
          
          <!-- Processing Stages -->
          <div class="mt-3">
            <div class="row">
              <div class="col-md-6">
                <div 
                  v-for="stage in processingStages.slice(0, Math.ceil(processingStages.length / 2))" 
                  :key="stage.name"
                  class="d-flex align-items-center mb-2"
                >
                  <i 
                    :class="getStageIcon(stage)"
                    class="me-2"
                  ></i>
                  <span 
                    :class="getStageClass(stage)"
                    class="small"
                  >
                    {{ stage.label }}
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div 
                  v-for="stage in processingStages.slice(Math.ceil(processingStages.length / 2))" 
                  :key="stage.name"
                  class="d-flex align-items-center mb-2"
                >
                  <i 
                    :class="getStageIcon(stage)"
                    class="me-2"
                  ></i>
                  <span 
                    :class="getStageClass(stage)"
                    class="small"
                  >
                    {{ stage.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Results Summary -->
        <div v-if="hasResults && !isProcessing" class="mb-3">
          <div class="alert alert-success">
            <div class="d-flex align-items-center">
              <i class="bi bi-check-circle-fill me-2"></i>
              <div>
                <strong>Forecast Generated Successfully!</strong>
                <p class="mb-0 mt-1">
                  Generated {{ forecastResults?.forecast_data?.length || 0 }} forecast points 
                  in {{ processingTime }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Quick Results Overview -->
          <div class="row" v-if="forecastResults?.model_summary">
            <div class="col-md-3">
              <div class="text-center">
                <div class="h4 text-primary mb-0">{{ forecastResults.model_summary.forecast_points }}</div>
                <small class="text-muted">Forecast Points</small>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <div class="h4 text-success mb-0">{{ forecastResults.model_summary.data_points }}</div>
                <small class="text-muted">Historical Points</small>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <div class="h4 text-info mb-0">{{ forecastResults.model_summary.horizon }}</div>
                <small class="text-muted">Periods Ahead</small>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <div class="h4 text-warning mb-0">
                  {{ forecastResults.performance_metrics?.rmse ? forecastResults.performance_metrics.rmse.toFixed(2) : 'N/A' }}
                </div>
                <small class="text-muted">RMSE</small>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary" @click="viewResults">
              <i class="bi bi-graph-up me-2"></i>
              View Charts
            </button>
            <button class="btn btn-outline-secondary" @click="downloadResults">
              <i class="bi bi-download me-2"></i>
              Download Results
            </button>
            <button class="btn btn-outline-info" @click="runNewForecast">
              <i class="bi bi-arrow-clockwise me-2"></i>
              Run New Forecast
            </button>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="alert alert-danger">
          <div class="d-flex align-items-start">
            <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
            <div>
              <strong>Forecast Generation Failed</strong>
              <p class="mb-2 mt-1">{{ error.message }}</p>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-danger btn-sm" @click="retryForecast">
                  <i class="bi bi-arrow-clockwise me-1"></i>
                  Retry
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="clearError">
                  <i class="bi bi-x me-1"></i>
                  Dismiss
                </button>
              </div>
              <div class="mt-2">
                <small class="text-muted">
                  <i class="bi bi-shield-check me-1"></i>
                  {{ error.privacyMessage || 'Your data was processed in memory only and has been automatically discarded.' }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Memory Cleanup Notice -->
    <div class="alert alert-secondary" v-if="showCleanupNotice">
      <div class="d-flex align-items-center">
        <i class="bi bi-trash3 me-2"></i>
        <div>
          <strong>Automatic Cleanup:</strong> Session data will be automatically cleared from server memory after completion or timeout.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'
import api from '../services/api'
import { notificationService } from '../services/notifications'

export default {
  name: 'ForecastExecution',
  props: {
    autoStart: {
      type: Boolean,
      default: false
    }
  },
  emits: ['forecast-completed', 'forecast-error', 'forecast-cancelled'],
  setup(props, { emit }) {
    const router = useRouter()
    const sessionStore = useSessionStore()
    
    // Reactive state
    const isProcessing = ref(false)
    const progress = ref(0)
    const currentStage = ref('')
    const statusMessage = ref('')
    const error = ref(null)
    const validationWarnings = ref([])
    const estimatedTime = ref('2-5 seconds')
    const processingTime = ref('')
    const startTime = ref(null)
    const canCancel = ref(true)
    const showCleanupNotice = ref(true)
    const pollingInterval = ref(null)
    
    // Processing stages
    const processingStages = ref([
      { name: 'validation', label: 'Validating Configuration', status: 'pending' },
      { name: 'data_prep', label: 'Preparing Data', status: 'pending' },
      { name: 'model_creation', label: 'Creating Prophet Model', status: 'pending' },
      { name: 'model_fitting', label: 'Fitting Model', status: 'pending' },
      { name: 'prediction', label: 'Generating Predictions', status: 'pending' },
      { name: 'components', label: 'Extracting Components', status: 'pending' },
      { name: 'cleanup', label: 'Memory Cleanup', status: 'pending' }
    ])
    
    // Computed properties
    const configSummary = computed(() => sessionStore.forecastConfig)
    const dataPoints = computed(() => sessionStore.uploadedData?.length || 0)
    const hasResults = computed(() => sessionStore.hasResults)
    const forecastResults = computed(() => sessionStore.forecastResults)
    
    const canStartForecast = computed(() => {
      return sessionStore.hasData && sessionStore.hasConfig && !isProcessing.value
    })
    
    const progressBarClass = computed(() => {
      if (error.value) return 'bg-danger'
      if (progress.value === 100) return 'bg-success'
      return 'bg-primary'
    })
    
    // Methods
    const validateForecastRequest = async () => {
      try {
        const request = {
          session_id: sessionStore.sessionId,
          config: sessionStore.forecastConfig,
          dataset_name: 'uploaded_data'
        }
        
        const response = await api.post('/forecast/validate', request)
        
        if (response.data.warnings) {
          validationWarnings.value = response.data.warnings
        }
        
        if (response.data.estimated_processing_time_seconds) {
          const seconds = response.data.estimated_processing_time_seconds
          estimatedTime.value = seconds < 60 
            ? `${Math.round(seconds)} seconds`
            : `${Math.round(seconds / 60)} minutes`
        }
        
        return response.data.is_valid
      } catch (err) {
        console.error('Validation failed:', err)
        return false
      }
    }
    
    const updateStage = (stageName, status = 'active') => {
      const stage = processingStages.value.find(s => s.name === stageName)
      if (stage) {
        // Mark previous stages as completed
        const stageIndex = processingStages.value.indexOf(stage)
        for (let i = 0; i < stageIndex; i++) {
          if (processingStages.value[i].status === 'active') {
            processingStages.value[i].status = 'completed'
          }
        }
        stage.status = status
      }
    }
    
    const getStageIcon = (stage) => {
      switch (stage.status) {
        case 'completed':
          return 'bi bi-check-circle-fill text-success'
        case 'active':
          return 'bi bi-arrow-right-circle-fill text-primary'
        case 'error':
          return 'bi bi-x-circle-fill text-danger'
        default:
          return 'bi bi-circle text-muted'
      }
    }
    
    const getStageClass = (stage) => {
      switch (stage.status) {
        case 'completed':
          return 'text-success'
        case 'active':
          return 'text-primary fw-bold'
        case 'error':
          return 'text-danger'
        default:
          return 'text-muted'
      }
    }
    
    const simulateProgress = () => {
      const stages = [
        { name: 'validation', duration: 500, progress: 10 },
        { name: 'data_prep', duration: 800, progress: 25 },
        { name: 'model_creation', duration: 1000, progress: 40 },
        { name: 'model_fitting', duration: 2000, progress: 70 },
        { name: 'prediction', duration: 1200, progress: 85 },
        { name: 'components', duration: 800, progress: 95 },
        { name: 'cleanup', duration: 300, progress: 100 }
      ]
      
      let currentStageIndex = 0
      
      const processStage = () => {
        if (currentStageIndex >= stages.length || !isProcessing.value) return
        
        const stage = stages[currentStageIndex]
        updateStage(stage.name, 'active')
        currentStage.value = processingStages.value.find(s => s.name === stage.name)?.label || ''
        statusMessage.value = `Processing ${stage.name.replace('_', ' ')}...`
        
        // Animate progress
        const startProgress = progress.value
        const targetProgress = stage.progress
        const duration = stage.duration
        const steps = 20
        const stepDuration = duration / steps
        const progressStep = (targetProgress - startProgress) / steps
        
        let step = 0
        const progressInterval = setInterval(() => {
          if (!isProcessing.value) {
            clearInterval(progressInterval)
            return
          }
          
          step++
          progress.value = Math.min(targetProgress, startProgress + (progressStep * step))
          
          if (step >= steps) {
            clearInterval(progressInterval)
            updateStage(stage.name, 'completed')
            currentStageIndex++
            
            if (currentStageIndex < stages.length) {
              setTimeout(processStage, 100)
            }
          }
        }, stepDuration)
      }
      
      processStage()
    }
    
    const startForecast = async () => {
      try {
        error.value = null
        isProcessing.value = true
        progress.value = 0
        startTime.value = Date.now()
        canCancel.value = true
        
        // Reset stages
        processingStages.value.forEach(stage => {
          stage.status = 'pending'
        })
        
        // Start progress simulation
        simulateProgress()
        
        // Validate request first
        const isValid = await validateForecastRequest()
        if (!isValid) {
          throw new Error('Forecast configuration validation failed')
        }
        
        // Prepare request
        const request = {
          session_id: sessionStore.sessionId,
          config: sessionStore.forecastConfig,
          dataset_name: 'uploaded_data'
        }
        
        // Make forecast request
        const response = await api.post('/forecast/generate', request)
        
        if (response.data.success) {
          // Store results
          sessionStore.setForecastResults(response.data)
          
          // Complete processing
          progress.value = 100
          isProcessing.value = false
          
          // Calculate processing time
          const endTime = Date.now()
          const duration = Math.round((endTime - startTime.value) / 1000)
          processingTime.value = duration < 60 
            ? `${duration} seconds`
            : `${Math.round(duration / 60)} minutes`
          
          // Mark all stages as completed
          processingStages.value.forEach(stage => {
            stage.status = 'completed'
          })
          
          // Show success notification
          notificationService.showForecastCompleted(processingTime.value)
          
          emit('forecast-completed', response.data)
        } else {
          throw new Error(response.data.message || 'Forecast generation failed')
        }
        
      } catch (err) {
        console.error('Forecast generation failed:', err)
        error.value = err
        isProcessing.value = false
        progress.value = 0
        
        // Mark current stage as error
        const activeStage = processingStages.value.find(s => s.status === 'active')
        if (activeStage) {
          activeStage.status = 'error'
        }
        
        // Show error notification
        notificationService.showForecastError(err)
        
        emit('forecast-error', err)
      }
    }
    
    const cancelForecast = () => {
      isProcessing.value = false
      progress.value = 0
      canCancel.value = false
      
      // Reset stages
      processingStages.value.forEach(stage => {
        if (stage.status === 'active') {
          stage.status = 'pending'
        }
      })
      
      emit('forecast-cancelled')
    }
    
    const retryForecast = () => {
      error.value = null
      startForecast()
    }
    
    const clearError = () => {
      error.value = null
    }
    
    const viewResults = () => {
      router.push('/results')
    }
    
    const downloadResults = () => {
      if (forecastResults.value) {
        const data = {
          forecast_data: forecastResults.value.forecast_data,
          components: forecastResults.value.components,
          model_summary: forecastResults.value.model_summary,
          performance_metrics: forecastResults.value.performance_metrics,
          generated_at: new Date().toISOString()
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `forecast_results_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }
    
    const runNewForecast = () => {
      sessionStore.setForecastResults(null)
      error.value = null
    }
    
    // Lifecycle
    onMounted(async () => {
      if (props.autoStart && canStartForecast.value) {
        await startForecast()
      }
      
      // Validate on mount
      if (canStartForecast.value) {
        await validateForecastRequest()
      }
    })
    
    onUnmounted(() => {
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value)
      }
    })
    
    // Watch for session changes
    watch(() => sessionStore.sessionId, () => {
      if (sessionStore.sessionId && canStartForecast.value) {
        validateForecastRequest()
      }
    })
    
    return {
      // State
      isProcessing,
      progress,
      currentStage,
      statusMessage,
      error,
      validationWarnings,
      estimatedTime,
      processingTime,
      canCancel,
      showCleanupNotice,
      processingStages,
      
      // Computed
      configSummary,
      dataPoints,
      hasResults,
      forecastResults,
      canStartForecast,
      progressBarClass,
      
      // Methods
      startForecast,
      cancelForecast,
      retryForecast,
      clearError,
      viewResults,
      downloadResults,
      runNewForecast,
      getStageIcon,
      getStageClass
    }
  }
}
</script>

<style scoped>
.forecast-execution {
  max-width: 100%;
}

.progress {
  border-radius: 4px;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

.alert {
  border-radius: 8px;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn {
  border-radius: 6px;
}

.text-primary {
  color: #0d6efd !important;
}

.text-success {
  color: #198754 !important;
}

.text-info {
  color: #0dcaf0 !important;
}

.text-warning {
  color: #ffc107 !important;
}

@media (max-width: 768px) {
  .d-flex.gap-2 {
    flex-direction: column;
  }
  
  .d-flex.gap-2 .btn {
    margin-bottom: 0.5rem;
  }
}
</style>