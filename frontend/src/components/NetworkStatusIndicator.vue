<template>
  <div class="network-status-indicator" v-if="showIndicator">
    <!-- Connection Status Badge -->
    <div 
      :class="getStatusClass()" 
      class="status-badge"
      @click="toggleDetails"
      :title="getStatusTooltip()"
    >
      <i :class="getStatusIcon()" class="status-icon"></i>
      <span class="status-text" v-if="showText">{{ getStatusText() }}</span>
      <i class="bi bi-chevron-down details-toggle" v-if="hasDetails"></i>
    </div>
    
    <!-- Detailed Status Panel -->
    <Transition name="slide-down">
      <div v-if="showDetails" class="status-details">
        <div class="details-header">
          <h6 class="mb-2">
            <i class="bi bi-activity me-2"></i>
            Connection Status
          </h6>
        </div>
        
        <div class="connection-info">
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span :class="getStatusTextClass()">{{ getDetailedStatus() }}</span>
          </div>
          
          <div class="info-row" v-if="connectionQuality !== 'unknown'">
            <span class="info-label">Quality:</span>
            <span :class="getQualityClass()">{{ getQualityText() }}</span>
          </div>
          
          <div class="info-row" v-if="lastChecked">
            <span class="info-label">Last Check:</span>
            <span class="text-muted">{{ formatLastChecked() }}</span>
          </div>
          
          <div class="info-row" v-if="retryCount > 0">
            <span class="info-label">Retry Attempts:</span>
            <span class="text-warning">{{ retryCount }}</span>
          </div>
        </div>
        
        <div class="status-actions" v-if="!isOnline || connectionQuality === 'poor'">
          <button 
            class="btn btn-sm btn-outline-primary"
            @click="checkConnection"
            :disabled="isChecking"
          >
            <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': isChecking }"></i>
            {{ isChecking ? 'Checking...' : 'Test Connection' }}
          </button>
          
          <button 
            v-if="!isOnline"
            class="btn btn-sm btn-outline-success"
            @click="retryConnection"
            :disabled="isRetrying"
          >
            <i class="bi bi-wifi me-1"></i>
            {{ isRetrying ? 'Retrying...' : 'Retry Connection' }}
          </button>
        </div>
        
        <!-- Privacy Notice -->
        <div class="privacy-notice" v-if="!isOnline">
          <div class="d-flex align-items-start">
            <i class="bi bi-shield-check text-success me-2 mt-1"></i>
            <div>
              <small class="text-muted">
                <strong>Privacy Protected:</strong> Your data remains safe in browser memory 
                even when offline. No data is transmitted during connection issues.
              </small>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { networkErrorHandler } from '../utils/errorHandling'
import { notificationService } from '../services/notifications'

export default {
  name: 'NetworkStatusIndicator',
  props: {
    showText: {
      type: Boolean,
      default: false
    },
    showWhenOnline: {
      type: Boolean,
      default: false
    },
    autoCheck: {
      type: Boolean,
      default: true
    },
    checkInterval: {
      type: Number,
      default: 30000 // 30 seconds
    }
  },
  emits: ['status-change', 'connection-restored', 'connection-lost'],
  setup(props, { emit }) {
    const isOnline = ref(navigator.onLine)
    const connectionQuality = ref('unknown')
    const lastChecked = ref(null)
    const showDetails = ref(false)
    const isChecking = ref(false)
    const isRetrying = ref(false)
    const retryCount = ref(0)
    const checkIntervalId = ref(null)
    
    const showIndicator = computed(() => {
      return !isOnline.value || props.showWhenOnline || connectionQuality.value === 'poor'
    })
    
    const hasDetails = computed(() => {
      return !isOnline.value || connectionQuality.value !== 'unknown'
    })
    
    // Connection monitoring
    const handleOnline = () => {
      const wasOffline = !isOnline.value
      isOnline.value = true
      retryCount.value = 0
      
      if (wasOffline) {
        emit('connection-restored')
        checkConnectionQuality()
        
        notificationService.addNotification({
          type: 'success',
          title: 'Connection Restored',
          message: 'Internet connection has been restored. You can continue working.',
          icon: 'bi-wifi',
          duration: 4000
        })
      }
    }
    
    const handleOffline = () => {
      const wasOnline = isOnline.value
      isOnline.value = false
      connectionQuality.value = 'offline'
      lastChecked.value = new Date()
      
      if (wasOnline) {
        emit('connection-lost')
        
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
      }
    }
    
    const checkConnectionQuality = async () => {
      if (!isOnline.value) {
        connectionQuality.value = 'offline'
        return
      }
      
      isChecking.value = true
      
      try {
        const start = Date.now()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        await fetch('/api/health', { 
          method: 'HEAD',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        const duration = Date.now() - start
        
        if (duration < 200) {
          connectionQuality.value = 'excellent'
        } else if (duration < 500) {
          connectionQuality.value = 'good'
        } else if (duration < 1000) {
          connectionQuality.value = 'fair'
        } else {
          connectionQuality.value = 'poor'
        }
        
        lastChecked.value = new Date()
        
      } catch (error) {
        connectionQuality.value = 'offline'
        lastChecked.value = new Date()
        
        if (isOnline.value) {
          // Browser thinks we're online but we can't reach the server
          notificationService.addNotification({
            type: 'warning',
            title: 'Server Unreachable',
            message: 'Cannot connect to the server. Your data remains private.',
            icon: 'bi-server',
            duration: 5000
          })
        }
      } finally {
        isChecking.value = false
      }
      
      // Emit status change
      emit('status-change', {
        isOnline: isOnline.value,
        quality: connectionQuality.value,
        lastChecked: lastChecked.value
      })
    }
    
    const checkConnection = async () => {
      await checkConnectionQuality()
    }
    
    const retryConnection = async () => {
      if (isRetrying.value) return
      
      isRetrying.value = true
      retryCount.value++
      
      try {
        // Wait a moment before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if we're back online
        if (navigator.onLine) {
          await checkConnectionQuality()
          
          if (connectionQuality.value !== 'offline') {
            notificationService.addNotification({
              type: 'success',
              title: 'Connection Restored',
              message: 'Successfully reconnected to the server.',
              icon: 'bi-wifi',
              duration: 3000
            })
          }
        }
      } catch (error) {
        console.error('Retry connection failed:', error)
      } finally {
        isRetrying.value = false
      }
    }
    
    const toggleDetails = () => {
      showDetails.value = !showDetails.value
    }
    
    // Status display methods
    const getStatusClass = () => {
      const baseClass = 'status-badge'
      
      if (!isOnline.value) {
        return `${baseClass} status-offline`
      }
      
      switch (connectionQuality.value) {
        case 'excellent':
          return `${baseClass} status-excellent`
        case 'good':
          return `${baseClass} status-good`
        case 'fair':
          return `${baseClass} status-fair`
        case 'poor':
          return `${baseClass} status-poor`
        default:
          return `${baseClass} status-unknown`
      }
    }
    
    const getStatusIcon = () => {
      if (!isOnline.value) {
        return 'bi-wifi-off'
      }
      
      switch (connectionQuality.value) {
        case 'excellent':
          return 'bi-wifi'
        case 'good':
          return 'bi-wifi'
        case 'fair':
          return 'bi-wifi-1'
        case 'poor':
          return 'bi-wifi-1'
        default:
          return 'bi-wifi-2'
      }
    }
    
    const getStatusText = () => {
      if (!isOnline.value) {
        return 'Offline'
      }
      
      switch (connectionQuality.value) {
        case 'excellent':
          return 'Excellent'
        case 'good':
          return 'Good'
        case 'fair':
          return 'Fair'
        case 'poor':
          return 'Poor'
        default:
          return 'Online'
      }
    }
    
    const getStatusTooltip = () => {
      if (!isOnline.value) {
        return 'No internet connection. Your data remains safe in browser memory.'
      }
      
      return `Connection quality: ${getStatusText()}. Click for details.`
    }
    
    const getDetailedStatus = () => {
      if (!isOnline.value) {
        return 'Offline - No Internet Connection'
      }
      
      return `Online - ${getStatusText()} Connection`
    }
    
    const getStatusTextClass = () => {
      if (!isOnline.value) {
        return 'text-danger fw-bold'
      }
      
      switch (connectionQuality.value) {
        case 'excellent':
        case 'good':
          return 'text-success fw-bold'
        case 'fair':
          return 'text-warning fw-bold'
        case 'poor':
          return 'text-danger fw-bold'
        default:
          return 'text-info fw-bold'
      }
    }
    
    const getQualityClass = () => {
      switch (connectionQuality.value) {
        case 'excellent':
          return 'text-success'
        case 'good':
          return 'text-success'
        case 'fair':
          return 'text-warning'
        case 'poor':
          return 'text-danger'
        default:
          return 'text-muted'
      }
    }
    
    const getQualityText = () => {
      switch (connectionQuality.value) {
        case 'excellent':
          return 'Excellent (< 200ms)'
        case 'good':
          return 'Good (< 500ms)'
        case 'fair':
          return 'Fair (< 1s)'
        case 'poor':
          return 'Poor (> 1s)'
        default:
          return 'Unknown'
      }
    }
    
    const formatLastChecked = () => {
      if (!lastChecked.value) return 'Never'
      
      const now = new Date()
      const diff = now - lastChecked.value
      
      if (diff < 60000) {
        return 'Just now'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)} minutes ago`
      } else {
        return lastChecked.value.toLocaleTimeString()
      }
    }
    
    // Lifecycle
    onMounted(() => {
      // Set up event listeners
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      // Initial connection check
      if (isOnline.value) {
        checkConnectionQuality()
      }
      
      // Set up periodic checks if enabled
      if (props.autoCheck && props.checkInterval > 0) {
        checkIntervalId.value = setInterval(() => {
          if (isOnline.value) {
            checkConnectionQuality()
          }
        }, props.checkInterval)
      }
    })
    
    onUnmounted(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (checkIntervalId.value) {
        clearInterval(checkIntervalId.value)
      }
    })
    
    return {
      isOnline,
      connectionQuality,
      lastChecked,
      showDetails,
      isChecking,
      isRetrying,
      retryCount,
      showIndicator,
      hasDetails,
      checkConnection,
      retryConnection,
      toggleDetails,
      getStatusClass,
      getStatusIcon,
      getStatusText,
      getStatusTooltip,
      getDetailedStatus,
      getStatusTextClass,
      getQualityClass,
      getQualityText,
      formatLastChecked
    }
  }
}
</script><sty
le scoped>
.network-status-indicator {
  position: relative;
  z-index: 1050;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  user-select: none;
}

.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.status-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.status-text {
  margin-right: 0.5rem;
}

.details-toggle {
  font-size: 0.75rem;
  transition: transform 0.3s ease;
}

.status-badge:hover .details-toggle {
  transform: rotate(180deg);
}

/* Status-specific styles */
.status-excellent {
  background-color: #d1edff;
  color: #0a58ca;
  border-color: #0a58ca;
}

.status-good {
  background-color: #d1f2eb;
  color: #0f5132;
  border-color: #198754;
}

.status-fair {
  background-color: #fff3cd;
  color: #664d03;
  border-color: #ffc107;
}

.status-poor {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #dc3545;
}

.status-offline {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #dc3545;
  animation: pulse-offline 2s infinite;
}

.status-unknown {
  background-color: #e2e3e5;
  color: #495057;
  border-color: #6c757d;
}

@keyframes pulse-offline {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Status details panel */
.status-details {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  min-width: 280px;
  z-index: 1060;
}

.details-header h6 {
  margin: 0;
  color: #495057;
  font-weight: 600;
}

.connection-info {
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #6c757d;
  font-weight: 500;
}

.status-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.status-actions .btn {
  flex: 1;
  min-width: 120px;
}

.privacy-notice {
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

/* Animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  transform-origin: top;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.8);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.8);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .status-details {
    right: -1rem;
    left: -1rem;
    min-width: auto;
  }
  
  .status-actions {
    flex-direction: column;
  }
  
  .status-actions .btn {
    width: 100%;
    min-width: auto;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .status-details {
    background: #2d2d2d;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .details-header h6 {
    color: #e9ecef;
  }
  
  .info-label {
    color: #adb5bd;
  }
  
  .privacy-notice {
    border-top-color: #404040;
  }
  
  /* Adjust status colors for dark mode */
  .status-excellent {
    background-color: #1a3a4a;
    color: #6edff6;
    border-color: #0dcaf0;
  }
  
  .status-good {
    background-color: #1a3a2a;
    color: #75b798;
    border-color: #198754;
  }
  
  .status-fair {
    background-color: #3a3a1a;
    color: #ffda6a;
    border-color: #ffc107;
  }
  
  .status-poor,
  .status-offline {
    background-color: #3a1a1a;
    color: #ea868f;
    border-color: #dc3545;
  }
  
  .status-unknown {
    background-color: #2a2a2a;
    color: #adb5bd;
    border-color: #6c757d;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .status-badge {
    border-width: 2px;
  }
  
  .status-details {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .status-badge,
  .details-toggle,
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: none;
  }
  
  .status-badge:hover {
    transform: none;
  }
  
  .status-badge:hover .details-toggle {
    transform: none;
  }
  
  .pulse-offline,
  .spin {
    animation: none;
  }
}
</style>