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
      columnMapping: columnMapping.value,
      config: forecastConfig.value,
      results: forecastResults.value
    }
  }

  // Import session data from user upload
  function importSessionData(sessionData) {
    if (sessionData.sessionId) sessionId.value = sessionData.sessionId
    if (sessionData.data) uploadedData.value = sessionData.data
    if (sessionData.columnMapping) columnMapping.value = sessionData.columnMapping
    if (sessionData.config) forecastConfig.value = sessionData.config
    if (sessionData.results) forecastResults.value = sessionData.results
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

  return {
    // State
    sessionId,
    uploadedData,
    dataPreview,
    columnMapping,
    forecastConfig,
    forecastResults,
    processingStatus,
    
    // Getters
    hasData,
    hasConfig,
    hasResults,
    isProcessing,
    
    // Actions
    generateSessionId,
    setUploadedData,
    setColumnMapping,
    setForecastConfig,
    setForecastResults,
    updateProcessingStatus,
    startProcessing,
    updateProgress,
    completeProcessing,
    stopProcessing,
    clearSession,
    exportSessionData,
    importSessionData,
    getSessionSummary
  }
})