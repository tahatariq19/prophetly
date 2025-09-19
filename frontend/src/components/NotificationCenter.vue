<template>
  <div class="notification-center">
    <!-- Notification Container -->
    <div class="notification-container" v-if="notifications.length > 0">
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="getNotificationClass(notification)"
          class="notification-item"
        >
          <div class="d-flex align-items-start">
            <!-- Icon -->
            <div class="notification-icon me-3">
              <i :class="notification.icon || getDefaultIcon(notification.type)"></i>
            </div>
            
            <!-- Content -->
            <div class="notification-content flex-grow-1">
              <h6 class="notification-title mb-1">{{ notification.title }}</h6>
              <p class="notification-message mb-2">{{ notification.message }}</p>
              
              <!-- Actions -->
              <div class="notification-actions" v-if="notification.actions && notification.actions.length > 0">
                <button
                  v-for="action in notification.actions"
                  :key="action.action"
                  :class="`btn btn-sm btn-${action.variant || 'primary'} me-2`"
                  @click="handleAction(notification, action)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
            
            <!-- Close Button -->
            <button
              type="button"
              class="btn-close btn-close-white"
              @click="removeNotification(notification.id)"
              :class="{ 'btn-close-dark': notification.type === 'info' || notification.type === 'warning' }"
            ></button>
          </div>
          
          <!-- Progress Bar for Auto-Remove -->
          <div
            v-if="notification.autoRemove !== false && notification.duration"
            class="notification-progress"
          >
            <div
              class="progress-bar"
              :style="{ animationDuration: `${notification.duration}ms` }"
            ></div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script>
import { useNotifications } from '../services/notifications'

export default {
  name: 'NotificationCenter',
  emits: ['action'],
  setup(_, { emit }) {
    const { notifications, removeNotification } = useNotifications()
    
    const getNotificationClass = (notification) => {
      const baseClass = 'alert notification'
      const typeClass = {
        success: 'alert-success',
        error: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info'
      }[notification.type] || 'alert-info'
      
      const priorityClass = notification.priority === 'high' ? 'notification-high-priority' : ''
      
      return `${baseClass} ${typeClass} ${priorityClass}`.trim()
    }
    
    const getDefaultIcon = (type) => {
      return {
        success: 'bi bi-check-circle-fill',
        error: 'bi bi-exclamation-triangle-fill',
        warning: 'bi bi-exclamation-triangle-fill',
        info: 'bi bi-info-circle-fill'
      }[type] || 'bi bi-info-circle-fill'
    }
    
    const handleAction = (notification, action) => {
      emit('action', {
        notificationId: notification.id,
        action: action.action,
        notification,
        actionData: action
      })
      
      // Remove notification after action unless specified otherwise
      if (action.keepNotification !== true) {
        removeNotification(notification.id)
      }
    }
    
    return {
      notifications,
      removeNotification,
      getNotificationClass,
      getDefaultIcon,
      handleAction
    }
  }
}
</script>

<style scoped>
.notification-center {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1060;
  max-width: 400px;
  width: 100%;
}

.notification-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: none;
  overflow: hidden;
}

.notification-high-priority {
  border-left: 4px solid #dc3545;
}

.notification-icon {
  font-size: 1.25rem;
  margin-top: 2px;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 0.9rem;
  margin-bottom: 8px;
  line-height: 1.4;
}

.notification-actions {
  margin-top: 8px;
}

.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  width: 100%;
  animation: progress-countdown linear forwards;
  transform-origin: left;
}

@keyframes progress-countdown {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Notification Transitions */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Alert Type Specific Styles */
.alert-success {
  background-color: #d1edff;
  border-color: #0d6efd;
  color: #0a3d62;
}

.alert-success .notification-icon {
  color: #198754;
}

.alert-danger {
  background-color: #f8d7da;
  border-color: #dc3545;
  color: #721c24;
}

.alert-danger .notification-icon {
  color: #dc3545;
}

.alert-warning {
  background-color: #fff3cd;
  border-color: #ffc107;
  color: #664d03;
}

.alert-warning .notification-icon {
  color: #f57c00;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #0dcaf0;
  color: #055160;
}

.alert-info .notification-icon {
  color: #0dcaf0;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .notification-center {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .notification-item {
    margin-bottom: 10px;
  }
  
  .notification-actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .notification-actions .btn {
    margin-right: 0 !important;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .notification-item {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .alert-success {
    background-color: #0f2419;
    border-color: #198754;
    color: #75b798;
  }
  
  .alert-danger {
    background-color: #2c0b0e;
    border-color: #dc3545;
    color: #ea868f;
  }
  
  .alert-warning {
    background-color: #332701;
    border-color: #ffc107;
    color: #ffda6a;
  }
  
  .alert-info {
    background-color: #032830;
    border-color: #0dcaf0;
    color: #6edff6;
  }
}
</style>