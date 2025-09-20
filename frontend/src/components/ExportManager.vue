<template>
  <div class="export-manager">
    <!-- Export Options Card -->
    <div class="card mb-4">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-download me-2"></i>
            Export Results
          </h5>
          <div class="d-flex align-items-center">
            <span class="badge bg-success me-2" v-if="hasResults">Ready</span>
            <span class="badge bg-secondary me-2" v-else>No Data</span>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- Export Categories -->
        <div class="row">
          <!-- Data Export -->
          <div class="col-md-3 mb-3">
            <div class="export-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-file-earmark-spreadsheet text-primary me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Data Export</h6>
                  <small class="text-muted">Forecast data with metadata</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="exportData('csv')"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-filetype-csv me-1"></i>
                  CSV Format
                </button>
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="exportData('json')"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-filetype-json me-1"></i>
                  JSON Format
                </button>
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="exportData('xlsx')"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-file-earmark-excel me-1"></i>
                  Excel Format
                </button>
              </div>
            </div>
          </div>

          <!-- Chart Export -->
          <div class="col-md-3 mb-3">
            <div class="export-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-graph-up text-success me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Chart Export</h6>
                  <small class="text-muted">Charts with annotations</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-success btn-sm"
                  @click="exportChart('png')"
                  :disabled="!hasCharts || isExporting"
                >
                  <i class="bi bi-image me-1"></i>
                  PNG Image
                </button>
                <button 
                  class="btn btn-outline-success btn-sm"
                  @click="exportChart('svg')"
                  :disabled="!hasCharts || isExporting"
                >
                  <i class="bi bi-vector-pen me-1"></i>
                  SVG Vector
                </button>
                <button 
                  class="btn btn-outline-success btn-sm"
                  @click="exportChart('pdf')"
                  :disabled="!hasCharts || isExporting"
                >
                  <i class="bi bi-filetype-pdf me-1"></i>
                  PDF Document
                </button>
              </div>
            </div>
          </div>

          <!-- Report Export -->
          <div class="col-md-3 mb-3">
            <div class="export-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-file-text text-info me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Report Export</h6>
                  <small class="text-muted">Comprehensive reports</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-info btn-sm"
                  @click="showReportModal = true"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-file-pdf me-1"></i>
                  PDF Report
                </button>
                <button 
                  class="btn btn-outline-info btn-sm"
                  @click="exportReport('html')"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-filetype-html me-1"></i>
                  HTML Report
                </button>
                <button 
                  class="btn btn-outline-info btn-sm"
                  @click="exportConfiguration"
                  :disabled="!hasConfig || isExporting"
                >
                  <i class="bi bi-gear me-1"></i>
                  Configuration
                </button>
              </div>
            </div>
          </div>

          <!-- Sharing & Documentation -->
          <div class="col-md-3 mb-3">
            <div class="export-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-share text-warning me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Sharing</h6>
                  <small class="text-muted">Privacy-safe sharing</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-warning btn-sm"
                  @click="showSharingManager = true"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-share me-1"></i>
                  Share Results
                </button>
                <button 
                  class="btn btn-outline-warning btn-sm"
                  @click="showSharingManager = true"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-chat-text me-1"></i>
                  Add Comments
                </button>
                <button 
                  class="btn btn-outline-warning btn-sm"
                  @click="exportForCollaboration"
                  :disabled="!hasResults || isExporting"
                >
                  <i class="bi bi-people me-1"></i>
                  Team Package
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Export Options -->
        <div class="row mt-4">
          <div class="col-12">
            <h6>Export Options</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="includeMetadata"
                    v-model="exportOptions.includeMetadata"
                  >
                  <label class="form-check-label" for="includeMetadata">
                    Include metadata and configuration details
                  </label>
                </div>
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="includeComponents"
                    v-model="exportOptions.includeComponents"
                  >
                  <label class="form-check-label" for="includeComponents">
                    Include component decomposition data
                  </label>
                </div>
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="includeCrossValidation"
                    v-model="exportOptions.includeCrossValidation"
                  >
                  <label class="form-check-label" for="includeCrossValidation">
                    Include cross-validation results
                  </label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="includeAnnotations"
                    v-model="exportOptions.includeAnnotations"
                  >
                  <label class="form-check-label" for="includeAnnotations">
                    Include user annotations and comments
                  </label>
                </div>
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="highResolution"
                    v-model="exportOptions.highResolution"
                  >
                  <label class="form-check-label" for="highResolution">
                    High resolution charts (2x scale)
                  </label>
                </div>
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="privacyNotice"
                    v-model="exportOptions.privacyNotice"
                  >
                  <label class="form-check-label" for="privacyNotice">
                    Include privacy compliance notice
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Export Actions -->
        <div class="row mt-4">
          <div class="col-12">
            <h6>Quick Actions</h6>
            <div class="d-flex flex-wrap gap-2">
              <button 
                class="btn btn-primary"
                @click="exportComplete"
                :disabled="!hasResults || isExporting"
              >
                <i class="bi bi-archive me-2"></i>
                Export Complete Package
              </button>
              <button 
                class="btn btn-outline-secondary"
                @click="exportForSharing"
                :disabled="!hasResults || isExporting"
              >
                <i class="bi bi-share me-2"></i>
                Export for Sharing
              </button>
              <button 
                class="btn btn-outline-warning"
                @click="exportForReproduction"
                :disabled="!hasConfig || isExporting"
              >
                <i class="bi bi-arrow-repeat me-2"></i>
                Export for Reproduction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Progress -->
    <div class="card mb-4" v-if="isExporting">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm text-primary me-3" role="status">
            <span class="visually-hidden">Exporting...</span>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <span>{{ exportStatus }}</span>
              <span class="text-muted">{{ exportProgress }}%</span>
            </div>
            <div class="progress mt-2" style="height: 4px;">
              <div 
                class="progress-bar" 
                role="progressbar" 
                :style="{ width: exportProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export History -->
    <div class="card" v-if="exportHistory.length > 0">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-clock-history me-2"></i>
          Recent Exports
        </h6>
      </div>
      <div class="card-body">
        <div class="list-group list-group-flush">
          <div 
            class="list-group-item d-flex justify-content-between align-items-center"
            v-for="export_item in exportHistory.slice(0, 5)"
            :key="export_item.id"
          >
            <div>
              <div class="fw-medium">{{ export_item.filename }}</div>
              <small class="text-muted">
                {{ export_item.type }} • {{ formatFileSize(export_item.size) }} • {{ formatDate(export_item.timestamp) }}
              </small>
            </div>
            <span class="badge bg-success">
              <i class="bi bi-check-circle me-1"></i>
              Exported
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Generation Modal -->
    <div class="modal fade" :class="{ show: showReportModal }" :style="{ display: showReportModal ? 'block' : 'none' }" v-if="showReportModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Generate Comprehensive Report</h5>
            <button type="button" class="btn-close" @click="showReportModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="reportTitle" class="form-label">Report Title</label>
              <input 
                type="text" 
                class="form-control" 
                id="reportTitle"
                v-model="reportOptions.title"
                placeholder="Prophet Forecast Analysis Report"
              >
            </div>
            
            <div class="mb-3">
              <label for="reportComments" class="form-label">Comments & Annotations</label>
              <textarea 
                class="form-control" 
                id="reportComments"
                rows="4"
                v-model="reportOptions.comments"
                placeholder="Add your analysis, insights, or notes about this forecast..."
              ></textarea>
            </div>

            <div class="row">
              <div class="col-md-6">
                <h6>Include Sections</h6>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="includeSummary" v-model="reportOptions.includeSummary">
                  <label class="form-check-label" for="includeSummary">Executive Summary</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="includeConfig" v-model="reportOptions.includeConfiguration">
                  <label class="form-check-label" for="includeConfig">Model Configuration</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="includeMetrics" v-model="reportOptions.includeMetrics">
                  <label class="form-check-label" for="includeMetrics">Performance Metrics</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="includeCharts" v-model="reportOptions.includeCharts">
                  <label class="form-check-label" for="includeCharts">Charts & Visualizations</label>
                </div>
              </div>
              <div class="col-md-6">
                <h6>Report Format</h6>
                <div class="form-check">
                  <input class="form-check-radio" type="radio" name="reportFormat" id="formatPdf" value="pdf" v-model="reportOptions.format">
                  <label class="form-check-label" for="formatPdf">PDF Document</label>
                </div>
                <div class="form-check">
                  <input class="form-check-radio" type="radio" name="reportFormat" id="formatHtml" value="html" v-model="reportOptions.format">
                  <label class="form-check-label" for="formatHtml">HTML Document</label>
                </div>
                <div class="form-check">
                  <input class="form-check-radio" type="radio" name="reportFormat" id="formatJson" value="json" v-model="reportOptions.format">
                  <label class="form-check-label" for="formatJson">JSON Data</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showReportModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="generateReport">
              <i class="bi bi-file-text me-1"></i>
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sharing Manager Modal -->
    <div class="modal fade" :class="{ show: showSharingManager }" :style="{ display: showSharingManager ? 'block' : 'none' }" v-if="showSharingManager">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Sharing & Documentation</h5>
            <button type="button" class="btn-close" @click="showSharingManager = false"></button>
          </div>
          <div class="modal-body p-0">
            <SharingManager 
              @sharing-completed="handleSharingCompleted"
              @sharing-error="handleSharingError"
              @comments-updated="handleCommentsUpdated"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div class="modal-backdrop fade show" v-if="showReportModal || showSharingManager" @click="closeModals"></div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '../stores/session'
import { exportService } from '../services/export'
import SharingManager from './SharingManager.vue'

export default {
  name: 'ExportManager',
  components: {
    SharingManager
  },
  emits: ['export-completed', 'export-error'],
  setup(_, { emit }) {
    const sessionStore = useSessionStore()
    
    // Reactive state
    const isExporting = ref(false)
    const exportStatus = ref('')
    const exportProgress = ref(0)
    const exportHistory = ref([])
    const showReportModal = ref(false)
    const showSharingManager = ref(false)
    
    // Export options
    const exportOptions = ref({
      includeMetadata: true,
      includeComponents: true,
      includeCrossValidation: false,
      includeAnnotations: true,
      highResolution: false,
      privacyNotice: true
    })
    
    // Report options
    const reportOptions = ref({
      title: 'Prophet Forecast Analysis Report',
      comments: '',
      format: 'pdf',
      includeSummary: true,
      includeConfiguration: true,
      includeMetrics: true,
      includeCharts: true
    })
    
    // Computed properties
    const hasResults = computed(() => sessionStore.hasResults)
    const hasConfig = computed(() => sessionStore.hasConfig)
    const hasCharts = computed(() => {
      // Check if there are chart elements on the page
      return document.querySelector('.chart-container, canvas, svg') !== null
    })
    
    // Methods
    const updateProgress = (status, progress) => {
      exportStatus.value = status
      exportProgress.value = progress
    }
    
    const addToHistory = (exportResult, type) => {
      exportHistory.value.unshift({
        id: Date.now(),
        filename: exportResult.filename,
        type: type,
        size: new Blob([exportResult.data]).size,
        timestamp: new Date()
      })
      
      // Keep only last 10 exports
      if (exportHistory.value.length > 10) {
        exportHistory.value = exportHistory.value.slice(0, 10)
      }
    }
    
    const exportData = async (format) => {
      if (!hasResults.value) return
      
      try {
        isExporting.value = true
        updateProgress(`Preparing ${format.toUpperCase()} export...`, 20)
        
        const forecastResults = sessionStore.forecastResults
        const options = {
          ...exportOptions.value,
          configuration: sessionStore.forecastConfig,
          annotations: sessionStore.userAnnotations || []
        }
        
        updateProgress(`Generating ${format.toUpperCase()} file...`, 60)
        
        const exportResult = await exportService.exportForecastData(forecastResults, format, options)
        
        updateProgress('Downloading file...', 90)
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, `Data (${format.toUpperCase()})`)
        
        updateProgress('Export completed!', 100)
        emit('export-completed', { type: 'data', format, result: exportResult })
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Export error:', error)
        isExporting.value = false
        exportProgress.value = 0
        emit('export-error', { type: 'data', format, error: error.message })
        alert(`Export failed: ${error.message}`)
      }
    }
    
    const exportChart = async (format) => {
      if (!hasCharts.value) return
      
      try {
        isExporting.value = true
        updateProgress(`Preparing chart export...`, 20)
        
        // Find the main chart element
        const chartElement = document.querySelector('.chart-container') || 
                           document.querySelector('canvas') || 
                           document.querySelector('svg')
        
        if (!chartElement) {
          throw new Error('No chart found to export')
        }
        
        const options = {
          title: 'Prophet Forecast Chart',
          width: exportOptions.value.highResolution ? 2400 : 1200,
          height: exportOptions.value.highResolution ? 1600 : 800,
          scale: exportOptions.value.highResolution ? 2 : 1,
          annotations: exportOptions.value.includeAnnotations ? (sessionStore.userAnnotations || []) : []
        }
        
        updateProgress(`Generating ${format.toUpperCase()} chart...`, 60)
        
        const exportResult = await exportService.exportChart(chartElement, format, options)
        
        updateProgress('Downloading chart...', 90)
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, `Chart (${format.toUpperCase()})`)
        
        updateProgress('Chart export completed!', 100)
        emit('export-completed', { type: 'chart', format, result: exportResult })
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Chart export error:', error)
        isExporting.value = false
        exportProgress.value = 0
        emit('export-error', { type: 'chart', format, error: error.message })
        alert(`Chart export failed: ${error.message}`)
      }
    }
    
    const exportReport = async (format) => {
      if (!hasResults.value) return
      
      try {
        isExporting.value = true
        updateProgress('Preparing report data...', 20)
        
        const sessionData = {
          sessionId: sessionStore.sessionId,
          uploadedData: sessionStore.uploadedData,
          forecastConfig: sessionStore.forecastConfig,
          forecastResults: sessionStore.forecastResults,
          userAnnotations: sessionStore.userAnnotations || []
        }
        
        const options = {
          title: reportOptions.value.title,
          comments: reportOptions.value.comments ? [reportOptions.value.comments] : [],
          includeCharts: reportOptions.value.includeCharts,
          ...exportOptions.value
        }
        
        updateProgress(`Generating ${format.toUpperCase()} report...`, 60)
        
        const exportResult = await exportService.generateForecastReport(sessionData, format, options)
        
        updateProgress('Downloading report...', 90)
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, `Report (${format.toUpperCase()})`)
        
        updateProgress('Report export completed!', 100)
        emit('export-completed', { type: 'report', format, result: exportResult })
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Report export error:', error)
        isExporting.value = false
        exportProgress.value = 0
        emit('export-error', { type: 'report', format, error: error.message })
        alert(`Report export failed: ${error.message}`)
      }
    }
    
    const generateReport = async () => {
      showReportModal.value = false
      await exportReport(reportOptions.value.format)
    }
    
    const exportConfiguration = () => {
      if (!hasConfig.value) return
      
      try {
        const exportResult = exportService.exportConfiguration(
          sessionStore.forecastConfig, 
          exportOptions.value.includeMetadata
        )
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, 'Configuration')
        
        emit('export-completed', { type: 'configuration', result: exportResult })
        
      } catch (error) {
        console.error('Configuration export error:', error)
        emit('export-error', { type: 'configuration', error: error.message })
        alert(`Configuration export failed: ${error.message}`)
      }
    }
    
    const exportComplete = async () => {
      if (!hasResults.value) return
      
      try {
        isExporting.value = true
        updateProgress('Preparing complete package...', 10)
        
        const sessionData = {
          sessionId: sessionStore.sessionId,
          uploadedData: sessionStore.uploadedData,
          forecastConfig: sessionStore.forecastConfig,
          forecastResults: sessionStore.forecastResults,
          userAnnotations: sessionStore.userAnnotations || []
        }
        
        // Export data as JSON
        updateProgress('Exporting data...', 30)
        const dataExport = await exportService.exportForecastData(
          sessionStore.forecastResults, 
          'json', 
          { ...exportOptions.value, configuration: sessionStore.forecastConfig }
        )
        
        // Export configuration
        updateProgress('Exporting configuration...', 50)
        const configExport = exportService.exportConfiguration(sessionStore.forecastConfig, true)
        
        // Export report
        updateProgress('Generating report...', 70)
        const reportExport = await exportService.generateForecastReport(sessionData, 'pdf', {
          title: 'Complete Forecast Package',
          ...exportOptions.value
        })
        
        // Create package
        updateProgress('Creating package...', 90)
        const packageData = {
          package_info: {
            created_at: new Date().toISOString(),
            application: 'Prophet Web Interface',
            version: '1.0.0',
            contents: ['forecast_data.json', 'configuration.json', 'report.pdf']
          },
          data: JSON.parse(dataExport.data),
          configuration: JSON.parse(configExport.data),
          report_metadata: {
            filename: reportExport.filename,
            size: new Blob([reportExport.data]).size
          }
        }
        
        const packageExport = {
          data: JSON.stringify(packageData, null, 2),
          filename: `prophet_complete_package_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(packageExport)
        addToHistory(packageExport, 'Complete Package')
        
        updateProgress('Package export completed!', 100)
        emit('export-completed', { type: 'complete', result: packageExport })
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Complete export error:', error)
        isExporting.value = false
        exportProgress.value = 0
        emit('export-error', { type: 'complete', error: error.message })
        alert(`Complete export failed: ${error.message}`)
      }
    }
    
    const exportForSharing = async () => {
      // Export a privacy-safe sharing package (no raw data, just results and config)
      if (!hasResults.value) return
      
      try {
        isExporting.value = true
        updateProgress('Preparing sharing package...', 30)
        
        const sharingData = {
          sharing_info: {
            created_at: new Date().toISOString(),
            privacy_notice: 'This package contains no raw user data - safe for sharing',
            application: 'Prophet Web Interface'
          },
          model_summary: sessionStore.forecastResults?.model_summary || {},
          performance_metrics: sessionStore.forecastResults?.performance_metrics || {},
          configuration: sessionStore.forecastConfig || {},
          forecast_summary: {
            horizon: sessionStore.forecastConfig?.horizon,
            data_points: sessionStore.uploadedData?.length || 0,
            forecast_points: sessionStore.forecastResults?.forecast_data?.length || 0
          }
        }
        
        updateProgress('Creating sharing package...', 70)
        
        const exportResult = {
          data: JSON.stringify(sharingData, null, 2),
          filename: `prophet_sharing_package_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, 'Sharing Package')
        
        updateProgress('Sharing package ready!', 100)
        emit('export-completed', { type: 'sharing', result: exportResult })
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Sharing export error:', error)
        isExporting.value = false
        exportProgress.value = 0
        emit('export-error', { type: 'sharing', error: error.message })
        alert(`Sharing export failed: ${error.message}`)
      }
    }
    
    const exportForReproduction = () => {
      // Export configuration and preprocessing steps for reproduction
      if (!hasConfig.value) return
      
      try {
        const reproductionData = {
          reproduction_info: {
            created_at: new Date().toISOString(),
            purpose: 'Model reproduction and replication',
            application: 'Prophet Web Interface',
            instructions: 'Upload this file to reproduce the same model configuration'
          },
          configuration: sessionStore.forecastConfig,
          preprocessing_steps: sessionStore.preprocessingSteps || [],
          data_requirements: {
            columns_required: ['date', 'value'],
            date_format: 'YYYY-MM-DD',
            minimum_points: 10,
            recommended_points: 100
          }
        }
        
        const exportResult = {
          data: JSON.stringify(reproductionData, null, 2),
          filename: `prophet_reproduction_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, 'Reproduction Package')
        
        emit('export-completed', { type: 'reproduction', result: exportResult })
        
      } catch (error) {
        console.error('Reproduction export error:', error)
        emit('export-error', { type: 'reproduction', error: error.message })
        alert(`Reproduction export failed: ${error.message}`)
      }
    }
    
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    const exportForCollaboration = async () => {
      // Quick collaboration export without opening the full sharing manager
      try {
        isExporting.value = true
        updateProgress('Creating collaboration package...', 30)
        
        const collaborationData = {
          collaboration_info: {
            created_at: new Date().toISOString(),
            purpose: 'Team collaboration and review',
            privacy_notice: 'Contains no raw user data - safe for team sharing'
          },
          model_summary: sessionStore.forecastResults?.model_summary || {},
          performance_metrics: sessionStore.forecastResults?.performance_metrics || {},
          configuration: sessionStore.forecastConfig || {},
          forecast_summary: {
            horizon: sessionStore.forecastConfig?.horizon,
            data_points: sessionStore.uploadedData?.length || 0,
            forecast_points: sessionStore.forecastResults?.forecast_data?.length || 0
          },
          user_comments: sessionStore.userAnnotations || []
        }
        
        updateProgress('Finalizing package...', 70)
        
        const exportResult = {
          data: JSON.stringify(collaborationData, null, 2),
          filename: `prophet_collaboration_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        addToHistory(exportResult, 'Collaboration Package')
        
        updateProgress('Collaboration package ready!', 100)
        emit('export-completed', { type: 'collaboration', result: exportResult })
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Collaboration export error:', error)
        isExporting.value = false
        exportProgress.value = 0
        emit('export-error', { type: 'collaboration', error: error.message })
        alert(`Failed to create collaboration package: ${error.message}`)
      }
    }
    
    const handleSharingCompleted = (sharingInfo) => {
      console.log('Sharing completed:', sharingInfo)
      if (sharingInfo.result) {
        addToHistory(sharingInfo.result, `Sharing (${sharingInfo.type})`)
      }
      emit('export-completed', sharingInfo)
    }
    
    const handleSharingError = (error) => {
      console.error('Sharing error:', error)
      emit('export-error', error)
    }
    
    const handleCommentsUpdated = (comments) => {
      console.log('Comments updated:', comments.length, 'comments')
    }
    
    const closeModals = () => {
      showReportModal.value = false
      showSharingManager.value = false
    }
    
    const formatDate = (date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    }
    
    // Load export history from localStorage on mount
    onMounted(() => {
      const savedHistory = localStorage.getItem('prophet_export_history')
      if (savedHistory) {
        try {
          exportHistory.value = JSON.parse(savedHistory).map(item => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        } catch (error) {
          console.warn('Failed to load export history:', error)
        }
      }
    })
    
    // Save export history to localStorage when it changes
    const saveHistory = () => {
      localStorage.setItem('prophet_export_history', JSON.stringify(exportHistory.value))
    }
    
    // Watch for changes in export history
    const unwatchHistory = () => {
      return () => saveHistory()
    }
    
    return {
      // State
      isExporting,
      exportStatus,
      exportProgress,
      exportHistory,
      showReportModal,
      showSharingManager,
      exportOptions,
      reportOptions,
      
      // Computed
      hasResults,
      hasConfig,
      hasCharts,
      
      // Methods
      exportData,
      exportChart,
      exportReport,
      generateReport,
      exportConfiguration,
      exportComplete,
      exportForSharing,
      exportForReproduction,
      exportForCollaboration,
      handleSharingCompleted,
      handleSharingError,
      handleCommentsUpdated,
      closeModals,
      formatFileSize,
      formatDate
    }
  }
}
</script>

<style scoped>
.export-manager {
  max-width: 100%;
}

.export-category {
  height: 100%;
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-sm {
  font-size: 0.875rem;
}

.progress {
  border-radius: 2px;
}

.modal {
  z-index: 1050;
}

.modal-backdrop {
  z-index: 1040;
}

.list-group-item {
  border-left: none;
  border-right: none;
}

.list-group-item:first-child {
  border-top: none;
}

.list-group-item:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .export-category {
    margin-bottom: 1rem;
  }
  
  .d-flex.flex-wrap.gap-2 {
    flex-direction: column;
  }
  
  .d-flex.flex-wrap.gap-2 .btn {
    width: 100%;
  }
}
</style>