<template>
  <div class="data-preprocessing">
    <!-- Privacy Notice Header -->
    <div class="alert alert-info mb-4">
      <div class="d-flex align-items-start">
        <i class="bi bi-shield-lock-fill me-2 mt-1"></i>
        <div>
          <strong>🔒 Privacy-First Data Processing:</strong>
          <p class="mb-1">All data cleaning and transformations happen in your browser memory only. No processed data is sent to or stored on our servers.</p>
          <small class="text-muted">
            • Processing operations are applied to session data only<br>
            • Download processed data to save your work<br>
            • Upload previously processed data to continue work
          </small>
        </div>
      </div>
    </div>

    <!-- Data Cleaning Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-broom me-2"></i>
          Data Cleaning Tools
        </h5>
        <div class="cleaning-status">
          <span class="badge bg-secondary" v-if="!hasData">No Data</span>
          <span class="badge bg-success" v-else-if="isDataClean">Clean</span>
          <span class="badge bg-warning" v-else>Issues Found</span>
        </div>
      </div>
      <div class="card-body">
        <div v-if="!hasData" class="text-center text-muted py-4">
          <i class="bi bi-inbox display-4 mb-3"></i>
          <h6>No Data Available</h6>
          <p>Upload data first to access cleaning tools.</p>
          <router-link to="/upload" class="btn btn-primary">
            <i class="bi bi-upload me-1"></i>
            Upload Data
          </router-link>
        </div>

        <div v-else>
          <!-- Data Quality Issues Summary -->
          <div class="quality-summary mb-4" v-if="qualityIssues.length > 0">
            <h6 class="text-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Data Quality Issues Detected
            </h6>
            <div class="row g-3">
              <div class="col-md-4" v-for="issue in qualityIssues" :key="issue.type">
                <div class="issue-card" :class="getIssueClass(issue.severity)">
                  <div class="issue-header">
                    <i :class="getIssueIcon(issue.type)"></i>
                    <span class="issue-title">{{ issue.title }}</span>
                  </div>
                  <div class="issue-details">
                    <div class="issue-count">{{ issue.count }} {{ issue.unit }}</div>
                    <div class="issue-description">{{ issue.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cleaning Options -->
          <div class="cleaning-options">
            <h6 class="mb-3">Available Cleaning Operations</h6>
            <div class="row g-3">
              <!-- Remove Duplicates -->
              <div class="col-md-6">
                <div class="cleaning-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="removeDuplicates"
                        v-model="cleaningOptions.removeDuplicates"
                        :disabled="!hasDuplicates"
                      >
                      <label class="form-check-label fw-semibold" for="removeDuplicates">
                        Remove Duplicate Rows
                      </label>
                    </div>
                    <span class="badge bg-info" v-if="duplicateCount > 0">{{ duplicateCount }} found</span>
                    <span class="badge bg-success" v-else>None found</span>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Remove rows with identical date and value combinations. Keeps the first occurrence.
                    </small>
                  </div>
                </div>
              </div>

              <!-- Handle Missing Values -->
              <div class="col-md-6">
                <div class="cleaning-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="handleMissing"
                        v-model="cleaningOptions.handleMissing"
                        :disabled="!hasMissingValues"
                      >
                      <label class="form-check-label fw-semibold" for="handleMissing">
                        Handle Missing Values
                      </label>
                    </div>
                    <span class="badge bg-warning" v-if="missingCount > 0">{{ missingCount }} found</span>
                    <span class="badge bg-success" v-else>None found</span>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Fill missing values using interpolation or remove rows with missing data.
                    </small>
                  </div>
                  <div class="option-config mt-2" v-if="cleaningOptions.handleMissing">
                    <select class="form-select form-select-sm" v-model="cleaningOptions.missingStrategy">
                      <option value="interpolate">Linear Interpolation</option>
                      <option value="forward_fill">Forward Fill</option>
                      <option value="backward_fill">Backward Fill</option>
                      <option value="remove">Remove Rows</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Remove Outliers -->
              <div class="col-md-6">
                <div class="cleaning-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="removeOutliers"
                        v-model="cleaningOptions.removeOutliers"
                        :disabled="!hasOutliers"
                      >
                      <label class="form-check-label fw-semibold" for="removeOutliers">
                        Remove Outliers
                      </label>
                    </div>
                    <span class="badge bg-warning" v-if="outlierCount > 0">{{ outlierCount }} found</span>
                    <span class="badge bg-success" v-else>None found</span>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Remove extreme values using statistical methods (IQR or Z-score).
                    </small>
                  </div>
                  <div class="option-config mt-2" v-if="cleaningOptions.removeOutliers">
                    <select class="form-select form-select-sm" v-model="cleaningOptions.outlierMethod">
                      <option value="iqr">IQR Method (1.5x IQR)</option>
                      <option value="zscore">Z-Score Method (3σ)</option>
                      <option value="modified_zscore">Modified Z-Score</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Data Validation -->
              <div class="col-md-6">
                <div class="cleaning-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="validateData"
                        v-model="cleaningOptions.validateData"
                      >
                      <label class="form-check-label fw-semibold" for="validateData">
                        Validate Data Types
                      </label>
                    </div>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Ensure date column is properly formatted and value column contains only numeric data.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Apply Cleaning Button -->
            <div class="cleaning-actions mt-4">
              <button 
                class="btn btn-primary me-2"
                @click="applyCleaning"
                :disabled="!hasCleaningOptionsSelected || isProcessing"
              >
                <i class="bi bi-play-circle me-1" v-if="!isProcessing"></i>
                <div class="spinner-border spinner-border-sm me-1" v-else></div>
                {{ isProcessing ? 'Processing...' : 'Apply Cleaning' }}
              </button>
              <button 
                class="btn btn-outline-secondary"
                @click="resetCleaningOptions"
                :disabled="isProcessing"
              >
                <i class="bi bi-arrow-clockwise me-1"></i>
                Reset Options
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Transformation Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-graph-up-arrow me-2"></i>
          Data Transformation Tools
        </h5>
        <div class="transformation-status">
          <span class="badge bg-secondary" v-if="!hasData">No Data</span>
          <span class="badge bg-info" v-else-if="appliedTransformations.length > 0">
            {{ appliedTransformations.length }} Applied
          </span>
          <span class="badge bg-light text-dark" v-else>Original</span>
        </div>
      </div>
      <div class="card-body">
        <div v-if="!hasData" class="text-center text-muted py-4">
          <i class="bi bi-inbox display-4 mb-3"></i>
          <h6>No Data Available</h6>
          <p>Upload and clean data first to access transformation tools.</p>
        </div>

        <div v-else>
          <!-- Applied Transformations Summary -->
          <div class="applied-transformations mb-4" v-if="appliedTransformations.length > 0">
            <h6 class="text-info">
              <i class="bi bi-list-check me-2"></i>
              Applied Transformations
            </h6>
            <div class="transformation-list">
              <div 
                class="transformation-item" 
                v-for="(transform, index) in appliedTransformations" 
                :key="index"
              >
                <div class="transform-info">
                  <i :class="getTransformIcon(transform.type)"></i>
                  <span class="transform-name">{{ transform.name }}</span>
                  <small class="text-muted">{{ transform.description }}</small>
                </div>
                <button 
                  class="btn btn-sm btn-outline-danger"
                  @click="removeTransformation(index)"
                  :disabled="isProcessing"
                >
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Transformation Options -->
          <div class="transformation-options">
            <h6 class="mb-3">Available Transformations</h6>
            <div class="row g-3">
              <!-- Log Transform -->
              <div class="col-md-6">
                <div class="transform-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="logTransform"
                        v-model="transformOptions.logTransform"
                        :disabled="!canApplyLogTransform"
                      >
                      <label class="form-check-label fw-semibold" for="logTransform">
                        Log Transform
                      </label>
                    </div>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Apply natural logarithm to reduce variance in exponential growth data.
                      <span class="text-warning" v-if="!canApplyLogTransform">
                        (Requires positive values only)
                      </span>
                    </small>
                  </div>
                  <div class="option-config mt-2" v-if="transformOptions.logTransform">
                    <select class="form-select form-select-sm" v-model="transformOptions.logType">
                      <option value="natural">Natural Log (ln)</option>
                      <option value="log10">Log Base 10</option>
                      <option value="log2">Log Base 2</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Differencing -->
              <div class="col-md-6">
                <div class="transform-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="differencing"
                        v-model="transformOptions.differencing"
                      >
                      <label class="form-check-label fw-semibold" for="differencing">
                        Differencing
                      </label>
                    </div>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Calculate differences between consecutive values to remove trends.
                    </small>
                  </div>
                  <div class="option-config mt-2" v-if="transformOptions.differencing">
                    <div class="row g-2">
                      <div class="col-6">
                        <label class="form-label form-label-sm">Order:</label>
                        <select class="form-select form-select-sm" v-model="transformOptions.diffOrder">
                          <option value="1">First Order (Δy)</option>
                          <option value="2">Second Order (ΔΔy)</option>
                        </select>
                      </div>
                      <div class="col-6">
                        <label class="form-label form-label-sm">Periods:</label>
                        <input 
                          type="number" 
                          class="form-control form-control-sm" 
                          v-model.number="transformOptions.diffPeriods"
                          min="1" 
                          max="30"
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Normalization -->
              <div class="col-md-6">
                <div class="transform-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="normalization"
                        v-model="transformOptions.normalization"
                      >
                      <label class="form-check-label fw-semibold" for="normalization">
                        Normalization
                      </label>
                    </div>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Scale values to a standard range for better model performance.
                    </small>
                  </div>
                  <div class="option-config mt-2" v-if="transformOptions.normalization">
                    <select class="form-select form-select-sm" v-model="transformOptions.normMethod">
                      <option value="minmax">Min-Max Scaling (0-1)</option>
                      <option value="zscore">Z-Score Standardization</option>
                      <option value="robust">Robust Scaling</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Seasonal Decomposition -->
              <div class="col-md-6">
                <div class="transform-option">
                  <div class="option-header">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="seasonalDecomp"
                        v-model="transformOptions.seasonalDecomp"
                      >
                      <label class="form-check-label fw-semibold" for="seasonalDecomp">
                        Seasonal Adjustment
                      </label>
                    </div>
                  </div>
                  <div class="option-description">
                    <small class="text-muted">
                      Remove seasonal patterns to focus on trend and irregular components.
                    </small>
                  </div>
                  <div class="option-config mt-2" v-if="transformOptions.seasonalDecomp">
                    <div class="row g-2">
                      <div class="col-6">
                        <label class="form-label form-label-sm">Method:</label>
                        <select class="form-select form-select-sm" v-model="transformOptions.seasonalMethod">
                          <option value="additive">Additive</option>
                          <option value="multiplicative">Multiplicative</option>
                        </select>
                      </div>
                      <div class="col-6">
                        <label class="form-label form-label-sm">Period:</label>
                        <input 
                          type="number" 
                          class="form-control form-control-sm" 
                          v-model.number="transformOptions.seasonalPeriod"
                          min="2" 
                          max="365"
                          placeholder="Auto"
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Apply Transformation Button -->
            <div class="transformation-actions mt-4">
              <button 
                class="btn btn-success me-2"
                @click="applyTransformations"
                :disabled="!hasTransformOptionsSelected || isProcessing"
              >
                <i class="bi bi-play-circle me-1" v-if="!isProcessing"></i>
                <div class="spinner-border spinner-border-sm me-1" v-else></div>
                {{ isProcessing ? 'Processing...' : 'Apply Transformations' }}
              </button>
              <button 
                class="btn btn-outline-secondary me-2"
                @click="resetTransformOptions"
                :disabled="isProcessing"
              >
                <i class="bi bi-arrow-clockwise me-1"></i>
                Reset Options
              </button>
              <button 
                class="btn btn-outline-warning"
                @click="revertAllTransformations"
                :disabled="appliedTransformations.length === 0 || isProcessing"
              >
                <i class="bi bi-arrow-counterclockwise me-1"></i>
                Revert All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Continuity Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-arrow-down-up me-2"></i>
          Data Continuity & Export
        </h5>
        <div class="export-status">
          <span class="badge bg-info" v-if="hasProcessedData">Ready to Export</span>
          <span class="badge bg-secondary" v-else>No Processed Data</span>
        </div>
      </div>
      <div class="card-body">
        <!-- Export Options -->
        <div class="export-section mb-4">
          <h6 class="mb-3">
            <i class="bi bi-download me-2"></i>
            Download Processed Data
          </h6>
          <div class="row g-3">
            <div class="col-md-4">
              <div class="export-option">
                <button 
                  class="btn btn-outline-primary w-100"
                  @click="downloadProcessedCSV"
                  :disabled="!hasData"
                >
                  <i class="bi bi-filetype-csv me-2"></i>
                  <div>
                    <div class="fw-semibold">CSV Format</div>
                    <small class="text-muted">Processed time series data</small>
                  </div>
                </button>
              </div>
            </div>
            <div class="col-md-4">
              <div class="export-option">
                <button 
                  class="btn btn-outline-success w-100"
                  @click="downloadProcessingConfig"
                  :disabled="!hasProcessingHistory"
                >
                  <i class="bi bi-gear me-2"></i>
                  <div>
                    <div class="fw-semibold">Processing Config</div>
                    <small class="text-muted">Cleaning & transformation steps</small>
                  </div>
                </button>
              </div>
            </div>
            <div class="col-md-4">
              <div class="export-option">
                <button 
                  class="btn btn-outline-info w-100"
                  @click="downloadFullSession"
                  :disabled="!hasData"
                >
                  <i class="bi bi-archive me-2"></i>
                  <div>
                    <div class="fw-semibold">Complete Session</div>
                    <small class="text-muted">Data + config + metadata</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Import Options -->
        <div class="import-section">
          <h6 class="mb-3">
            <i class="bi bi-upload me-2"></i>
            Upload Previously Processed Data
          </h6>
          <div class="upload-area" 
               @drop="handleFileDrop" 
               @dragover.prevent 
               @dragenter.prevent
               :class="{ 'drag-over': isDragOver }"
               @dragenter="isDragOver = true"
               @dragleave="isDragOver = false">
            <div class="upload-content">
              <i class="bi bi-cloud-upload display-4 text-muted mb-3"></i>
              <h6>Drop files here or click to browse</h6>
              <p class="text-muted mb-3">
                Upload CSV data or session files to continue previous work
              </p>
              <div class="upload-buttons">
                <input 
                  type="file" 
                  ref="csvFileInput" 
                  @change="handleCSVUpload"
                  accept=".csv"
                  style="display: none"
                >
                <input 
                  type="file" 
                  ref="sessionFileInput" 
                  @change="handleSessionUpload"
                  accept=".json"
                  style="display: none"
                >
                <button 
                  class="btn btn-outline-primary me-2"
                  @click="$refs.csvFileInput.click()"
                >
                  <i class="bi bi-filetype-csv me-1"></i>
                  Upload CSV
                </button>
                <button 
                  class="btn btn-outline-success"
                  @click="$refs.sessionFileInput.click()"
                >
                  <i class="bi bi-archive me-1"></i>
                  Upload Session
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Privacy Notice -->
        <div class="alert alert-info mt-4">
          <small>
            <i class="bi bi-shield-lock me-1"></i>
            <strong>Privacy Guarantee:</strong> All downloads contain only your processed data. 
            No processing happens on our servers - everything is done in your browser. 
            Upload files are processed locally and never transmitted to our servers.
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

export default {
  name: 'DataPreprocessing',
  setup() {
    const sessionStore = useSessionStore()
    
    // Reactive state
    const isProcessing = ref(false)
    const isDragOver = ref(false)
    
    // Cleaning options
    const cleaningOptions = ref({
      removeDuplicates: false,
      handleMissing: false,
      missingStrategy: 'interpolate',
      removeOutliers: false,
      outlierMethod: 'iqr',
      validateData: false
    })
    
    // Transformation options
    const transformOptions = ref({
      logTransform: false,
      logType: 'natural',
      differencing: false,
      diffOrder: 1,
      diffPeriods: 1,
      normalization: false,
      normMethod: 'minmax',
      seasonalDecomp: false,
      seasonalMethod: 'additive',
      seasonalPeriod: null
    })
    
    // Applied transformations history
    const appliedTransformations = ref([])
    
    // Computed properties
    const hasData = computed(() => sessionStore.hasData)
    const dataPreview = computed(() => sessionStore.dataPreview)
    
    // Data quality metrics
    const qualityIssues = computed(() => {
      if (!dataPreview.value?.quality) return []
      
      const issues = []
      const quality = dataPreview.value.quality
      
      if (quality.duplicates?.count > 0) {
        issues.push({
          type: 'duplicates',
          title: 'Duplicate Rows',
          count: quality.duplicates.count,
          unit: 'rows',
          severity: 'warning',
          description: 'Identical date-value combinations found'
        })
      }
      
      if (quality.missing_values?.missing_count > 0) {
        issues.push({
          type: 'missing',
          title: 'Missing Values',
          count: quality.missing_values.missing_count,
          unit: 'values',
          severity: 'warning',
          description: 'Empty or null values in dataset'
        })
      }
      
      if (quality.outliers?.count > 0) {
        issues.push({
          type: 'outliers',
          title: 'Outliers',
          count: quality.outliers.count,
          unit: 'values',
          severity: 'info',
          description: 'Statistical outliers detected'
        })
      }
      
      return issues
    })
    
    const duplicateCount = computed(() => {
      return dataPreview.value?.quality?.duplicates?.count || 0
    })
    
    const missingCount = computed(() => {
      return dataPreview.value?.quality?.missing_values?.missing_count || 0
    })
    
    const outlierCount = computed(() => {
      return dataPreview.value?.quality?.outliers?.count || 0
    })
    
    const hasDuplicates = computed(() => duplicateCount.value > 0)
    const hasMissingValues = computed(() => missingCount.value > 0)
    const hasOutliers = computed(() => outlierCount.value > 0)
    
    const isDataClean = computed(() => {
      return !hasDuplicates.value && !hasMissingValues.value && !hasOutliers.value
    })
    
    const hasCleaningOptionsSelected = computed(() => {
      return cleaningOptions.value.removeDuplicates || 
             cleaningOptions.value.handleMissing || 
             cleaningOptions.value.removeOutliers || 
             cleaningOptions.value.validateData
    })
    
    const hasTransformOptionsSelected = computed(() => {
      return transformOptions.value.logTransform || 
             transformOptions.value.differencing || 
             transformOptions.value.normalization || 
             transformOptions.value.seasonalDecomp
    })
    
    const canApplyLogTransform = computed(() => {
      // Check if all values are positive (required for log transform)
      if (!dataPreview.value?.stats) return false
      return dataPreview.value.stats.min_value > 0
    })
    
    const hasProcessedData = computed(() => {
      return hasData.value && (appliedTransformations.value.length > 0 || sessionStore.hasProcessingHistory)
    })
    
    const hasProcessingHistory = computed(() => {
      return appliedTransformations.value.length > 0 || sessionStore.hasProcessingHistory
    })
    
    // Methods
    const getIssueClass = (severity) => {
      const classes = {
        'critical': 'border-danger',
        'warning': 'border-warning', 
        'info': 'border-info'
      }
      return classes[severity] || 'border-secondary'
    }
    
    const getIssueIcon = (type) => {
      const icons = {
        'duplicates': 'bi bi-files text-warning',
        'missing': 'bi bi-question-circle text-warning',
        'outliers': 'bi bi-exclamation-triangle text-info'
      }
      return icons[type] || 'bi bi-info-circle'
    }
    
    const getTransformIcon = (type) => {
      const icons = {
        'log': 'bi bi-graph-up text-primary',
        'diff': 'bi bi-arrow-up-right text-success',
        'norm': 'bi bi-speedometer text-info',
        'seasonal': 'bi bi-calendar-week text-warning'
      }
      return icons[type] || 'bi bi-gear'
    }
    
    const applyCleaning = async () => {
      if (!hasData.value || isProcessing.value) return
      
      isProcessing.value = true
      
      try {
        // Import API functions
        const { cleanData } = await import('@/services/api.js')
        
        // Prepare cleaning configuration for backend
        const cleaningConfig = {
          remove_duplicates: cleaningOptions.value.removeDuplicates,
          missing_values_strategy: cleaningOptions.value.handleMissing ? cleaningOptions.value.missingStrategy : 'none',
          remove_outliers: cleaningOptions.value.removeOutliers,
          outlier_method: cleaningOptions.value.outlierMethod,
          remove_empty_rows: cleaningOptions.value.validateData
        }
        
        // Call backend API
        const response = await cleanData(sessionStore.sessionId, cleaningConfig)
        
        if (response.success) {
          // Update session store with cleaned data
          sessionStore.addProcessingStep({
            type: 'cleaning',
            config: cleaningConfig,
            report: response.operation_report,
            timestamp: new Date().toISOString()
          })
          
          // Update data preview if available
          if (response.data_preview) {
            sessionStore.setUploadedData(
              response.data_preview.rows,
              response.data_preview
            )
          }
          
          // Reset options after successful application
          resetCleaningOptions()
          
          // Show success message
          alert(`Data cleaning completed successfully! ${response.message}`)
        } else {
          throw new Error(response.message || 'Cleaning failed')
        }
        
      } catch (error) {
        console.error('Error applying cleaning:', error)
        alert(`Error applying data cleaning: ${error.message}`)
      } finally {
        isProcessing.value = false
      }
    }
    
    const applyTransformations = async () => {
      if (!hasData.value || isProcessing.value) return
      
      isProcessing.value = true
      
      try {
        // Import API functions
        const { transformData } = await import('@/services/api.js')
        
        // Get column mapping to determine which columns to transform
        const columnMapping = sessionStore.getColumnMapping()
        const valueColumn = columnMapping?.valueColumn
        
        if (!valueColumn) {
          throw new Error('Please select a value column before applying transformations')
        }
        
        // Prepare transformation configuration for backend
        const transformationConfig = {
          log_transform_columns: transformOptions.value.logTransform ? [valueColumn] : [],
          differencing_columns: transformOptions.value.differencing ? [valueColumn] : [],
          sqrt_transform_columns: [], // Not implemented in UI yet
          boxcox_transform_columns: [] // Not implemented in UI yet
        }
        
        // Call backend API
        const response = await transformData(sessionStore.sessionId, transformationConfig)
        
        if (response.success) {
          // Build transformation list for UI display
          const transformations = []
          
          if (transformOptions.value.logTransform) {
            transformations.push({
              type: 'log',
              name: `${transformOptions.value.logType === 'natural' ? 'Natural' : transformOptions.value.logType.toUpperCase()} Log Transform`,
              description: `Applied ${transformOptions.value.logType} logarithm to ${valueColumn}`,
              config: { logType: transformOptions.value.logType, column: valueColumn }
            })
          }
          
          if (transformOptions.value.differencing) {
            transformations.push({
              type: 'diff',
              name: `Differencing (Order ${transformOptions.value.diffOrder})`,
              description: `${transformOptions.value.diffOrder === 1 ? 'First' : 'Second'} order differencing on ${valueColumn}`,
              config: { 
                order: transformOptions.value.diffOrder,
                periods: transformOptions.value.diffPeriods,
                column: valueColumn
              }
            })
          }
          
          if (transformOptions.value.normalization) {
            transformations.push({
              type: 'norm',
              name: `${transformOptions.value.normMethod.toUpperCase()} Normalization`,
              description: `Applied ${transformOptions.value.normMethod} scaling to ${valueColumn}`,
              config: { method: transformOptions.value.normMethod, column: valueColumn }
            })
          }
          
          if (transformOptions.value.seasonalDecomp) {
            transformations.push({
              type: 'seasonal',
              name: 'Seasonal Adjustment',
              description: `${transformOptions.value.seasonalMethod} decomposition on ${valueColumn}`,
              config: { 
                method: transformOptions.value.seasonalMethod,
                period: transformOptions.value.seasonalPeriod,
                column: valueColumn
              }
            })
          }
          
          // Add to applied transformations
          appliedTransformations.value.push(...transformations)
          
          // Store transformation history
          sessionStore.addProcessingStep({
            type: 'transformation',
            transformations: transformations,
            report: response.operation_report,
            timestamp: new Date().toISOString()
          })
          
          // Update data preview if available
          if (response.data_preview) {
            sessionStore.setUploadedData(
              response.data_preview.rows,
              response.data_preview
            )
          }
          
          // Reset options after successful application
          resetTransformOptions()
          
          // Show success message
          alert(`${transformations.length} transformation(s) applied successfully! ${response.message}`)
        } else {
          throw new Error(response.message || 'Transformation failed')
        }
        
      } catch (error) {
        console.error('Error applying transformations:', error)
        alert(`Error applying transformations: ${error.message}`)
      } finally {
        isProcessing.value = false
      }
    }
    
    const removeTransformation = (index) => {
      if (isProcessing.value) return
      
      const removed = appliedTransformations.value.splice(index, 1)[0]
      
      // Update session store
      sessionStore.removeProcessingStep('transformation', index)
      
      alert(`Removed transformation: ${removed.name}`)
    }
    
    const revertAllTransformations = () => {
      if (isProcessing.value || appliedTransformations.value.length === 0) return
      
      if (confirm('Are you sure you want to revert all transformations? This will restore the original cleaned data.')) {
        appliedTransformations.value = []
        sessionStore.clearProcessingSteps('transformation')
        alert('All transformations reverted successfully!')
      }
    }
    
    const resetCleaningOptions = () => {
      cleaningOptions.value = {
        removeDuplicates: false,
        handleMissing: false,
        missingStrategy: 'interpolate',
        removeOutliers: false,
        outlierMethod: 'iqr',
        validateData: false
      }
    }
    
    const resetTransformOptions = () => {
      transformOptions.value = {
        logTransform: false,
        logType: 'natural',
        differencing: false,
        diffOrder: 1,
        diffPeriods: 1,
        normalization: false,
        normMethod: 'minmax',
        seasonalDecomp: false,
        seasonalMethod: 'additive',
        seasonalPeriod: null
      }
    }
    
    const downloadProcessedCSV = async () => {
      if (!hasData.value) return
      
      try {
        // Import API functions
        const { prepareDownload } = await import('@/services/api.js')
        
        // Get processed data from backend
        const response = await prepareDownload(sessionStore.sessionId)
        
        if (response.success && response.download_data) {
          // Convert to CSV format
          const csvContent = response.download_data.csv_content || convertToCSV(response.download_data.data)
          
          // Create and download file
          const blob = new Blob([csvContent], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `processed_data_${new Date().toISOString().split('T')[0]}.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } else {
          throw new Error('No processed data available for download')
        }
        
      } catch (error) {
        console.error('Error downloading CSV:', error)
        alert(`Error downloading data: ${error.message}`)
      }
    }
    
    const downloadProcessingConfig = async () => {
      if (!hasProcessingHistory.value) return
      
      try {
        // Import API functions
        const { getProcessingHistory } = await import('@/services/api.js')
        
        // Get processing history from backend
        const historyResponse = await getProcessingHistory(sessionStore.sessionId)
        
        const config = {
          processingHistory: historyResponse,
          appliedTransformations: appliedTransformations.value,
          sessionId: sessionStore.sessionId,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { 
          type: 'application/json' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `processing_config_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
      } catch (error) {
        console.error('Error downloading config:', error)
        alert(`Error downloading configuration: ${error.message}`)
      }
    }
    
    const downloadFullSession = async () => {
      if (!hasData.value) return
      
      try {
        // Import API functions
        const { prepareDownload, getProcessingHistory } = await import('@/services/api.js')
        
        // Get both processed data and processing history
        const [downloadResponse, historyResponse] = await Promise.all([
          prepareDownload(sessionStore.sessionId),
          getProcessingHistory(sessionStore.sessionId)
        ])
        
        const sessionData = {
          sessionId: sessionStore.sessionId,
          data: downloadResponse.download_data,
          processingHistory: historyResponse,
          appliedTransformations: appliedTransformations.value,
          columnMapping: sessionStore.getColumnMapping(),
          metadata: {
            exportDate: new Date().toISOString(),
            version: '1.0',
            dataSource: 'prophet-web-interface',
            privacyNote: 'This data was processed entirely in browser memory and never stored on servers'
          }
        }
        
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { 
          type: 'application/json' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `prophet_session_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
      } catch (error) {
        console.error('Error downloading session:', error)
        alert(`Error downloading session data: ${error.message}`)
      }
    }
    
    const handleFileDrop = (event) => {
      event.preventDefault()
      isDragOver.value = false
      
      const files = event.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (file.name.endsWith('.csv')) {
          handleFileUpload(file, 'csv')
        } else if (file.name.endsWith('.json')) {
          handleFileUpload(file, 'session')
        } else {
          alert('Please upload a CSV or JSON file')
        }
      }
    }
    
    const handleCSVUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        handleFileUpload(file, 'csv')
      }
    }
    
    const handleSessionUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        handleFileUpload(file, 'session')
      }
    }
    
    const handleFileUpload = (file, type) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          if (type === 'csv') {
            // Parse CSV and load into session
            const csvData = e.target.result
            sessionStore.loadCSVData(csvData)
            alert('CSV data loaded successfully!')
          } else if (type === 'session') {
            // Parse JSON session data
            const sessionData = JSON.parse(e.target.result)
            sessionStore.loadSessionData(sessionData)
            
            // Restore applied transformations
            if (sessionData.appliedTransformations) {
              appliedTransformations.value = sessionData.appliedTransformations
            }
            
            alert('Session data loaded successfully!')
          }
        } catch (error) {
          console.error('Error loading file:', error)
          alert('Error loading file. Please check the file format and try again.')
        }
      }
      
      if (type === 'csv') {
        reader.readAsText(file)
      } else {
        reader.readAsText(file)
      }
    }
    
    const convertToCSV = (data) => {
      if (!data || !Array.isArray(data) || data.length === 0) {
        return ''
      }
      
      // Get headers from first row
      const headers = Object.keys(data[0])
      
      // Create CSV content
      const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ]
      
      return csvRows.join('\n')
    }
    
    return {
      // State
      isProcessing,
      isDragOver,
      cleaningOptions,
      transformOptions,
      appliedTransformations,
      
      // Computed
      hasData,
      dataPreview,
      qualityIssues,
      duplicateCount,
      missingCount,
      outlierCount,
      hasDuplicates,
      hasMissingValues,
      hasOutliers,
      isDataClean,
      hasCleaningOptionsSelected,
      hasTransformOptionsSelected,
      canApplyLogTransform,
      hasProcessedData,
      hasProcessingHistory,
      
      // Methods
      getIssueClass,
      getIssueIcon,
      getTransformIcon,
      applyCleaning,
      applyTransformations,
      removeTransformation,
      revertAllTransformations,
      resetCleaningOptions,
      resetTransformOptions,
      downloadProcessedCSV,
      downloadProcessingConfig,
      downloadFullSession,
      handleFileDrop,
      handleCSVUpload,
      handleSessionUpload
    }
  }
}
</script>

<style scoped>
.data-preprocessing {
  padding: 1rem 0;
}

.cleaning-status,
.transformation-status,
.export-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quality-summary {
  background: #fff3cd;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #ffeaa7;
}

.issue-card {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  border: 2px solid #dee2e6;
  transition: transform 0.2s ease;
}

.issue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.issue-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.issue-title {
  font-weight: 600;
  color: #495057;
}

.issue-count {
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
}

.issue-description {
  font-size: 0.875rem;
  color: #6c757d;
}

.cleaning-option,
.transform-option {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #dee2e6;
  height: 100%;
}

.option-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.option-description {
  margin-bottom: 0.5rem;
}

.option-config {
  background: white;
  border-radius: 4px;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
}

.cleaning-actions,
.transformation-actions {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 1rem;
  border-top: 2px solid #dee2e6;
}

.applied-transformations {
  background: #e7f3ff;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #b3d9ff;
}

.transformation-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transformation-item {
  display: flex;
  justify-content: between;
  align-items: center;
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
}

.transform-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.transform-name {
  font-weight: 600;
  color: #495057;
}

.export-option {
  height: 100%;
}

.export-option .btn {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
}

.upload-area {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #0d6efd;
  background-color: #f8f9ff;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.card {
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-radius: 12px;
}

.card-header {
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  border-radius: 12px 12px 0 0 !important;
}

.alert {
  border: none;
  border-radius: 8px;
}

.alert-info {
  background: linear-gradient(135deg, #d1ecf1, #bee5eb);
  color: #0c5460;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
}

.badge {
  font-size: 0.75rem;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .data-preprocessing {
    padding: 0.5rem 0;
  }
  
  .cleaning-option,
  .transform-option {
    margin-bottom: 1rem;
  }
  
  .transformation-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .upload-area {
    padding: 1.5rem 1rem;
  }
  
  .upload-buttons {
    flex-direction: column;
    width: 100%;
  }
  
  .export-option .btn {
    padding: 1rem;
  }
}
</style>