import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Session store for temporary data (browser memory only)
export const useSessionStore = defineStore('session', () => {
  // State - all data is temporary and session-only
  const sessionId = ref(null)
  const uploadedData = ref(null)
  const dataPreview = ref(null)
  const columnMapping = ref(null)
  const forecastConfig = ref(null)
  const forecastResults = ref(null)
  const processingHistory = ref([])
  const processedData = ref(null)
  const userAnnotations = ref([])
  const processingStatus = ref({
    isProcessing: false,
    stage: null,
    progress: 0,
    message: ''
  })

  // Getters
  const hasData = computed(() => uploadedData.value !== null)
  const hasConfig = computed(() => forecastConfig.value !== null)
  const hasResults = computed(() => forecastResults.value !== null)
  const hasProcessingHistory = computed(() => processingHistory.value.length > 0)
  const isProcessing = computed(() => processingStatus.value.isProcessing)

  // Actions
  function generateSessionId() {
    sessionId.value = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return sessionId.value
  }

  function setUploadedData(data, preview = null) {
    uploadedData.value = data
    dataPreview.value = preview
    
    // Generate session ID when data is first uploaded
    if (!sessionId.value) {
      generateSessionId()
    }
  }

  function setColumnMapping(mapping) {
    columnMapping.value = mapping
  }

  function setForecastConfig(config) {
    forecastConfig.value = config
  }

  function setForecastResults(results) {
    forecastResults.value = results
  }

  function updateUserAnnotations(annotations) {
    userAnnotations.value = annotations
  }

  function addUserAnnotation(annotation) {
    userAnnotations.value.push({
      ...annotation,
      id: Date.now(),
      timestamp: new Date()
    })
  }

  function removeUserAnnotation(id) {
    userAnnotations.value = userAnnotations.value.filter(annotation => annotation.id !== id)
  }

  function getUserAnnotations() {
    return userAnnotations.value
  }

  function addProcessingStep(step) {
    processingHistory.value.push(step)
  }

  function removeProcessingStep(type, index) {
    const stepIndex = processingHistory.value.findIndex((step, i) => 
      step.type === type && i === index
    )
    if (stepIndex !== -1) {
      processingHistory.value.splice(stepIndex, 1)
    }
  }

  function clearProcessingSteps(type = null) {
    if (type) {
      processingHistory.value = processingHistory.value.filter(step => step.type !== type)
    } else {
      processingHistory.value = []
    }
  }

  function getProcessingHistory() {
    return processingHistory.value
  }

  function setProcessedData(data) {
    processedData.value = data
  }

  function getProcessedData() {
    return processedData.value || uploadedData.value
  }

  function getColumnMapping() {
    return columnMapping.value
  }

  function loadCSVData(csvContent) {
    // Parse CSV content and set as uploaded data
    // This is a simplified implementation - in reality would need proper CSV parsing
    try {
      const lines = csvContent.split('\n')
      const headers = lines[0].split(',')
      const data = lines.slice(1).map(line => {
        const values = line.split(',')
        const row = {}
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim()
        })
        return row
      }).filter(row => Object.values(row).some(val => val)) // Remove empty rows
      
      setUploadedData(data)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      throw new Error('Invalid CSV format')
    }
  }

  function loadSessionData(sessionData) {
    importSessionData(sessionData)
    if (sessionData.processingHistory) {
      processingHistory.value = sessionData.processingHistory
    }
    if (sessionData.processedData) {
      processedData.value = sessionData.processedData
    }
  }

  function updateProcessingStatus(status) {
    processingStatus.value = { ...processingStatus.value, ...status }
  }

  function startProcessing(stage = 'Initializing', message = '') {
    processingStatus.value = {
      isProcessing: true,
      stage,
      progress: 0,
      message
    }
  }

  function updateProgress(progress, stage = null, message = '') {
    processingStatus.value = {
      ...processingStatus.value,
      progress: Math.min(100, Math.max(0, progress)),
      ...(stage && { stage }),
      ...(message && { message })
    }
  }

  function completeProcessing() {
    processingStatus.value = {
      isProcessing: false,
      stage: 'Completed',
      progress: 100,
      message: 'Processing completed successfully'
    }
  }

  function stopProcessing(error = null) {
    processingStatus.value = {
      isProcessing: false,
      stage: error ? 'Error' : 'Stopped',
      progress: 0,
      message: error || 'Processing stopped'
    }
  }

  // Clear all session data (privacy compliance)
  function clearSession() {
    sessionId.value = null
    uploadedData.value = null
    dataPreview.value = null
    columnMapping.value = null
    forecastConfig.value = null
    forecastResults.value = null
    processingHistory.value = []
    processedData.value = null
    userAnnotations.value = []
    processingStatus.value = {
      isProcessing: false,
      stage: null,
      progress: 0,
      message: ''
    }
  }

  // Download session data for user continuity
  function exportSessionData() {
    if (!hasData.value && !hasConfig.value && !hasResults.value) {
      return null
    }

    return {
      sessionId: sessionId.value,
      timestamp: new Date().toISOString(),
      data: uploadedData.value,
      processedData: processedData.value,
      columnMapping: columnMapping.value,
      config: forecastConfig.value,
      results: forecastResults.value,
      processingHistory: processingHistory.value,
      userAnnotations: userAnnotations.value
    }
  }

  // Import session data from user upload
  function importSessionData(sessionData) {
    if (sessionData.sessionId) sessionId.value = sessionData.sessionId
    if (sessionData.data) uploadedData.value = sessionData.data
    if (sessionData.processedData) processedData.value = sessionData.processedData
    if (sessionData.columnMapping) columnMapping.value = sessionData.columnMapping
    if (sessionData.config) forecastConfig.value = sessionData.config
    if (sessionData.results) forecastResults.value = sessionData.results
    if (sessionData.processingHistory) processingHistory.value = sessionData.processingHistory
    if (sessionData.userAnnotations) userAnnotations.value = sessionData.userAnnotations
  }

  // Get session summary for UI display
  function getSessionSummary() {
    return {
      sessionId: sessionId.value,
      hasData: hasData.value,
      hasConfig: hasConfig.value,
      hasResults: hasResults.value,
      isProcessing: isProcessing.value,
      dataRows: uploadedData.value?.length || 0,
      configMode: forecastConfig.value?.mode || null,
      lastActivity: new Date().toISOString()
    }
  }

  // Schedule automatic cleanup notification
  function scheduleCleanupNotification(callback, delayMinutes = 110) {
    // Schedule notification 10 minutes before 2-hour expiry
    const delay = delayMinutes * 60 * 1000
    setTimeout(() => {
      if (hasData.value || hasConfig.value || hasResults.value) {
        callback()
      }
    }, delay)
  }

  // Check if session should be cleaned up
  function shouldCleanupSession(maxAgeMinutes = 120) {
    if (!sessionId.value) return false
    
    // Extract timestamp from session ID
    const sessionTimestamp = sessionId.value.split('_')[1]
    if (!sessionTimestamp) return false
    
    const sessionAge = Date.now() - parseInt(sessionTimestamp)
    const maxAge = maxAgeMinutes * 60 * 1000
    
    return sessionAge > maxAge
  }

  return {
    // State
    sessionId,
    uploadedData,
    dataPreview,
    columnMapping,
    forecastConfig,
    forecastResults,
    processingHistory,
    processedData,
    processingStatus,
    userAnnotations,
    
    // Getters
    hasData,
    hasConfig,
    hasResults,
    hasProcessingHistory,
    isProcessing,
    
    // Actions
    generateSessionId,
    setUploadedData,
    setColumnMapping,
    setForecastConfig,
    setForecastResults,
    updateUserAnnotations,
    addUserAnnotation,
    removeUserAnnotation,
    getUserAnnotations,
    addProcessingStep,
    removeProcessingStep,
    clearProcessingSteps,
    getProcessingHistory,
    setProcessedData,
    getProcessedData,
    getColumnMapping,
    loadCSVData,
    loadSessionData,
    updateProcessingStatus,
    startProcessing,
    updateProgress,
    completeProcessing,
    stopProcessing,
    clearSession,
    exportSessionData,
    importSessionData,
    getSessionSummary,
    scheduleCleanupNotification,
    shouldCleanupSession
  }
})