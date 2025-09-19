<template>
  <div class="model-comparison-interface">
    <!-- Header -->
    <div class="comparison-header">
      <h3 class="comparison-title">
        <i class="fas fa-balance-scale"></i>
        Model Comparison & Analysis
      </h3>
      <p class="comparison-description">
        Compare multiple Prophet models to find the best configuration for your data.
        All comparisons happen in memory only - no data is stored on the server.
      </p>
    </div>

    <!-- Model Selection Section -->
    <div class="model-selection-section">
      <h4>Available Models</h4>
      
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        Loading models...
      </div>
      
      <div v-else-if="availableModels.length === 0" class="empty-state">
        <i class="fas fa-info-circle"></i>
        <p>No models available for comparison.</p>
        <p class="help-text">Generate some forecasts first to compare different configurations.</p>
      </div>
      
      <div v-else class="models-grid">
        <div
          v-for="model in availableModels"
          :key="model.model_id"
          class="model-card"
          :class="{ selected: selectedModels.includes(model.model_id) }"
          @click="toggleModelSelection(model.model_id)"
        >
          <div class="model-header">
            <div class="model-checkbox">
              <input
                type="checkbox"
                :checked="selectedModels.includes(model.model_id)"
                @click.stop
                @change="toggleModelSelection(model.model_id)"
              />
            </div>
            <div class="model-info">
              <h5 class="model-name">{{ model.name || `Model ${model.model_id.slice(0, 8)}` }}</h5>
              <p class="model-date">{{ formatDate(model.created_at) }}</p>
            </div>
            <div class="model-actions">
              <button
                class="btn-icon"
                @click.stop="viewModelDetails(model.model_id)"
                title="View Details"
              >
                <i class="fas fa-eye"></i>
              </button>
              <button
                class="btn-icon delete"
                @click.stop="deleteModel(model.model_id)"
                title="Delete Model"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div class="model-summary">
            <div class="summary-item">
              <span class="label">Processing Time:</span>
              <span class="value">{{ formatTime(model.processing_time_seconds) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Data Points:</span>
              <span class="value">{{ model.data_points?.toLocaleString() || 'N/A' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Has CV Metrics:</span>
              <span class="value">
                <i :class="model.has_cv_metrics ? 'fas fa-check text-success' : 'fas fa-times text-muted'"></i>
              </span>
            </div>
          </div>
          
          <div v-if="model.config_summary" class="config-preview">
            <div class="config-item">
              <span class="config-label">Growth:</span>
              <span class="config-value">{{ model.config_summary.growth || 'linear' }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Seasonality:</span>
              <span class="config-value">{{ formatSeasonality(model.config_summary) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Selection Actions -->
      <div v-if="availableModels.length > 0" class="selection-actions">
        <div class="selection-info">
          <span>{{ selectedModels.length }} of {{ availableModels.length }} models selected</span>
        </div>
        <div class="selection-buttons">
          <button
            class="btn btn-outline-secondary"
            @click="selectAllModels"
            :disabled="selectedModels.length === availableModels.length"
          >
            Select All
          </button>
          <button
            class="btn btn-outline-secondary"
            @click="clearSelection"
            :disabled="selectedModels.length === 0"
          >
            Clear Selection
          </button>
          <button
            class="btn btn-primary"
            @click="compareSelectedModels"
            :disabled="selectedModels.length < 2 || isComparing"
          >
            <i class="fas fa-balance-scale"></i>
            <span v-if="isComparing">Comparing...</span>
            <span v-else>Compare Models ({{ selectedModels.length }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Comparison Options -->
    <div v-if="selectedModels.length >= 2" class="comparison-options">
      <h4>Comparison Options</h4>
      <div class="options-grid">
        <label class="option-item">
          <input v-model="comparisonOptions.includeParameters" type="checkbox" />
          <span>Parameter Comparison</span>
          <small>Compare Prophet configuration parameters</small>
        </label>
        <label class="option-item">
          <input v-model="comparisonOptions.includePerformance" type="checkbox" />
          <span>Performance Metrics</span>
          <small>Compare cross-validation and training metrics</small>
        </label>
        <label class="option-item">
          <input v-model="comparisonOptions.includeForecasts" type="checkbox" />
          <span>Forecast Data</span>
          <small>Compare forecast results (may be slow)</small>
        </label>
      </div>
    </div>

    <!-- Comparison Results -->
    <div v-if="comparisonResult && !isComparing" class="comparison-results">
      <div class="results-header">
        <h4>Comparison Results</h4>
        <div class="results-actions">
          <button class="btn btn-outline-primary" @click="exportComparison">
            <i class="fas fa-download"></i>
            Export Report
          </button>
          <button class="btn btn-outline-secondary" @click="exportComparisonCharts">
            <i class="fas fa-chart-bar"></i>
            Export Charts
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="comparisonSummary" class="comparison-summary">
        <h5>Summary</h5>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="card-header">
              <i class="fas fa-trophy"></i>
              Best Performing Model
            </div>
            <div class="card-content">
              <div class="winner-name">{{ comparisonSummary.performance_winner || 'N/A' }}</div>
              <div class="recommendation">{{ comparisonSummary.recommendation }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-header">
              <i class="fas fa-cogs"></i>
              Parameter Differences
            </div>
            <div class="card-content">
              <div class="difference-count">{{ comparisonSummary.parameter_differences_count }}</div>
              <div class="difference-label">Different Parameters</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-header">
              <i class="fas fa-chart-line"></i>
              Performance Metrics
            </div>
            <div class="card-content">
              <div class="metrics-count">{{ comparisonSummary.performance_metrics_count }}</div>
              <div class="metrics-label">Metrics Compared</div>
            </div>
          </div>
        </div>
        
        <div v-if="comparisonSummary.key_differences.length" class="key-differences">
          <h6>Key Differences:</h6>
          <ul>
            <li v-for="diff in comparisonSummary.key_differences" :key="diff">
              {{ diff }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Parameter Comparison -->
      <div v-if="comparisonResult.parameter_differences?.length" class="parameter-comparison">
        <h5>Parameter Comparison</h5>
        <div class="parameters-table">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th v-for="model in comparisonResult.models" :key="model.model_id">
                  {{ model.name || `Model ${model.model_id.slice(0, 8)}` }}
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="param in comparisonResult.parameter_differences"
                :key="param.parameter_name"
                :class="{ different: param.is_different }"
              >
                <td class="param-name">{{ param.parameter_name }}</td>
                <td class="param-type">{{ param.parameter_type }}</td>
                <td
                  v-for="model in comparisonResult.models"
                  :key="model.model_id"
                  class="param-value"
                >
                  {{ formatParameterValue(param.model_values[model.model_id]) }}
                </td>
                <td class="param-status">
                  <span v-if="param.is_different" class="status-different">
                    <i class="fas fa-exclamation-triangle"></i>
                    Different
                  </span>
                  <span v-else class="status-same">
                    <i class="fas fa-check"></i>
                    Same
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Performance Comparison -->
      <div v-if="comparisonResult.performance_comparison?.length" class="performance-comparison">
        <h5>Performance Comparison</h5>
        
        <!-- Performance Chart -->
        <div class="performance-chart-container">
          <canvas ref="performanceComparisonChart"></canvas>
        </div>
        
        <!-- Performance Table -->
        <div class="performance-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th v-for="model in comparisonResult.models" :key="model.model_id">
                  {{ model.name || `Model ${model.model_id.slice(0, 8)}` }}
                </th>
                <th>Best Model</th>
                <th>Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in comparisonResult.performance_comparison" :key="metric.metric_name">
                <td class="metric-name">{{ metric.metric_name.toUpperCase() }}</td>
                <td
                  v-for="model in comparisonResult.models"
                  :key="model.model_id"
                  class="metric-value"
                  :class="{ 
                    best: metric.best_model_id === model.model_id,
                    worst: metric.worst_model_id === model.model_id
                  }"
                >
                  {{ formatMetricValue(metric.model_values[model.model_id]) }}
                </td>
                <td class="best-model">
                  {{ getBestModelName(metric.best_model_id) }}
                </td>
                <td class="improvement">
                  {{ metric.improvement_pct ? `${metric.improvement_pct.toFixed(1)}%` : 'N/A' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Processing Info -->
      <div class="processing-info">
        <div class="info-item">
          <span class="info-label">Models Compared:</span>
          <span class="info-value">{{ comparisonResult.comparison_count }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Processing Time:</span>
          <span class="info-value">{{ formatTime(comparisonResult.processing_time_seconds) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Generated:</span>
          <span class="info-value">{{ formatDate(comparisonResult.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Processing State -->
    <div v-if="isComparing" class="processing-section">
      <div class="processing-content">
        <i class="fas fa-spinner fa-spin"></i>
        <h4>Comparing Models...</h4>
        <p>Analyzing {{ selectedModels.length }} models and generating comparison report.</p>
        <div class="privacy-notice">
          <i class="fas fa-shield-alt"></i>
          All comparisons happen in memory only. No data is stored on the server.
        </div>
      </div>
    </div>

    <!-- Model Details Modal -->
    <div v-if="showModelDetails" class="modal-overlay" @click="closeModelDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>Model Details</h4>
          <button class="modal-close" @click="closeModelDetails">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="selectedModelDetails" class="model-details">
            <!-- Basic Info -->
            <div class="details-section">
              <h5>Basic Information</h5>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">Model ID:</span>
                  <span class="detail-value">{{ selectedModelDetails.model_id }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">{{ selectedModelDetails.name || 'Unnamed' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">{{ formatDate(selectedModelDetails.created_at) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Processing Time:</span>
                  <span class="detail-value">{{ formatTime(selectedModelDetails.processing_time_seconds) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Data Points:</span>
                  <span class="detail-value">{{ selectedModelDetails.data_points?.toLocaleString() || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- Configuration -->
            <div v-if="selectedModelDetails.config" class="details-section">
              <h5>Configuration</h5>
              <div class="config-details">
                <pre>{{ JSON.stringify(selectedModelDetails.config, null, 2) }}</pre>
              </div>
            </div>

            <!-- Metrics -->
            <div v-if="selectedModelDetails.cv_metrics" class="details-section">
              <h5>Cross-Validation Metrics</h5>
              <div class="metrics-details">
                <div class="metric-item">
                  <span class="metric-label">RMSE:</span>
                  <span class="metric-value">{{ selectedModelDetails.cv_metrics.rmse?.toFixed(4) }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">MAE:</span>
                  <span class="metric-value">{{ selectedModelDetails.cv_metrics.mae?.toFixed(4) }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">MAPE:</span>
                  <span class="metric-value">{{ selectedModelDetails.cv_metrics.mape?.toFixed(2) }}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Coverage:</span>
                  <span class="metric-value">{{ selectedModelDetails.cv_metrics.coverage?.toFixed(2) }}%</span>
                </div>
              </div>
            </div>

            <!-- Forecast Summary -->
            <div v-if="selectedModelDetails.forecast_summary" class="details-section">
              <h5>Forecast Summary</h5>
              <div class="forecast-details">
                <div class="detail-item">
                  <span class="detail-label">Data Points:</span>
                  <span class="detail-value">{{ selectedModelDetails.forecast_summary.data_points }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date Range:</span>
                  <span class="detail-value">
                    {{ selectedModelDetails.forecast_summary.date_range?.start }} to 
                    {{ selectedModelDetails.forecast_summary.date_range?.end }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Columns:</span>
                  <span class="detail-value">{{ selectedModelDetails.forecast_summary.columns?.join(', ') }}</span>
                </div>
              </div>
            </div>
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
import { 
  getSessionModels, 
  compareModels, 
  getComparisonSummary, 
  getModelDetails, 
  deleteModel as deleteModelApi,
  cleanupSessionModels 
} from '../services/api'

Chart.register(...registerables)

export default {
  name: 'ModelComparisonInterface',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['comparison-updated'],
  setup(props, { emit }) {
    // Reactive data
    const availableModels = ref([])
    const selectedModels = ref([])
    const comparisonResult = ref(null)
    const comparisonSummary = ref(null)
    const loading = ref(false)
    const isComparing = ref(false)
    const error = ref(null)
    
    // Modal state
    const showModelDetails = ref(false)
    const selectedModelDetails = ref(null)
    
    // Options
    const comparisonOptions = ref({
      includeParameters: true,
      includePerformance: true,
      includeForecasts: false
    })
    
    // Chart reference
    const performanceComparisonChart = ref(null)
    let performanceChartInstance = null
    
    // Methods
    const loadModels = async () => {
      try {
        loading.value = true
        error.value = null
        
        const models = await getSessionModels(props.sessionId)
        availableModels.value = models
        
        // Clear selection if models changed
        selectedModels.value = selectedModels.value.filter(id => 
          models.some(model => model.model_id === id)
        )
        
      } catch (err) {
        console.error('Failed to load models:', err)
        error.value = err
        availableModels.value = []
      } finally {
        loading.value = false
      }
    }
    
    const toggleModelSelection = (modelId) => {
      const index = selectedModels.value.indexOf(modelId)
      if (index > -1) {
        selectedModels.value.splice(index, 1)
      } else {
        selectedModels.value.push(modelId)
      }
    }
    
    const selectAllModels = () => {
      selectedModels.value = availableModels.value.map(model => model.model_id)
    }
    
    const clearSelection = () => {
      selectedModels.value = []
    }
    
    const compareSelectedModels = async () => {
      if (selectedModels.value.length < 2) return
      
      try {
        isComparing.value = true
        error.value = null
        
        // Perform comparison
        const result = await compareModels(
          props.sessionId, 
          selectedModels.value, 
          comparisonOptions.value
        )
        
        comparisonResult.value = result
        
        // Get summary
        const summary = await getComparisonSummary(props.sessionId, selectedModels.value)
        comparisonSummary.value = summary
        
        // Create performance chart
        await nextTick()
        createPerformanceComparisonChart()
        
        emit('comparison-updated', result)
        
      } catch (err) {
        console.error('Model comparison failed:', err)
        error.value = err
      } finally {
        isComparing.value = false
      }
    }
    
    const viewModelDetails = async (modelId) => {
      try {
        const details = await getModelDetails(props.sessionId, modelId)
        selectedModelDetails.value = details
        showModelDetails.value = true
      } catch (err) {
        console.error('Failed to load model details:', err)
        error.value = err
      }
    }
    
    const closeModelDetails = () => {
      showModelDetails.value = false
      selectedModelDetails.value = null
    }
    
    const deleteModel = async (modelId) => {
      if (!confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
        return
      }
      
      try {
        await deleteModelApi(props.sessionId, modelId)
        
        // Remove from local state
        availableModels.value = availableModels.value.filter(model => model.model_id !== modelId)
        selectedModels.value = selectedModels.value.filter(id => id !== modelId)
        
        // Clear comparison if it included this model
        if (comparisonResult.value?.models?.some(model => model.model_id === modelId)) {
          comparisonResult.value = null
          comparisonSummary.value = null
        }
        
      } catch (err) {
        console.error('Failed to delete model:', err)
        error.value = err
      }
    }
    
    const createPerformanceComparisonChart = () => {
      if (!performanceComparisonChart.value || !comparisonResult.value?.performance_comparison?.length) return
      
      const ctx = performanceComparisonChart.value.getContext('2d')
      
      // Destroy existing chart
      if (performanceChartInstance) {
        performanceChartInstance.destroy()
      }
      
      const metrics = comparisonResult.value.performance_comparison
      const models = comparisonResult.value.models
      
      const datasets = models.map((model, index) => ({
        label: model.name || `Model ${model.model_id.slice(0, 8)}`,
        data: metrics.map(metric => metric.model_values[model.model_id] || 0),
        backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.6)`,
        borderColor: `hsla(${index * 60}, 70%, 50%, 1)`,
        borderWidth: 2
      }))
      
      performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: metrics.map(metric => metric.metric_name.toUpperCase()),
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Metric Value'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Performance Metrics Comparison'
            },
            legend: {
              display: true,
              position: 'top'
            }
          }
        }
      })
    }
    
    const exportComparison = () => {
      if (!comparisonResult.value) return
      
      // Create comprehensive report
      const report = {
        title: 'Model Comparison Report',
        generated: new Date().toISOString(),
        session_id: props.sessionId,
        summary: comparisonSummary.value,
        models: comparisonResult.value.models.map(model => ({
          id: model.model_id,
          name: model.name,
          created_at: model.created_at,
          processing_time_seconds: model.processing_time_seconds,
          data_points: model.data_points
        })),
        parameter_differences: comparisonResult.value.parameter_differences,
        performance_comparison: comparisonResult.value.performance_comparison,
        processing_info: {
          comparison_count: comparisonResult.value.comparison_count,
          processing_time_seconds: comparisonResult.value.processing_time_seconds,
          created_at: comparisonResult.value.created_at
        }
      }
      
      const reportJson = JSON.stringify(report, null, 2)
      downloadFile(reportJson, `model_comparison_report_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    }
    
    const exportComparisonCharts = () => {
      if (performanceChartInstance) {
        performanceComparisonChart.value.toBlob(blob => {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `performance_comparison_${new Date().toISOString().split('T')[0]}.png`
          link.click()
          URL.revokeObjectURL(url)
        })
      }
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
    
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleString()
    }
    
    const formatTime = (seconds) => {
      if (!seconds) return '0s'
      if (seconds < 60) return `${Math.round(seconds)}s`
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      return `${minutes}m ${remainingSeconds}s`
    }
    
    const formatSeasonality = (configSummary) => {
      const seasonalities = []
      if (configSummary.yearly_seasonality) seasonalities.push('Yearly')
      if (configSummary.weekly_seasonality) seasonalities.push('Weekly')
      if (configSummary.daily_seasonality) seasonalities.push('Daily')
      return seasonalities.length > 0 ? seasonalities.join(', ') : 'None'
    }
    
    const formatParameterValue = (value) => {
      if (value == null) return 'N/A'
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (typeof value === 'number') return value.toFixed(4)
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }
    
    const formatMetricValue = (value) => {
      if (value == null) return 'N/A'
      return value.toFixed(4)
    }
    
    const getBestModelName = (modelId) => {
      const model = comparisonResult.value?.models?.find(m => m.model_id === modelId)
      return model ? (model.name || `Model ${modelId.slice(0, 8)}`) : 'N/A'
    }
    
    // Lifecycle
    onMounted(() => {
      loadModels()
    })
    
    onUnmounted(() => {
      if (performanceChartInstance) {
        performanceChartInstance.destroy()
      }
    })
    
    return {
      availableModels,
      selectedModels,
      comparisonResult,
      comparisonSummary,
      loading,
      isComparing,
      error,
      showModelDetails,
      selectedModelDetails,
      comparisonOptions,
      performanceComparisonChart,
      loadModels,
      toggleModelSelection,
      selectAllModels,
      clearSelection,
      compareSelectedModels,
      viewModelDetails,
      closeModelDetails,
      deleteModel,
      exportComparison,
      exportComparisonCharts,
      formatDate,
      formatTime,
      formatSeasonality,
      formatParameterValue,
      formatMetricValue,
      getBestModelName
    }
  }
}
</script>

<style scoped>
.model-comparison-interface {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.comparison-header {
  text-align: center;
  margin-bottom: 30px;
}

.comparison-title {
  color: #2c3e50;
  margin-bottom: 10px;
}

.comparison-title i {
  margin-right: 10px;
  color: #e74c3c;
}

.comparison-description {
  color: #7f8c8d;
  font-size: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.model-selection-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.loading-state i {
  font-size: 24px;
  margin-bottom: 10px;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #dee2e6;
}

.help-text {
  color: #6c757d;
  font-size: 14px;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.model-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.model-card:hover {
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
}

.model-card.selected {
  border-color: #3498db;
  background-color: #f8f9fa;
}

.model-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 15px;
}

.model-checkbox input {
  transform: scale(1.2);
}

.model-info {
  flex: 1;
}

.model-name {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 16px;
}

.model-date {
  margin: 0;
  color: #6c757d;
  font-size: 12px;
}

.model-actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  color: #6c757d;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #e9ecef;
  color: #495057;
}

.btn-icon.delete:hover {
  background-color: #f8d7da;
  color: #721c24;
}

.model-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.summary-item .label {
  color: #6c757d;
}

.summary-item .value {
  font-weight: 600;
  color: #2c3e50;
}

.text-success {
  color: #28a745 !important;
}

.text-muted {
  color: #6c757d !important;
}

.config-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #e9ecef;
}

.config-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.config-label {
  color: #6c757d;
}

.config-value {
  font-weight: 600;
  color: #2c3e50;
}

.selection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.selection-info {
  color: #6c757d;
  font-size: 14px;
}

.selection-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
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

.comparison-options {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  border: 1px solid #e9ecef;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
}

.option-item input {
  margin-right: 8px;
}

.option-item small {
  color: #6c757d;
  font-size: 12px;
  margin-left: 24px;
}

.comparison-results {
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

.comparison-summary {
  margin-bottom: 30px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.summary-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 15px;
}

.card-content {
  color: #2c3e50;
}

.winner-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 5px;
}

.recommendation {
  font-size: 14px;
  color: #6c757d;
}

.difference-count,
.metrics-count {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
}

.difference-label,
.metrics-label {
  font-size: 14px;
  color: #6c757d;
}

.key-differences {
  background: #e3f2fd;
  border-radius: 6px;
  padding: 15px;
}

.key-differences h6 {
  margin-bottom: 10px;
  color: #1976d2;
}

.key-differences ul {
  margin: 0;
  padding-left: 20px;
}

.key-differences li {
  color: #0d47a1;
  margin-bottom: 5px;
}

.parameter-comparison,
.performance-comparison {
  margin-bottom: 30px;
}

.parameters-table,
.performance-table {
  overflow-x: auto;
}

.parameters-table table,
.performance-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.parameters-table th,
.parameters-table td,
.performance-table th,
.performance-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.parameters-table th,
.performance-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.parameters-table tr.different {
  background-color: #fff3cd;
}

.param-name,
.metric-name {
  font-weight: 600;
}

.param-type {
  color: #6c757d;
  font-size: 12px;
}

.param-value {
  font-family: monospace;
  font-size: 12px;
}

.param-status .status-different {
  color: #856404;
}

.param-status .status-same {
  color: #155724;
}

.metric-value.best {
  background-color: #d4edda;
  color: #155724;
  font-weight: 700;
}

.metric-value.worst {
  background-color: #f8d7da;
  color: #721c24;
}

.performance-chart-container {
  height: 400px;
  margin-bottom: 20px;
  background: white;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.processing-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  color: #6c757d;
}

.info-value {
  font-weight: 600;
  color: #2c3e50;
}

.processing-section {
  background: #e3f2fd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin-bottom: 25px;
}

.processing-content h4 {
  color: #1976d2;
  margin: 15px 0 10px 0;
}

.processing-content i {
  font-size: 32px;
  color: #1976d2;
}

.privacy-notice {
  background: #d4edda;
  color: #155724;
  padding: 10px 15px;
  border-radius: 6px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  max-height: 90vh;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6c757d;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.model-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.details-section h5 {
  margin-bottom: 15px;
  color: #2c3e50;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 5px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.detail-label {
  font-weight: 600;
  color: #495057;
}

.detail-value {
  color: #2c3e50;
}

.config-details pre {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.metrics-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.metric-label {
  font-weight: 600;
  color: #495057;
}

.metric-value {
  color: #2c3e50;
  font-weight: 700;
}

.forecast-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  .model-comparison-interface {
    padding: 15px;
  }
  
  .models-grid {
    grid-template-columns: 1fr;
  }
  
  .selection-actions {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .selection-buttons {
    justify-content: center;
  }
  
  .results-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .results-actions {
    justify-content: center;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-details {
    grid-template-columns: 1fr;
  }
  
  .processing-info {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
}
</style>