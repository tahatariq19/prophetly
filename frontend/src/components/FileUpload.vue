<template>
  <div class="file-upload-component">
    <!-- Privacy Notice -->
    <div class="alert alert-info mb-4">
      <div class="d-flex align-items-start">
        <i class="bi bi-shield-lock-fill me-2 mt-1"></i>
        <div>
          <strong>🔒 Privacy Guarantee:</strong>
          <p class="mb-1">Your data will be processed entirely in server memory and automatically discarded after your session.</p>
          <small class="text-muted">
            • No data is ever saved to disk or databases<br>
            • Processing happens in volatile memory only<br>
            • All data is immediately destroyed when you close the browser or after 2 hours of inactivity
          </small>
        </div>
      </div>
    </div>

    <!-- Upload Area -->
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
        <i class="bi bi-cloud-upload display-1 text-primary mb-3"></i>
        <h5>Drop your CSV file here</h5>
        <p class="text-muted mb-3">or click to browse files</p>
        <div class="upload-requirements">
          <small class="text-muted">
            <i class="bi bi-check-circle text-success"></i> CSV format only<br>
            <i class="bi bi-check-circle text-success"></i> Maximum 10MB<br>
            <i class="bi bi-check-circle text-success"></i> Must contain date and value columns
          </small>
        </div>
      </div>

      <div v-else-if="selectedFile && !isUploading" class="file-selected">
        <i class="bi bi-file-earmark-text display-4 text-success mb-2"></i>
        <h6>{{ selectedFile.name }}</h6>
        <p class="text-muted mb-2">{{ fileSize }} • Ready to upload</p>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-primary" @click="uploadFile" :disabled="isUploading">
            <i class="bi bi-upload me-1"></i>
            Process File
          </button>
          <button class="btn btn-outline-secondary" @click="clearFile">
            <i class="bi bi-x-lg me-1"></i>
            Remove
          </button>
        </div>
      </div>

      <div v-else-if="isUploading" class="uploading-state">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Processing...</span>
        </div>
        <h6>{{ uploadStatus.stage }}</h6>
        <div class="progress mb-2" style="height: 8px;">
          <div 
            class="progress-bar" 
            :style="{ width: uploadStatus.progress + '%' }"
            role="progressbar"
          ></div>
        </div>
        <p class="text-muted small">{{ uploadStatus.message }}</p>
        <div class="privacy-reminder mt-2">
          <small class="text-info">
            <i class="bi bi-shield-check me-1"></i>
            Processing in memory only - no data stored
          </small>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="hasError" class="alert alert-danger mt-3">
      <div class="d-flex align-items-start">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <div>
          <strong>Upload Error:</strong>
          <ul class="mb-1 mt-1">
            <li v-for="error in errors" :key="error">{{ error }}</li>
          </ul>
          <small class="text-muted">
            Your data was not transmitted and remains private on your device.
          </small>
        </div>
      </div>
    </div>

    <!-- File Preview -->
    <div v-if="dataPreview && !isUploading" class="file-preview mt-4">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-table me-2"></i>
            Data Preview (Session Only)
          </h6>
          <div class="d-flex align-items-center gap-3">
            <small class="text-muted">
              {{ dataPreview.totalRows }} rows • {{ dataPreview.columns.length }} columns
            </small>
            <div class="privacy-indicator">
              <i class="bi bi-shield-lock text-success" title="Data in memory only"></i>
            </div>
          </div>
        </div>
        <div class="card-body">
          <!-- Data Quality Summary -->
          <div class="data-quality mb-3">
            <div class="row g-2">
              <div class="col-md-3">
                <div class="quality-metric">
                  <small class="text-muted">Completeness</small>
                  <div class="fw-bold">{{ dataPreview.stats.completeness }}%</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="quality-metric">
                  <small class="text-muted">Date Column</small>
                  <div class="fw-bold text-success" v-if="dataPreview.columnMapping.dateColumn">
                    {{ dataPreview.columnMapping.dateColumn }}
                  </div>
                  <div class="fw-bold text-warning" v-else>Not detected</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="quality-metric">
                  <small class="text-muted">Value Column</small>
                  <div class="fw-bold text-success" v-if="dataPreview.columnMapping.valueColumn">
                    {{ dataPreview.columnMapping.valueColumn }}
                  </div>
                  <div class="fw-bold text-warning" v-else>Not detected</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="quality-metric">
                  <small class="text-muted">Missing Values</small>
                  <div class="fw-bold" :class="dataPreview.stats.missingValues > 0 ? 'text-warning' : 'text-success'">
                    {{ dataPreview.stats.missingValues }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Table Preview -->
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th v-for="column in dataPreview.columns" :key="column" class="text-nowrap">
                    {{ column }}
                    <span v-if="column === dataPreview.columnMapping.dateColumn" class="badge bg-primary ms-1">Date</span>
                    <span v-if="column === dataPreview.columnMapping.valueColumn" class="badge bg-success ms-1">Value</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in dataPreview.sampleRows" :key="index">
                  <td v-for="column in dataPreview.columns" :key="column" class="text-nowrap">
                    {{ formatCellValue(row[column]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Preview Footer -->
          <div class="preview-footer mt-3 pt-3 border-top">
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                Showing first {{ Math.min(5, dataPreview.totalRows) }} rows of {{ dataPreview.totalRows }} total
              </small>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-primary btn-sm" @click="downloadSampleData">
                  <i class="bi bi-download me-1"></i>
                  Download Sample
                </button>
                <button class="btn btn-primary btn-sm" @click="proceedToConfiguration">
                  <i class="bi bi-arrow-right me-1"></i>
                  Configure Forecast
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Data Notice -->
    <div v-if="dataPreview" class="alert alert-warning mt-3">
      <div class="d-flex align-items-start">
        <i class="bi bi-clock me-2"></i>
        <div>
          <strong>Session Data Notice:</strong>
          <p class="mb-1">Your data is temporarily stored in browser memory for this session only.</p>
          <small class="text-muted">
            To continue your work later, download your processed data and configuration files before closing the browser.
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { uploadFile as apiUploadFile } from '@/services/api'
import { fileValidation, dataValidation } from '@/utils/validation'

export default {
  name: 'FileUpload',
  emits: ['file-uploaded', 'upload-error', 'proceed-to-config'],
  setup(props, { emit }) {
    const sessionStore = useSessionStore()
    
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

    // Drag and drop handlers
    const handleDragOver = (e) => {
      e.preventDefault()
      isDragOver.value = true
    }

    const handleDragEnter = (e) => {
      e.preventDefault()
      isDragOver.value = true
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      // Only set to false if we're leaving the upload area entirely
      if (!e.currentTarget.contains(e.relatedTarget)) {
        isDragOver.value = false
      }
    }

    const handleDrop = (e) => {
      e.preventDefault()
      isDragOver.value = false
      
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelection(files[0])
      }
    }

    // File selection handlers
    const triggerFileInput = () => {
      if (!isUploading.value) {
        fileInput.value?.click()
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
      
      // Validate file
      const validation = fileValidation.validateFile(file)
      if (!validation.isValid) {
        errors.value = validation.errors
        return
      }

      selectedFile.value = file
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
            stage: 'Uploading file...',
            progress: Math.min(progress, 90), // Reserve 10% for processing
            message: `${progress}% uploaded`
          }
        }

        // Start upload
        uploadStatus.value = {
          stage: 'Preparing upload...',
          progress: 0,
          message: 'Validating file and preparing secure transmission'
        }

        const response = await apiUploadFile(selectedFile.value, onProgress)

        // Processing stage
        uploadStatus.value = {
          stage: 'Processing data...',
          progress: 95,
          message: 'Parsing CSV and analyzing data quality'
        }

        // Simulate processing time for user feedback
        await new Promise(resolve => setTimeout(resolve, 500))

        // Complete upload
        uploadStatus.value = {
          stage: 'Complete',
          progress: 100,
          message: 'Data processed successfully'
        }

        // Store data in session
        sessionStore.setUploadedData(response.data, response.preview)

        // Emit success event
        emit('file-uploaded', {
          file: selectedFile.value,
          data: response.data,
          preview: response.preview
        })

      } catch (error) {
        console.error('Upload error:', error)
        errors.value = [error.message || 'Upload failed. Please try again.']
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
    }

    const proceedToConfiguration = () => {
      emit('proceed-to-config')
    }

    // Cleanup on unmount
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
      
      // Methods
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      triggerFileInput,
      handleFileSelect,
      handleFileSelection,
      uploadFile,
      clearFile,
      formatCellValue,
      downloadSampleData,
      proceedToConfiguration
    }
  }
}
</script>

<style scoped>
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
}

.upload-area:hover {
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

.upload-prompt i {
  opacity: 0.7;
}

.upload-requirements {
  background: rgba(13, 110, 253, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.file-selected, .uploading-state {
  width: 100%;
}

.progress {
  background-color: #e9ecef;
}

.progress-bar {
  background: linear-gradient(90deg, #0d6efd, #198754);
  transition: width 0.3s ease;
}

.data-quality {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.quality-metric {
  text-align: center;
  padding: 0.5rem;
}

.quality-metric small {
  display: block;
  margin-bottom: 0.25rem;
}

.table th {
  background: #f8f9fa;
  border-top: none;
  font-weight: 600;
  font-size: 0.875rem;
}

.table td {
  font-size: 0.875rem;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-footer {
  background: #f8f9fa;
  margin: -1rem -1rem -1rem -1rem;
  padding: 1rem;
  border-radius: 0 0 8px 8px;
}

.privacy-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.privacy-reminder {
  background: rgba(13, 202, 240, 0.1);
  border-radius: 6px;
  padding: 0.5rem;
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
  .upload-area {
    padding: 2rem 1rem;
    min-height: 150px;
  }
  
  .data-quality .row {
    text-align: center;
  }
  
  .table-responsive {
    font-size: 0.8rem;
  }
  
  .preview-footer .d-flex {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>