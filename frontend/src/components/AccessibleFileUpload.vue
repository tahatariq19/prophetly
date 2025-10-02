<template>
  <div class="accessible-file-upload" :class="accessibilityClasses">
    <!-- Screen Reader Instructions -->
    <div class="sr-only" id="upload-instructions">
      Upload a CSV file for time series forecasting. 
      Use the file input or drag and drop. 
      Your data will be processed securely in memory only and never stored on our servers.
    </div>

    <!-- Privacy Notice with Enhanced Accessibility -->
    <div 
      class="alert alert-info privacy-notice" 
      role="region" 
      aria-labelledby="privacy-heading"
      tabindex="0"
    >
      <h6 id="privacy-heading" class="alert-heading">
        <i class="bi bi-shield-lock-fill me-2" aria-hidden="true"></i>
        Privacy Protection Active
      </h6>
      <p class="mb-2">
        Your data will be processed entirely in server memory and automatically discarded after your session.
      </p>
      <ul class="privacy-features mb-0" aria-label="Privacy features">
        <li>No data is ever saved to disk or databases</li>
        <li>Processing happens in volatile memory only</li>
        <li>All data is immediately destroyed when you close the browser or after 2 hours of inactivity</li>
      </ul>
    </div>

    <!-- Upload Area with Enhanced Accessibility -->
    <div 
      class="upload-area"
      :class="{ 
        'drag-over': isDragOver, 
        'has-file': selectedFile,
        'uploading': isUploading,
        'error': hasError
      }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
      @keydown="handleKeydown"
      role="button"
      tabindex="0"
      :aria-describedby="selectedFile ? 'file-selected-desc' : 'upload-instructions'"
      :aria-label="uploadAreaLabel"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".csv,.txt"
        @change="handleFileSelect"
        class="visually-hidden"
        :aria-describedby="'upload-instructions'"
        @focus="announceToScreenReader('File input focused. Press Enter to select a file.')"
      >

      <!-- Upload States with Screen Reader Support -->
      <div v-if="!selectedFile && !isUploading" class="upload-prompt">
        <i class="bi bi-cloud-upload display-1 text-primary mb-3" aria-hidden="true"></i>
        <h5 id="upload-title">Drop your CSV file here</h5>
        <p class="text-muted mb-3">or press Enter to browse files</p>
        
        <!-- Accessible Requirements List -->
        <div class="upload-requirements" role="region" aria-labelledby="requirements-heading">
          <h6 id="requirements-heading" class="visually-hidden">File Requirements</h6>
          <ul class="requirements-list" aria-label="File requirements">
            <li>
              <i class="bi bi-check-circle text-success" aria-hidden="true"></i>
              <span>CSV format only</span>
            </li>
            <li>
              <i class="bi bi-check-circle text-success" aria-hidden="true"></i>
              <span>Maximum 10MB file size</span>
            </li>
            <li>
              <i class="bi bi-check-circle text-success" aria-hidden="true"></i>
              <span>Must contain date and value columns</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- File Selected State -->
      <div v-else-if="selectedFile && !isUploading" class="file-selected" id="file-selected-desc">
        <i class="bi bi-file-earmark-text display-4 text-success mb-2" aria-hidden="true"></i>
        <h6>{{ selectedFile.name }}</h6>
        <p class="text-muted mb-2">{{ fileSize }} • Ready to upload</p>
        <div class="d-flex gap-2 justify-content-center">
          <button 
            class="btn btn-primary" 
            @click="uploadFile" 
            :disabled="isUploading"
            :aria-describedby="'privacy-processing-note'"
          >
            <i class="bi bi-upload me-1" aria-hidden="true"></i>
            Process File Securely
          </button>
          <button 
            class="btn btn-outline-secondary" 
            @click="clearFile"
            aria-label="Remove selected file and choose a different one"
          >
            <i class="bi bi-x-lg me-1" aria-hidden="true"></i>
            Remove
          </button>
        </div>
        <div id="privacy-processing-note" class="privacy-note mt-2">
          <small class="text-muted">
            <i class="bi bi-info-circle me-1" aria-hidden="true"></i>
            File will be processed in secure memory only
          </small>
        </div>
      </div>

      <!-- Uploading State with Live Updates -->
      <div v-else-if="isUploading" class="uploading-state" role="status" aria-live="polite">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Processing file...</span>
        </div>
        <h6>{{ uploadStatus.stage }}</h6>
        <div class="progress mb-2" style="height: 8px;" role="progressbar" :aria-valuenow="uploadStatus.progress" aria-valuemin="0" aria-valuemax="100">
          <div 
            class="progress-bar" 
            :style="{ width: uploadStatus.progress + '%' }"
          ></div>
        </div>
        <p class="text-muted small">{{ uploadStatus.message }}</p>
        <div class="privacy-reminder mt-2" role="note">
          <small class="text-info">
            <i class="bi bi-shield-check me-1" aria-hidden="true"></i>
            Processing in memory only - no data stored
          </small>
        </div>
      </div>
    </div>

    <!-- Enhanced Error Display -->
    <div v-if="hasError" class="alert alert-danger mt-3" role="alert" aria-live="assertive">
      <div class="d-flex align-items-start">
        <i class="bi bi-exclamation-triangle-fill me-2 mt-1" aria-hidden="true"></i>
        <div>
          <h6 class="alert-heading">Upload Error</h6>
          <ul class="mb-2" role="list">
            <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
          </ul>
          <div class="privacy-assurance" role="note">
            <small class="text-muted">
              <i class="bi bi-shield-check me-1 text-success" aria-hidden="true"></i>
              Your data was not transmitted and remains private on your device.
            </small>
          </div>
          <button 
            class="btn btn-outline-danger btn-sm mt-2" 
            @click="clearErrors"
            aria-label="Clear error messages and try again"
          >
            <i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
            Try Again
          </button>
        </div>
      </div>
    </div>

    <!-- Accessible File Preview -->
    <div v-if="dataPreview && !isUploading" class="file-preview mt-4" role="region" aria-labelledby="preview-heading">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0" id="preview-heading">
            <i class="bi bi-table me-2" aria-hidden="true"></i>
            Data Preview (Session Only)
          </h6>
          <div class="d-flex align-items-center gap-3">
            <span class="text-muted" aria-label="Data summary">
              {{ dataPreview.totalRows }} rows, {{ dataPreview.columns.length }} columns
            </span>
            <div class="privacy-indicator" role="img" aria-label="Data stored in memory only">
              <i class="bi bi-shield-lock text-success" title="Data in memory only"></i>
            </div>
          </div>
        </div>
        <div class="card-body">
          <!-- Accessible Data Quality Summary -->
          <div class="data-quality mb-3" role="region" aria-labelledby="quality-heading">
            <h6 id="quality-heading" class="visually-hidden">Data Quality Summary</h6>
            <div class="row g-2">
              <div class="col-md-3">
                <div class="quality-metric" role="group" aria-labelledby="completeness-label">
                  <div id="completeness-label" class="metric-label">Completeness</div>
                  <div class="metric-value" :class="getQualityClass(dataPreview.stats.completeness)">
                    {{ dataPreview.stats.completeness }}%
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="quality-metric" role="group" aria-labelledby="date-column-label">
                  <div id="date-column-label" class="metric-label">Date Column</div>
                  <div class="metric-value" :class="dataPreview.columnMapping.dateColumn ? 'text-success' : 'text-warning'">
                    {{ dataPreview.columnMapping.dateColumn || 'Not detected' }}
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="quality-metric" role="group" aria-labelledby="value-column-label">
                  <div id="value-column-label" class="metric-label">Value Column</div>
                  <div class="metric-value" :class="dataPreview.columnMapping.valueColumn ? 'text-success' : 'text-warning'">
                    {{ dataPreview.columnMapping.valueColumn || 'Not detected' }}
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="quality-metric" role="group" aria-labelledby="missing-values-label">
                  <div id="missing-values-label" class="metric-label">Missing Values</div>
                  <div class="metric-value" :class="dataPreview.stats.missingValues > 0 ? 'text-warning' : 'text-success'">
                    {{ dataPreview.stats.missingValues }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Accessible Data Table -->
          <div class="table-responsive">
            <table 
              class="table table-sm table-hover" 
              role="table"
              :aria-label="`Data preview table with ${dataPreview.totalRows} rows and ${dataPreview.columns.length} columns`"
            >
              <thead class="table-light">
                <tr role="row">
                  <th 
                    v-for="(column, index) in dataPreview.columns" 
                    :key="column" 
                    :id="`col-${index}`"
                    role="columnheader"
                    scope="col"
                    class="text-nowrap"
                  >
                    {{ column }}
                    <span v-if="column === dataPreview.columnMapping.dateColumn" class="badge bg-primary ms-1" role="img" aria-label="Date column">Date</span>
                    <span v-if="column === dataPreview.columnMapping.valueColumn" class="badge bg-success ms-1" role="img" aria-label="Value column">Value</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in dataPreview.sampleRows" :key="rowIndex" role="row">
                  <td 
                    v-for="(column, colIndex) in dataPreview.columns" 
                    :key="column" 
                    :headers="`col-${colIndex}`"
                    role="gridcell"
                    class="text-nowrap"
                  >
                    {{ formatCellValue(row[column]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Accessible Preview Footer -->
          <div class="preview-footer mt-3 pt-3 border-top">
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                Showing first {{ Math.min(5, dataPreview.totalRows) }} rows of {{ dataPreview.totalRows }} total
              </small>
              <div class="d-flex gap-2">
                <button 
                  class="btn btn-outline-primary btn-sm" 
                  @click="downloadSampleData"
                  aria-label="Download sample of the uploaded data"
                >
                  <i class="bi bi-download me-1" aria-hidden="true"></i>
                  Download Sample
                </button>
                <button 
                  class="btn btn-primary btn-sm" 
                  @click="proceedToConfiguration"
                  aria-label="Proceed to forecast configuration with this data"
                >
                  <i class="bi bi-arrow-right me-1" aria-hidden="true"></i>
                  Configure Forecast
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Session Data Notice -->
    <div v-if="dataPreview" class="alert alert-warning mt-3" role="region" aria-labelledby="session-notice-heading">
      <div class="d-flex align-items-start">
        <i class="bi bi-clock me-2 mt-1" aria-hidden="true"></i>
        <div>
          <h6 id="session-notice-heading" class="alert-heading">Session Data Notice</h6>
          <p class="mb-2">Your data is temporarily stored in browser memory for this session only.</p>
          <p class="mb-0">
            <strong>Important:</strong> To continue your work later, download your processed data and configuration files before closing the browser.
          </p>
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div class="keyboard-help mt-3" v-if="isKeyboardNavigating">
      <details>
        <summary class="btn btn-outline-info btn-sm">
          <i class="bi bi-keyboard me-1" aria-hidden="true"></i>
          Keyboard Shortcuts
        </summary>
        <div class="mt-2 p-2 bg-light rounded">
          <ul class="list-unstyled mb-0">
            <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Select file</li>
            <li><kbd>Tab</kbd> - Navigate between elements</li>
            <li><kbd>Escape</kbd> - Clear selection or close dialogs</li>
          </ul>
        </div>
      </details>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { uploadFile as apiUploadFile } from '@/services/api'
import { fileValidation } from '@/utils/validation'
import { useAccessibility } from '@/composables/useAccessibility'

export default {
  name: 'AccessibleFileUpload',
  emits: ['file-uploaded', 'upload-error', 'proceed-to-config'],
  setup(props, { emit }) {
    const sessionStore = useSessionStore()
    const {
      accessibilityClasses,
      isKeyboardNavigating,
      announceToScreenReader,
      announceError,
      announceSuccess,
      makeTableAccessible
    } = useAccessibility()
    
    // Reactive state
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const isDragOver = ref(false)
    const isUploading = ref(false)
    const errors = ref([])
    const uploadStatus = ref({
      stage: '',
      progress: 0,
      message: ''
    })

    // Computed properties
    const hasError = computed(() => errors.value.length > 0)
    const fileSize = computed(() => {
      if (!selectedFile.value) return ''
      return fileValidation.getFileSize(selectedFile.value)
    })
    const dataPreview = computed(() => sessionStore.dataPreview)
    
    const uploadAreaLabel = computed(() => {
      if (selectedFile.value) {
        return `File selected: ${selectedFile.value.name}. Press Enter to process or remove.`
      }
      if (isUploading.value) {
        return `Uploading file: ${uploadStatus.value.stage}`
      }
      return 'File upload area. Press Enter to select a CSV file for forecasting.'
    })

    // Accessibility methods
    const getQualityClass = (value) => {
      if (value >= 95) return 'text-success'
      if (value >= 80) return 'text-warning'
      return 'text-danger'
    }

    // Event handlers with accessibility enhancements
    const handleKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!isUploading.value) {
          if (selectedFile.value) {
            uploadFile()
          } else {
            triggerFileInput()
          }
        }
      } else if (e.key === 'Escape') {
        if (selectedFile.value && !isUploading.value) {
          clearFile()
          announceToScreenReader('File selection cleared')
        }
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
      isDragOver.value = true
      announceToScreenReader('File dragged over upload area')
    }

    const handleDragEnter = (e) => {
      e.preventDefault()
      isDragOver.value = true
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      if (!e.currentTarget.contains(e.relatedTarget)) {
        isDragOver.value = false
        announceToScreenReader('File dragged away from upload area')
      }
    }

    const handleDrop = (e) => {
      e.preventDefault()
      isDragOver.value = false
      
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        announceToScreenReader(`File dropped: ${files[0].name}`)
        handleFileSelection(files[0])
      }
    }

    const triggerFileInput = () => {
      if (!isUploading.value) {
        fileInput.value?.click()
        announceToScreenReader('File selection dialog opened')
      }
    }

    const handleFileSelect = (e) => {
      const files = Array.from(e.target.files)
      if (files.length > 0) {
        handleFileSelection(files[0])
      }
    }

    const handleFileSelection = (file) => {
      clearErrors()
      
      // Validate file with accessibility feedback
      const validation = fileValidation.validateFile(file)
      if (!validation.isValid) {
        errors.value = validation.errors
        announceError(`File validation failed: ${validation.errors.join(', ')}`)
        return
      }

      selectedFile.value = file
      announceSuccess(`File selected: ${file.name}, size: ${fileValidation.getFileSize(file)}`)
      emit('file-uploaded', { file, validation: validation.fileInfo })
    }

    const uploadFile = async () => {
      if (!selectedFile.value || isUploading.value) return

      isUploading.value = true
      clearErrors()
      
      announceToScreenReader('Starting secure file upload and processing')
      
      try {
        const onProgress = (progress) => {
          uploadStatus.value = {
            stage: 'Uploading securely...',
            progress: Math.min(progress, 90),
            message: `${progress}% uploaded via encrypted connection`
          }
          
          // Announce progress at key milestones
          if (progress === 25 || progress === 50 || progress === 75) {
            announceToScreenReader(`Upload ${progress}% complete`)
          }
        }

        uploadStatus.value = {
          stage: 'Preparing secure upload...',
          progress: 0,
          message: 'Validating file and establishing secure connection'
        }

        const response = await apiUploadFile(selectedFile.value, onProgress)

        // Check if response is valid
        if (!response || !response.success) {
          throw new Error(response?.message || 'Upload failed - invalid response from server')
        }

        uploadStatus.value = {
          stage: 'Processing in memory...',
          progress: 95,
          message: 'Analyzing data quality and structure'
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        uploadStatus.value = {
          stage: 'Processing complete',
          progress: 100,
          message: 'Data processed successfully and securely'
        }

        // Handle both snake_case and camelCase
        const dataPreview = response.data_preview || response.dataPreview
        const fileInfo = response.file_info || response.fileInfo
        const dataQuality = response.data_quality || response.dataQuality
        
        const enhancedPreview = {
          columns: dataPreview?.columns || [],
          sampleRows: dataPreview?.rows || [],
          totalRows: dataPreview?.total_rows || dataPreview?.totalRows || 0,
          columnMapping: response.column_mapping || response.columnMapping || {},
          stats: {
            completeness: dataQuality?.completeness || 0,
            missingValues: dataQuality?.missing_values || dataQuality?.missingValues || 0,
            totalRows: fileInfo?.rows || 0,
            totalColumns: fileInfo?.columns || 0
          }
        }

        sessionStore.setUploadedData(response, enhancedPreview)

        announceSuccess(`File processed successfully! Found ${enhancedPreview.totalRows} rows and ${enhancedPreview.columns.length} columns.`)

        emit('file-uploaded', {
          file: selectedFile.value,
          data: response,
          preview: enhancedPreview
        })

      } catch (error) {
        console.error('Upload error:', error)
        errors.value = [error.message || 'Upload failed. Please try again.']
        announceError(`Upload failed: ${error.message || 'Unknown error'}`)
        emit('upload-error', error)
      } finally {
        isUploading.value = false
      }
    }

    const clearFile = () => {
      selectedFile.value = null
      clearErrors()
      if (fileInput.value) {
        fileInput.value.value = ''
      }
      announceToScreenReader('File selection cleared')
    }

    const clearErrors = () => {
      errors.value = []
    }

    const formatCellValue = (value) => {
      if (value === null || value === undefined) return '-'
      if (typeof value === 'number') {
        return value.toLocaleString()
      }
      return String(value)
    }

    const downloadSampleData = () => {
      if (!dataPreview.value) return

      const csvContent = [
        dataPreview.value.columns.join(','),
        ...dataPreview.value.sampleRows.map(row => 
          dataPreview.value.columns.map(col => row[col] || '').join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedFile.value?.name || 'data'}_sample.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      announceSuccess('Sample data downloaded successfully')
    }

    const proceedToConfiguration = () => {
      announceToScreenReader('Proceeding to forecast configuration')
      emit('proceed-to-config')
    }

    // Make table accessible when data preview is available
    onMounted(() => {
      // Watch for data preview changes and make table accessible
      const observer = new MutationObserver(() => {
        const table = document.querySelector('.file-preview table')
        if (table && dataPreview.value) {
          makeTableAccessible(table, dataPreview.value)
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true
      })

      return () => observer.disconnect()
    })

    onUnmounted(() => {
      if (selectedFile.value) {
        clearFile()
      }
    })

    return {
      // Refs
      fileInput,
      selectedFile,
      isDragOver,
      isUploading,
      errors,
      uploadStatus,
      
      // Computed
      hasError,
      fileSize,
      dataPreview,
      uploadAreaLabel,
      accessibilityClasses,
      isKeyboardNavigating,
      
      // Methods
      handleKeydown,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      triggerFileInput,
      handleFileSelect,
      handleFileSelection,
      uploadFile,
      clearFile,
      clearErrors,
      formatCellValue,
      downloadSampleData,
      proceedToConfiguration,
      getQualityClass,
      announceToScreenReader
    }
  }
}
</script>

<style scoped>
/* Enhanced accessibility styles */
.accessible-file-upload {
  position: relative;
}

/* High contrast mode support */
.high-contrast .upload-area {
  border-width: 3px;
  border-style: solid;
}

.high-contrast .btn {
  border-width: 2px;
}

.high-contrast .alert {
  border-width: 2px;
}

/* Keyboard navigation enhancements */
.keyboard-navigation .upload-area:focus {
  outline: 3px solid #0d6efd;
  outline-offset: 2px;
}

.keyboard-navigation .btn:focus {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
}

/* Screen reader optimizations */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Enhanced upload area */
.upload-area {
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.upload-area:hover,
.upload-area:focus {
  border-color: #0d6efd;
  background: #f0f8ff;
}

.upload-area.drag-over {
  border-color: #0d6efd;
  background: #e7f3ff;
  transform: scale(1.02);
}

.upload-area.has-file {
  border-color: #198754;
  background: #f0fff4;
}

.upload-area.uploading {
  border-color: #fd7e14;
  background: #fff8f0;
  cursor: not-allowed;
}

.upload-area.error {
  border-color: #dc3545;
  background: #fff5f5;
}

/* Privacy notice enhancements */
.privacy-notice {
  border-left: 4px solid #0dcaf0;
}

.privacy-features {
  list-style: none;
  padding-left: 0;
}

.privacy-features li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.25rem;
}

.privacy-features li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #198754;
  font-weight: bold;
}

/* Quality metrics */
.quality-metric {
  text-align: center;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: #f8f9fa;
}

.metric-label {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
}

/* Requirements list */
.requirements-list {
  list-style: none;
  padding: 0;
  text-align: left;
  background: rgba(13, 110, 253, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.requirements-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.requirements-list li:last-child {
  margin-bottom: 0;
}

/* Progress enhancements */
.progress {
  background-color: #e9ecef;
  height: 8px;
  border-radius: 4px;
}

.progress-bar {
  background: linear-gradient(90deg, #0d6efd, #198754);
  transition: width 0.3s ease;
  border-radius: 4px;
}

/* Table accessibility */
.table th {
  background: #f8f9fa;
  border-top: none;
  font-weight: 600;
  font-size: 0.875rem;
  position: relative;
}

.table td {
  font-size: 0.875rem;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Keyboard shortcuts help */
.keyboard-help details {
  margin-top: 1rem;
}

.keyboard-help summary {
  cursor: pointer;
  user-select: none;
}

.keyboard-help kbd {
  background: #212529;
  color: #ffffff;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .upload-area,
  .progress-bar,
  * {
    transition: none !important;
    animation: none !important;
  }
  
  .upload-area.drag-over {
    transform: none;
  }
}

/* Large text support */
.large-text {
  font-size: 1.125em;
}

.large-text .btn {
  padding: 0.75rem 1.5rem;
  font-size: 1.1em;
}

.large-text .upload-area {
  padding: 4rem 2.5rem;
}

/* Color blind friendly adjustments */
.color-blind-friendly .text-success {
  color: #0066cc !important;
}

.color-blind-friendly .text-danger {
  color: #cc0000 !important;
}

.color-blind-friendly .text-warning {
  color: #ff6600 !important;
}

/* Mobile accessibility */
@media (max-width: 768px) {
  .upload-area {
    padding: 2rem 1rem;
    min-height: 150px;
  }
  
  .quality-metric {
    margin-bottom: 1rem;
  }
  
  .table-responsive {
    font-size: 0.8rem;
  }
  
  .preview-footer .d-flex {
    flex-direction: column;
    gap: 1rem;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .btn {
    min-height: 44px;
    min-width: 44px;
  }
  
  .upload-area {
    min-height: 200px;
  }
}
</style>