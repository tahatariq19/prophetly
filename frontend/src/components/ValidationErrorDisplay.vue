<template>
  <div class="validation-error-display" v-if="hasErrors">
    <!-- Summary Alert -->
    <div class="alert alert-warning validation-summary" role="alert">
      <div class="d-flex align-items-start">
        <i class="bi bi-exclamation-triangle-fill me-3 fs-5 flex-shrink-0 mt-1"></i>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-2">
            <strong>Please correct the following {{ errorCount }} {{ errorCount === 1 ? 'issue' : 'issues' }}:</strong>
          </h6>
          
          <!-- Error List -->
          <ul class="error-list mb-3" v-if="showErrorList">
            <li v-for="error in displayErrors" :key="error.id" class="error-item">
              <strong v-if="error.field">{{ getFieldLabel(error.field) }}:</strong>
              {{ error.message }}
            </li>
          </ul>
          
          <!-- Privacy Notice -->
          <div class="privacy-notice">
            <i class="bi bi-shield-check text-success me-2"></i>
            <small class="text-muted">
              <strong>Privacy Protected:</strong> Validation errors are processed locally. 
              No invalid data is transmitted to our servers.
            </small>
          </div>
          
          <!-- Actions -->
          <div class="error-actions mt-3" v-if="showActions">
            <button 
              class="btn btn-sm btn-outline-primary me-2"
              @click="scrollToFirstError"
              v-if="hasFieldErrors"
            >
              <i class="bi bi-arrow-up-circle me-1"></i>
              Go to First Error
            </button>
            
            <button 
              class="btn btn-sm btn-outline-secondary me-2"
              @click="clearAllErrors"
              v-if="allowClear"
            >
              <i class="bi bi-x-circle me-1"></i>
              Clear Errors
            </button>
            
            <button 
              class="btn btn-sm btn-outline-info"
              @click="showHelp"
              v-if="hasHelpContent"
            >
              <i class="bi bi-question-circle me-1"></i>
              Get Help
            </button>
          </div>
        </div>
        
        <!-- Dismiss Button -->
        <button 
          type="button" 
          class="btn-close" 
          @click="dismiss"
          v-if="dismissible"
          :aria-label="$t ? $t('close') : 'Close'"
        ></button>
      </div>
    </div>
    
    <!-- Help Section -->
    <Transition name="slide-down">
      <div v-if="showHelpSection" class="help-section">
        <div class="card border-info">
          <div class="card-header bg-light">
            <h6 class="mb-0">
              <i class="bi bi-lightbulb me-2"></i>
              Validation Help
            </h6>
          </div>
          <div class="card-body">
            <div class="help-content">
              <!-- General Help -->
              <div class="help-category mb-3">
                <h6 class="help-category-title">Common Issues:</h6>
                <ul class="help-tips">
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    Ensure all required fields are filled out
                  </li>
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    Check that numeric values are properly formatted
                  </li>
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    Verify file formats match requirements (CSV for uploads)
                  </li>
                  <li>
                    <i class="bi bi-check-circle text-success me-2"></i>
                    Make sure dates are in a recognized format
                  </li>
                </ul>
              </div>
              
              <!-- Field-Specific Help -->
              <div class="help-category" v-if="hasFieldSpecificHelp">
                <h6 class="help-category-title">Field-Specific Help:</h6>
                <div class="field-help-items">
                  <div 
                    v-for="fieldHelp in getFieldSpecificHelp()" 
                    :key="fieldHelp.field"
                    class="field-help-item"
                  >
                    <strong>{{ getFieldLabel(fieldHelp.field) }}:</strong>
                    <span class="text-muted">{{ fieldHelp.help }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Privacy Information -->
              <div class="help-category">
                <h6 class="help-category-title">Privacy Information:</h6>
                <div class="privacy-help">
                  <div class="d-flex align-items-start mb-2">
                    <i class="bi bi-shield-check text-success me-2 mt-1"></i>
                    <div>
                      <strong>Client-Side Validation:</strong>
                      <span class="text-muted">
                        All validation happens in your browser before any data is sent.
                      </span>
                    </div>
                  </div>
                  <div class="d-flex align-items-start">
                    <i class="bi bi-server text-info me-2 mt-1"></i>
                    <div>
                      <strong>Server Protection:</strong>
                      <span class="text-muted">
                        Invalid data is rejected at the server and never stored.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'

export default {
  name: 'ValidationErrorDisplay',
  props: {
    errors: {
      type: Array,
      default: () => []
    },
    fieldLabels: {
      type: Object,
      default: () => ({})
    },
    showErrorList: {
      type: Boolean,
      default: true
    },
    showActions: {
      type: Boolean,
      default: true
    },
    dismissible: {
      type: Boolean,
      default: true
    },
    allowClear: {
      type: Boolean,
      default: true
    },
    maxDisplayErrors: {
      type: Number,
      default: 10
    },
    fieldHelpContent: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['clear-errors', 'dismiss', 'scroll-to-field'],
  setup(props, { emit }) {
    const showHelpSection = ref(false)
    
    // Computed properties
    const hasErrors = computed(() => {
      return Array.isArray(props.errors) && props.errors.length > 0
    })
    
    const errorCount = computed(() => {
      return props.errors.length
    })
    
    const displayErrors = computed(() => {
      if (!hasErrors.value) return []
      
      // Add unique IDs and limit display count
      return props.errors
        .slice(0, props.maxDisplayErrors)
        .map((error, index) => ({
          id: `error_${index}`,
          field: error.field || null,
          message: error.message || error,
          ...error
        }))
    })
    
    const hasFieldErrors = computed(() => {
      return props.errors.some(error => error.field)
    })
    
    const hasHelpContent = computed(() => {
      return Object.keys(props.fieldHelpContent).length > 0 || hasFieldErrors.value
    })
    
    const hasFieldSpecificHelp = computed(() => {
      return props.errors.some(error => 
        error.field && props.fieldHelpContent[error.field]
      )
    })
    
    // Methods
    const getFieldLabel = (fieldName) => {
      if (!fieldName) return ''
      
      // Use provided label or generate from field name
      return props.fieldLabels[fieldName] || 
             fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    
    const scrollToFirstError = async () => {
      const firstFieldError = props.errors.find(error => error.field)
      if (!firstFieldError) return
      
      await nextTick()
      
      // Try to find the field element
      const fieldElement = document.querySelector(`[name="${firstFieldError.field}"]`) ||
                          document.querySelector(`#${firstFieldError.field}`) ||
                          document.querySelector(`[data-field="${firstFieldError.field}"]`)
      
      if (fieldElement) {
        fieldElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // Focus the field if possible
        if (fieldElement.focus) {
          setTimeout(() => fieldElement.focus(), 300)
        }
        
        // Emit event for parent component
        emit('scroll-to-field', firstFieldError.field)
      }
    }
    
    const clearAllErrors = () => {
      emit('clear-errors')
    }
    
    const dismiss = () => {
      emit('dismiss')
    }
    
    const showHelp = () => {
      showHelpSection.value = !showHelpSection.value
    }
    
    const getFieldSpecificHelp = () => {
      return props.errors
        .filter(error => error.field && props.fieldHelpContent[error.field])
        .map(error => ({
          field: error.field,
          help: props.fieldHelpContent[error.field]
        }))
    }
    
    // Watch for error changes to auto-scroll
    watch(() => props.errors, (newErrors, oldErrors) => {
      // If we have new field errors, optionally auto-scroll to first
      if (newErrors.length > 0 && (!oldErrors || oldErrors.length === 0)) {
        const hasNewFieldErrors = newErrors.some(error => error.field)
        if (hasNewFieldErrors) {
          // Auto-scroll after a short delay to allow DOM updates
          setTimeout(() => {
            scrollToFirstError()
          }, 100)
        }
      }
    }, { deep: true })
    
    return {
      showHelpSection,
      hasErrors,
      errorCount,
      displayErrors,
      hasFieldErrors,
      hasHelpContent,
      hasFieldSpecificHelp,
      getFieldLabel,
      scrollToFirstError,
      clearAllErrors,
      dismiss,
      showHelp,
      getFieldSpecificHelp
    }
  }
}
</script>

<style scoped>
.validation-error-display {
  margin-bottom: 1rem;
}

.validation-summary {
  border-left: 4px solid #ffc107;
  background-color: #fff3cd;
  border-color: #ffc107;
}

.error-list {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
}

.error-item {
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255, 193, 7, 0.2);
  font-size: 0.9rem;
}

.error-item:last-child {
  border-bottom: none;
}

.privacy-notice {
  background-color: rgba(25, 135, 84, 0.1);
  border-radius: 0.375rem;
  padding: 0.5rem;
  margin-top: 0.75rem;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.help-section {
  margin-top: 1rem;
}

.help-category {
  margin-bottom: 1rem;
}

.help-category:last-child {
  margin-bottom: 0;
}

.help-category-title {
  color: #495057;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.help-tips {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
}

.help-tips li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.help-tips li:last-child {
  margin-bottom: 0;
}

.field-help-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-help-item {
  font-size: 0.9rem;
  line-height: 1.4;
}

.privacy-help {
  font-size: 0.9rem;
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  transform-origin: top;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.9);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.9);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .error-actions {
    flex-direction: column;
  }
  
  .error-actions .btn {
    width: 100%;
  }
  
  .validation-summary {
    padding: 1rem;
  }
  
  .help-section {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .validation-summary {
    background-color: #3a3a1a;
    border-color: #ffc107;
    color: #ffda6a;
  }
  
  .privacy-notice {
    background-color: rgba(102, 217, 102, 0.1);
  }
  
  .help-category-title {
    color: #e9ecef;
  }
  
  .card {
    background-color: #2d2d2d;
    border-color: #404040;
  }
  
  .card-header {
    background-color: #1a1a1a !important;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .card-body {
    color: #e9ecef;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .validation-summary {
    border-width: 3px;
  }
  
  .error-item {
    border-bottom-width: 2px;
  }
}

/* Focus styles for accessibility */
.btn:focus {
  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}

.btn-close:focus {
  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}
</style>