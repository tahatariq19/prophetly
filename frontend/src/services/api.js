import axios from 'axios'

// Create axios instance with privacy-focused configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds for Prophet processing
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor for privacy compliance
api.interceptors.request.use(
  (config) => {
    // Add privacy headers
    config.headers['X-Privacy-Mode'] = 'stateless'
    config.headers['X-No-Logging'] = 'true'
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle privacy-focused error messages
    if (error.response?.status === 413) {
      error.message = 'File too large. Please use a smaller dataset.'
    } else if (error.response?.status === 429) {
      error.message = 'Too many requests. Please wait before trying again.'
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Your data was not stored and processing was stopped.'
    }
    return Promise.reject(error)
  }
)

export default api

// Health check function
export const checkHealth = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    throw new Error('API health check failed')
  }
}