<template>
  <div class="cross-validation-interface">
    <!-- Header -->
    <div class="cv-header">
      <h3 class="cv-title">
        <i class="fas fa-chart-line"></i>
        Cross-Validation & Model Diagnostics
      </h3>
      <p class="cv-description">
        Validate your model's performance with comprehensive cross-validation analysis.
        All processing happens in memory only - no data is stored on the server.
      </p>
    </div>

    <!-- Configuration Form -->
    <div class="cv-config-section">
      <h4>Cross-Validation Configuration</h4>
      
      <div class="config-grid">
        <!-- Initial Training Period -->
        <div class="config-group">
          <label for="initial-period">Initial Training Period</label>
          <input
            id="initial-period"
            v-model="config.initial"
            type="text"
            class="form-control"
            placeholder="730 days"
            :disabled="isProcessing"
          />
          <small class="help-text">
            Minimum training data before first prediction (e.g., "730 days", "2 years")
          </small>
        </div>

        <!-- Period Between Cutoffs -->
        <div class="config-group">
          <label for="period">Period Between Cutoffs</label>
          <input
            id="period"
            v-model="config.period"
            type="text"
            class="form-control"
            placeholder="180 days"
            :disabled="isProcessing"
          />
          <small class="help-text">
            Time between validation cutoffs (e.g., "180 days", "6 months")
          </small>
        </div>

        <!-- Forecast Horizon -->
        <div class="config-group">
          <label for="horizon">Forecast Horizon</label>
          <input
            id="horizon"
            v-model="config.horizon"
            type="text"
            class="form-control"
            placeholder="365 days"
            :disabled="isProcessing"
          />
          <small class="help-text">
            How far ahead to predict at each cutoff (e.g., "365 days", "1 year")
          </small>
        </div>

        <!-- Parallel Processing -->
        <div class="config-group">
          <label for="parallel">Parallel Processing</label>
          <select
            id="parallel"
            v-model="config.parallel"
            class="form-control"
            :disabled="isProcessing"
          >
            <option value="">None (Sequential)</option>
            <option value="processes">Processes</option>
            <option value="threads">Threads</option>
          </select>
          <small class="help-text">
            Enable parallel processing for faster validation
          </small>
        </div>
      </div>

      <!-- Custom Cutoffs -->
      <div class="custom-cutoffs-section">
        <div class="cutoffs-header">
          <label>
            <input
              v-model="useCustomCutoffs"
              type="checkbox"
              :disabled="isProcessing"
            />
            Use Custom Cutoff Dates
          </label>
        </div>
        
        <div v-if="useCustomCutoffs" class="cutoffs-input">
          <textarea
            v-model="customCutoffsText"
            class="form-control"
            rows="3"
            placeholder="2023-01-01&#10;2023-07-01&#10;2024-01-01"
            :disabled="isProcessing"
          ></textarea>
          <small class="help-text">
            Enter cutoff dates in YYYY-MM-DD format, one per line
          </small>
        </div>
      </div>

      <!-- Validation and Execute Buttons -->
      <div class="cv-actions">
        <button
          class="btn btn-outline-primary"
          :disabled="!canValidate || isProcessing"
          @click="validateConfiguration"
        >
          <i class="fas fa-check-circle"></i>
          Validate Configuration
        </button>
        
        <button
          class="btn btn-primary"
          :disabled="!canExecute || isProcessing"
          @click="executeCrossValidation"
        >
          <i class="fas fa-play"></i>
          <span v-if="isProcessing">Processing...</span>
          <span v-else>Run Cross-Validation</span>
        </button>
      </div>
    </div>

    <!-- Validation Results -->
    <div v-if="validationResult" class="validation-results">
      <h4>Configuration Validation</h4>
      
      <div class="validation-status" :class="validationResult.is_valid ? 'valid' : 'invalid'">
        <i :class="validationResult.is_valid ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
        <span>{{ validationResult.is_valid ? 'Configuration Valid' : 'Configuration Issues Found' }}</span>
      </div>

      <!-- Errors -->
      <div v-if="validationResult.errors?.length" class="validation-errors">
        <h5>Errors:</h5>
        <ul>
          <li v-for="error in validationResult.errors" :key="error" class="error-item">
            {{ error }}
          </li>
        </ul>
      </div>

      <!-- Warnings -->
      <div v-if="validationResult.warnings?.length" class="validation-warnings">
        <h5>Warnings:</h5>
        <ul>
          <li v-for="warning in validationResult.warnings" :key="warning" class="warning-item">
            {{ warning }}
          </li>
        </ul>
      </div>

      <!-- Recommendations -->
      <div v-if="validationResult.recommendations?.length" class="validation-recommendations">
        <h5>Recommendations:</h5>
        <ul>
          <li v-for="rec in validationResult.recommendations" :key="rec" class="recommendation-item">
            {{ rec }}
          </li>
        </ul>
      </div>

      <!-- Estimates -->
      <div v-if="validationResult.is_valid" class="validation-estimates">
        <div class="estimates-grid">
          <div class="estimate-item">
            <span class="estimate-label">Data Points:</span>
            <span class="estimate-value">{{ validationResult.data_points?.toLocaleString() }}</span>
          </div>
          <div class="estimate-item">
            <span class="estimate-label">Estimated Cutoffs:</span>
            <span class="estimate-value">{{ validationResult.estimated_cutoffs }}</span>
          </div>
          <div class="estimate-item">
            <span class="estimate-label">Estimated Time:</span>
            <span class="estimate-value">{{ formatTime(validationResult.estimated_processing_time_seconds) }}</span>
          </div>
          <div class="estimate-item">
            <span class="estimate-label">Estimated Memory:</span>
            <span class="estimate-value">{{ Math.round(validationResult.estimated_memory_mb) }} MB</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Progress -->
    <div v-if="isProcessing" class="processing-section">
      <div class="progress-header">
        <h4>Cross-Validation in Progress</h4>
        <p>Processing {{ processingStatus.current_cutoff || 0 }} of {{ processingStatus.total_cutoffs || 0 }} cutoffs...</p>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${processingProgress}%` }"
        ></div>
      </div>
      
      <div class="progress-details">
        <div class="detail-item">
          <span>Stage:</span>
          <span>{{ processingStatus.stage || 'Initializing...' }}</span>
        </div>
        <div class="detail-item">
          <span>Elapsed:</span>
          <span>{{ formatTime(processingStatus.elapsed_seconds || 0) }}</span>
        </div>
        <div class="detail-item">
          <span>Estimated Remaining:</span>
          <span>{{ formatTime(processingStatus.estimated_remaining_seconds || 0) }}</span>
        </div>
      </div>

      <div class="privacy-notice">
        <i class="fas fa-shield-alt"></i>
        Your data is being processed in memory only and will be automatically discarded after completion.
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="cvResults && !isProcessing" class="results-section">
      <div class="results-header">
        <h4>Cross-Validation Results</h4>
        <div class="results-actions">
          <button class="btn btn-outline-primary" @click="exportResults">
            <i class="fas fa-download"></i>
            Export Results
          </button>
          <button class="btn btn-outline-secondary" @click="exportCharts">
            <i class="fas fa-chart-bar"></i>
            Export Charts
          </button>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="metrics-section">
        <h5>Performance Metrics</h5>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">RMSE</div>
            <div class="metric-value">{{ formatMetric(cvResults.metrics?.rmse) }}</div>
            <div class="metric-description">Root Mean Square Error</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">MAE</div>
            <div class="metric-value">{{ formatMetric(cvResults.metrics?.mae) }}</div>
            <div class="metric-description">Mean Absolute Error</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">MAPE</div>
            <div class="metric-value">{{ formatMetric(cvResults.metrics?.mape, '%') }}</div>
            <div class="metric-description">Mean Absolute Percentage Error</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Coverage</div>
            <div class="metric-value">{{ formatMetric(cvResults.metrics?.coverage, '%') }}</div>
            <div class="metric-description">Prediction Interval Coverage</div>
          </div>
        </div>
      </div>

      <!-- Error Analysis Chart -->
      <div class="chart-section">
        <h5>Error Analysis</h5>
        <div class="chart-container">
          <canvas ref="errorChart"></canvas>
        </div>
      </div>

      <!-- Performance Over Time Chart -->
      <div class="chart-section">
        <h5>Performance Over Time</h5>
        <div class="chart-container">
          <canvas ref="performanceChart"></canvas>
        </div>
      </div>

      <!-- Results Summary -->
      <div class="summary-section">
        <h5>Summary</h5>
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">Total Predictions:</span>
            <span class="stat-value">{{ cvResults.total_predictions?.toLocaleString() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Cutoffs Used:</span>
            <span class="stat-value">{{ cvResults.cutoff_count }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">{{ formatTime(cvResults.processing_time_seconds) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-section">
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>Error:</strong> {{ error.message }}
          <div v-if="error.privacyMessage" class="privacy-message">
            <i class="fas fa-shield-alt"></i>
            {{ error.privacyMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

export default {
  name: 'CrossValidationInterface',
  props: {
    sessionId: {
      type: String,
      required: true
    },
    forecastConfig: {
      type: Object,
      required: true
    }
  },
  emits: ['results-updated'],
  setup(props, { emit }) {
    // Reactive data
    const config = ref({
      initial: '730 days',
      period: '180 days', 
      horizon: '365 days',
      parallel: ''
    })
    
    const useCustomCutoffs = ref(false)
    const customCutoffsText = ref('')
    const validationResult = ref(null)
    const cvResults = ref(null)
    const isProcessing = ref(false)
    const processingStatus = ref({})
    const error = ref(null)
    
    // Chart references
    const errorChart = ref(null)
    const performanceChart = ref(null)
    let errorChartInstance = null
    let performanceChartInstance = null
    
    // Computed properties
    const canValidate = computed(() => {
      return props.sessionId && props.forecastConfig && 
             config.value.initial && config.value.period && config.value.horizon
    })
    
    const canExecute = computed(() => {
      return canValidate.value && validationResult.value?.is_valid && !isProcessing.value
    })
    
    const processingProgress = computed(() => {
      if (!processingStatus.value.total_cutoffs) return 0
      return Math.round((processingStatus.value.current_cutoff || 0) / processingStatus.value.total_cutoffs * 100)
    })
    
    // Methods
    const validateConfiguration = async () => {
      try {
        error.value = null
        
        const requestConfig = {
          session_id: props.sessionId,
          config: {
            initial: config.value.initial,
            period: config.value.period,
            horizon: config.value.horizon,
            parallel: config.value.parallel || null,
            cutoffs: useCustomCutoffs.value ? parseCustomCutoffs() : null
          },
          forecast_config: props.forecastConfig
        }
        
        const response = await api.post('/cross-validation/validate-config', requestConfig)
        validationResult.value = response.data
        
      } catch (err) {
        console.error('Configuration validation failed:', err)
        error.value = err
        validationResult.value = null
      }
    }
    
    const executeCrossValidation = async () => {
      try {
        error.value = null
        isProcessing.value = true
        processingStatus.value = { stage: 'Initializing...', current_cutoff: 0 }
        
        const requestConfig = {
          session_id: props.sessionId,
          config: {
            initial: config.value.initial,
            period: config.value.period,
            horizon: config.value.horizon,
            parallel: config.value.parallel || null,
            cutoffs: useCustomCutoffs.value ? parseCustomCutoffs() : null
          },
          forecast_config: props.forecastConfig
        }
        
        // Start progress tracking
        const progressInterval = startProgressTracking()
        
        try {
          const response = await api.post('/cross-validation/execute', requestConfig)
          cvResults.value = response.data
          
          // Create charts after results are available
          await nextTick()
          createErrorAnalysisChart()
          createPerformanceChart()
          
          emit('results-updated', cvResults.value)
          
        } finally {
          clearInterval(progressInterval)
          isProcessing.value = false
        }
        
      } catch (err) {
        console.error('Cross-validation failed:', err)
        error.value = err
        isProcessing.value = false
      }
    }
    
    const parseCustomCutoffs = () => {
      if (!customCutoffsText.value.trim()) return null
      
      return customCutoffsText.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    }
    
    const startProgressTracking = () => {
      let elapsed = 0
      return setInterval(() => {
        elapsed += 1
        processingStatus.value = {
          ...processingStatus.value,
          elapsed_seconds: elapsed,
          stage: getProcessingStage(elapsed),
          estimated_remaining_seconds: Math.max(0, (validationResult.value?.estimated_processing_time_seconds || 60) - elapsed)
        }
      }, 1000)
    }
    
    const getProcessingStage = (elapsed) => {
      if (elapsed < 5) return 'Initializing model...'
      if (elapsed < 15) return 'Preparing data...'
      if (elapsed < 30) return 'Running cross-validation...'
      return 'Calculating metrics...'
    }
    
    const createErrorAnalysisChart = () => {
      if (!errorChart.value || !cvResults.value?.results) return
      
      const ctx = errorChart.value.getContext('2d')
      
      // Destroy existing chart
      if (errorChartInstance) {
        errorChartInstance.destroy()
      }
      
      const data = cvResults.value.results.map(point => ({
        x: new Date(point.ds),
        y: point.error
      }))
      
      errorChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Prediction Errors',
            data: data,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Prediction Error'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Prediction Errors Over Time'
            },
            legend: {
              display: false
            }
          }
        }
      })
    }
    
    const createPerformanceChart = () => {
      if (!performanceChart.value || !cvResults.value?.results) return
      
      const ctx = performanceChart.value.getContext('2d')
      
      // Destroy existing chart
      if (performanceChartInstance) {
        performanceChartInstance.destroy()
      }
      
      // Group by horizon and calculate average absolute error
      const horizonGroups = {}
      cvResults.value.results.forEach(point => {
        const horizon = point.horizon_days
        if (!horizonGroups[horizon]) {
          horizonGroups[horizon] = []
        }
        horizonGroups[horizon].push(point.abs_error)
      })
      
      const horizonData = Object.keys(horizonGroups)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(horizon => ({
          x: parseInt(horizon),
          y: horizonGroups[horizon].reduce((sum, err) => sum + err, 0) / horizonGroups[horizon].length
        }))
      
      performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Average Absolute Error',
            data: horizonData,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Forecast Horizon (Days)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Average Absolute Error'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Performance by Forecast Horizon'
            },
            legend: {
              display: false
            }
          }
        }
      })
    }
    
    const exportResults = () => {
      if (!cvResults.value) return
      
      // Create CSV content
      const headers = ['Date', 'Cutoff', 'Actual', 'Predicted', 'Lower_CI', 'Upper_CI', 'Horizon_Days', 'Error', 'Abs_Error', 'Pct_Error']
      const rows = cvResults.value.results.map(point => [
        point.ds,
        point.cutoff,
        point.y,
        point.yhat,
        point.yhat_lower,
        point.yhat_upper,
        point.horizon_days,
        point.error,
        point.abs_error,
        point.pct_error || ''
      ])
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')
      
      // Add metadata header
      const metadata = [
        `# Cross-Validation Results`,
        `# Generated: ${new Date().toISOString()}`,
        `# Session: ${props.sessionId}`,
        `# Configuration: Initial=${config.value.initial}, Period=${config.value.period}, Horizon=${config.value.horizon}`,
        `# Metrics: RMSE=${cvResults.value.metrics?.rmse?.toFixed(4)}, MAE=${cvResults.value.metrics?.mae?.toFixed(4)}, MAPE=${cvResults.value.metrics?.mape?.toFixed(2)}%`,
        `# Total Predictions: ${cvResults.value.total_predictions}, Cutoffs: ${cvResults.value.cutoff_count}`,
        `# Processing Time: ${cvResults.value.processing_time_seconds?.toFixed(2)} seconds`,
        `#`,
        csvContent
      ].join('\n')
      
      downloadFile(metadata, `cross_validation_results_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    }
    
    const exportCharts = () => {
      const charts = []
      
      if (errorChartInstance) {
        charts.push({
          name: 'error_analysis',
          canvas: errorChart.value
        })
      }
      
      if (performanceChartInstance) {
        charts.push({
          name: 'performance_by_horizon',
          canvas: performanceChart.value
        })
      }
      
      charts.forEach(chart => {
        chart.canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${chart.name}_${new Date().toISOString().split('T')[0]}.png`
          link.click()
          URL.revokeObjectURL(url)
        })
      })
    }
    
    const downloadFile = (content, filename, mimeType) => {
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }
    
    const formatMetric = (value, suffix = '') => {
      if (value == null) return 'N/A'
      return `${value.toFixed(4)}${suffix}`
    }
    
    const formatTime = (seconds) => {
      if (!seconds) return '0s'
      if (seconds < 60) return `${Math.round(seconds)}s`
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      return `${minutes}m ${remainingSeconds}s`
    }
    
    // Lifecycle
    onMounted(() => {
      // Auto-validate on mount if config is available
      if (canValidate.value) {
        validateConfiguration()
      }
    })
    
    onUnmounted(() => {
      // Cleanup charts
      if (errorChartInstance) {
        errorChartInstance.destroy()
      }
      if (performanceChartInstance) {
        performanceChartInstance.destroy()
      }
    })
    
    return {
      config,
      useCustomCutoffs,
      customCutoffsText,
      validationResult,
      cvResults,
      isProcessing,
      processingStatus,
      error,
      errorChart,
      performanceChart,
      canValidate,
      canExecute,
      processingProgress,
      validateConfiguration,
      executeCrossValidation,
      exportResults,
      exportCharts,
      formatMetric,
      formatTime
    }
  }
}
</script>

<style scoped>
.cross-validation-interface {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.cv-header {
  text-align: center;
  margin-bottom: 30px;
}

.cv-title {
  color: #2c3e50;
  margin-bottom: 10px;
}

.cv-title i {
  margin-right: 10px;
  color: #3498db;
}

.cv-description {
  color: #7f8c8d;
  font-size: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.cv-config-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.config-group {
  display: flex;
  flex-direction: column;
}

.config-group label {
  font-weight: 600;
  margin-bottom: 5px;
  color: #2c3e50;
}

.form-control {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-control:disabled {
  background-color: #f5f5f5;
  color: #999;
}

.help-text {
  color: #6c757d;
  font-size: 12px;
  margin-top: 5px;
}

.custom-cutoffs-section {
  margin-bottom: 25px;
}

.cutoffs-header label {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #2c3e50;
}

.cutoffs-header input[type="checkbox"] {
  margin-right: 8px;
}

.cutoffs-input {
  margin-top: 15px;
}

.cutoffs-input textarea {
  resize: vertical;
  min-height: 80px;
}

.cv-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-outline-primary {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline-primary:hover:not(:disabled) {
  background-color: #3498db;
  color: white;
}

.btn-outline-secondary {
  background-color: transparent;
  color: #6c757d;
  border: 1px solid #6c757d;
}

.btn-outline-secondary:hover:not(:disabled) {
  background-color: #6c757d;
  color: white;
}

.validation-results {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  border: 1px solid #e9ecef;
}

.validation-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 600;
}

.validation-status.valid {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.validation-status.invalid {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.validation-errors,
.validation-warnings,
.validation-recommendations {
  margin-bottom: 15px;
}

.validation-errors h5 {
  color: #dc3545;
}

.validation-warnings h5 {
  color: #ffc107;
}

.validation-recommendations h5 {
  color: #17a2b8;
}

.validation-errors ul,
.validation-warnings ul,
.validation-recommendations ul {
  margin: 10px 0;
  padding-left: 20px;
}

.error-item {
  color: #dc3545;
}

.warning-item {
  color: #856404;
}

.recommendation-item {
  color: #0c5460;
}

.validation-estimates {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.estimates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.estimate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.estimate-label {
  font-weight: 600;
  color: #495057;
}

.estimate-value {
  font-weight: 700;
  color: #2c3e50;
}

.processing-section {
  background: #e3f2fd;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
  text-align: center;
}

.progress-header h4 {
  color: #1976d2;
  margin-bottom: 10px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin: 20px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2980b9);
  transition: width 0.3s ease;
}

.progress-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 10px 15px;
  border-radius: 6px;
}

.privacy-notice {
  background: #d4edda;
  color: #155724;
  padding: 10px 15px;
  border-radius: 6px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.results-section {
  background: white;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
  border: 1px solid #e9ecef;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.results-actions {
  display: flex;
  gap: 10px;
}

.metrics-section {
  margin-bottom: 30px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.metric-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.metric-label {
  font-size: 14px;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 5px;
}

.metric-description {
  font-size: 12px;
  color: #6c757d;
}

.chart-section {
  margin-bottom: 30px;
}

.chart-container {
  height: 300px;
  background: white;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.summary-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-weight: 600;
  color: #495057;
}

.stat-value {
  font-weight: 700;
  color: #2c3e50;
}

.error-section {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  color: #721c24;
}

.error-message i {
  font-size: 20px;
  margin-top: 2px;
}

.privacy-message {
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Responsive design */
@media (max-width: 768px) {
  .cross-validation-interface {
    padding: 15px;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .cv-actions {
    flex-direction: column;
  }
  
  .results-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .results-actions {
    justify-content: center;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .estimates-grid {
    grid-template-columns: 1fr;
  }
  
  .progress-details {
    grid-template-columns: 1fr;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
}
</style>