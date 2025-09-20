<template>
  <div class="contextual-help-wrapper">
    <!-- Help Trigger Button -->
    <button
      v-if="showTrigger"
      :class="getTriggerClass()"
      @click="toggleHelp"
      :title="triggerTooltip"
      :aria-label="triggerAriaLabel"
    >
      <i :class="triggerIcon"></i>
      <span v-if="showTriggerText" class="trigger-text">{{ triggerText }}</span>
    </button>
    
    <!-- Help Content Panel -->
    <Transition name="help-panel">
      <div v-if="isVisible" :class="getPanelClass()" ref="helpPanel">
        <!-- Header -->
        <div class="help-header">
          <div class="help-title">
            <i class="bi bi-lightbulb me-2"></i>
            <h6 class="mb-0">{{ getTitle() }}</h6>
          </div>
          <div class="help-actions">
            <button
              class="btn btn-sm btn-outline-secondary me-2"
              @click="toggleDetailLevel"
              :title="detailLevelTooltip"
            >
              <i :class="getDetailIcon()"></i>
            </button>
            <button
              class="btn-close btn-sm"
              @click="hideHelp"
              aria-label="Close help"
            ></button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="help-content">
          <!-- Main Help Content -->
          <div v-if="helpContent" class="main-help">
            <p class="help-description">{{ helpContent.content }}</p>
            
            <!-- Examples/Tips -->
            <div v-if="showExamples && helpContent.examples" class="help-examples">
              <h6 class="examples-title">
                <i class="bi bi-list-ul me-2"></i>
                Examples:
              </h6>
              <ul class="examples-list">
                <li v-for="example in helpContent.examples" :key="example">
                  {{ example }}
                </li>
              </ul>
            </div>
            
            <!-- Tips -->
            <div v-if="showTips && helpContent.tips" class="help-tips">
              <h6 class="tips-title">
                <i class="bi bi-lightbulb me-2"></i>
                Tips:
              </h6>
              <ul class="tips-list">
                <li v-for="tip in helpContent.tips" :key="tip">
                  <i class="bi bi-check-circle text-success me-2"></i>
                  {{ tip }}
                </li>
              </ul>
            </div>
            
            <!-- Strategies/Approaches -->
            <div v-if="showStrategies && helpContent.strategies" class="help-strategies">
              <h6 class="strategies-title">
                <i class="bi bi-gear me-2"></i>
                Strategies:
              </h6>
              <ul class="strategies-list">
                <li v-for="strategy in helpContent.strategies" :key="strategy">
                  {{ strategy }}
                </li>
              </ul>
            </div>
            
            <!-- Detailed Information -->
            <div v-if="showDetailed && helpContent.modes" class="help-detailed">
              <h6 class="detailed-title">
                <i class="bi bi-info-circle me-2"></i>
                Detailed Information:
              </h6>
              <div class="detailed-content">
                <div v-for="(description, mode) in helpContent.modes" :key="mode" class="mode-info">
                  <strong>{{ formatModeTitle(mode) }}:</strong>
                  <span class="text-muted">{{ description }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Contextual Suggestions -->
          <div v-if="showSuggestions && contextualSuggestions.length > 0" class="contextual-suggestions">
            <h6 class="suggestions-title">
              <i class="bi bi-compass me-2"></i>
              Related Help:
            </h6>
            <div class="suggestions-list">
              <button
                v-for="suggestion in contextualSuggestions"
                :key="suggestion.title"
                class="btn btn-sm btn-outline-info suggestion-btn"
                @click="showSuggestion(suggestion)"
              >
                {{ suggestion.title }}
              </button>
            </div>
          </div>
          
          <!-- Privacy Notice -->
          <div v-if="showPrivacyNotice && helpContent?.privacyNote" class="privacy-notice">
            <div class="d-flex align-items-start">
              <i class="bi bi-shield-check text-success me-2 mt-1"></i>
              <div>
                <strong class="privacy-title">Privacy Note:</strong>
                <p class="privacy-text mb-0">{{ helpContent.privacyNote }}</p>
              </div>
            </div>
          </div>
          
          <!-- Business Explanation -->
          <div v-if="showBusinessExplanation && businessExplanation" class="business-explanation">
            <div class="d-flex align-items-start">
              <i class="bi bi-briefcase text-primary me-2 mt-1"></i>
              <div>
                <strong class="business-title">Business Impact:</strong>
                <p class="business-text mb-0">{{ businessExplanation }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer Actions -->
        <div v-if="showActions" class="help-footer">
          <div class="help-actions-row">
            <button
              v-if="allowSearch"
              class="btn btn-sm btn-outline-primary"
              @click="openSearch"
            >
              <i class="bi bi-search me-1"></i>
              Search Help
            </button>
            
            <button
              v-if="allowFeedback"
              class="btn btn-sm btn-outline-secondary"
              @click="provideFeedback"
            >
              <i class="bi bi-chat-dots me-1"></i>
              Feedback
            </button>
            
            <button
              class="btn btn-sm btn-outline-info"
              @click="openPreferences"
            >
              <i class="bi bi-gear me-1"></i>
              Settings
            </button>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- Search Modal -->
    <Teleport to="body">
      <div v-if="showSearchModal" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-search me-2"></i>
                Search Help
              </h5>
              <button type="button" class="btn-close" @click="closeSearch"></button>
            </div>
            <div class="modal-body">
              <div class="search-input-group mb-3">
                <input
                  v-model="searchQuery"
                  type="text"
                  class="form-control"
                  placeholder="Search help topics..."
                  @input="performSearch"
                  ref="searchInput"
                >
                <button class="btn btn-outline-secondary" @click="performSearch">
                  <i class="bi bi-search"></i>
                </button>
              </div>
              
              <div v-if="searchResults.length > 0" class="search-results">
                <div
                  v-for="result in searchResults"
                  :key="`${result.category}-${result.topicKey}`"
                  class="search-result-item"
                  @click="selectSearchResult(result)"
                >
                  <h6 class="result-title">{{ result.topic.title }}</h6>
                  <p class="result-content">{{ result.topic.content.substring(0, 150) }}...</p>
                  <small class="result-category text-muted">{{ formatCategory(result.category) }}</small>
                </div>
              </div>
              
              <div v-else-if="searchQuery && searchResults.length === 0" class="no-results">
                <div class="text-center text-muted">
                  <i class="bi bi-search display-4 mb-3"></i>
                  <p>No help topics found for "{{ searchQuery }}"</p>
                  <p>Try different keywords or browse categories.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show"></div>
      </div>
    </Teleport>
    
    <!-- Preferences Modal -->
    <Teleport to="body">
      <div v-if="showPreferencesModal" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-gear me-2"></i>
                Help Preferences
              </h5>
              <button type="button" class="btn-close" @click="closePreferences"></button>
            </div>
            <div class="modal-body">
              <div class="preferences-form">
                <div class="form-check mb-3">
                  <input
                    v-model="localPreferences.showTooltips"
                    class="form-check-input"
                    type="checkbox"
                    id="showTooltips"
                  >
                  <label class="form-check-label" for="showTooltips">
                    Show tooltips and contextual help
                  </label>
                </div>
                
                <div class="form-check mb-3">
                  <input
                    v-model="localPreferences.autoShow"
                    class="form-check-input"
                    type="checkbox"
                    id="autoShow"
                  >
                  <label class="form-check-label" for="autoShow">
                    Automatically show help for new features
                  </label>
                </div>
                
                <div class="form-check mb-3">
                  <input
                    v-model="localPreferences.privacyReminders"
                    class="form-check-input"
                    type="checkbox"
                    id="privacyReminders"
                  >
                  <label class="form-check-label" for="privacyReminders">
                    Show privacy reminders and notices
                  </label>
                </div>
                
                <div class="mb-3">
                  <label for="detailLevel" class="form-label">Detail Level:</label>
                  <select
                    v-model="localPreferences.detailLevel"
                    class="form-select"
                    id="detailLevel"
                  >
                    <option value="basic">Basic - Essential information only</option>
                    <option value="medium">Medium - Balanced detail level</option>
                    <option value="detailed">Detailed - Comprehensive information</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closePreferences">
                Cancel
              </button>
              <button type="button" class="btn btn-primary" @click="savePreferences">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show"></div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useContextualHelp, HELP_CATEGORIES } from '../services/contextualHelp'

export default {
  name: 'ContextualHelp',
  props: {
    category: {
      type: String,
      required: true
    },
    topic: {
      type: String,
      required: true
    },
    context: {
      type: Object,
      default: () => ({})
    },
    position: {
      type: String,
      default: 'bottom-right',
      validator: value => ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(value)
    },
    showTrigger: {
      type: Boolean,
      default: true
    },
    triggerIcon: {
      type: String,
      default: 'bi-question-circle'
    },
    triggerText: {
      type: String,
      default: ''
    },
    showTriggerText: {
      type: Boolean,
      default: false
    },
    autoShow: {
      type: Boolean,
      default: false
    },
    showPrivacyNotice: {
      type: Boolean,
      default: true
    },
    showBusinessExplanation: {
      type: Boolean,
      default: false
    },
    businessValue: {
      type: Number,
      default: null
    },
    allowSearch: {
      type: Boolean,
      default: true
    },
    allowFeedback: {
      type: Boolean,
      default: false
    }
  },
  emits: ['help-shown', 'help-hidden', 'feedback-requested'],
  setup(props, { emit }) {
    const {
      getHelp,
      getContextualSuggestions,
      searchHelp,
      updatePreferences,
      preferences,
      getBusinessExplanation
    } = useContextualHelp()
    
    // State
    const isVisible = ref(false)
    const detailLevel = ref('medium')
    const showSearchModal = ref(false)
    const showPreferencesModal = ref(false)
    const searchQuery = ref('')
    const searchResults = ref([])
    const localPreferences = ref({ ...preferences.value })
    const helpPanel = ref(null)
    const searchInput = ref(null)
    
    // Computed
    const helpContent = computed(() => {
      return getHelp(props.category, props.topic)
    })
    
    const contextualSuggestions = computed(() => {
      return getContextualSuggestions(props.context).slice(0, 3) // Limit to 3 suggestions
    })
    
    const businessExplanation = computed(() => {
      if (!props.showBusinessExplanation || props.businessValue === null) return null
      return getBusinessExplanation(props.topic, props.businessValue, props.context)
    })
    
    const showExamples = computed(() => {
      return detailLevel.value !== 'basic' && helpContent.value?.examples
    })
    
    const showTips = computed(() => {
      return helpContent.value?.tips
    })
    
    const showStrategies = computed(() => {
      return detailLevel.value === 'detailed' && helpContent.value?.strategies
    })
    
    const showDetailed = computed(() => {
      return detailLevel.value === 'detailed' && helpContent.value?.modes
    })
    
    const showSuggestions = computed(() => {
      return contextualSuggestions.value.length > 0
    })
    
    const showActions = computed(() => {
      return props.allowSearch || props.allowFeedback
    })
    
    const triggerTooltip = computed(() => {
      return helpContent.value ? `Help: ${helpContent.value.title}` : 'Show help'
    })
    
    const triggerAriaLabel = computed(() => {
      return `Show help for ${helpContent.value?.title || props.topic}`
    })
    
    const detailLevelTooltip = computed(() => {
      const levels = { basic: 'Basic', medium: 'Medium', detailed: 'Detailed' }
      return `Detail level: ${levels[detailLevel.value]}`
    })
    
    // Methods
    const toggleHelp = () => {
      if (isVisible.value) {
        hideHelp()
      } else {
        showHelp()
      }
    }
    
    const showHelp = () => {
      isVisible.value = true
      emit('help-shown', { category: props.category, topic: props.topic })
    }
    
    const hideHelp = () => {
      isVisible.value = false
      emit('help-hidden', { category: props.category, topic: props.topic })
    }
    
    const toggleDetailLevel = () => {
      const levels = ['basic', 'medium', 'detailed']
      const currentIndex = levels.indexOf(detailLevel.value)
      const nextIndex = (currentIndex + 1) % levels.length
      detailLevel.value = levels[nextIndex]
    }
    
    const getTitle = () => {
      return helpContent.value?.title || 'Help'
    }
    
    const getTriggerClass = () => {
      const baseClass = 'btn contextual-help-trigger'
      const sizeClass = props.showTriggerText ? 'btn-sm' : 'btn-sm'
      const variantClass = isVisible.value ? 'btn-primary' : 'btn-outline-secondary'
      
      return `${baseClass} ${sizeClass} ${variantClass}`
    }
    
    const getPanelClass = () => {
      const baseClass = 'contextual-help-panel'
      const positionClass = `panel-${props.position}`
      const detailClass = `detail-${detailLevel.value}`
      
      return `${baseClass} ${positionClass} ${detailClass}`
    }
    
    const getDetailIcon = () => {
      const icons = {
        basic: 'bi-eye',
        medium: 'bi-eye-fill',
        detailed: 'bi-binoculars'
      }
      return icons[detailLevel.value] || 'bi-eye'
    }
    
    const formatModeTitle = (mode) => {
      return mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    
    const formatCategory = (category) => {
      return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    
    const showSuggestion = (suggestion) => {
      // This would typically navigate to or show the suggested help topic
      console.log('Show suggestion:', suggestion)
    }
    
    const openSearch = () => {
      showSearchModal.value = true
      nextTick(() => {
        if (searchInput.value) {
          searchInput.value.focus()
        }
      })
    }
    
    const closeSearch = () => {
      showSearchModal.value = false
      searchQuery.value = ''
      searchResults.value = []
    }
    
    const performSearch = () => {
      if (searchQuery.value.trim()) {
        searchResults.value = searchHelp(searchQuery.value.trim())
      } else {
        searchResults.value = []
      }
    }
    
    const selectSearchResult = (result) => {
      // This would typically show the selected help topic
      console.log('Selected search result:', result)
      closeSearch()
    }
    
    const openPreferences = () => {
      localPreferences.value = { ...preferences.value }
      showPreferencesModal.value = true
    }
    
    const closePreferences = () => {
      showPreferencesModal.value = false
    }
    
    const savePreferences = () => {
      updatePreferences(localPreferences.value)
      showPreferencesModal.value = false
    }
    
    const provideFeedback = () => {
      emit('feedback-requested', {
        category: props.category,
        topic: props.topic,
        context: props.context
      })
    }
    
    // Handle click outside to close
    const handleClickOutside = (event) => {
      if (helpPanel.value && !helpPanel.value.contains(event.target)) {
        const trigger = event.target.closest('.contextual-help-trigger')
        if (!trigger) {
          hideHelp()
        }
      }
    }
    
    // Lifecycle
    onMounted(() => {
      if (props.autoShow && preferences.value.autoShow) {
        showHelp()
      }
      
      document.addEventListener('click', handleClickOutside)
    })
    
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })
    
    // Watch for preference changes
    watch(() => preferences.value.detailLevel, (newLevel) => {
      detailLevel.value = newLevel
    }, { immediate: true })
    
    return {
      // State
      isVisible,
      detailLevel,
      showSearchModal,
      showPreferencesModal,
      searchQuery,
      searchResults,
      localPreferences,
      helpPanel,
      searchInput,
      
      // Computed
      helpContent,
      contextualSuggestions,
      businessExplanation,
      showExamples,
      showTips,
      showStrategies,
      showDetailed,
      showSuggestions,
      showActions,
      triggerTooltip,
      triggerAriaLabel,
      detailLevelTooltip,
      
      // Methods
      toggleHelp,
      showHelp,
      hideHelp,
      toggleDetailLevel,
      getTitle,
      getTriggerClass,
      getPanelClass,
      getDetailIcon,
      formatModeTitle,
      formatCategory,
      showSuggestion,
      openSearch,
      closeSearch,
      performSearch,
      selectSearchResult,
      openPreferences,
      closePreferences,
      savePreferences,
      provideFeedback
    }
  }
}
</script><style scop
ed>
.contextual-help-wrapper {
  position: relative;
  display: inline-block;
}

.contextual-help-trigger {
  border-radius: 50%;
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.contextual-help-trigger.btn-sm {
  width: 28px;
  height: 28px;
  font-size: 0.875rem;
}

.contextual-help-trigger:hover {
  transform: scale(1.1);
}

.contextual-help-trigger .trigger-text {
  margin-left: 0.5rem;
  white-space: nowrap;
}

.contextual-help-panel {
  position: absolute;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 0;
  min-width: 320px;
  max-width: 480px;
  z-index: 1050;
  overflow: hidden;
}

/* Panel positioning */
.panel-top-left {
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
}

.panel-top-right {
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
}

.panel-bottom-left {
  top: 100%;
  right: 0;
  margin-top: 8px;
}

.panel-bottom-right {
  top: 100%;
  left: 0;
  margin-top: 8px;
}

.panel-center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
}

.help-title {
  display: flex;
  align-items: center;
  color: #495057;
  font-weight: 600;
}

.help-actions {
  display: flex;
  align-items: center;
}

.help-content {
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.help-description {
  margin-bottom: 1rem;
  line-height: 1.5;
  color: #495057;
}

.help-examples,
.help-tips,
.help-strategies,
.help-detailed {
  margin-bottom: 1rem;
}

.help-examples:last-child,
.help-tips:last-child,
.help-strategies:last-child,
.help-detailed:last-child {
  margin-bottom: 0;
}

.examples-title,
.tips-title,
.strategies-title,
.detailed-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.examples-list,
.tips-list,
.strategies-list {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
}

.examples-list li,
.strategies-list li {
  padding: 0.25rem 0;
  font-size: 0.9rem;
  color: #6c757d;
  border-left: 3px solid #e9ecef;
  padding-left: 0.75rem;
  margin-bottom: 0.25rem;
}

.tips-list li {
  display: flex;
  align-items: flex-start;
  padding: 0.25rem 0;
  font-size: 0.9rem;
  color: #495057;
  margin-bottom: 0.25rem;
}

.detailed-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mode-info {
  font-size: 0.9rem;
  line-height: 1.4;
}

.contextual-suggestions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.suggestions-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.suggestion-btn {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 16px;
}

.privacy-notice,
.business-explanation {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.privacy-notice {
  background-color: rgba(25, 135, 84, 0.1);
  border-left: 4px solid #198754;
}

.business-explanation {
  background-color: rgba(13, 110, 253, 0.1);
  border-left: 4px solid #0d6efd;
}

.privacy-title,
.business-title {
  color: #495057;
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.privacy-text,
.business-text {
  color: #6c757d;
  line-height: 1.4;
}

.help-footer {
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.help-actions-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Detail level variations */
.detail-basic .help-content {
  padding: 0.75rem;
}

.detail-detailed .help-content {
  max-height: 500px;
}

/* Transitions */
.help-panel-enter-active,
.help-panel-leave-active {
  transition: all 0.3s ease;
  transform-origin: top left;
}

.help-panel-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

.help-panel-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

/* Search Modal Styles */
.search-input-group {
  display: flex;
}

.search-input-group .form-control {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.search-input-group .btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: 0;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.search-result-item {
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result-item:hover {
  background-color: #f8f9fa;
  border-color: #0d6efd;
  transform: translateY(-1px);
}

.result-title {
  margin-bottom: 0.5rem;
  color: #495057;
  font-weight: 600;
}

.result-content {
  margin-bottom: 0.5rem;
  color: #6c757d;
  line-height: 1.4;
}

.result-category {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.no-results {
  padding: 2rem;
}

/* Preferences Modal Styles */
.preferences-form .form-check {
  padding-left: 1.5rem;
}

.preferences-form .form-check-label {
  font-weight: 500;
  color: #495057;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .contextual-help-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 400px;
    max-height: 80vh;
  }
  
  .help-content {
    max-height: 300px;
  }
  
  .help-actions-row {
    flex-direction: column;
  }
  
  .help-actions-row .btn {
    width: 100%;
  }
  
  .suggestions-list {
    flex-direction: column;
  }
  
  .suggestion-btn {
    width: 100%;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .contextual-help-panel {
    background: #2d2d2d;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .help-header {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    border-bottom-color: #404040;
  }
  
  .help-title {
    color: #e9ecef;
  }
  
  .help-description {
    color: #adb5bd;
  }
  
  .examples-title,
  .tips-title,
  .strategies-title,
  .detailed-title,
  .suggestions-title {
    color: #adb5bd;
  }
  
  .examples-list li,
  .strategies-list li {
    color: #adb5bd;
    border-left-color: #404040;
  }
  
  .tips-list li {
    color: #e9ecef;
  }
  
  .privacy-notice {
    background-color: rgba(102, 217, 102, 0.1);
    border-left-color: #198754;
  }
  
  .business-explanation {
    background-color: rgba(102, 178, 255, 0.1);
    border-left-color: #0d6efd;
  }
  
  .privacy-title,
  .business-title {
    color: #e9ecef;
  }
  
  .privacy-text,
  .business-text {
    color: #adb5bd;
  }
  
  .help-footer {
    background-color: #1a1a1a;
    border-top-color: #404040;
  }
  
  .contextual-suggestions {
    border-top-color: #404040;
  }
  
  .search-result-item {
    background-color: #2d2d2d;
    border-color: #404040;
    color: #e9ecef;
  }
  
  .search-result-item:hover {
    background-color: #404040;
    border-color: #0d6efd;
  }
  
  .result-title {
    color: #e9ecef;
  }
  
  .result-content {
    color: #adb5bd;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .contextual-help-panel {
    border-width: 2px;
  }
  
  .privacy-notice,
  .business-explanation {
    border-left-width: 6px;
  }
  
  .search-result-item {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .contextual-help-trigger,
  .help-panel-enter-active,
  .help-panel-leave-active,
  .search-result-item {
    transition: none;
  }
  
  .contextual-help-trigger:hover {
    transform: none;
  }
  
  .search-result-item:hover {
    transform: none;
  }
}

/* Focus styles for accessibility */
.contextual-help-trigger:focus,
.suggestion-btn:focus,
.search-result-item:focus {
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  outline: none;
}

/* Scrollbar styling */
.help-content::-webkit-scrollbar,
.search-results::-webkit-scrollbar {
  width: 6px;
}

.help-content::-webkit-scrollbar-track,
.search-results::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.help-content::-webkit-scrollbar-thumb,
.search-results::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.help-content::-webkit-scrollbar-thumb:hover,
.search-results::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>