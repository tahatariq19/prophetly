// Privacy-aware error handling utilities
import { notificationService } from '../services/notifications'

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation', 
  PROPHET: 'prophet',
  FILE_UPLOAD: 'file_upload',
  SESSION: 'session',
  TIMEOUT: 'timeout',
  MEMORY: 'memory',
  UNKNOWN: 'unknown'
}

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

/**
 * Privacy-focused error categorizer
 */
export class ErrorCategorizer {
  static categorizeError(error) {
    const errorInfo = {
      type: ERROR_TYPES.UNKNOWN,
      severity: ERROR_SEVERITY.MEDIUM,
      userMessage: 'An unexpected error occurred. Your data remains private.',
      privacyMessage: 'Your data was processed in memory only and has been automatically discarded.',
      retryable: true,
      actions: []
    }

    // Network errors
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      errorInfo.type = ERROR_TYPES.NETWORK
      errorInfo.severity = ERROR_SEVERITY.MEDIUM
      errorInfo.userMessage = 'Network connection error. Please check your connection and try again.'
      errorInfo.privacyMessage = 'No data was transmitted due to connection failure.'
      errorInfo.actions = [
        { label: 'Retry', action: 'retry', variant: 'primary' },
        { label: 'Check Connection', action: 'check-connection', variant: 'outline-secondary' }
      ]
    }

    // Timeout errors
    else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorInfo.type = ERROR_TYPES.TIMEOUT
      errorInfo.severity = ERROR_SEVERITY.MEDIUM
      errorInfo.userMessage = 'Request timeout. The operation took too long to complete.'
      errorInfo.privacyMessage = 'Processing was stopped and your data was automatically cleared from memory.'
      errorInfo.actions = [
        { label: 'Retry with Smaller Dataset', action: 'retry-smaller', variant: 'primary' },
        { label: 'Adjust Configuration', action: 'adjust-config', variant: 'outline-secondary' }
      ]
    }

    // HTTP status code errors
    else if (error.response?.status) {
      const status = error.response.status
      
      if (status === 400) {
        errorInfo.type = ERROR_TYPES.VALIDATION
        errorInfo.severity = ERROR_SEVERITY.LOW
        errorInfo.userMessage = error.response.data?.detail || 'Invalid request. Please check your input.'
        errorInfo.actions = [
          { label: 'Review Input', action: 'review-input', variant: 'primary' }
        ]
      }
      
      else if (status === 413) {
        errorInfo.type = ERROR_TYPES.FILE_UPLOAD
        errorInfo.severity = ERROR_SEVERITY.MEDIUM
        errorInfo.userMessage = 'File too large. Please use a smaller dataset (max 10MB).'
        errorInfo.privacyMessage = 'Large file was rejected and not stored on our servers.'
        errorInfo.actions = [
          { label: 'Use Smaller File', action: 'smaller-file', variant: 'primary' },
          { label: 'Learn About Limits', action: 'learn-limits', variant: 'outline-info' }
        ]
      }
      
      else if (status === 422) {
        errorInfo.type = ERROR_TYPES.VALIDATION
        errorInfo.severity = ERROR_SEVERITY.LOW
        errorInfo.userMessage = 'Data validation failed. Please check your file format.'
        errorInfo.actions = [
          { label: 'Check Format', action: 'check-format', variant: 'primary' },
          { label: 'View Requirements', action: 'view-requirements', variant: 'outline-info' }
        ]
      }
      
      else if (status === 429) {
        errorInfo.type = ERROR_TYPES.NETWORK
        errorInfo.severity = ERROR_SEVERITY.MEDIUM
        errorInfo.userMessage = 'Too many requests. Please wait before trying again.'
        errorInfo.privacyMessage = 'Rate limiting protects privacy by preventing data accumulation.'
        errorInfo.retryable = true
        errorInfo.actions = [
          { label: 'Wait and Retry', action: 'wait-retry', variant: 'primary' }
        ]
      }
      
      else if (status >= 500) {
        errorInfo.type = ERROR_TYPES.UNKNOWN
        errorInfo.severity = ERROR_SEVERITY.HIGH
        errorInfo.userMessage = 'Server error occurred. Please try again later.'
        errorInfo.privacyMessage = 'Server error prevented data processing. No data was stored.'
        errorInfo.actions = [
          { label: 'Retry Later', action: 'retry-later', variant: 'primary' },
          { label: 'Report Issue', action: 'report-issue', variant: 'outline-secondary' }
        ]
      }
    }

    // Prophet-specific errors
    else if (error.message?.includes('Prophet') || error.message?.includes('forecast')) {
      errorInfo.type = ERROR_TYPES.PROPHET
      errorInfo.severity = ERROR_SEVERITY.MEDIUM
      errorInfo.userMessage = 'Forecasting error. Please check your data and configuration.'
      errorInfo.actions = [
        { label: 'Check Data Quality', action: 'check-data', variant: 'primary' },
        { label: 'Adjust Parameters', action: 'adjust-params', variant: 'outline-secondary' }
      ]
    }

    // Session errors
    else if (error.message?.includes('session') || error.message?.includes('expired')) {
      errorInfo.type = ERROR_TYPES.SESSION
      errorInfo.severity = ERROR_SEVERITY.MEDIUM
      errorInfo.userMessage = 'Session expired. Please start a new session.'
      errorInfo.privacyMessage = 'Session data was automatically cleared for privacy protection.'
      errorInfo.retryable = false
      errorInfo.actions = [
        { label: 'New Session', action: 'new-session', variant: 'primary' }
      ]
    }

    return errorInfo
  }
}/**

 * Privacy-aware error handler with retry mechanisms
 */
export class ErrorHandler {
  constructor() {
    this.retryAttempts = new Map()
    this.maxRetries = 3
    this.retryDelays = [1000, 2000, 4000] // Exponential backoff
  }

  /**
   * Handle error with privacy-focused messaging and retry logic
   */
  async handleError(error, context = {}) {
    const errorInfo = ErrorCategorizer.categorizeError(error)
    const requestId = context.requestId || this.generateRequestId()
    
    // Log error (without user data)
    this.logError(error, errorInfo, context)
    
    // Show user notification
    this.showErrorNotification(errorInfo, context)
    
    // Handle retries if applicable
    if (errorInfo.retryable && context.retryFunction) {
      return this.handleRetry(requestId, context.retryFunction, errorInfo)
    }
    
    return { success: false, error: errorInfo }
  }

  /**
   * Handle retry logic with exponential backoff
   */
  async handleRetry(requestId, retryFunction, errorInfo) {
    const attempts = this.retryAttempts.get(requestId) || 0
    
    if (attempts >= this.maxRetries) {
      this.retryAttempts.delete(requestId)
      
      notificationService.addNotification({
        type: 'error',
        title: 'Maximum Retries Exceeded',
        message: 'Unable to complete the request after multiple attempts. Your data remains private.',
        icon: 'bi-x-circle',
        autoRemove: false,
        actions: [
          { label: 'Start Over', action: 'start-over', variant: 'primary' }
        ]
      })
      
      return { success: false, error: errorInfo, maxRetriesExceeded: true }
    }
    
    const delay = this.retryDelays[attempts] || 4000
    this.retryAttempts.set(requestId, attempts + 1)
    
    // Show retry notification
    notificationService.addNotification({
      type: 'info',
      title: 'Retrying Request',
      message: `Attempting retry ${attempts + 1} of ${this.maxRetries} in ${delay/1000} seconds...`,
      icon: 'bi-arrow-clockwise',
      duration: delay
    })
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay))
    
    try {
      const result = await retryFunction()
      this.retryAttempts.delete(requestId) // Clear on success
      
      notificationService.addNotification({
        type: 'success',
        title: 'Request Successful',
        message: 'The request completed successfully after retry.',
        icon: 'bi-check-circle',
        duration: 3000
      })
      
      return { success: true, result, retriedAfter: attempts + 1 }
    } catch (retryError) {
      return this.handleRetry(requestId, retryFunction, ErrorCategorizer.categorizeError(retryError))
    }
  }

  /**
   * Show privacy-focused error notification
   */
  showErrorNotification(errorInfo, context = {}) {
    const notification = {
      type: 'error',
      title: this.getErrorTitle(errorInfo.type),
      message: errorInfo.userMessage,
      icon: this.getErrorIcon(errorInfo.type),
      autoRemove: errorInfo.severity !== ERROR_SEVERITY.CRITICAL,
      duration: errorInfo.severity === ERROR_SEVERITY.LOW ? 5000 : 8000,
      actions: errorInfo.actions
    }
    
    // Add privacy message for data-related errors
    if (errorInfo.privacyMessage) {
      notification.message += `\n\n🔒 ${errorInfo.privacyMessage}`
    }
    
    return notificationService.addNotification(notification)
  }

  /**
   * Log error without user data
   */
  logError(error, errorInfo, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: error.message,
      status: error.response?.status,
      code: error.code,
      context: {
        component: context.component,
        action: context.action,
        requestId: context.requestId
      }
      // Explicitly exclude any user data
    }
    
    console.error('Privacy-safe error log:', logEntry)
  }

  /**
   * Generate unique request ID for retry tracking
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get user-friendly error title
   */
  getErrorTitle(errorType) {
    const titles = {
      [ERROR_TYPES.NETWORK]: 'Connection Error',
      [ERROR_TYPES.VALIDATION]: 'Validation Error',
      [ERROR_TYPES.PROPHET]: 'Forecasting Error',
      [ERROR_TYPES.FILE_UPLOAD]: 'Upload Error',
      [ERROR_TYPES.SESSION]: 'Session Error',
      [ERROR_TYPES.TIMEOUT]: 'Request Timeout',
      [ERROR_TYPES.MEMORY]: 'Memory Error',
      [ERROR_TYPES.UNKNOWN]: 'Unexpected Error'
    }
    
    return titles[errorType] || 'Error'
  }

  /**
   * Get appropriate icon for error type
   */
  getErrorIcon(errorType) {
    const icons = {
      [ERROR_TYPES.NETWORK]: 'bi-wifi-off',
      [ERROR_TYPES.VALIDATION]: 'bi-exclamation-triangle',
      [ERROR_TYPES.PROPHET]: 'bi-graph-down',
      [ERROR_TYPES.FILE_UPLOAD]: 'bi-file-earmark-x',
      [ERROR_TYPES.SESSION]: 'bi-clock-history',
      [ERROR_TYPES.TIMEOUT]: 'bi-hourglass-split',
      [ERROR_TYPES.MEMORY]: 'bi-memory',
      [ERROR_TYPES.UNKNOWN]: 'bi-question-circle'
    }
    
    return icons[errorType] || 'bi-exclamation-triangle'
  }

  /**
   * Clear retry attempts for a request
   */
  clearRetryAttempts(requestId) {
    this.retryAttempts.delete(requestId)
  }

  /**
   * Get retry statistics
   */
  getRetryStats() {
    return {
      activeRetries: this.retryAttempts.size,
      maxRetries: this.maxRetries,
      retryDelays: this.retryDelays
    }
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler()

/**
 * Validation error handler for forms
 */
export class ValidationErrorHandler {
  static handleValidationErrors(errors, formRef = null) {
    const errorMap = new Map()
    
    errors.forEach(error => {
      if (error.field) {
        errorMap.set(error.field, error.message)
      }
    })
    
    // Show field-specific errors if form reference provided
    if (formRef && formRef.value) {
      errorMap.forEach((message, field) => {
        const fieldElement = formRef.value.querySelector(`[name="${field}"]`)
        if (fieldElement) {
          fieldElement.classList.add('is-invalid')
          
          // Add or update error message
          let errorElement = fieldElement.parentNode.querySelector('.invalid-feedback')
          if (!errorElement) {
            errorElement = document.createElement('div')
            errorElement.className = 'invalid-feedback'
            fieldElement.parentNode.appendChild(errorElement)
          }
          errorElement.textContent = message
        }
      })
    }
    
    // Show summary notification
    if (errors.length > 0) {
      const errorList = errors.map(e => e.message || e).join('\n')
      
      notificationService.addNotification({
        type: 'warning',
        title: 'Validation Errors',
        message: `Please correct the following issues:\n${errorList}`,
        icon: 'bi-exclamation-triangle',
        autoRemove: false,
        actions: [
          { label: 'Review Form', action: 'review-form', variant: 'primary' }
        ]
      })
    }
    
    return errorMap
  }

  static clearValidationErrors(formRef) {
    if (formRef && formRef.value) {
      const invalidFields = formRef.value.querySelectorAll('.is-invalid')
      invalidFields.forEach(field => {
        field.classList.remove('is-invalid')
      })
      
      const errorMessages = formRef.value.querySelectorAll('.invalid-feedback')
      errorMessages.forEach(msg => msg.remove())
    }
  }
}

/**
 * Network error handler with connection monitoring
 */
export class NetworkErrorHandler {
  constructor() {
    this.isOnline = navigator.onLine
    this.connectionQuality = 'unknown'
    this.setupConnectionMonitoring()
  }

  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true
      notificationService.addNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'Internet connection has been restored. You can continue working.',
        icon: 'bi-wifi',
        duration: 3000
      })
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      notificationService.addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Internet connection lost. Your data remains safe in browser memory.',
        icon: 'bi-wifi-off',
        autoRemove: false,
        actions: [
          { label: 'Retry Connection', action: 'retry-connection', variant: 'primary' }
        ]
      })
    })
  }

  async checkConnectionQuality() {
    if (!this.isOnline) {
      return 'offline'
    }
    
    try {
      const start = Date.now()
      await fetch('/api/health', { method: 'HEAD' })
      const duration = Date.now() - start
      
      if (duration < 200) return 'excellent'
      if (duration < 500) return 'good'
      if (duration < 1000) return 'fair'
      return 'poor'
    } catch {
      return 'offline'
    }
  }

  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      quality: this.connectionQuality
    }
  }
}

// Create singleton instance
export const networkErrorHandler = new NetworkErrorHandler()

// Export convenience functions
export const handleError = (error, context) => errorHandler.handleError(error, context)
export const handleValidationErrors = (errors, formRef) => ValidationErrorHandler.handleValidationErrors(errors, formRef)
export const clearValidationErrors = (formRef) => ValidationErrorHandler.clearValidationErrors(formRef)