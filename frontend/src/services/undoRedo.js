// Privacy-focused undo/redo system for session management
import { ref, computed, watch } from 'vue'
import { notificationService } from './notifications'

/**
 * Action types for undo/redo operations
 */
export const ACTION_TYPES = {
  DATA_UPLOAD: 'data_upload',
  DATA_CLEANING: 'data_cleaning',
  DATA_TRANSFORMATION: 'data_transformation',
  CONFIG_CHANGE: 'config_change',
  FORECAST_GENERATION: 'forecast_generation',
  MODEL_COMPARISON: 'model_comparison',
  EXPORT_OPERATION: 'export_operation'
}

/**
 * Undo/Redo service for session-based operations
 */
class UndoRedoService {
  constructor() {
    this.history = []
    this.currentIndex = -1
    this.maxHistorySize = 20 // Limit for memory management
    this.listeners = []
  }

  /**
   * Record an action that can be undone
   */
  recordAction(action) {
    // Validate action structure
    if (!this.isValidAction(action)) {
      console.warn('Invalid action recorded:', action)
      return false
    }

    // Remove any actions after current index (when branching)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // Add new action
    this.history.push({
      id: this.generateActionId(),
      timestamp: new Date().toISOString(),
      ...action
    })

    // Maintain history size limit
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
    }

    this.currentIndex = this.history.length - 1
    this.notifyListeners('action-recorded', action)

    return true
  }

  /**
   * Undo the last action
   */
  async undo() {
    if (!this.canUndo()) {
      return { success: false, message: 'Nothing to undo' }
    }

    const action = this.history[this.currentIndex]
    
    try {
      // Execute undo function if provided
      if (action.undoFunction) {
        await action.undoFunction(action.undoData)
      }

      this.currentIndex--
      this.notifyListeners('action-undone', action)

      // Show notification
      notificationService.addNotification({
        type: 'info',
        title: 'Action Undone',
        message: `${action.description} has been undone`,
        icon: 'bi-arrow-counterclockwise',
        duration: 3000,
        actions: [
          { label: 'Redo', action: 'redo-action', variant: 'outline-primary' }
        ]
      })

      return { success: true, action }
    } catch (error) {
      console.error('Undo failed:', error)
      
      notificationService.addNotification({
        type: 'error',
        title: 'Undo Failed',
        message: 'Unable to undo the last action. Your data remains safe.',
        icon: 'bi-exclamation-triangle',
        duration: 5000
      })

      return { success: false, error }
    }
  }

  /**
   * Redo the next action
   */
  async redo() {
    if (!this.canRedo()) {
      return { success: false, message: 'Nothing to redo' }
    }

    const action = this.history[this.currentIndex + 1]
    
    try {
      // Execute redo function if provided
      if (action.redoFunction) {
        await action.redoFunction(action.redoData)
      }

      this.currentIndex++
      this.notifyListeners('action-redone', action)

      // Show notification
      notificationService.addNotification({
        type: 'info',
        title: 'Action Redone',
        message: `${action.description} has been redone`,
        icon: 'bi-arrow-clockwise',
        duration: 3000
      })

      return { success: true, action }
    } catch (error) {
      console.error('Redo failed:', error)
      
      notificationService.addNotification({
        type: 'error',
        title: 'Redo Failed',
        message: 'Unable to redo the action. Your data remains safe.',
        icon: 'bi-exclamation-triangle',
        duration: 5000
      })

      return { success: false, error }
    }
  }

  /**
   * Check if undo is possible
   */
  canUndo() {
    return this.currentIndex >= 0
  }

  /**
   * Check if redo is possible
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get current action
   */
  getCurrentAction() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex]
    }
    return null
  }

  /**
   * Get next action (for redo)
   */
  getNextAction() {
    const nextIndex = this.currentIndex + 1
    if (nextIndex < this.history.length) {
      return this.history[nextIndex]
    }
    return null
  }

  /**
   * Get action history for display
   */
  getHistory() {
    return this.history.map((action, index) => ({
      ...action,
      isCurrent: index === this.currentIndex,
      canUndo: index <= this.currentIndex,
      canRedo: index > this.currentIndex
    }))
  }

  /**
   * Clear all history
   */
  clearHistory() {
    const clearedCount = this.history.length
    this.history = []
    this.currentIndex = -1
    this.notifyListeners('history-cleared', { clearedCount })

    notificationService.addNotification({
      type: 'info',
      title: 'History Cleared',
      message: `${clearedCount} action${clearedCount !== 1 ? 's' : ''} cleared from history`,
      icon: 'bi-trash',
      duration: 3000
    })
  }

  /**
   * Jump to specific action in history
   */
  async jumpToAction(actionId) {
    const targetIndex = this.history.findIndex(action => action.id === actionId)
    if (targetIndex === -1) {
      return { success: false, message: 'Action not found in history' }
    }

    const currentIndex = this.currentIndex
    
    try {
      // Determine direction and execute appropriate functions
      if (targetIndex < currentIndex) {
        // Undo to target
        for (let i = currentIndex; i > targetIndex; i--) {
          const action = this.history[i]
          if (action.undoFunction) {
            await action.undoFunction(action.undoData)
          }
        }
      } else if (targetIndex > currentIndex) {
        // Redo to target
        for (let i = currentIndex + 1; i <= targetIndex; i++) {
          const action = this.history[i]
          if (action.redoFunction) {
            await action.redoFunction(action.redoData)
          }
        }
      }

      this.currentIndex = targetIndex
      this.notifyListeners('jumped-to-action', this.history[targetIndex])

      return { success: true, action: this.history[targetIndex] }
    } catch (error) {
      console.error('Jump to action failed:', error)
      return { success: false, error }
    }
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Listener error:', error)
      }
    })
  }

  /**
   * Validate action structure
   */
  isValidAction(action) {
    return (
      action &&
      typeof action.type === 'string' &&
      typeof action.description === 'string' &&
      (action.undoFunction === undefined || typeof action.undoFunction === 'function') &&
      (action.redoFunction === undefined || typeof action.redoFunction === 'function')
    )
  }

  /**
   * Generate unique action ID
   */
  generateActionId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get statistics about history usage
   */
  getStats() {
    return {
      totalActions: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      actionTypes: this.getActionTypeStats(),
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Get statistics by action type
   */
  getActionTypeStats() {
    const stats = {}
    this.history.forEach(action => {
      stats[action.type] = (stats[action.type] || 0) + 1
    })
    return stats
  }

  /**
   * Estimate memory usage of history
   */
  estimateMemoryUsage() {
    // Rough estimation in KB
    const jsonSize = JSON.stringify(this.history).length
    return Math.round(jsonSize / 1024)
  }
}

// Create singleton instance
export const undoRedoService = new UndoRedoService()

/**
 * Vue composable for undo/redo functionality
 */
export function useUndoRedo() {
  const history = ref([])
  const currentIndex = ref(-1)
  const canUndo = ref(false)
  const canRedo = ref(false)
  const currentAction = ref(null)
  const nextAction = ref(null)

  // Update reactive state
  const updateState = () => {
    history.value = undoRedoService.getHistory()
    currentIndex.value = undoRedoService.currentIndex
    canUndo.value = undoRedoService.canUndo()
    canRedo.value = undoRedoService.canRedo()
    currentAction.value = undoRedoService.getCurrentAction()
    nextAction.value = undoRedoService.getNextAction()
  }

  // Subscribe to changes
  const unsubscribe = undoRedoService.subscribe(() => {
    updateState()
  })

  // Initial state update
  updateState()

  // Cleanup on unmount
  const cleanup = () => {
    unsubscribe()
  }

  return {
    // State
    history: computed(() => history.value),
    currentIndex: computed(() => currentIndex.value),
    canUndo: computed(() => canUndo.value),
    canRedo: computed(() => canRedo.value),
    currentAction: computed(() => currentAction.value),
    nextAction: computed(() => nextAction.value),

    // Methods
    recordAction: undoRedoService.recordAction.bind(undoRedoService),
    undo: undoRedoService.undo.bind(undoRedoService),
    redo: undoRedoService.redo.bind(undoRedoService),
    jumpToAction: undoRedoService.jumpToAction.bind(undoRedoService),
    clearHistory: undoRedoService.clearHistory.bind(undoRedoService),
    getStats: undoRedoService.getStats.bind(undoRedoService),

    // Cleanup
    cleanup
  }
}

/**
 * Helper function to create action objects
 */
export function createAction(type, description, options = {}) {
  return {
    type,
    description,
    undoFunction: options.undoFunction,
    redoFunction: options.redoFunction,
    undoData: options.undoData,
    redoData: options.redoData,
    metadata: options.metadata || {}
  }
}

/**
 * Helper functions for common actions
 */
export const actionHelpers = {
  /**
   * Create data upload action
   */
  createDataUploadAction(filename, undoFunction, redoFunction) {
    return createAction(
      ACTION_TYPES.DATA_UPLOAD,
      `Upload file: ${filename}`,
      { undoFunction, redoFunction }
    )
  },

  /**
   * Create configuration change action
   */
  createConfigChangeAction(configName, oldConfig, newConfig, applyFunction) {
    return createAction(
      ACTION_TYPES.CONFIG_CHANGE,
      `Change ${configName} configuration`,
      {
        undoFunction: () => applyFunction(oldConfig),
        redoFunction: () => applyFunction(newConfig),
        undoData: oldConfig,
        redoData: newConfig
      }
    )
  },

  /**
   * Create data cleaning action
   */
  createDataCleaningAction(operation, undoFunction, redoFunction) {
    return createAction(
      ACTION_TYPES.DATA_CLEANING,
      `Data cleaning: ${operation}`,
      { undoFunction, redoFunction }
    )
  },

  /**
   * Create forecast generation action
   */
  createForecastAction(modelName, undoFunction, redoFunction) {
    return createAction(
      ACTION_TYPES.FORECAST_GENERATION,
      `Generate forecast: ${modelName}`,
      { undoFunction, redoFunction }
    )
  }
}

export default undoRedoService