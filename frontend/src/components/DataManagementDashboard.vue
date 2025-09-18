<template>
  <div class="data-management-dashboard">
    <!-- Privacy Notice Header -->
    <div class="alert alert-info mb-4">
      <div class="d-flex align-items-start">
        <i class="bi bi-shield-lock-fill me-2 mt-1"></i>
        <div>
          <strong>🔒 Session Data Management:</strong>
          <p class="mb-1">Your data exists only in browser memory during this session. All processing is temporary and privacy-first.</p>
          <small class="text-muted">
            • Data automatically cleared when browser closes or after 2 hours of inactivity<br>
            • No server-side storage or logging of your data<br>
            • Download processed data to continue work later
          </small>
        </div>
      </div>
    </div>

    <!-- Data Statistics Section -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-graph-up me-2"></i>
              Data Statistics (Session Only)
            </h5>
            <div class="privacy-indicator">
              <i class="bi bi-shield-check text-success" title="Data in memory only"></i>
              <small class="text-muted ms-1">Memory Only</small>
            </div>
          </div>
          <div class="card-body">
            <div v-if="!hasData" class="text-center text-muted py-4">
              <i class="bi bi-inbox display-4 mb-3"></i>
              <h6>No Data Uploaded</h6>
              <p>Upload a CSV file to see data statistics and quality indicators.</p>
              <router-link to="/upload" class="btn btn-primary">
                <i class="bi bi-upload me-1"></i>
                Upload Data
              </router-link>
            </div>

            <div v-else>
              <!-- Basic Statistics Grid -->
              <div class="row g-3 mb-4">
                <div class="col-md-3">
                  <div class="stat-card">
                    <div class="stat-icon">
                      <i class="bi bi-table text-primary"></i>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ formatNumber(basicStats.total_rows) }}</div>
                      <div class="stat-label">Total Rows</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="stat-card">
                    <div class="stat-icon">
                      <i class="bi bi-columns text-success"></i>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ basicStats.total_columns }}</div>
                      <div class="stat-label">Total Columns</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="stat-card">
                    <div class="stat-icon">
                      <i class="bi bi-memory text-info"></i>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ formatMemory(basicStats.memory_usage_mb) }}</div>
                      <div class="stat-label">Memory Usage</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="stat-card">
                    <div class="stat-icon">
                      <i class="bi bi-percent text-warning"></i>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ formatPercentage(missingValuePercentage) }}</div>
                      <div class="stat-label">Missing Values</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Data Quality Indicators -->
              <div class="data-quality-section mb-4">
                <h6 class="mb-3">
                  <i class="bi bi-check-circle me-2"></i>
                  Data Quality Assessment
                </h6>
                <div class="row g-3">
                  <div class="col-md-4">
                    <div class="quality-indicator">
                      <div class="quality-header">
                        <span class="quality-label">Overall Quality</span>
                        <span class="quality-grade" :class="getGradeClass(overallQuality.grade)">
                          {{ overallQuality.grade }}
                        </span>
                      </div>
                      <div class="progress mb-2">
                        <div 
                          class="progress-bar" 
                          :class="getProgressClass(overallQuality.score)"
                          :style="{ width: overallQuality.score + '%' }"
                        ></div>
                      </div>
                      <small class="text-muted">{{ overallQuality.score }}/100</small>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="quality-indicator">
                      <div class="quality-header">
                        <span class="quality-label">Time Series Ready</span>
                        <span class="quality-status" :class="timeSeriesReady ? 'text-success' : 'text-warning'">
                          <i :class="timeSeriesReady ? 'bi bi-check-circle' : 'bi bi-exclamation-triangle'"></i>
                          {{ timeSeriesReady ? 'Yes' : 'No' }}
                        </span>
                      </div>
                      <div class="quality-details">
                        <small class="text-muted">
                          Date Column: {{ hasDateColumn ? '✓' : '✗' }} | 
                          Value Column: {{ hasValueColumn ? '✓' : '✗' }} | 
                          Min Rows: {{ hasMinimumRows ? '✓' : '✗' }}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="quality-indicator">
                      <div class="quality-header">
                        <span class="quality-label">Data Completeness</span>
                        <span class="quality-percentage" :class="getCompletenessClass(completenessPercentage)">
                          {{ formatPercentage(completenessPercentage) }}
                        </span>
                      </div>
                      <div class="progress mb-2">
                        <div 
                          class="progress-bar" 
                          :class="getCompletenessProgressClass(completenessPercentage)"
                          :style="{ width: completenessPercentage + '%' }"
                        ></div>
                      </div>
                      <small class="text-muted">{{ basicStats.total_rows - basicStats.completely_empty_rows }} complete rows</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quality Issues and Recommendations -->
              <div v-if="hasQualityIssues" class="quality-issues mb-4">
                <div class="row">
                  <div class="col-md-6" v-if="criticalIssues.length > 0">
                    <div class="alert alert-danger">
                      <h6 class="alert-heading">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Critical Issues
                      </h6>
                      <ul class="mb-0">
                        <li v-for="issue in criticalIssues" :key="issue">{{ issue }}</li>
                      </ul>
                    </div>
                  </div>
                  <div class="col-md-6" v-if="warnings.length > 0">
                    <div class="alert alert-warning">
                      <h6 class="alert-heading">
                        <i class="bi bi-info-circle me-2"></i>
                        Warnings
                      </h6>
                      <ul class="mb-0">
                        <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Column Mapping Interface -->
    <div class="row mb-4" v-if="hasData">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-diagram-3 me-2"></i>
              Column Mapping (Session Storage)
            </h5>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm" @click="autoDetectColumns">
                <i class="bi bi-magic me-1"></i>
                Auto-Detect
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="resetColumnMapping">
                <i class="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="row">
              <!-- Date Column Selection -->
              <div class="col-md-6 mb-3">
                <label class="form-label">
                  <i class="bi bi-calendar-date me-1"></i>
                  Date Column (ds)
                  <span class="text-danger">*</span>
                </label>
                <select 
                  class="form-select" 
                  v-model="columnMapping.dateColumn"
                  @change="updateColumnMapping"
                  :class="{ 'is-invalid': !columnMapping.dateColumn }"
                >
                  <option value="">Select date column...</option>
                  <option 
                    v-for="column in availableColumns" 
                    :key="column.name"
                    :value="column.name"
                    :disabled="column.name === columnMapping.valueColumn"
                  >
                    {{ column.name }} 
                    <span v-if="column.isPotentialDate">(Auto-detected)</span>
                    <span v-if="column.type">({{ column.type }})</span>
                  </option>
                </select>
                <div class="form-text">
                  Select the column containing dates/timestamps for your time series.
                </div>
              </div>

              <!-- Value Column Selection -->
              <div class="col-md-6 mb-3">
                <label class="form-label">
                  <i class="bi bi-graph-up me-1"></i>
                  Value Column (y)
                  <span class="text-danger">*</span>
                </label>
                <select 
                  class="form-select" 
                  v-model="columnMapping.valueColumn"
                  @change="updateColumnMapping"
                  :class="{ 'is-invalid': !columnMapping.valueColumn }"
                >
                  <option value="">Select value column...</option>
                  <option 
                    v-for="column in availableColumns" 
                    :key="column.name"
                    :value="column.name"
                    :disabled="column.name === columnMapping.dateColumn"
                  >
                    {{ column.name }} 
                    <span v-if="column.isPotentialValue">(Auto-detected)</span>
                    <span v-if="column.type">({{ column.type }})</span>
                  </option>
                </select>
                <div class="form-text">
                  Select the numeric column containing values to forecast.
                </div>
              </div>
            </div>

            <!-- Column Preview -->
            <div v-if="columnMapping.dateColumn || columnMapping.valueColumn" class="column-preview mt-3">
              <h6>Column Preview</h6>
              <div class="table-responsive">
                <table class="table table-sm table-hover">
                  <thead class="table-light">
                    <tr>
                      <th v-if="columnMapping.dateColumn">{{ columnMapping.dateColumn }} (Date)</th>
                      <th v-if="columnMapping.valueColumn">{{ columnMapping.valueColumn }} (Value)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in previewRows" :key="index">
                      <td v-if="columnMapping.dateColumn">{{ formatCellValue(row[columnMapping.dateColumn]) }}</td>
                      <td v-if="columnMapping.valueColumn">{{ formatCellValue(row[columnMapping.valueColumn]) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Mapping Status -->
            <div class="mapping-status mt-3">
              <div class="d-flex align-items-center gap-3">
                <div class="status-item">
                  <i :class="columnMapping.dateColumn ? 'bi bi-check-circle text-success' : 'bi bi-x-circle text-danger'"></i>
                  <span class="ms-1">Date Column {{ columnMapping.dateColumn ? 'Selected' : 'Required' }}</span>
                </div>
                <div class="status-item">
                  <i :class="columnMapping.valueColumn ? 'bi bi-check-circle text-success' : 'bi bi-x-circle text-danger'"></i>
                  <span class="ms-1">Value Column {{ columnMapping.valueColumn ? 'Selected' : 'Required' }}</span>
                </div>
                <div class="status-item">
                  <i :class="isValidMapping ? 'bi bi-check-circle text-success' : 'bi bi-exclamation-triangle text-warning'"></i>
                  <span class="ms-1">{{ isValidMapping ? 'Ready for Forecasting' : 'Mapping Incomplete' }}</span>
                </div>
              </div>
            </div>

            <!-- Privacy Notice for Column Mapping -->
            <div class="alert alert-info mt-3">
              <small>
                <i class="bi bi-shield-lock me-1"></i>
                <strong>Privacy Note:</strong> Column mappings are stored in your browser's session storage only. 
                No mapping information is sent to or stored on our servers.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="row" v-if="hasData">
      <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary" @click="downloadSessionData">
              <i class="bi bi-download me-1"></i>
              Download Session Data
            </button>
            <button class="btn btn-outline-warning" @click="clearSessionData">
              <i class="bi bi-trash me-1"></i>
              Clear Session Data
            </button>
          </div>
          <div class="d-flex gap-2">
            <router-link 
              to="/upload" 
              class="btn btn-outline-primary"
            >
              <i class="bi bi-upload me-1"></i>
              Upload New Data
            </router-link>
            <router-link 
              to="/configure" 
              class="btn btn-primary"
              :class="{ disabled: !isValidMapping }"
            >
              <i class="bi bi-arrow-right me-1"></i>
              Configure Forecast
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useRouter } from 'vue-router'

export default {
  name: 'DataManagementDashboard',
  setup() {
    const sessionStore = useSessionStore()
    const router = useRouter()
    
    // Reactive state
    const columnMapping = ref({
      dateColumn: '',
      valueColumn: ''
    })

    // Computed properties
    const hasData = computed(() => sessionStore.hasData)
    const dataPreview = computed(() => sessionStore.dataPreview)
    
    // Basic statistics from session data
    const basicStats = computed(() => {
      if (!dataPreview.value?.stats) {
        return {
          total_rows: 0,
          total_columns: 0,
          memory_usage_mb: 0,
          completely_empty_rows: 0
        }
      }
      return dataPreview.value.stats
    })

    // Data quality metrics
    const overallQuality = computed(() => {
      if (!dataPreview.value?.quality) {
        return { score: 0, grade: 'F' }
      }
      return dataPreview.value.quality.overall_quality || { score: 0, grade: 'F' }
    })

    const missingValuePercentage = computed(() => {
      if (!dataPreview.value?.quality?.missing_values) return 0
      return dataPreview.value.quality.missing_values.missing_percentage || 0
    })

    const completenessPercentage = computed(() => {
      const total = basicStats.value.total_rows
      const empty = basicStats.value.completely_empty_rows
      return total > 0 ? ((total - empty) / total) * 100 : 0
    })

    // Time series readiness
    const timeSeriesChecks = computed(() => {
      if (!dataPreview.value?.quality?.time_series_checks) {
        return { time_series_readiness: {} }
      }
      return dataPreview.value.quality.time_series_checks
    })

    const timeSeriesReady = computed(() => {
      return timeSeriesChecks.value.time_series_readiness?.ready_for_forecasting || false
    })

    const hasDateColumn = computed(() => {
      return timeSeriesChecks.value.time_series_readiness?.has_date_column || false
    })

    const hasValueColumn = computed(() => {
      return timeSeriesChecks.value.time_series_readiness?.has_value_column || false
    })

    const hasMinimumRows = computed(() => {
      return timeSeriesChecks.value.time_series_readiness?.minimum_rows || false
    })

    // Quality issues
    const criticalIssues = computed(() => {
      return overallQuality.value.critical_issues || []
    })

    const warnings = computed(() => {
      return overallQuality.value.warnings || []
    })

    const hasQualityIssues = computed(() => {
      return criticalIssues.value.length > 0 || warnings.value.length > 0
    })

    // Available columns for mapping
    const availableColumns = computed(() => {
      if (!dataPreview.value?.columns) return []
      
      return dataPreview.value.columns.map(col => ({
        name: col,
        type: dataPreview.value.columnInfo?.[col]?.type || 'unknown',
        isPotentialDate: dataPreview.value.columnInfo?.[col]?.is_potential_date || false,
        isPotentialValue: dataPreview.value.columnInfo?.[col]?.is_potential_value || false
      }))
    })

    // Preview rows for column mapping
    const previewRows = computed(() => {
      if (!dataPreview.value?.sampleRows) return []
      return dataPreview.value.sampleRows.slice(0, 5)
    })

    // Validation
    const isValidMapping = computed(() => {
      return columnMapping.value.dateColumn && columnMapping.value.valueColumn
    })

    // Methods
    const formatNumber = (num) => {
      if (typeof num !== 'number') return '0'
      return num.toLocaleString()
    }

    const formatMemory = (mb) => {
      if (typeof mb !== 'number') return '0 MB'
      if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`
      return `${mb.toFixed(1)} MB`
    }

    const formatPercentage = (pct) => {
      if (typeof pct !== 'number') return '0%'
      return `${pct.toFixed(1)}%`
    }

    const formatCellValue = (value) => {
      if (value === null || value === undefined) return '-'
      if (typeof value === 'number') return value.toLocaleString()
      return String(value)
    }

    const getGradeClass = (grade) => {
      const gradeClasses = {
        'A': 'badge bg-success',
        'B': 'badge bg-primary', 
        'C': 'badge bg-warning',
        'D': 'badge bg-warning',
        'F': 'badge bg-danger'
      }
      return gradeClasses[grade] || 'badge bg-secondary'
    }

    const getProgressClass = (score) => {
      if (score >= 90) return 'bg-success'
      if (score >= 80) return 'bg-primary'
      if (score >= 70) return 'bg-info'
      if (score >= 60) return 'bg-warning'
      return 'bg-danger'
    }

    const getCompletenessClass = (pct) => {
      if (pct >= 95) return 'text-success'
      if (pct >= 85) return 'text-primary'
      if (pct >= 70) return 'text-warning'
      return 'text-danger'
    }

    const getCompletenessProgressClass = (pct) => {
      if (pct >= 95) return 'bg-success'
      if (pct >= 85) return 'bg-primary'
      if (pct >= 70) return 'bg-warning'
      return 'bg-danger'
    }

    const autoDetectColumns = () => {
      // Auto-detect date and value columns based on analysis
      const dateColumns = availableColumns.value.filter(col => col.isPotentialDate)
      const valueColumns = availableColumns.value.filter(col => col.isPotentialValue)

      if (dateColumns.length > 0) {
        columnMapping.value.dateColumn = dateColumns[0].name
      }
      if (valueColumns.length > 0) {
        columnMapping.value.valueColumn = valueColumns[0].name
      }

      updateColumnMapping()
    }

    const resetColumnMapping = () => {
      columnMapping.value.dateColumn = ''
      columnMapping.value.valueColumn = ''
      updateColumnMapping()
    }

    const updateColumnMapping = () => {
      // Store column mapping in session storage (browser only)
      const mapping = {
        dateColumn: columnMapping.value.dateColumn,
        valueColumn: columnMapping.value.valueColumn,
        timestamp: new Date().toISOString()
      }
      
      sessionStorage.setItem('prophet_column_mapping', JSON.stringify(mapping))
      
      // Also update the session store
      sessionStore.setColumnMapping(mapping)
    }

    const loadColumnMapping = () => {
      // Load column mapping from session storage
      try {
        const stored = sessionStorage.getItem('prophet_column_mapping')
        if (stored) {
          const mapping = JSON.parse(stored)
          columnMapping.value.dateColumn = mapping.dateColumn || ''
          columnMapping.value.valueColumn = mapping.valueColumn || ''
        }
      } catch (error) {
        console.warn('Failed to load column mapping from session storage:', error)
      }
    }

    const downloadSessionData = () => {
      const sessionData = sessionStore.exportSessionData()
      if (!sessionData) {
        alert('No session data to download')
        return
      }

      // Include column mapping in export
      sessionData.columnMapping = columnMapping.value

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
    }

    const clearSessionData = () => {
      if (confirm('Are you sure you want to clear all session data? This action cannot be undone.')) {
        sessionStore.clearSession()
        sessionStorage.removeItem('prophet_column_mapping')
        columnMapping.value.dateColumn = ''
        columnMapping.value.valueColumn = ''
      }
    }

    // Lifecycle
    onMounted(() => {
      loadColumnMapping()
      
      // Auto-detect columns if none are mapped and data is available
      if (hasData.value && !columnMapping.value.dateColumn && !columnMapping.value.valueColumn) {
        autoDetectColumns()
      }
    })

    // Watch for data changes to auto-detect columns
    watch(hasData, (newHasData) => {
      if (newHasData && !columnMapping.value.dateColumn && !columnMapping.value.valueColumn) {
        autoDetectColumns()
      }
    })

    return {
      // State
      columnMapping,
      
      // Computed
      hasData,
      dataPreview,
      basicStats,
      overallQuality,
      missingValuePercentage,
      completenessPercentage,
      timeSeriesReady,
      hasDateColumn,
      hasValueColumn,
      hasMinimumRows,
      criticalIssues,
      warnings,
      hasQualityIssues,
      availableColumns,
      previewRows,
      isValidMapping,
      
      // Methods
      formatNumber,
      formatMemory,
      formatPercentage,
      formatCellValue,
      getGradeClass,
      getProgressClass,
      getCompletenessClass,
      getCompletenessProgressClass,
      autoDetectColumns,
      resetColumnMapping,
      updateColumnMapping,
      downloadSessionData,
      clearSessionData
    }
  }
}
</script>

<style scoped>
.data-management-dashboard {
  padding: 1rem 0;
}

.privacy-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 2rem;
  margin-right: 1rem;
  opacity: 0.8;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #495057;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.data-quality-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.quality-indicator {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid #dee2e6;
}

.quality-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.quality-label {
  font-weight: 500;
  color: #495057;
}

.quality-grade {
  font-size: 0.875rem;
  font-weight: 600;
}

.quality-status {
  font-weight: 500;
}

.quality-percentage {
  font-weight: 600;
}

.quality-details {
  margin-top: 0.5rem;
}

.progress {
  height: 6px;
  background-color: #e9ecef;
}

.column-preview {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 1rem;
}

.mapping-status {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.table th {
  background: #f8f9fa;
  border-top: none;
  font-weight: 600;
  font-size: 0.875rem;
}

.table td {
  font-size: 0.875rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert {
  border: none;
  border-radius: 8px;
}

.alert-info {
  background: linear-gradient(135deg, #d1ecf1, #bee5eb);
  color: #0c5460;
}

.alert-danger {
  background: linear-gradient(135deg, #f8d7da, #f5c6cb);
  color: #721c24;
}

.alert-warning {
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  color: #856404;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
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

@media (max-width: 768px) {
  .data-management-dashboard {
    padding: 0.5rem 0;
  }
  
  .stat-card {
    margin-bottom: 1rem;
  }
  
  .quality-indicator {
    margin-bottom: 1rem;
  }
  
  .d-flex.justify-content-between {
    flex-direction: column;
    gap: 1rem;
  }
  
  .d-flex.gap-2 {
    justify-content: center;
  }
}
</style>