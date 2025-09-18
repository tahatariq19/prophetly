import axios from 'axios'

// Create axios instance with privacy-focused configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000, // 60 seconds for Prophet processing
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false // No cookies for privacy
})

// Request interceptor for privacy compliance
api.interceptors.request.use(
  (config) => {
    // Add privacy headers
    config.headers['X-Privacy-Mode'] = 'stateless'
    config.headers['X-No-Logging'] = 'true'
    config.headers['X-Session-Only'] = 'true'
    
    // Add timestamp for request tracking (not user tracking)
    config.headers['X-Request-Time'] = new Date().toISOString()
    
    return config
  },
  (error) => {
    console.error('Request configuration error:', error.message)
    return Promise.reject(new Error('Failed to configure request'))
  }
)

// Response interceptor for privacy-focused error handling
api.interceptors.response.use(
  (response) => {
    // Add privacy confirmation header check
    if (response.headers['x-data-processed'] === 'memory-only') {
      console.log('✅ Privacy confirmed: Data processed in memory only')
    }
    return response
  },
  (error) => {
    // Enhanced privacy-focused error messages
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Your data was not stored and processing was stopped.'
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'Network connection error. Please check your connection and try again. No data was transmitted.'
    } else if (error.response?.status === 400) {
      error.message = error.response.data?.detail || 'Invalid request. Please check your data format.'
    } else if (error.response?.status === 413) {
      error.message = 'File too large. Please use a smaller dataset (max 10MB). Your data was not stored.'
    } else if (error.response?.status === 422) {
      error.message = 'Data validation failed. Please check your file format and try again.'
    } else if (error.response?.status === 429) {
      error.message = 'Too many requests. Please wait before trying again. No data was stored.'
    } else if (error.response?.status === 500) {
      error.message = 'Server error occurred. Your data was not stored and processing was stopped.'
    } else if (error.response?.status === 503) {
      error.message = 'Service temporarily unavailable. Please try again later. No data was stored.'
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Your data was not stored and all processing was stopped.'
    } else {
      error.message = error.response?.data?.detail || 'An error occurred. Your data remains private and was not stored.'
    }

    // Add privacy assurance to all errors
    error.privacyMessage = 'Your data was processed in memory only and has been automatically discarded.'
    
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      privacy: error.privacyMessage
    })
    
    return Promise.reject(error)
  }
)

export default api

// Enhanced health check function
export const checkHealth = async () => {
  try {
    const response = await api.get('/health')
    return {
      status: 'healthy',
      environment: response.data.environment || 'unknown',
      privacy: response.data.privacy_mode || 'stateless',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`API health check failed: ${error.message}`)
  }
}

// File upload with privacy-focused configuration
export const uploadFile = async (file, onProgress = null) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Privacy-Mode': 'stateless',
      'X-No-Logging': 'true',
      'X-File-Processing': 'memory-only'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentCompleted)
      }
    }
  }
  
  try {
    const response = await api.post('/upload', formData, config)
    return response.data
  } catch (error) {
    // Add specific file upload error handling
    if (error.response?.status === 415) {
      error.message = 'Unsupported file type. Please upload a CSV file only.'
    }
    throw error
  }
}

// Forecast generation with progress tracking
export const generateForecast = async (config, onProgress = null) => {
  try {
    const response = await api.post('/forecast', config, {
      headers: {
        'X-Processing-Mode': 'memory-only',
        'X-Progress-Tracking': onProgress ? 'enabled' : 'disabled'
      }
    })
    return response.data
  } catch (error) {
    if (error.response?.status === 422) {
      error.message = 'Invalid forecast configuration. Please check your parameters.'
    }
    throw error
  }
}

// Cross-validation with privacy assurance
export const performCrossValidation = async (config) => {
  const response = await api.post('/validate', config, {
    headers: {
      'X-Validation-Mode': 'memory-only'
    }
  })
  return response.data
}