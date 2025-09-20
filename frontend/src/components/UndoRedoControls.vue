<template>
  <div class="undo-redo-controls">
    <!-- Compact Button Group -->
    <div v-if="layout === 'compact'" class="btn-group" role="group" aria-label="Undo/Redo controls">
      <button
        :class="getUndoButtonClass()"
        @click="performUndo"
        :disabled="!canUndo || isProcessing"
        :title="getUndoTooltip()"
        :aria-label="getUndoAriaLabel()"
      >
        <i class="bi bi-arrow-counterclockwise"></i>
        <span v-if="showLabels" class="ms-1">Undo</span>
      </button>
      
      <button
        :class="getRedoButtonClass()"
        @click="performRedo"
        :disabled="!canRedo || isProcessing"
        :title="getRedoTooltip()"
        :aria-label="getRedoAriaLabel()"
      >
        <i class="bi bi-arrow-clockwise"></i>
        <span v-if="showLabels" class="ms-1">Redo</span>
      </button>
      
      <!-- History Dropdown -->
      <div v-if="showHistory" class="btn-group" role="group">
        <button
          class="btn btn-outline-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          :disabled="history.length === 0"
          aria-expanded="false"
          title="View action history"
        >
          <i class="bi bi-clock-history"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end history-dropdown">
          <li class="dropdown-header">
            <i class="bi bi-list-ul me-2"></i>
            Action History ({{ history.length }})
          </li>
          <li v-if="history.length === 0" class="dropdown-item-text text-muted">
            No actions recorded
          </li>
          <li v-for="(action, index) in displayHistory" :key="action.id" class="history-item">
            <button
              :class="getHistoryItemClass(action, index)"
              @click="jumpToAction(action.id)"
              :disabled="isProcessing"
            >
              <div class="history-item-content">
                <div class="history-description">{{ action.description }}</div>
                <div class="history-meta">
                  <small class="text-muted">{{ formatTimestamp(action.timestamp) }}</small>
                  <span v-if="action.isCurrent" class="badge bg-primary ms-2">Current</span>
                </div>
              </div>
            </button>
          </li>
          <li v-if="history.length > maxHistoryDisplay">
            <hr class="dropdown-divider">
            <div class="dropdown-item-text text-muted text-center">
              <small>{{ history.length - maxHistoryDisplay }} more actions...</small>
            </div>
          </li>
          <li v-if="history.length > 0">
            <hr class="dropdown-divider">
            <button class="dropdown-item text-danger" @click="clearHistory">
              <i class="bi bi-trash me-2"></i>
              Clear History
            </button>
          </li>
        </ul>
      </div>
    </div>
    
    <!-- Expanded Layout -->
    <div v-else-if="layout === 'expanded'" class="expanded-controls">
      <div class="controls-header">
        <h6 class="controls-title">
          <i class="bi bi-arrow-repeat me-2"></i>
          Action History
        </h6>
        <div class="controls-stats">
          <small class="text-muted">{{ history.length }} actions</small>
        </div>
      </div>
      
      <div class="controls-actions">
        <button
          :class="getUndoButtonClass('btn-sm')"
          @click="performUndo"
          :disabled="!canUndo || isProcessing"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i>
          Undo
          <span v-if="currentAction" class="action-preview">
            {{ truncateDescription(currentAction.description) }}
          </span>
        </button>
        
        <button
          :class="getRedoButtonClass('btn-sm')"
          @click="performRedo"
          :disabled="!canRedo || isProcessing"
        >
          <i class="bi bi-arrow-clockwise me-1"></i>
          Redo
          <span v-if="nextAction" class="action-preview">
            {{ truncateDescription(nextAction.description) }}
          </span>
        </button>
        
        <button
          class="btn btn-outline-danger btn-sm"
          @click="clearHistory"
          :disabled="history.length === 0 || isProcessing"
        >
          <i class="bi bi-trash me-1"></i>
          Clear
        </button>
      </div>
      
      <!-- History Timeline -->
      <div v-if="showTimeline && history.length > 0" class="history-timeline">
        <div class="timeline-container">
          <div
            v-for="(action, index) in displayHistory"
            :key="action.id"
            :class="getTimelineItemClass(action, index)"
            @click="jumpToAction(action.id)"
          >
            <div class="timeline-marker">
              <i :class="getActionIcon(action.type)"></i>
            </div>
            <div class="timeline-content">
              <div class="timeline-description">{{ action.description }}</div>
              <div class="timeline-timestamp">
                <small class="text-muted">{{ formatTimestamp(action.timestamp) }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Floating Action Button -->
    <div v-else-if="layout === 'fab'" class="fab-controls">
      <div class="fab-group">
        <button
          class="btn btn-primary btn-fab"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#fabControls"
          aria-expanded="false"
          aria-controls="fabControls"
        >
          <i class="bi bi-arrow-repeat"></i>
        </button>
        
        <div class="collapse fab-collapse" id="fabControls">
          <div class="fab-menu">
            <button
              :class="getUndoButtonClass('btn-fab-item')"
              @click="performUndo"
              :disabled="!canUndo || isProcessing"
              :title="getUndoTooltip()"
            >
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
            
            <button
              :class="getRedoButtonClass('btn-fab-item')"
              @click="performRedo"
              :disabled="!canRedo || isProcessing"
              :title="getRedoTooltip()"
            >
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            
            <button
              class="btn btn-outline-secondary btn-fab-item"
              @click="toggleHistoryModal"
              :disabled="history.length === 0"
              title="View history"
            >
              <i class="bi bi-clock-history"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Processing Indicator -->
    <div v-if="isProcessing" class="processing-indicator">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Processing...</span>
      </div>
      <span class="processing-text">{{ processingMessage }}</span>
    </div>
    
    <!-- History Modal (for FAB layout) -->
    <Teleport to="body">
      <div v-if="showHistoryModal" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-clock-history me-2"></i>
                Action History
              </h5>
              <button type="button" class="btn-close" @click="closeHistoryModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="history.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-clock-history display-4 mb-3"></i>
                <p>No actions recorded yet</p>
                <p>Actions will appear here as you work with your data</p>
              </div>
              
              <div v-else class="history-list">
                <div
                  v-for="(action, index) in history"
                  :key="action.id"
                  :class="getModalHistoryItemClass(action, index)"
                  @click="jumpToAction(action.id)"
                >
                  <div class="history-item-icon">
                    <i :class="getActionIcon(action.type)"></i>
                  </div>
                  <div class="history-item-details">
                    <div class="history-item-description">{{ action.description }}</div>
                    <div class="history-item-meta">
                      <small class="text-muted">{{ formatTimestamp(action.timestamp) }}</small>
                      <span v-if="action.isCurrent" class="badge bg-primary ms-2">Current</span>
                    </div>
                  </div>
                  <div class="history-item-actions">
                    <button
                      v-if="!action.isCurrent"
                      class="btn btn-sm btn-outline-primary"
                      @click.stop="jumpToAction(action.id)"
                      :disabled="isProcessing"
                    >
                      Jump Here
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeHistoryModal">
                Close
              </button>
              <button
                type="button"
                class="btn btn-outline-danger"
                @click="clearHistory"
                :disabled="history.length === 0 || isProcessing"
              >
                <i class="bi bi-trash me-1"></i>
                Clear History
              </button>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show"></div>
      </div>
    </Teleport>
    
    <!-- Privacy Notice -->
    <div v-if="showPrivacyNotice" class="privacy-notice mt-2">
      <small class="text-muted">
        <i class="bi bi-shield-check text-success me-1"></i>
        Action history is stored in browser memory only and automatically cleared when you close the tab.
      </small>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useUndoRedo, ACTION_TYPES } from '../services/undoRedo'
import { notificationService } from '../services/notifications'

export default {
  name: 'UndoRedoControls',
  props: {
    layout: {
      type: String,
      default: 'compact',
      validator: value => ['compact', 'expanded', 'fab'].includes(value)
    },
    showLabels: {
      type: Boolean,
      default: false
    },
    showHistory: {
      type: Boolean,
      default: true
    },
    showTimeline: {
      type: Boolean,
      default: true
    },
    showPrivacyNotice: {
      type: Boolean,
      default: false
    },
    maxHistoryDisplay: {
      type: Number,
      default: 10
    },
    size: {
      type: String,
      default: 'normal',
      validator: value => ['sm', 'normal', 'lg'].includes(value)
    }
  },
  emits: ['action-performed', 'history-changed'],
  setup(props, { emit }) {
    const {
      history,
      canUndo,
      canRedo,
      currentAction,
      nextAction,
      undo,
      redo,
      jumpToAction: jumpToHistoryAction,
      clearHistory: clearUndoHistory
    } = useUndoRedo()
    
    // State
    const isProcessing = ref(false)
    const processingMessage = ref('')
    const showHistoryModal = ref(false)
    
    // Computed
    const displayHistory = computed(() => {
      return history.value.slice(-props.maxHistoryDisplay).reverse()
    })
    
    // Methods
    const performUndo = async () => {
      if (!canUndo.value || isProcessing.value) return
      
      isProcessing.value = true
      processingMessage.value = 'Undoing action...'
      
      try {
        const result = await undo()
        
        if (result.success) {
          emit('action-performed', { type: 'undo', action: result.action })
        } else {
          notificationService.addNotification({
            type: 'error',
            title: 'Undo Failed',
            message: result.message || 'Unable to undo the last action',
            icon: 'bi-exclamation-triangle',
            duration: 4000
          })
        }
      } catch (error) {
        console.error('Undo error:', error)
        notificationService.addNotification({
          type: 'error',
          title: 'Undo Error',
          message: 'An error occurred while undoing the action',
          icon: 'bi-exclamation-triangle',
          duration: 4000
        })
      } finally {
        isProcessing.value = false
        processingMessage.value = ''
      }
    }
    
    const performRedo = async () => {
      if (!canRedo.value || isProcessing.value) return
      
      isProcessing.value = true
      processingMessage.value = 'Redoing action...'
      
      try {
        const result = await redo()
        
        if (result.success) {
          emit('action-performed', { type: 'redo', action: result.action })
        } else {
          notificationService.addNotification({
            type: 'error',
            title: 'Redo Failed',
            message: result.message || 'Unable to redo the action',
            icon: 'bi-exclamation-triangle',
            duration: 4000
          })
        }
      } catch (error) {
        console.error('Redo error:', error)
        notificationService.addNotification({
          type: 'error',
          title: 'Redo Error',
          message: 'An error occurred while redoing the action',
          icon: 'bi-exclamation-triangle',
          duration: 4000
        })
      } finally {
        isProcessing.value = false
        processingMessage.value = ''
      }
    }
    
    const jumpToAction = async (actionId) => {
      if (isProcessing.value) return
      
      isProcessing.value = true
      processingMessage.value = 'Jumping to action...'
      
      try {
        const result = await jumpToHistoryAction(actionId)
        
        if (result.success) {
          emit('action-performed', { type: 'jump', action: result.action })
          closeHistoryModal()
        } else {
          notificationService.addNotification({
            type: 'error',
            title: 'Jump Failed',
            message: result.message || 'Unable to jump to the selected action',
            icon: 'bi-exclamation-triangle',
            duration: 4000
          })
        }
      } catch (error) {
        console.error('Jump error:', error)
        notificationService.addNotification({
          type: 'error',
          title: 'Jump Error',
          message: 'An error occurred while jumping to the action',
          icon: 'bi-exclamation-triangle',
          duration: 4000
        })
      } finally {
        isProcessing.value = false
        processingMessage.value = ''
      }
    }
    
    const clearHistory = () => {
      clearUndoHistory()
      emit('history-changed', { type: 'cleared' })
      closeHistoryModal()
    }
    
    const toggleHistoryModal = () => {
      showHistoryModal.value = !showHistoryModal.value
    }
    
    const closeHistoryModal = () => {
      showHistoryModal.value = false
    }
    
    // UI Helper Methods
    const getUndoButtonClass = (extraClass = '') => {
      const baseClass = 'btn'
      const sizeClass = props.size === 'sm' ? 'btn-sm' : props.size === 'lg' ? 'btn-lg' : ''
      const variantClass = canUndo.value ? 'btn-outline-primary' : 'btn-outline-secondary'
      
      return `${baseClass} ${variantClass} ${sizeClass} ${extraClass}`.trim()
    }
    
    const getRedoButtonClass = (extraClass = '') => {
      const baseClass = 'btn'
      const sizeClass = props.size === 'sm' ? 'btn-sm' : props.size === 'lg' ? 'btn-lg' : ''
      const variantClass = canRedo.value ? 'btn-outline-primary' : 'btn-outline-secondary'
      
      return `${baseClass} ${variantClass} ${sizeClass} ${extraClass}`.trim()
    }
    
    const getHistoryItemClass = (action, index) => {
      const baseClass = 'dropdown-item history-action'
      const currentClass = action.isCurrent ? 'active' : ''
      const futureClass = !action.canUndo ? 'future-action' : ''
      
      return `${baseClass} ${currentClass} ${futureClass}`.trim()
    }
    
    const getTimelineItemClass = (action, index) => {
      const baseClass = 'timeline-item'
      const currentClass = action.isCurrent ? 'current' : ''
      const pastClass = action.canUndo && !action.isCurrent ? 'past' : ''
      const futureClass = !action.canUndo ? 'future' : ''
      
      return `${baseClass} ${currentClass} ${pastClass} ${futureClass}`.trim()
    }
    
    const getModalHistoryItemClass = (action, index) => {
      const baseClass = 'history-item'
      const currentClass = action.isCurrent ? 'current' : ''
      const clickableClass = !action.isCurrent ? 'clickable' : ''
      
      return `${baseClass} ${currentClass} ${clickableClass}`.trim()
    }
    
    const getActionIcon = (actionType) => {
      const icons = {
        [ACTION_TYPES.DATA_UPLOAD]: 'bi-upload',
        [ACTION_TYPES.DATA_CLEANING]: 'bi-brush',
        [ACTION_TYPES.DATA_TRANSFORMATION]: 'bi-arrow-repeat',
        [ACTION_TYPES.CONFIG_CHANGE]: 'bi-gear',
        [ACTION_TYPES.FORECAST_GENERATION]: 'bi-graph-up',
        [ACTION_TYPES.MODEL_COMPARISON]: 'bi-bar-chart',
        [ACTION_TYPES.EXPORT_OPERATION]: 'bi-download'
      }
      
      return icons[actionType] || 'bi-circle'
    }
    
    const getUndoTooltip = () => {
      if (!canUndo.value) return 'Nothing to undo'
      if (currentAction.value) return `Undo: ${currentAction.value.description}`
      return 'Undo last action'
    }
    
    const getRedoTooltip = () => {
      if (!canRedo.value) return 'Nothing to redo'
      if (nextAction.value) return `Redo: ${nextAction.value.description}`
      return 'Redo next action'
    }
    
    const getUndoAriaLabel = () => {
      if (!canUndo.value) return 'Undo (disabled)'
      return `Undo ${currentAction.value?.description || 'last action'}`
    }
    
    const getRedoAriaLabel = () => {
      if (!canRedo.value) return 'Redo (disabled)'
      return `Redo ${nextAction.value?.description || 'next action'}`
    }
    
    const truncateDescription = (description, maxLength = 30) => {
      if (!description) return ''
      return description.length > maxLength 
        ? `${description.substring(0, maxLength)}...` 
        : description
    }
    
    const formatTimestamp = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
      return date.toLocaleDateString()
    }
    
    // Watch for history changes
    watch(history, (newHistory) => {
      emit('history-changed', { type: 'updated', history: newHistory })
    }, { deep: true })
    
    return {
      // State
      isProcessing,
      processingMessage,
      showHistoryModal,
      
      // Computed
      history,
      canUndo,
      canRedo,
      currentAction,
      nextAction,
      displayHistory,
      
      // Methods
      performUndo,
      performRedo,
      jumpToAction,
      clearHistory,
      toggleHistoryModal,
      closeHistoryModal,
      
      // UI Helpers
      getUndoButtonClass,
      getRedoButtonClass,
      getHistoryItemClass,
      getTimelineItemClass,
      getModalHistoryItemClass,
      getActionIcon,
      getUndoTooltip,
      getRedoTooltip,
      getUndoAriaLabel,
      getRedoAriaLabel,
      truncateDescription,
      formatTimestamp
    }
  }
}
</script><style 
scoped>
.undo-redo-controls {
  position: relative;
}

/* Compact Layout */
.btn-group .btn {
  transition: all 0.2s ease;
}

.btn-group .btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.history-dropdown {
  min-width: 300px;
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  margin: 0;
}

.history-action {
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: all 0.2s ease;
}

.history-action:hover {
  background-color: #f8f9fa;
}

.history-action.active {
  background-color: #e7f3ff;
  border-left: 3px solid #0d6efd;
}

.history-action.future-action {
  opacity: 0.6;
  font-style: italic;
}

.history-item-content {
  display: flex;
  flex-direction: column;
}

.history-description {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Expanded Layout */
.expanded-controls {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.controls-title {
  margin: 0;
  color: #495057;
  font-weight: 600;
}

.controls-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.controls-actions .btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.action-preview {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-left: 0.5rem;
}

/* Timeline */
.history-timeline {
  max-height: 300px;
  overflow-y: auto;
}

.timeline-container {
  position: relative;
  padding-left: 2rem;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #dee2e6;
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.timeline-item:hover {
  transform: translateX(4px);
}

.timeline-item.current .timeline-marker {
  background: #0d6efd;
  color: white;
  box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.2);
}

.timeline-item.past .timeline-marker {
  background: #6c757d;
  color: white;
}

.timeline-item.future .timeline-marker {
  background: #e9ecef;
  color: #6c757d;
  opacity: 0.6;
}

.timeline-marker {
  position: absolute;
  left: -2rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  z-index: 1;
  transition: all 0.2s ease;
}

.timeline-content {
  flex: 1;
  padding-left: 1rem;
}

.timeline-description {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #495057;
}

.timeline-timestamp {
  color: #6c757d;
}

/* FAB Layout */
.fab-controls {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1040;
}

.fab-group {
  position: relative;
}

.btn-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.3s ease;
}

.btn-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.fab-collapse {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 1rem;
}

.fab-menu {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-end;
}

.btn-fab-item {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-fab-item:hover:not(:disabled) {
  transform: scale(1.05);
}

/* Processing Indicator */
.processing-indicator {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(13, 110, 253, 0.1);
  border: 1px solid rgba(13, 110, 253, 0.2);
  border-radius: 6px;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #0d6efd;
}

.processing-text {
  font-weight: 500;
}

/* History Modal */
.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
}

.history-item.clickable {
  cursor: pointer;
}

.history-item.clickable:hover {
  background-color: #f8f9fa;
  border-color: #0d6efd;
  transform: translateY(-1px);
}

.history-item.current {
  background-color: #e7f3ff;
  border-color: #0d6efd;
}

.history-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  color: #6c757d;
}

.history-item.current .history-item-icon {
  background: #0d6efd;
  color: white;
}

.history-item-details {
  flex: 1;
}

.history-item-description {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #495057;
}

.history-item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-item-actions {
  margin-left: 1rem;
}

/* Privacy Notice */
.privacy-notice {
  padding: 0.5rem;
  background: rgba(25, 135, 84, 0.1);
  border-radius: 6px;
  border-left: 3px solid #198754;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .expanded-controls {
    padding: 0.75rem;
  }
  
  .controls-actions {
    flex-direction: column;
  }
  
  .controls-actions .btn {
    width: 100%;
    justify-content: center;
  }
  
  .timeline-container {
    padding-left: 1.5rem;
  }
  
  .timeline-marker {
    left: -1.5rem;
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.7rem;
  }
  
  .fab-controls {
    bottom: 1rem;
    right: 1rem;
  }
  
  .btn-fab {
    width: 48px;
    height: 48px;
    font-size: 1rem;
  }
  
  .btn-fab-item {
    width: 40px;
    height: 40px;
    font-size: 0.9rem;
  }
  
  .history-dropdown {
    min-width: 280px;
  }
  
  .history-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .history-item-icon {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  .history-item-actions {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
  }
  
  .history-item-actions .btn {
    width: 100%;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .expanded-controls {
    background: #2d2d2d;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .controls-header {
    border-bottom-color: #404040;
  }
  
  .controls-title {
    color: #e9ecef;
  }
  
  .timeline-container::before {
    background: #404040;
  }
  
  .timeline-marker {
    background: #2d2d2d;
    border-color: #404040;
    color: #adb5bd;
  }
  
  .timeline-description {
    color: #e9ecef;
  }
  
  .timeline-timestamp {
    color: #adb5bd;
  }
  
  .history-action:hover {
    background-color: #404040;
  }
  
  .history-action.active {
    background-color: #1a3a4a;
    border-left-color: #0dcaf0;
  }
  
  .history-item {
    background: #2d2d2d;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .history-item.clickable:hover {
    background-color: #404040;
    border-color: #0dcaf0;
  }
  
  .history-item.current {
    background-color: #1a3a4a;
    border-color: #0dcaf0;
  }
  
  .history-item-icon {
    background: #404040;
    color: #adb5bd;
  }
  
  .history-item.current .history-item-icon {
    background: #0dcaf0;
    color: #000;
  }
  
  .history-item-description {
    color: #e9ecef;
  }
  
  .processing-indicator {
    background: rgba(102, 178, 255, 0.1);
    border-color: rgba(102, 178, 255, 0.2);
    color: #66b2ff;
  }
  
  .privacy-notice {
    background: rgba(102, 217, 102, 0.1);
    border-left-color: #66d966;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .expanded-controls,
  .history-item {
    border-width: 2px;
  }
  
  .timeline-marker {
    border-width: 3px;
  }
  
  .privacy-notice {
    border-left-width: 4px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .btn-group .btn,
  .timeline-item,
  .btn-fab,
  .btn-fab-item,
  .history-item,
  .timeline-marker {
    transition: none;
  }
  
  .btn-group .btn:hover,
  .timeline-item:hover,
  .btn-fab:hover,
  .btn-fab-item:hover,
  .history-item:hover {
    transform: none;
  }
}

/* Focus Styles for Accessibility */
.btn:focus,
.history-action:focus,
.timeline-item:focus,
.history-item:focus {
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  outline: none;
}

/* Scrollbar Styling */
.history-dropdown::-webkit-scrollbar,
.history-timeline::-webkit-scrollbar,
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-dropdown::-webkit-scrollbar-track,
.history-timeline::-webkit-scrollbar-track,
.history-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.history-dropdown::-webkit-scrollbar-thumb,
.history-timeline::-webkit-scrollbar-thumb,
.history-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.history-dropdown::-webkit-scrollbar-thumb:hover,
.history-timeline::-webkit-scrollbar-thumb:hover,
.history-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>