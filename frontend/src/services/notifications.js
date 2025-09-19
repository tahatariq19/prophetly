import { ref, readonly, onMounted, onUnmounted } from 'vue'

// Privacy-focused notification service for session management
class NotificationService {
  constructor() {
    this.notifications = []
    this.listeners = []
  }

  // Add a notification
  addNotification(notification) {
    const id = Date.now().toString()
    const newNotification = {
      id,
      timestamp: new Date().toISOString(),
      ...notification
    }
    
    this.notifications.unshift(newNotification)
    this.notifyListeners('added', newNotification)
    
    // Auto-remove after specified duration
    if (notification.autoRemove !== false) {
      const duration = notification.duration || 5000
      setTimeout(() => {
        this.removeNotification(id)
      }, duration)
    }
    
    return id
  }

  // Remove a notification
  removeNotification(id) {
    const index = this.notifications.findIndex(n => n.id === id)
    if (index !== -1) {
      const removed = this.notifications.splice(index, 1)[0]
      this.notifyListeners('removed', removed)
      return removed
    }
    return null
  }

  // Clear all notifications
  clearAll() {
    const cleared = [...this.notifications]
    this.notifications = []
    this.notifyListeners('cleared', cleared)
    return cleared
  }

  // Get all notifications
  getAll() {
    return [...this.notifications]
  }

  // Subscribe to notification changes
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Notify all listeners
  notifyListeners(action, data) {
    this.listeners.forEach(listener => {
      try {
        listener(action, data)
      } catch (error) {
        console.error('Notification listener error:', error)
      }
    })
  }

  // Privacy-specific notifications
  showSessionExpiryWarning(minutesRemaining) {
    return this.addNotification({
      type: 'warning',
      title: 'Session Expiring Soon',
      message: `Your session will expire in ${minutesRemaining} minutes. Download your results to keep them.`,
      icon: 'bi-clock-history',
      actions: [
        {
          label: 'Download Results',
          action: 'download-results',
          variant: 'primary'
        },
        {
          label: 'Extend Session',
          action: 'extend-session',
          variant: 'outline-secondary'
        }
      ],
      autoRemove: false,
      priority: 'high'
    })
  }

  showSessionExpired() {
    return this.addNotification({
      type: 'error',
      title: 'Session Expired',
      message: 'Your session has expired and all data has been automatically cleared for privacy.',
      icon: 'bi-shield-check',
      actions: [
        {
          label: 'Start New Session',
          action: 'new-session',
          variant: 'primary'
        }
      ],
      autoRemove: false,
      priority: 'high'
    })
  }

  showDataCleared() {
    return this.addNotification({
      type: 'info',
      title: 'Data Cleared',
      message: 'All session data has been cleared from memory as requested.',
      icon: 'bi-trash3',
      duration: 3000
    })
  }

  showForecastCompleted(duration) {
    return this.addNotification({
      type: 'success',
      title: 'Forecast Completed',
      message: `Your forecast has been generated successfully in ${duration}.`,
      icon: 'bi-check-circle',
      actions: [
        {
          label: 'View Results',
          action: 'view-results',
          variant: 'primary'
        },
        {
          label: 'Download',
          action: 'download-results',
          variant: 'outline-secondary'
        }
      ],
      duration: 8000
    })
  }

  showForecastError(error) {
    return this.addNotification({
      type: 'error',
      title: 'Forecast Failed',
      message: error.message || 'An error occurred during forecast generation.',
      icon: 'bi-exclamation-triangle',
      actions: [
        {
          label: 'Retry',
          action: 'retry-forecast',
          variant: 'outline-primary'
        }
      ],
      autoRemove: false
    })
  }

  showUploadSuccess(filename, rows) {
    return this.addNotification({
      type: 'success',
      title: 'Upload Successful',
      message: `${filename} uploaded successfully (${rows} rows). Data is processed in memory only.`,
      icon: 'bi-upload',
      duration: 4000
    })
  }

  showPrivacyReminder() {
    return this.addNotification({
      type: 'info',
      title: 'Privacy Notice',
      message: 'Your data is processed in memory only and will be automatically discarded.',
      icon: 'bi-shield-check',
      duration: 6000
    })
  }

  showNetworkError() {
    return this.addNotification({
      type: 'error',
      title: 'Network Error',
      message: 'Connection failed. Your data remains private and was not transmitted.',
      icon: 'bi-wifi-off',
      actions: [
        {
          label: 'Retry',
          action: 'retry-request',
          variant: 'outline-primary'
        }
      ],
      duration: 8000
    })
  }

  showConfigurationSaved() {
    return this.addNotification({
      type: 'success',
      title: 'Configuration Saved',
      message: 'Your forecast configuration has been saved to browser storage.',
      icon: 'bi-gear',
      duration: 3000
    })
  }

  showSessionRestored() {
    return this.addNotification({
      type: 'success',
      title: 'Session Restored',
      message: 'Your previous session has been restored successfully.',
      icon: 'bi-arrow-clockwise',
      duration: 4000
    })
  }

  // Browser notification support (with permission)
  async requestBrowserNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  showBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      })
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)
      
      return notification
    }
    return null
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Vue composable for notifications
export function useNotifications() {
  const notifications = ref([])
  
  const addNotification = (notification) => {
    return notificationService.addNotification(notification)
  }
  
  const removeNotification = (id) => {
    return notificationService.removeNotification(id)
  }
  
  const clearAll = () => {
    return notificationService.clearAll()
  }
  
  // Subscribe to changes
  onMounted(() => {
    notifications.value = notificationService.getAll()
    
    const unsubscribe = notificationService.subscribe((action, data) => {
      notifications.value = notificationService.getAll()
    })
    
    onUnmounted(() => {
      unsubscribe()
    })
  })
  
  return {
    notifications: readonly(notifications),
    addNotification,
    removeNotification,
    clearAll,
    
    // Convenience methods
    showSuccess: (message, title = 'Success') => addNotification({
      type: 'success',
      title,
      message,
      icon: 'bi-check-circle'
    }),
    
    showError: (message, title = 'Error') => addNotification({
      type: 'error',
      title,
      message,
      icon: 'bi-exclamation-triangle',
      autoRemove: false
    }),
    
    showWarning: (message, title = 'Warning') => addNotification({
      type: 'warning',
      title,
      message,
      icon: 'bi-exclamation-triangle'
    }),
    
    showInfo: (message, title = 'Information') => addNotification({
      type: 'info',
      title,
      message,
      icon: 'bi-info-circle'
    })
  }
}

export default notificationService