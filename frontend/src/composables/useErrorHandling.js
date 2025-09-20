// Composable for privacy-aware error handling
import { ref, computed } from 'vue'
import { errorHandler, handleValidationErrors, clearValidationErrors } from '../utils/errorHandling'
import { useNotifications } from '../services/notifications'

/**
 * Composable for comprehensive error handling with privacy protection
 */
export function useErrorHandling(options = {}) {
  const {
    component = 'Unknown',
    autoRetry = true,
    maxRetries = 3,
    showNotifications = true
  } = options

  const { addNotification } = useNotifications()
  
  // State
  const errors = ref([])
  const isLoading = ref(false)
  const lastError = ref(null)
  const retryCount = ref(0)
  
  // Computed
  const hasErrors = computed(() => errors.value.length > 0)
  const hasValidationErrors = computed(() => 
    errors.value.some(error => error.type === 'validation')
  )
  const hasNetworkErrors = computed(() => 
    errors.value.some(error => error.type === 'network')
  )
  
  /**
   * Handle any error with privacy protection
   */
  const handleError = async (error, context = {}) => {
    const errorContext = {
      component,
      requestId: generateRequestId(),
      ...context
    }
    
    try {
      const result = await errorHandler.handleError(error, errorContext)
      
      // Store error information
      lastError.value = result.error
      
      // Add to errors array if not duplicate
      const isDuplicate = errors.value.some(existingError => 
        existingError.message === result.error.userMessage &&
        existingError.type === result.error.type
      )
      
      if (!isDuplicate) {
        errors.value.push({
          id: Date.now(),
          type: result.error.type,
          message: result.error.userMessage,
          privacyMessage: result.error.privacyMessage,
          timestamp: new Date(),
          context: errorContext
        })
      }
      
      return result
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError)
      
      // Fallback error handling
      const fallbackError = {
        id: Date.now(),
        type: 'unknown',
        message: 'An unexpected error occurred. Your data remains private.',
        privacyMessage: 'Error handling failed, but no data was compromised.',
        timestamp: new Date(),
        context: errorContext
      }
      
      errors.value.push(fallbackError)
      lastError.value = fallbackError
      
      return { success: false, error: fallbackError }
    }
  }
  
  /**
   * Handle validation errors specifically
   */
  const handleValidationError = (validationErrors, formRef = null) => {
    // Clear existing validation errors
    clearValidationErrors()
    
    // Process validation errors
    const processedErrors = validationErrors.map(error => ({
      id: Date.now() + Math.random(),
      type: 'validation',
      field: error.field,
      message: error.message || error,
      timestamp: new Date()
    }))
    
    // Add to errors array
    errors.value.push(...processedErrors)
    
    // Handle form field highlighting
    if (formRef) {
      handleValidationErrors(validationErrors, formRef)
    }
    
    // Show notification if enabled
    if (showNotifications) {
      addNotification({
        type: 'warning',
        title: 'Validation Errors',
        message: `Please correct ${processedErrors.length} validation error${processedErrors.length > 1 ? 's' : ''}`,
        icon: 'bi-exclamation-triangle',
        duration: 5000
      })
    }
    
    return processedErrors
  }
  
  /**
   * Handle network errors with retry logic
   */
  const handleNetworkError = async (error, retryFunction = null) => {
    const result = await handleError(error, { 
      type: 'network',
      retryFunction: autoRetry ? retryFunction : null
    })
    
    if (result.success && result.retriedAfter) {
      retryCount.value = result.retriedAfter
      
      if (showNotifications) {
        addNotification({
          type: 'success',
          title: 'Connection Restored',
          message: `Request succeeded after ${result.retriedAfter} ${result.retriedAfter === 1 ? 'retry' : 'retries'}`,
          icon: 'bi-wifi',
          duration: 4000
        })
      }
    }
    
    return result
  }
  
  /**
   * Retry the last failed operation
   */
  const retryLastOperation = async (retryFunction) => {
    if (!retryFunction || !lastError.value) {
      return { success: false, error: 'No operation to retry' }
    }
    
    isLoading.value = true
    
    try {
      const result = await retryFunction()
      
      // Clear errors on successful retry
      if (result && result.success !== false) {
        clearErrors()
        retryCount.value++
        
        if (showNotifications) {
          addNotification({
            type: 'success',
            title: 'Retry Successful',
            message: 'The operation completed successfully',
            icon: 'bi-check-circle',
            duration: 3000
          })
        }
      }
      
      return { success: true, result }
    } catch (error) {
      return await handleError(error, { source: 'retry-operation' })
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Clear all errors
   */
  const clearErrors = () => {
    errors.value = []
    lastError.value = null
    retryCount.value = 0
  }
  
  /**
   * Clear specific error by ID
   */
  const clearError = (errorId) => {
    const index = errors.value.findIndex(error => error.id === errorId)
    if (index !== -1) {
      errors.value.splice(index, 1)
    }
  }
  
  /**
   * Clear validation errors and form highlighting
   */
  const clearValidationErrors = (formRef = null) => {
    // Remove validation errors from array
    errors.value = errors.value.filter(error => error.type !== 'validation')
    
    // Clear form field highlighting
    if (formRef) {
      clearValidationErrors(formRef)
    }
  }
  
  /**
   * Get errors by type
   */
  const getErrorsByType = (type) => {
    return errors.value.filter(error => error.type === type)
  }
  
  /**
   * Check if specific error type exists
   */
  const hasErrorType = (type) => {
    return errors.value.some(error => error.type === type)
  }
  
  /**
   * Generate unique request ID
   */
  const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get error summary for display
   */
  const getErrorSummary = () => {
    if (!hasErrors.value) return null
    
    const errorTypes = [...new Set(errors.value.map(error => error.type))]
    const totalErrors = errors.value.length
    
    return {
      totalErrors,
      errorTypes,
      hasValidation: hasValidationErrors.value,
      hasNetwork: hasNetworkErrors.value,
      lastErrorTime: lastError.value?.timestamp,
      retryCount: retryCount.value
    }
  }
  
  /**
   * Export error report for debugging (privacy-safe)
   */
  const exportErrorReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      component,
      totalErrors: errors.value.length,
      retryCount: retryCount.value,
      errors: errors.value.map(error => ({
        type: error.type,
        message: error.message,
        timestamp: error.timestamp,
        // Exclude any potentially sensitive context data
      })),
      userAgent: navigator.userAgent,
      url: window.location.href,
      privacyNote: 'This report contains no user data or personal information'
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-report-${component}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return {
    // State
    errors: computed(() => errors.value),
    isLoading: computed(() => isLoading.value),
    lastError: computed(() => lastError.value),
    retryCount: computed(() => retryCount.value),
    
    // Computed
    hasErrors,
    hasValidationErrors,
    hasNetworkErrors,
    
    // Methods
    handleError,
    handleValidationError,
    handleNetworkError,
    retryLastOperation,
    clearErrors,
    clearError,
    clearValidationErrors,
    getErrorsByType,
    hasErrorType,
    getErrorSummary,
    exportErrorReport,
    
    // Utilities
    generateRequestId
  }
}

/**
 * Composable for API error handling
 */
export function useApiErrorHandling(options = {}) {
  const errorHandling = useErrorHandling({
    component: 'API',
    ...options
  })
  
  /**
   * Wrapper for API calls with automatic error handling
   */
  const apiCall = async (apiFunction, context = {}) => {
    errorHandling.isLoading.value = true
    
    try {
      const result = await apiFunction()
      
      // Clear errors on successful API call
      errorHandling.clearErrors()
      
      return { success: true, data: result }
    } catch (error) {
      const errorResult = await errorHandling.handleError(error, {
        source: 'api-call',
        ...context
      })
      
      return { success: false, error: errorResult.error }
    } finally {
      errorHandling.isLoading.value = false
    }
  }
  
  /**
   * Wrapper for API calls with retry logic
   */
  const apiCallWithRetry = async (apiFunction, context = {}) => {
    const retryFunction = () => apiFunction()
    
    const result = await apiCall(apiFunction, context)
    
    if (!result.success && result.error?.retryable) {
      return await errorHandling.handleNetworkError(
        new Error(result.error.userMessage),
        retryFunction
      )
    }
    
    return result
  }
  
  return {
    ...errorHandling,
    apiCall,
    apiCallWithRetry
  }
}

/**
 * Composable for form error handling
 */
export function useFormErrorHandling(formRef, options = {}) {
  const errorHandling = useErrorHandling({
    component: 'Form',
    ...options
  })
  
  /**
   * Validate form and handle errors
   */
  const validateForm = async (validationFunction) => {
    try {
      const result = await validationFunction()
      
      if (result.isValid) {
        errorHandling.clearValidationErrors(formRef)
        return { success: true, data: result }
      } else {
        errorHandling.handleValidationError(result.errors, formRef)
        return { success: false, errors: result.errors }
      }
    } catch (error) {
      const errorResult = await errorHandling.handleError(error, {
        source: 'form-validation'
      })
      
      return { success: false, error: errorResult.error }
    }
  }
  
  /**
   * Submit form with error handling
   */
  const submitForm = async (submitFunction, validationFunction = null) => {
    // Validate first if validation function provided
    if (validationFunction) {
      const validationResult = await validateForm(validationFunction)
      if (!validationResult.success) {
        return validationResult
      }
    }
    
    // Submit form
    errorHandling.isLoading.value = true
    
    try {
      const result = await submitFunction()
      
      // Clear all errors on successful submission
      errorHandling.clearErrors()
      errorHandling.clearValidationErrors(formRef)
      
      return { success: true, data: result }
    } catch (error) {
      const errorResult = await errorHandling.handleError(error, {
        source: 'form-submission'
      })
      
      return { success: false, error: errorResult.error }
    } finally {
      errorHandling.isLoading.value = false
    }
  }
  
  return {
    ...errorHandling,
    validateForm,
    submitForm
  }
}