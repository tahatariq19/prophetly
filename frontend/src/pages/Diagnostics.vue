<template>
  <div class="diagnostics-page">
    <!-- Page Header -->
    <div class="page-header">
      <h2 class="page-title">
        <i class="fas fa-chart-line"></i>
        Model Diagnostics & Validation
      </h2>
      <p class="page-description">
        Validate your Prophet models with comprehensive cross-validation and compare different configurations 
        to find the optimal forecasting approach for your data. All analysis happens in memory only.
      </p>
    </div>

    <!-- Session Check -->
    <div v-if="!sessionId" class="session-required">
      <div class="session-message">
        <i class="fas fa-info-circle"></i>
        <h3>Session Required</h3>
        <p>Please upload data and configure a forecast model before accessing diagnostics.</p>
        <router-link to="/upload" class="btn btn-primary">
          <i class="fas fa-upload"></i>
          Upload Data
        </router-link>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="diagnostics-content">
      <!-- Navigation Tabs -->
      <div class="diagnostics-nav">
        <button
          class="nav-tab"
          :class="{ active: activeTab === 'cross-validation' }"
          @click="activeTab = 'cross-validation'"
        >
          <i class="fas fa-chart-line"></i>
          Cross-Validation
        </button>
        <button
          class="nav-tab"
          :class="{ active: activeTab === 'model-comparison' }"
          @click="activeTab = 'model-comparison'"
        >
          <i class="fas fa-balance-scale"></i>
          Model Comparison
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Cross-Validation Tab -->
        <div v-if="activeTab === 'cross-validation'" class="tab-panel">
          <div v-if="!forecastConfig" class="config-required">
            <div class="config-message">
              <i class="fas fa-cog"></i>
              <h4>Forecast Configuration Required</h4>
              <p>Please configure and generate a forecast before running cross-validation.</p>
              <router-link to="/configure" class="btn btn-primary">
                <i class="fas fa-cog"></i>
                Configure Forecast
              </router-link>
            </div>
          </div>
          
          <CrossValidationInterface
            v-else
            :session-id="sessionId"
            :forecast-config="forecastConfig"
            @results-updated="onCrossValidationResults"
          />
        </div>

        <!-- Model Comparison Tab -->
        <div v-if="activeTab === 'model-comparison'" class="tab-panel">
          <ModelComparisonInterface
            :session-id="sessionId"
            @comparison-updated="onComparisonResults"
          />
        </div>
      </div>

      <!-- Results Summary -->
      <div v-if="diagnosticsResults" class="results-summary">
        <h3>Diagnostics Summary</h3>
        
        <div class="summary-cards">
          <!-- Cross-Validation Summary -->
          <div v-if="diagnosticsResults.crossValidation" class="summary-card">
            <div class="card-header">
              <i class="fas fa-chart-line"></i>
              <h4>Cross-Validation Results</h4>
            </div>
            <div class="card-content">
              <div class="metric-row">
                <span class="metric-label">RMSE:</span>
                <span class="metric-value">{{ formatMetric(diagnosticsResults.crossValidation.metrics?.rmse) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">MAE:</span>
                <span class="metric-value">{{ formatMetric(diagnosticsResults.crossValidation.metrics?.mae) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">MAPE:</span>
                <span class="metric-value">{{ formatMetric(diagnosticsResults.crossValidation.metrics?.mape, '%') }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Coverage:</span>
                <span class="metric-value">{{ formatMetric(diagnosticsResults.crossValidation.metrics?.coverage, '%') }}</span>
              </div>
            </div>
          </div>

          <!-- Model Comparison Summary -->
          <div v-if="diagnosticsResults.comparison" class="summary-card">
            <div class="card-header">
              <i class="fas fa-balance-scale"></i>
              <h4>Model Comparison Results</h4>
            </div>
            <div class="card-content">
              <div class="metric-row">
                <span class="metric-label">Models Compared:</span>
                <span class="metric-value">{{ diagnosticsResults.comparison.comparison_count }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Best Model:</span>
                <span class="metric-value">{{ getBestModelName() }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Parameter Differences:</span>
                <span class="metric-value">{{ diagnosticsResults.comparison.parameter_differences?.length || 0 }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Performance Metrics:</span>
                <span class="metric-value">{{ diagnosticsResults.comparison.performance_comparison?.length || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Export All Results -->
        <div class="export-section">
          <h4>Export Diagnostics</h4>
          <p>Download comprehensive diagnostics report including all validation and comparison results.</p>
          <div class="export-actions">
            <button class="btn btn-primary" @click="exportAllResults">
              <i class="fas fa-download"></i>
              Export Complete Report
            </button>
            <button class="btn btn-outline-primary" @click="exportSummaryReport">
              <i class="fas fa-file-alt"></i>
              Export Summary
            </button>
          </div>
        </div>
      </div>

      <!-- Privacy Notice -->
      <div class="privacy-notice">
        <div class="privacy-content">
          <i class="fas fa-shield-alt"></i>
          <div class="privacy-text">
            <h4>Privacy Assurance</h4>
            <p>
              All diagnostic analysis is performed in memory only. Your data and model results are never stored 
              on the server and are automatically discarded when your session ends. Export options allow you to 
              save results locally for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import CrossValidationInterface from '../components/CrossValidationInterface.vue'
import ModelComparisonInterface from '../components/ModelComparisonInterface.vue'

export default {
  name: 'DiagnosticsPage',
  components: {
    CrossValidationInterface,
    ModelComparisonInterface
  },
  setup() {
    const router = useRouter()
    
    // Reactive data
    const activeTab = ref('cross-validation')
    const sessionId = ref(null)
    const forecastConfig = ref(null)
    const diagnosticsResults = ref({
      crossValidation: null,
      comparison: null
    })
    
    // Computed properties
    const hasResults = computed(() => {
      return diagnosticsResults.value.crossValidation || diagnosticsResults.value.comparison
    })
    
    // Methods
    const loadSessionData = () => {
      // Get session ID from localStorage or URL params
      const storedSessionId = localStorage.getItem('prophet_session_id')
      const urlParams = new URLSearchParams(window.location.search)
      const urlSessionId = urlParams.get('session')
      
      sessionId.value = urlSessionId || storedSessionId
      
      // Get forecast config from localStorage
      const storedConfig = localStorage.getItem('prophet_forecast_config')
      if (storedConfig) {
        try {
          forecastConfig.value = JSON.parse(storedConfig)
        } catch (error) {
          console.error('Failed to parse stored forecast config:', error)
        }
      }
    }
    
    const onCrossValidationResults = (results) => {
      diagnosticsResults.value.crossValidation = results
      
      // Store results in localStorage for persistence across page reloads
      localStorage.setItem('prophet_cv_results', JSON.stringify(results))
    }
    
    const onComparisonResults = (results) => {
      diagnosticsResults.value.comparison = results
      
      // Store results in localStorage for persistence across page reloads
      localStorage.setItem('prophet_comparison_results', JSON.stringify(results))
    }
    
    const getBestModelName = () => {
      if (!diagnosticsResults.value.comparison?.best_overall_model_id) return 'N/A'
      
      const bestModelId = diagnosticsResults.value.comparison.best_overall_model_id
      const bestModel = diagnosticsResults.value.comparison.models?.find(
        model => model.model_id === bestModelId
      )
      
      return bestModel ? (bestModel.name || `Model ${bestModelId.slice(0, 8)}`) : 'N/A'
    }
    
    const exportAllResults = () => {
      const report = {
        title: 'Prophet Model Diagnostics Report',
        generated: new Date().toISOString(),
        session_id: sessionId.value,
        forecast_config: forecastConfig.value,
        cross_validation: diagnosticsResults.value.crossValidation,
        model_comparison: diagnosticsResults.value.comparison,
        summary: {
          has_cross_validation: !!diagnosticsResults.value.crossValidation,
          has_model_comparison: !!diagnosticsResults.value.comparison,
          best_model: getBestModelName(),
          cv_metrics: diagnosticsResults.value.crossValidation?.metrics,
          comparison_count: diagnosticsResults.value.comparison?.comparison_count || 0
        }
      }
      
      const reportJson = JSON.stringify(report, null, 2)
      downloadFile(reportJson, `prophet_diagnostics_report_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    }
    
    const exportSummaryReport = () => {
      const summary = {
        title: 'Prophet Model Diagnostics Summary',
        generated: new Date().toISOString(),
        session_id: sessionId.value,
        
        // Cross-validation summary
        cross_validation_summary: diagnosticsResults.value.crossValidation ? {
          total_predictions: diagnosticsResults.value.crossValidation.total_predictions,
          cutoff_count: diagnosticsResults.value.crossValidation.cutoff_count,
          processing_time_seconds: diagnosticsResults.value.crossValidation.processing_time_seconds,
          metrics: diagnosticsResults.value.crossValidation.metrics
        } : null,
        
        // Model comparison summary
        model_comparison_summary: diagnosticsResults.value.comparison ? {
          models_compared: diagnosticsResults.value.comparison.comparison_count,
          best_model: getBestModelName(),
          parameter_differences: diagnosticsResults.value.comparison.parameter_differences?.length || 0,
          performance_metrics: diagnosticsResults.value.comparison.performance_comparison?.length || 0,
          processing_time_seconds: diagnosticsResults.value.comparison.processing_time_seconds
        } : null,
        
        // Overall recommendations
        recommendations: generateRecommendations()
      }
      
      const summaryJson = JSON.stringify(summary, null, 2)
      downloadFile(summaryJson, `prophet_diagnostics_summary_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    }
    
    const generateRecommendations = () => {
      const recommendations = []
      
      // Cross-validation recommendations
      if (diagnosticsResults.value.crossValidation?.metrics) {
        const metrics = diagnosticsResults.value.crossValidation.metrics
        
        if (metrics.mape > 20) {
          recommendations.push('High MAPE (>20%) suggests the model may not be suitable for this data. Consider adjusting parameters or using a different approach.')
        }
        
        if (metrics.coverage < 80) {
          recommendations.push('Low prediction interval coverage (<80%) indicates uncertainty estimates may be unreliable. Consider adjusting interval_width or model parameters.')
        }
        
        if (metrics.rmse > metrics.mae * 2) {
          recommendations.push('RMSE significantly higher than MAE suggests presence of outliers. Consider outlier detection and handling.')
        }
      }
      
      // Model comparison recommendations
      if (diagnosticsResults.value.comparison) {
        const comparison = diagnosticsResults.value.comparison
        
        if (comparison.comparison_count >= 3) {
          recommendations.push('Multiple models compared - use the best performing model for production forecasting.')
        }
        
        if (comparison.parameters_identical) {
          recommendations.push('All compared models have identical parameters. Consider testing different configurations for better performance.')
        }
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Model diagnostics look good. Consider running additional validation with different time periods if needed.')
      }
      
      return recommendations
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
    
    const loadStoredResults = () => {
      // Load stored cross-validation results
      const storedCvResults = localStorage.getItem('prophet_cv_results')
      if (storedCvResults) {
        try {
          diagnosticsResults.value.crossValidation = JSON.parse(storedCvResults)
        } catch (error) {
          console.error('Failed to parse stored CV results:', error)
        }
      }
      
      // Load stored comparison results
      const storedComparisonResults = localStorage.getItem('prophet_comparison_results')
      if (storedComparisonResults) {
        try {
          diagnosticsResults.value.comparison = JSON.parse(storedComparisonResults)
        } catch (error) {
          console.error('Failed to parse stored comparison results:', error)
        }
      }
    }
    
    // Lifecycle
    onMounted(() => {
      loadSessionData()
      loadStoredResults()
    })
    
    // Watch for session changes
    watch(sessionId, (newSessionId) => {
      if (newSessionId) {
        localStorage.setItem('prophet_session_id', newSessionId)
      }
    })
    
    return {
      activeTab,
      sessionId,
      forecastConfig,
      diagnosticsResults,
      hasResults,
      onCrossValidationResults,
      onComparisonResults,
      getBestModelName,
      exportAllResults,
      exportSummaryReport,
      formatMetric
    }
  }
}
</script>

<style scoped>
.diagnostics-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-title {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 32px;
}

.page-title i {
  margin-right: 15px;
  color: #3498db;
}

.page-description {
  color: #7f8c8d;
  font-size: 18px;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.session-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.session-message {
  text-align: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 60px 40px;
  max-width: 500px;
}

.session-message i {
  font-size: 64px;
  color: #3498db;
  margin-bottom: 20px;
}

.session-message h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.session-message p {
  color: #6c757d;
  margin-bottom: 25px;
  font-size: 16px;
}

.diagnostics-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.diagnostics-nav {
  display: flex;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 5px;
  gap: 5px;
}

.nav-tab {
  flex: 1;
  padding: 15px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.nav-tab:hover {
  background: #e9ecef;
  color: #495057;
}

.nav-tab.active {
  background: #3498db;
  color: white;
}

.tab-content {
  min-height: 400px;
}

.tab-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.config-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.config-message {
  text-align: center;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 40px;
  max-width: 500px;
}

.config-message i {
  font-size: 48px;
  color: #856404;
  margin-bottom: 15px;
}

.config-message h4 {
  color: #856404;
  margin-bottom: 10px;
}

.config-message p {
  color: #856404;
  margin-bottom: 20px;
}

.results-summary {
  background: white;
  border-radius: 12px;
  padding: 30px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-summary h3 {
  color: #2c3e50;
  margin-bottom: 25px;
  text-align: center;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.summary-card {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.card-header {
  background: #3498db;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header h4 {
  margin: 0;
  font-size: 16px;
}

.card-content {
  padding: 20px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  font-weight: 600;
  color: #495057;
}

.metric-value {
  font-weight: 700;
  color: #2c3e50;
}

.export-section {
  background: #e3f2fd;
  border-radius: 8px;
  padding: 25px;
  text-align: center;
}

.export-section h4 {
  color: #1976d2;
  margin-bottom: 10px;
}

.export-section p {
  color: #0d47a1;
  margin-bottom: 20px;
}

.export-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-outline-primary {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline-primary:hover {
  background-color: #3498db;
  color: white;
}

.privacy-notice {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-radius: 12px;
  padding: 25px;
  border: 1px solid #c3e6cb;
}

.privacy-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.privacy-content i {
  font-size: 32px;
  color: #155724;
  margin-top: 5px;
}

.privacy-text h4 {
  color: #155724;
  margin-bottom: 10px;
}

.privacy-text p {
  color: #155724;
  margin: 0;
  line-height: 1.6;
}

/* Responsive design */
@media (max-width: 768px) {
  .diagnostics-page {
    padding: 15px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-description {
    font-size: 16px;
  }
  
  .diagnostics-nav {
    flex-direction: column;
  }
  
  .nav-tab {
    text-align: center;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .export-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .privacy-content {
    flex-direction: column;
    text-align: center;
  }
  
  .session-message,
  .config-message {
    padding: 30px 20px;
  }
}

@media (max-width: 480px) {
  .diagnostics-page {
    padding: 10px;
  }
  
  .results-summary {
    padding: 20px;
  }
  
  .export-section {
    padding: 20px;
  }
  
  .privacy-notice {
    padding: 20px;
  }
}
</style>