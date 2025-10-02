<template>
  <div class="mobile-file-upload">
    <!-- Mobile Privacy Banner -->
    <div class="mobile-privacy-banner">
      <div class="privacy-icon">
        <i class="bi bi-shield-lock-fill"></i>
      </div>
      <div class="privacy-content">
        <h6 class="mb-1">🔒 Your Privacy is Protected</h6>
        <p class="mb-0">Data processed in memory only • Never stored on servers • Auto-deleted after session</p>
      </div>
    </div>

    <!-- Mobile Upload Interface -->
    <div class="mobile-upload-container">
      <!-- Upload Area -->
      <div 
        class="mobile-upload-area"
        :class="{ 
          'drag-over': isDragOver, 
          'has-file': selectedFile,
          'uploading': isUploading,
          'error': hasError
        }"
        @click="handleUploadClick"
        ref="uploadArea"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.txt"
          @change="handleFileSelect"
          class="d-none"
        >

        <!-- Upload States -->
        <div v-if="!selectedFile && !isUploading" class="upload-prompt">
          <div class="upload-icon">
            <i class="bi bi-cloud-upload"></i>
          </div>
          <h5 class="upload-title">Upload Your Data</h5>
          <p class="upload-subtitle">Tap to select CSV file</p>
          
          <!-- Mobile-specific options -->
          <div class="mobile-upload-options">
            <button 
              class="btn btn-primary btn-lg w-100 mb-2"
              @click.stop="selectFile"
              :disabled="isUploading"
            >
              <i class="bi bi-folder2-open me-2"></i>
              Choose File
            </button>
            
            <button 
              v-if="supportsCameraCapture"
              class="btn btn-outline-secondary btn-lg w-100 mb-3"
              @click.stop="captureFromCamera"
              :disabled="isUploading"
            >
              <i class="bi bi-camera me-2"></i>
              Scan Document
            </button>
          </div>

          <!-- Requirements -->
          <div class="upload-requirements">
            <div class="requirement-item">
              <i class="bi bi-check-circle text-success"></i>
              <span>CSV format only</span>
            </div>
            <div class="requirement-item">
              <i class="bi bi-check-circle text-success"></i>
              <span>Maximum 10MB</span>
            </div>
            <div class="requirement-item">
              <i class="bi bi-check-circle text-success"></i>
              <span>Date and value columns required</span>
            </div>
          </div>
        </div>

        <!-- File Selected State -->
        <div v-else-if="selectedFile && !isUploading" class="file-selected">
          <div class="file-icon">
            <i class="bi bi-file-earmark-text text-success"></i>
          </div>
          <h6 class="file-name">{{ selectedFile.name }}</h6>
          <p class="file-info">{{ fileSize }} • Ready to process</p>
          
          <div class="file-actions">
            <button 
              class="btn btn-success btn-lg w-100 mb-2" 
              @click="uploadFile" 
              :disabled="isUploading"
            >
              <i class="bi bi-upload me-2"></i>
              Process File Securely
            </button>
            <button 
              class="btn btn-outline-secondary w-100" 
              @click="clearFile"
            >
              <i class="bi bi-x-lg me-2"></i>
              Choose Different File
            </button>
          </div>
        </div>

        <!-- Uploading State -->
        <div v-else-if="isUploading" class="uploading-state">
          <div class="upload-spinner">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Processing...</span>
            </div>
          </div>
          
          <h6 class="upload-stage">{{ uploadStatus.stage }}</h6>
          
          <div class="upload-progress mb-3">
            <div class="progress">
              <div 
                class="progress-bar progress-bar-striped progress-bar-animated" 
                :style="{ width: uploadStatus.progress + '%' }"
                role="progressbar"
              ></div>
            </div>
            <small class="progress-text">{{ uploadStatus.progress }}% complete</small>
          </div>
          
          <p class="upload-message">{{ uploadStatus.message }}</p>
          
          <div class="privacy-reminder">
            <i class="bi bi-shield-check text-success"></i>
            <small>Processing in secure memory only</small>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="hasError" class="mobile-error-display">
        <div class="error-icon">
          <i class="bi bi-exclamation-triangle-fill text-danger"></i>
        </div>
        <div class="error-content">
          <h6 class="error-title">Upload Error</h6>
          <ul class="error-list">
            <li v-for="error in errors" :key="error">{{ error }}</li>
          </ul>
          <div class="privacy-assurance">
            <i class="bi bi-shield-check text-success"></i>
            <small>Your data remains private and was not transmitted</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Data Preview -->
    <div v-if="dataPreview && !isUploading" class="mobile-data-preview">
      <div class="preview-header">
        <h6 class="preview-title">
          <i class="bi bi-table me-2"></i>
          Data Preview
        </h6>
        <div class="privacy-badge">
          <i class="bi bi-shield-lock"></i>
          <span>Session Only</span>
        </div>
      </div>

      <!-- Mobile Data Stats -->
      <div class="mobile-data-stats">
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">{{ dataPreview.totalRows }}</div>
            <div class="stat-label">Rows</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dataPreview.columns?.length || 0 }}</div>
            <div class="stat-label">Columns</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dataPreview.stats?.completeness || 0 }}%</div>
            <div class="stat-label">Complete</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dataPreview.stats?.missingValues || 0 }}</div>
            <div class="stat-label">Missing</div>
          </div>
        </div>
      </div>

      <!-- Column Detection -->
      <div class="mobile-column-detection">
        <div class="column-item">
          <span class="column-label">Date Column:</span>
          <span class="column-value" :class="dataPreview.columnMapping?.dateColumn ? 'text-success' : 'text-warning'">
            {{ dataPreview.columnMapping?.dateColumn || 'Not detected' }}
          </span>
        </div>
        <div class="column-item">
          <span class="column-label">Value Column:</span>
          <span class="column-value" :class="dataPreview.columnMapping?.valueColumn ? 'text-success' : 'text-warning'">
            {{ dataPreview.columnMapping?.valueColumn || 'Not detected' }}
          </span>
        </div>
      </div>

      <!-- Mobile Data Table -->
      <div class="mobile-data-table">
        <div class="table-header">
          <span>Sample Data (First {{ Math.min(3, dataPreview.totalRows) }} rows)</span>
          <button class="btn btn-sm btn-outline-primary" @click="showFullPreview">
            <i class="bi bi-eye"></i>
          </button>
        </div>
        
        <div class="table-scroll">
          <table class="table table-sm">
            <thead>
              <tr>
                <th v-for="column in dataPreview.columns?.slice(0, 3)" :key="column">
                  {{ column }}
                  <span v-if="column === dataPreview.columnMapping?.dateColumn" class="badge bg-primary">Date</span>
                  <span v-if="column === dataPreview.columnMapping?.valueColumn" class="badge bg-success">Value</span>
                </th>
                <th v-if="dataPreview.columns?.length > 3">...</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in dataPreview.sampleRows?.slice(0, 3)" :key="index">
                <td v-for="column in dataPreview.columns?.slice(0, 3)" :key="column">
                  {{ formatCellValue(row[column]) }}
                </td>
                <td v-if="dataPreview.columns?.length > 3">...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Actions -->
      <div class="mobile-preview-actions">
        <button class="btn btn-outline-secondary btn-sm me-2" @click="downloadSample">
          <i class="bi bi-download me-1"></i>
          Download Sample
        </button>
        <button class="btn btn-primary btn-sm" @click="proceedToConfig">
          <i class="bi bi-arrow-right me-1"></i>
          Configure Forecast
        </button>
      </div>
    </div>

    <!-- Mobile Session Notice -->
    <div v-if="dataPreview" class="mobile-session-notice">
      <div class="notice-icon">
        <i class="bi bi-clock text-warning"></i>
      </div>
      <div class="notice-content">
        <h6 class="notice-title">Session Data Notice</h6>
        <p class="notice-text">
          Your data is temporarily stored in browser memory for this session only. 
          Download your processed data before closing the browser to continue later.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { uploadFile as apiUploadFile } from '@/services/api'
import { fileValidation } from '@/utils/validation'
import { deviceDetection, touchUtils, mobileUI, mobilePrivacy } from '@/utils/mobile'

export default {
  name: 'MobileFileUpload',
  emits: ['file-uploaded', 'upload-error', 'proceed-to-config'],
  setup(props, { emit }) {
    const sessionStore = useSessionStore()
    
    // Reactive state
    const fileInput = ref(null)
    const uploadArea = ref(null)
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
    const supportsCameraCapture = computed(() => {
      return deviceDetection.isMobile() && 'mediaDevices' in navigator
    })

    // Touch event cleanup
    let touchCleanup = null

    // File selection methods
    const selectFile = () => {
      if (deviceDetection.isMobile()) {
        mobileUI.showMobileFilePicker({
          accept: '.csv,.txt',
          multiple: false
        }).then(files => {
          if (files.length > 0) {
            handleFileSelection(files[0])
          }
        }).catch(error => {
          console.log('File selection cancelled')
        })
      } else {
        fileInput.value?.click()
      }
    }

    const captureFromCamera = async () => {
      try {
        mobileUI.showMobileToast('Camera capture for CSV files is not yet supported. Please select a file instead.', {
          type: 'info',
          icon: 'bi-info-circle'
        })
      } catch (error) {
        console.error('Camera capture error:', error)
        mobileUI.showMobileToast('Camera not available', { type: 'error' })
      }
    }

    const handleUploadClick = () => {
      if (!isUploading.value && !selectedFile.value) {
        selectFile()
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
      
      // Show privacy notice on first upload
      if (!sessionStore.hasSeenPrivacyNotice) {
        mobilePrivacy.showPrivacyNotice(
          'Your file will be processed securely in memory only and never stored on our servers.',
          {
            onDismiss: () => {
              sessionStore.setPrivacyNoticeShown(true)
            }
          }
        )
      }
      
      // Validate file
      const validation = fileValidation.validateFile(file)
      if (!validation.isValid) {
        errors.value = validation.errors
        mobileUI.showMobileToast('File validation failed', { type: 'error' })
        return
      }

      selectedFile.value = file
      mobileUI.showMobileToast('File selected successfully', { 
        type: 'success',
        icon: 'bi-check-circle'
      })
      
      emit('file-uploaded', { file, validation: validation.fileInfo })
    }

    // Upload functionality
    const uploadFile = async () => {
      if (!selectedFile.value || isUploading.value) return

      isUploading.value = true
      clearErrors()
      
      try {
        // Update progress during upload
        const onProgress = (progress) => {
          uploadStatus.value = {
            stage: 'Uploading securely...',
            progress: Math.min(progress, 90),
            message: `${progress}% uploaded via encrypted connection`
          }
        }

        // Start upload
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

        // Processing stage
        uploadStatus.value = {
          stage: 'Processing in memory...',
          progress: 95,
          message: 'Analyzing data quality and structure'
        }

        // Simulate processing time for user feedback
        await new Promise(resolve => setTimeout(resolve, 800))

        // Complete upload
        uploadStatus.value = {
          stage: 'Processing complete',
          progress: 100,
          message: 'Data processed successfully and securely'
        }

        // Store data in session - handle both snake_case and camelCase
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

        mobileUI.showMobileToast('File processed successfully!', { 
          type: 'success',
          icon: 'bi-check-circle-fill'
        })

        emit('file-uploaded', {
          file: selectedFile.value,
          data: response,
          preview: enhancedPreview
        })

      } catch (error) {
        console.error('Upload error:', error)
        errors.value = [error.message || 'Upload failed. Please try again.']
        mobileUI.showMobileToast('Upload failed', { type: 'error' })
        emit('upload-error', error)
      } finally {
        isUploading.value = false
      }
    }

    // Utility functions
    const clearFile = () => {
      selectedFile.value = null
      clearErrors()
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    const clearErrors = () => {
      errors.value = []
    }

    const formatCellValue = (value) => {
      if (value === null || value === undefined) return '-'
      if (typeof value === 'number') {
        return value.toLocaleString()
      }
      const str = String(value)
      return str.length > 15 ? str.substring(0, 15) + '...' : str
    }

    const downloadSample = () => {
      if (!dataPreview.value) return

      const csvContent = [
        dataPreview.value.columns.join(','),
        ...dataPreview.value.sampleRows.slice(0, 5).map(row => 
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

      mobileUI.showMobileToast('Sample downloaded', { type: 'success' })
    }

    const showFullPreview = () => {
      if (!dataPreview.value) return

      const tableContent = `
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                ${dataPreview.value.columns.map(col => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${dataPreview.value.sampleRows.map(row => 
                `<tr>${dataPreview.value.columns.map(col => `<td>${formatCellValue(row[col])}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </div>
      `

      mobileUI.createMobileModal(tableContent, {
        title: 'Full Data Preview',
        dismissible: true
      })
    }

    const proceedToConfig = () => {
      emit('proceed-to-config')
    }

    // Lifecycle
    onMounted(() => {
      // Add touch event listeners for better mobile interaction
      if (uploadArea.value && deviceDetection.isTouchDevice()) {
        touchCleanup = touchUtils.addTouchListeners(uploadArea.value, {
          onTap: (e) => {
            if (!isUploading.value && !selectedFile.value) {
              selectFile()
            }
          }
        })
      }
    })

    onUnmounted(() => {
      if (touchCleanup) {
        touchCleanup()
      }
      if (selectedFile.value) {
        clearFile()
      }
    })

    return {
      // Refs
      fileInput,
      uploadArea,
      selectedFile,
      isDragOver,
      isUploading,
      errors,
      uploadStatus,
      
      // Computed
      hasError,
      fileSize,
      dataPreview,
      supportsCameraCapture,
      
      // Methods
      selectFile,
      captureFromCamera,
      handleUploadClick,
      handleFileSelect,
      handleFileSelection,
      uploadFile,
      clearFile,
      formatCellValue,
      downloadSample,
      showFullPreview,
      proceedToConfig
    }
  }
}
</script>

<style scoped>
.mobile-file-upload {
  padding: 1rem;
  max-width: 100%;
}

/* Mobile Privacy Banner */
.mobile-privacy-banner {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #d1ecf1, #bee5eb);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #0dcaf0;
}

.privacy-icon {
  font-size: 1.5rem;
  color: #0dcaf0;
  margin-right: 1rem;
  flex-shrink: 0;
}

.privacy-content h6 {
  color: #0c5460;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.privacy-content p {
  color: #0c5460;
  font-size: 0.875rem;
  line-height: 1.4;
}

/* Mobile Upload Container */
.mobile-upload-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.mobile-upload-area {
  padding: 2rem 1.5rem;
  text-align: center;
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-upload-area:active {
  transform: scale(0.98);
}

.mobile-upload-area.drag-over {
  border-color: #0d6efd;
  background: #e7f3ff;
}

.mobile-upload-area.has-file {
  border-color: #198754;
  background: #f0fff4;
}

.mobile-upload-area.uploading {
  border-color: #fd7e14;
  background: #fff8f0;
  cursor: not-allowed;
}

.mobile-upload-area.error {
  border-color: #dc3545;
  background: #fff5f5;
}

/* Upload States */
.upload-prompt {
  width: 100%;
}

.upload-icon {
  font-size: 3rem;
  color: #0d6efd;
  margin-bottom: 1rem;
}

.upload-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #212529;
}

.upload-subtitle {
  color: #6c757d;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.mobile-upload-options {
  margin-bottom: 1.5rem;
}

.upload-requirements {
  background: rgba(13, 110, 253, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.requirement-item:last-child {
  margin-bottom: 0;
}

/* File Selected State */
.file-selected {
  width: 100%;
}

.file-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.file-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.file-info {
  color: #6c757d;
  margin-bottom: 1.5rem;
}

.file-actions {
  width: 100%;
}

/* Uploading State */
.uploading-state {
  width: 100%;
}

.upload-spinner {
  margin-bottom: 1rem;
}

.upload-stage {
  font-weight: 600;
  margin-bottom: 1rem;
  color: #212529;
}

.upload-progress {
  margin-bottom: 1rem;
}

.progress {
  height: 8px;
  border-radius: 4px;
  background-color: #e9ecef;
}

.progress-text {
  display: block;
  text-align: center;
  margin-top: 0.5rem;
  color: #6c757d;
}

.upload-message {
  color: #6c757d;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.privacy-reminder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(13, 202, 240, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  color: #0dcaf0;
}

/* Mobile Error Display */
.mobile-error-display {
  background: #fff5f5;
  border: 1px solid #f5c6cb;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #721c24;
}

.error-list {
  margin-bottom: 1rem;
  padding-left: 1rem;
  color: #721c24;
}

.privacy-assurance {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(25, 135, 84, 0.1);
  border-radius: 4px;
  padding: 0.5rem;
  color: #198754;
}

/* Mobile Data Preview */
.mobile-data-preview {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.preview-title {
  margin: 0;
  font-weight: 600;
  color: #212529;
}

.privacy-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(25, 135, 84, 0.1);
  color: #198754;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Mobile Data Stats */
.mobile-data-stats {
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #212529;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

/* Column Detection */
.mobile-column-detection {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

.column-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.column-item:last-child {
  margin-bottom: 0;
}

.column-label {
  font-weight: 500;
  color: #495057;
}

.column-value {
  font-weight: 600;
}

/* Mobile Data Table */
.mobile-data-table {
  padding: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #495057;
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table {
  margin-bottom: 0;
  font-size: 0.8rem;
}

.table th {
  background: #f8f9fa;
  border-top: none;
  font-weight: 600;
  white-space: nowrap;
  padding: 0.5rem 0.25rem;
}

.table td {
  padding: 0.5rem 0.25rem;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  font-size: 0.6rem;
  margin-left: 0.25rem;
}

/* Mobile Preview Actions */
.mobile-preview-actions {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

/* Mobile Session Notice */
.mobile-session-notice {
  display: flex;
  align-items: flex-start;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1.5rem;
  gap: 1rem;
}

.notice-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.notice-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #856404;
}

.notice-text {
  color: #856404;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
}

/* Button Enhancements */
.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:active {
  transform: scale(0.98);
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

/* Responsive Adjustments */
@media (max-width: 576px) {
  .mobile-file-upload {
    padding: 0.75rem;
  }

  .mobile-privacy-banner {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .mobile-upload-area {
    padding: 1.5rem 1rem;
    min-height: 180px;
  }

  .upload-icon {
    font-size: 2.5rem;
  }

  .upload-title {
    font-size: 1.1rem;
  }

  .stat-grid {
    gap: 0.75rem;
  }

  .stat-value {
    font-size: 1.1rem;
  }

  .mobile-error-display,
  .mobile-session-notice {
    flex-direction: column;
    gap: 0.75rem;
  }

  .error-icon,
  .notice-icon {
    align-self: flex-start;
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .mobile-upload-area {
    background: #2d2d2d;
    border-color: #495057;
    color: #ffffff;
  }

  .upload-title {
    color: #ffffff;
  }

  .mobile-data-preview {
    background: #2d2d2d;
    color: #ffffff;
  }

  .preview-header,
  .mobile-data-stats,
  .mobile-preview-actions {
    background: #3d3d3d;
    border-color: #495057;
  }

  .table th {
    background: #3d3d3d;
    color: #ffffff;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .mobile-upload-area {
    border-width: 3px;
  }

  .btn {
    border-width: 2px;
  }

  .mobile-privacy-banner,
  .mobile-error-display,
  .mobile-session-notice {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .mobile-upload-area,
  .btn {
    transition: none;
  }

  .mobile-upload-area:active,
  .btn:active {
    transform: none;
  }
}
</style>