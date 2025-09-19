<template>
  <div class="configure-page">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Configure Model</h1>
              <p class="text-muted">Configure Prophet forecasting parameters for your time series data</p>
            </div>
            <div class="btn-group" role="group">
              <input 
                type="radio" 
                class="btn-check" 
                name="configMode" 
                id="simpleMode" 
                value="simple"
                v-model="configMode"
              >
              <label class="btn btn-outline-primary" for="simpleMode">Simple</label>
              
              <input 
                type="radio" 
                class="btn-check" 
                name="configMode" 
                id="advancedMode" 
                value="advanced"
                v-model="configMode"
              >
              <label class="btn btn-outline-primary" for="advancedMode">Advanced</label>
            </div>
          </div>
          
          <!-- Privacy Notice -->
          <div class="alert alert-info mb-4" v-if="showPrivacyNotice">
            <div class="d-flex align-items-start">
              <i class="bi bi-shield-check me-2 mt-1"></i>
              <div class="flex-grow-1">
                <strong>Privacy-First Configuration</strong>
                <p class="mb-2">Your configuration preferences are stored only in your browser cookies. No data is sent to our servers until you generate a forecast.</p>
                <button 
                  class="btn btn-sm btn-outline-info"
                  @click="showPrivacyNotice = false"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
          
          <!-- Model Templates -->
          <div class="mb-4">
            <ModelTemplates 
              :current-config="currentConfig"
              @template-selected="handleTemplateSelected"
            />
          </div>

          <!-- Configuration Components -->
          <div v-if="configMode === 'simple'">
            <SimpleConfiguration 
              :initial-config="templateConfig"
              @config-updated="handleConfigUpdate"
              @config-applied="handleConfigApply"
            />
          </div>
          
          <div v-else-if="configMode === 'advanced'">
            <AdvancedConfiguration 
              :initial-config="templateConfig"
              @config-updated="handleConfigUpdate"
              @config-applied="handleConfigApply"
            />
          </div>
        </div>
      </div>
      
      <!-- Configuration Status -->
      <div class="row mt-4" v-if="currentConfig">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0">Current Configuration</h6>
              <div>
                <button 
                  class="btn btn-sm btn-outline-secondary me-2"
                  @click="exportConfiguration"
                  :disabled="!currentConfig"
                >
                  <i class="bi bi-download me-1"></i>
                  Export
                </button>
                <button 
                  class="btn btn-sm btn-primary"
                  @click="proceedToForecast"
                  :disabled="!isConfigValid"
                >
                  <i class="bi bi-arrow-right me-1"></i>
                  Generate Forecast
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <small class="text-muted">Forecast Horizon:</small>
                  <div class="fw-bold">{{ currentConfig.horizon }} days</div>
                </div>
                <div class="col-md-6">
                  <small class="text-muted">Growth Mode:</small>
                  <div class="fw-bold text-capitalize">{{ currentConfig.growth }}</div>
                </div>
                <div class="col-md-6 mt-2">
                  <small class="text-muted">Confidence Interval:</small>
                  <div class="fw-bold">{{ Math.round(currentConfig.interval_width * 100) }}%</div>
                </div>
                <div class="col-md-6 mt-2">
                  <small class="text-muted">Seasonality:</small>
                  <div class="fw-bold">
                    <span v-if="currentConfig.yearly_seasonality" class="badge bg-secondary me-1">Yearly</span>
                    <span v-if="currentConfig.weekly_seasonality" class="badge bg-secondary me-1">Weekly</span>
                    <span v-if="currentConfig.daily_seasonality" class="badge bg-secondary me-1">Daily</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserPreferencesStore } from '@/stores/userPreferences'
import SimpleConfiguration from '@/components/SimpleConfiguration.vue'
import AdvancedConfiguration from '@/components/AdvancedConfiguration.vue'
import ModelTemplates from '@/components/ModelTemplates.vue'
import { fileDownload } from '@/utils/storage'

export default {
  name: 'Configure',
  
  components: {
    SimpleConfiguration,
    AdvancedConfiguration,
    ModelTemplates
  },
  
  setup() {
    const router = useRouter()
    const userPreferences = useUserPreferencesStore()
    
    // State
    const configMode = ref(userPreferences.preferredMode)
    const currentConfig = ref(null)
    const templateConfig = ref(null)
    const showPrivacyNotice = ref(!userPreferences.privacySettings.acceptedPrivacyNotice)
    
    // Computed
    const isConfigValid = computed(() => {
      return currentConfig.value && 
             currentConfig.value.horizon > 0 && 
             (currentConfig.value.growth !== 'logistic' || currentConfig.value.cap > 0)
    })
    
    // Methods
    function handleConfigUpdate(config) {
      currentConfig.value = { ...config }
    }
    
    function handleConfigApply(config) {
      currentConfig.value = { ...config }
      
      // Show success message
      console.log('Configuration applied:', config)
      
      // Could emit event or show notification here
    }
    
    function handleTemplateSelected(config) {
      templateConfig.value = { ...config }
      currentConfig.value = { ...config }
      
      console.log('Template selected:', config.templateName || 'Custom template')
    }
    
    function exportConfiguration() {
      if (currentConfig.value) {
        const exportData = {
          configuration: currentConfig.value,
          mode: configMode.value,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
        
        const filename = `prophet-config-${new Date().toISOString().split('T')[0]}.json`
        fileDownload.downloadJSON(exportData, filename)
      }
    }
    
    function proceedToForecast() {
      if (isConfigValid.value) {
        // Store configuration in session for forecast generation
        sessionStorage.setItem('prophet_config', JSON.stringify(currentConfig.value))
        
        // Navigate to results page or forecast execution
        router.push('/results')
      }
    }
    
    // Watchers
    watch(configMode, (newMode) => {
      userPreferences.updatePreferredMode(newMode)
    })
    
    watch(() => showPrivacyNotice.value, (newValue) => {
      if (!newValue) {
        userPreferences.acceptPrivacyNotice()
      }
    })
    
    // Initialize
    onMounted(() => {
      // Check if there's a saved configuration
      const savedConfig = sessionStorage.getItem('prophet_config')
      if (savedConfig) {
        try {
          currentConfig.value = JSON.parse(savedConfig)
        } catch (error) {
          console.warn('Failed to load saved configuration:', error)
        }
      }
    })
    
    return {
      // State
      configMode,
      currentConfig,
      templateConfig,
      showPrivacyNotice,
      
      // Computed
      isConfigValid,
      
      // Methods
      handleConfigUpdate,
      handleConfigApply,
      handleTemplateSelected,
      exportConfiguration,
      proceedToForecast
    }
  }
}
</script>

<style scoped>
.configure-page {
  padding: 2rem 0;
}

.btn-check:checked + .btn-outline-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.alert {
  border-left: 4px solid #0dcaf0;
}

.badge {
  font-size: 0.75rem;
}

.card-header h6 {
  color: #495057;
}

.fw-bold {
  font-weight: 600;
}

.text-capitalize {
  text-transform: capitalize;
}
</style>