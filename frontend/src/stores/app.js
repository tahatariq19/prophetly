import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false)
  const error = ref(null)
  const apiStatus = ref({
    healthy: false,
    environment: null,
    lastChecked: null
  })
  const notifications = ref([])

  // Getters
  const hasError = computed(() => error.value !== null)
  const isApiHealthy = computed(() => apiStatus.value.healthy)

  // Actions
  function setLoading(loading) {
    isLoading.value = loading
  }

  function setError(errorMessage) {
    error.value = errorMessage
    if (errorMessage) {
      addNotification({
        type: 'error',
        message: errorMessage,
        timestamp: Date.now()
      })
    }
  }

  function clearError() {
    error.value = null
  }

  function setApiStatus(status) {
    apiStatus.value = {
      ...status,
      lastChecked: Date.now()
    }
  }

  function addNotification(notification) {
    const id = Date.now() + Math.random()
    notifications.value.push({
      id,
      ...notification,
      timestamp: notification.timestamp || Date.now()
    })

    // Auto-remove notifications after 5 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearAllNotifications() {
    notifications.value = []
  }

  // Privacy-focused error handling
  function handlePrivacyError(error) {
    let message = 'An error occurred during processing.'
    
    if (error.response?.status === 413) {
      message = 'File too large. Please use a smaller dataset. Your data was not stored.'
    } else if (error.response?.status === 429) {
      message = 'Too many requests. Please wait before trying again. No data was stored.'
    } else if (error.response?.status >= 500) {
      message = 'Server error. Your data was not stored and processing was stopped.'
    } else if (error.code === 'NETWORK_ERROR') {
      message = 'Network connection error. Please check your connection and try again.'
    }

    setError(message)
  }

  return {
    // State
    isLoading,
    error,
    apiStatus,
    notifications,
    
    // Getters
    hasError,
    isApiHealthy,
    
    // Actions
    setLoading,
    setError,
    clearError,
    setApiStatus,
    addNotification,
    removeNotification,
    clearAllNotifications,
    handlePrivacyError
  }
})