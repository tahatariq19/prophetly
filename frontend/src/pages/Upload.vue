<template>
  <div class="upload-page">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="page-header mb-4">
            <h1 class="display-6 fw-bold">Upload Your Data</h1>
            <p class="lead text-muted">Upload your time series data to get started with forecasting</p>
          </div>
          
          <!-- File Upload Component -->
          <FileUpload 
            @file-uploaded="handleFileUploaded"
            @upload-error="handleUploadError"
            @proceed-to-config="handleProceedToConfig"
          />
          
          <!-- Additional Help Section -->
          <div class="help-section mt-5">
            <div class="row">
              <div class="col-md-4">
                <div class="help-card">
                  <div class="help-icon">
                    <i class="bi bi-file-earmark-spreadsheet text-primary"></i>
                  </div>
                  <h6>CSV Format</h6>
                  <p class="small text-muted">
                    Upload CSV files with date and value columns. Common formats include sales data, website traffic, or any time-based metrics.
                  </p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="help-card">
                  <div class="help-icon">
                    <i class="bi bi-calendar-date text-success"></i>
                  </div>
                  <h6>Date Column</h6>
                  <p class="small text-muted">
                    Your data should include a date column (ds, date, timestamp) with consistent date formatting like YYYY-MM-DD.
                  </p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="help-card">
                  <div class="help-icon">
                    <i class="bi bi-graph-up text-info"></i>
                  </div>
                  <h6>Value Column</h6>
                  <p class="small text-muted">
                    Include a numeric value column (y, value, sales) representing the metric you want to forecast.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Sample Data Section -->
          <div class="sample-data-section mt-4">
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="bi bi-lightbulb me-2"></i>
                  Need Sample Data?
                </h6>
              </div>
              <div class="card-body">
                <p class="mb-3">Try our sample datasets to explore Prophet forecasting:</p>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-outline-primary btn-sm" @click="downloadSampleData('sales')">
                    <i class="bi bi-download me-1"></i>
                    E-commerce Sales
                  </button>
                  <button class="btn btn-outline-primary btn-sm" @click="downloadSampleData('traffic')">
                    <i class="bi bi-download me-1"></i>
                    Website Traffic
                  </button>
                  <button class="btn btn-outline-primary btn-sm" @click="downloadSampleData('financial')">
                    <i class="bi bi-download me-1"></i>
                    Financial Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import FileUpload from '@/components/FileUpload.vue'

export default {
  name: 'Upload',
  components: {
    FileUpload
  },
  setup() {
    const router = useRouter()
    const sessionStore = useSessionStore()
    
    const uploadStatus = ref(null)
    const uploadError = ref(null)

    const handleFileUploaded = (uploadData) => {
      console.log('File uploaded successfully:', uploadData)
      uploadStatus.value = 'success'
      uploadError.value = null
      
      // Show success notification
      // This could be enhanced with a toast notification system
    }

    const handleUploadError = (error) => {
      console.error('Upload error:', error)
      uploadError.value = error
      uploadStatus.value = 'error'
    }

    const handleProceedToConfig = () => {
      // Navigate to configuration page
      router.push('/configure')
    }

    const downloadSampleData = (type) => {
      // Generate sample data based on type
      let sampleData = []
      const startDate = new Date('2023-01-01')
      
      switch (type) {
        case 'sales':
          sampleData = generateSalesData(startDate)
          break
        case 'traffic':
          sampleData = generateTrafficData(startDate)
          break
        case 'financial':
          sampleData = generateFinancialData(startDate)
          break
      }

      // Convert to CSV and download
      const csvContent = [
        'ds,y',
        ...sampleData.map(row => `${row.ds},${row.y}`)
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sample_${type}_data.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const generateSalesData = (startDate) => {
      const data = []
      for (let i = 0; i < 365; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Generate realistic sales data with trend and seasonality
        const trend = 1000 + (i * 2)
        const seasonal = 200 * Math.sin((i / 365) * 2 * Math.PI)
        const weekly = 100 * Math.sin((i / 7) * 2 * Math.PI)
        const noise = (Math.random() - 0.5) * 100
        
        const value = Math.max(0, trend + seasonal + weekly + noise)
        
        data.push({
          ds: date.toISOString().split('T')[0],
          y: Math.round(value)
        })
      }
      return data
    }

    const generateTrafficData = (startDate) => {
      const data = []
      for (let i = 0; i < 365; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Generate realistic traffic data
        const trend = 5000 + (i * 10)
        const seasonal = 1000 * Math.sin((i / 365) * 2 * Math.PI)
        const weekly = 500 * Math.sin((i / 7) * 2 * Math.PI)
        const noise = (Math.random() - 0.5) * 200
        
        const value = Math.max(0, trend + seasonal + weekly + noise)
        
        data.push({
          ds: date.toISOString().split('T')[0],
          y: Math.round(value)
        })
      }
      return data
    }

    const generateFinancialData = (startDate) => {
      const data = []
      let price = 100
      
      for (let i = 0; i < 365; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Generate realistic financial data with random walk
        const change = (Math.random() - 0.5) * 2
        price = Math.max(10, price + change)
        
        data.push({
          ds: date.toISOString().split('T')[0],
          y: Math.round(price * 100) / 100
        })
      }
      return data
    }

    return {
      uploadStatus,
      uploadError,
      handleFileUploaded,
      handleUploadError,
      handleProceedToConfig,
      downloadSampleData
    }
  }
}
</script>

<style scoped>
.upload-page {
  padding: 2rem 0;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.help-section {
  margin-top: 3rem;
}

.help-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 12px;
  background: #f8f9fa;
  height: 100%;
  transition: transform 0.2s ease;
}

.help-card:hover {
  transform: translateY(-2px);
  background: #e9ecef;
}

.help-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.help-card h6 {
  color: #495057;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.sample-data-section {
  margin-top: 2rem;
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

.btn {
  border-radius: 6px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .upload-page {
    padding: 1rem 0;
  }
  
  .help-card {
    margin-bottom: 1rem;
  }
  
  .d-flex.flex-wrap {
    justify-content: center;
  }
}
</style>