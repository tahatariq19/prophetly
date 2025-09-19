<template>
  <div class="simple-configuration">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Simple Configuration</h5>
        <div class="form-check form-switch">
          <input 
            class="form-check-input" 
            type="checkbox" 
            id="rememberPreferences"
            v-model="rememberPreferences"
          >
          <label class="form-check-label" for="rememberPreferences">
            Remember preferences
          </label>
        </div>
      </div>
      
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <!-- Forecast Horizon -->
          <div class="mb-4">
            <label for="horizon" class="form-label">
              Forecast Horizon (days)
              <span class="text-danger">*</span>
            </label>
            <input
              type="number"
              class="form-control"
              :class="{ 'is-invalid': errors.horizon }"
              id="horizon"
              v-model.number="config.horizon"
              :min="PROPHET_LIMITS.horizon.min"
              :max="PROPHET_LIMITS.horizon.max"
              required
            >
            <div class="form-text">
              Number of days to forecast into the future ({{ PROPHET_LIMITS.horizon.min }}-{{ PROPHET_LIMITS.horizon.max }})
            </div>
            <div v-if="errors.horizon" class="invalid-feedback">
              {{ errors.horizon }}
            </div>
          </div>

          <!-- Confidence Interval -->
          <div class="mb-4">
            <label for="intervalWidth" class="form-label">
              Confidence Interval
            </label>
            <div class="row">
              <div class="col-8">
                <input
                  type="range"
                  class="form-range"
                  id="intervalWidth"
                  v-model.number="config.interval_width"
                  :min="PROPHET_LIMITS.interval_width.min"
                  :max="PROPHET_LIMITS.interval_width.max"
                  step="0.01"
                >
              </div>
              <div class="col-4">
                <input
                  type="number"
                  class="form-control form-control-sm"
                  v-model.number="config.interval_width"
                  :min="PROPHET_LIMITS.interval_width.min"
                  :max="PROPHET_LIMITS.interval_width.max"
                  step="0.01"
                >
              </div>
            </div>
            <div class="form-text">
              Width of uncertainty intervals ({{ Math.round(config.interval_width * 100) }}%)
            </div>
          </div>

          <!-- Seasonality Options -->
          <div class="mb-4">
            <label class="form-label">Seasonality Components</label>
            <div class="row">
              <div class="col-md-4">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="yearlySeasonality"
                    v-model="config.yearly_seasonality"
                  >
                  <label class="form-check-label" for="yearlySeasonality">
                    Yearly
                  </label>
                </div>
                <small class="text-muted">Annual patterns</small>
              </div>
              <div class="col-md-4">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="weeklySeasonality"
                    v-model="config.weekly_seasonality"
                  >
                  <label class="form-check-label" for="weeklySeasonality">
                    Weekly
                  </label>
                </div>
                <small class="text-muted">Day-of-week patterns</small>
              </div>
              <div class="col-md-4">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="dailySeasonality"
                    v-model="config.daily_seasonality"
                  >
                  <label class="form-check-label" for="dailySeasonality">
                    Daily
                  </label>
                </div>
                <small class="text-muted">Hour-of-day patterns</small>
              </div>
            </div>
          </div>

          <!-- Holiday Effects -->
          <div class="mb-4">
            <div class="form-check mb-3">
              <input
                class="form-check-input"
                type="checkbox"
                id="includeHolidays"
                v-model="config.include_holidays"
              >
              <label class="form-check-label" for="includeHolidays">
                Include Holiday Effects
              </label>
            </div>
            
            <div v-if="config.include_holidays" class="ms-4">
              <label for="holidayCountry" class="form-label">Country</label>
              <select
                class="form-select"
                id="holidayCountry"
                v-model="config.holiday_country"
              >
                <option value="">Select a country</option>
                <option
                  v-for="country in HOLIDAY_COUNTRIES"
                  :key="country.code"
                  :value="country.code"
                >
                  {{ country.name }}
                </option>
              </select>
              <div class="form-text">
                Built-in holidays for the selected country will be included
              </div>
            </div>
          </div>

          <!-- Growth Mode -->
          <div class="mb-4">
            <label class="form-label">Growth Pattern</label>
            <div class="row">
              <div v-for="mode in GROWTH_MODES" :key="mode.value" class="col-md-4">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    :id="`growth-${mode.value}`"
                    :value="mode.value"
                    v-model="config.growth"
                  >
                  <label class="form-check-label" :for="`growth-${mode.value}`">
                    {{ mode.label }}
                  </label>
                </div>
                <small class="text-muted">{{ mode.description }}</small>
              </div>
            </div>
          </div>

          <!-- Carrying Capacity (for logistic growth) -->
          <div v-if="config.growth === 'logistic'" class="mb-4">
            <label for="cap" class="form-label">
              Carrying Capacity
              <span class="text-danger">*</span>
            </label>
            <input
              type="number"
              class="form-control"
              :class="{ 'is-invalid': errors.cap }"
              id="cap"
              v-model.number="config.cap"
              step="0.01"
              required
            >
            <div class="form-text">
              Maximum value the forecast can reach (required for logistic growth)
            </div>
            <div v-if="errors.cap" class="invalid-feedback">
              {{ errors.cap }}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="d-flex justify-content-between">
            <div>
              <button
                type="button"
                class="btn btn-outline-secondary me-2"
                @click="resetToDefaults"
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                class="btn btn-outline-info"
                @click="loadFromPreferences"
                :disabled="!hasStoredPreferences"
              >
                Load Saved
              </button>
            </div>
            <div>
              <button
                type="button"
                class="btn btn-outline-primary me-2"
                @click="validateConfiguration"
              >
                Validate
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!isValid || isValidating"
              >
                <span v-if="isValidating" class="spinner-border spinner-border-sm me-2"></span>
                {{ isValidating ? 'Validating...' : 'Apply Configuration' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Configuration Preview -->
    <div class="card mt-3" v-if="showPreview">
      <div class="card-header">
        <h6 class="mb-0">Configuration Preview</h6>
      </div>
      <div class="card-body">
        <pre class="bg-light p-3 rounded"><code>{{ configPreview }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useUserPreferencesStore } from '@/stores/userPreferences'
import { PROPHET_DEFAULTS, PROPHET_LIMITS, GROWTH_MODES, HOLIDAY_COUNTRIES } from '@/utils/constants'
import { validateProphetConfig } from '@/utils/validation'
import { cookies } from '@/utils/storage'

export default {
  name: 'SimpleConfiguration',
  
  props: {
    initialConfig: {
      type: Object,
      default: null
    }
  },
  
  emits: ['config-updated', 'config-applied'],
  
  setup(props, { emit }) {
    const userPreferences = useUserPreferencesStore()
    
    // Configuration state
    const config = ref({
      horizon: PROPHET_DEFAULTS.horizon,
      interval_width: PROPHET_DEFAULTS.interval_width,
      yearly_seasonality: true,
      weekly_seasonality: true,
      daily_seasonality: false,
      include_holidays: false,
      holiday_country: '',
      growth: PROPHET_DEFAULTS.growth,
      cap: null
    })
    
    // UI state
    const rememberPreferences = ref(true)
    const errors = ref({})
    const isValidating = ref(false)
    const showPreview = ref(false)
    
    // Computed properties
    const isValid = computed(() => {
      return Object.keys(errors.value).length === 0 && 
             config.value.horizon >= PROPHET_LIMITS.horizon.min &&
             config.value.horizon <= PROPHET_LIMITS.horizon.max &&
             (config.value.growth !== 'logistic' || config.value.cap > 0)
    })
    
    const hasStoredPreferences = computed(() => {
      return cookies.get('simple_config') !== null
    })
    
    const configPreview = computed(() => {
      return JSON.stringify(config.value, null, 2)
    })
    
    // Validation
    function validateField(field, value) {
      const fieldErrors = {}
      
      switch (field) {
        case 'horizon':
          if (!value || value < PROPHET_LIMITS.horizon.min || value > PROPHET_LIMITS.horizon.max) {
            fieldErrors.horizon = `Horizon must be between ${PROPHET_LIMITS.horizon.min} and ${PROPHET_LIMITS.horizon.max} days`
          }
          break
          
        case 'interval_width':
          if (value < PROPHET_LIMITS.interval_width.min || value > PROPHET_LIMITS.interval_width.max) {
            fieldErrors.interval_width = `Interval width must be between ${PROPHET_LIMITS.interval_width.min} and ${PROPHET_LIMITS.interval_width.max}`
          }
          break
          
        case 'cap':
          if (config.value.growth === 'logistic' && (!value || value <= 0)) {
            fieldErrors.cap = 'Carrying capacity is required for logistic growth and must be positive'
          }
          break
      }
      
      // Update errors
      if (Object.keys(fieldErrors).length > 0) {
        errors.value = { ...errors.value, ...fieldErrors }
      } else {
        delete errors.value[field]
        errors.value = { ...errors.value }
      }
    }
    
    async function validateConfiguration() {
      isValidating.value = true
      errors.value = {}
      
      try {
        // Validate all fields
        validateField('horizon', config.value.horizon)
        validateField('interval_width', config.value.interval_width)
        validateField('cap', config.value.cap)
        
        // Additional validation using utility function
        const validationResult = validateProphetConfig(config.value)
        if (!validationResult.isValid) {
          validationResult.errors.forEach(error => {
            errors.value[error.field] = error.message
          })
        }
        
        if (Object.keys(errors.value).length === 0) {
          showPreview.value = true
          emit('config-updated', { ...config.value })
        }
      } catch (error) {
        console.error('Validation error:', error)
        errors.value.general = 'Configuration validation failed'
      } finally {
        isValidating.value = false
      }
    }
    
    // Configuration management
    function saveToPreferences() {
      if (rememberPreferences.value) {
        cookies.set('simple_config', config.value, { days: 30 })
        userPreferences.updateDefaultHorizon(config.value.horizon)
      }
    }
    
    function loadFromPreferences() {
      const savedConfig = cookies.get('simple_config')
      if (savedConfig) {
        config.value = { ...config.value, ...savedConfig }
        validateConfiguration()
      }
    }
    
    function resetToDefaults() {
      config.value = {
        horizon: userPreferences.defaultHorizon || PROPHET_DEFAULTS.horizon,
        interval_width: PROPHET_DEFAULTS.interval_width,
        yearly_seasonality: true,
        weekly_seasonality: true,
        daily_seasonality: false,
        include_holidays: false,
        holiday_country: '',
        growth: PROPHET_DEFAULTS.growth,
        cap: null
      }
      errors.value = {}
      showPreview.value = false
    }
    
    function handleSubmit() {
      validateConfiguration().then(() => {
        if (isValid.value) {
          saveToPreferences()
          emit('config-applied', { ...config.value })
        }
      })
    }
    
    // Watchers for real-time validation
    watch(() => config.value.horizon, (newValue) => {
      validateField('horizon', newValue)
    })
    
    watch(() => config.value.interval_width, (newValue) => {
      validateField('interval_width', newValue)
    })
    
    watch(() => config.value.cap, (newValue) => {
      validateField('cap', newValue)
    })
    
    watch(() => config.value.growth, (newValue) => {
      if (newValue !== 'logistic') {
        config.value.cap = null
        delete errors.value.cap
      }
    })
    
    // Watch for initial config changes (from templates)
    watch(() => props.initialConfig, (newConfig) => {
      if (newConfig) {
        config.value = { ...config.value, ...newConfig }
        validateConfiguration()
      }
    }, { immediate: true })

    // Initialize component
    onMounted(() => {
      // Load user preferences
      config.value.horizon = userPreferences.defaultHorizon
      
      // Load saved configuration if available
      if (hasStoredPreferences.value && !props.initialConfig) {
        loadFromPreferences()
      }
    })
    
    return {
      // State
      config,
      rememberPreferences,
      errors,
      isValidating,
      showPreview,
      
      // Computed
      isValid,
      hasStoredPreferences,
      configPreview,
      
      // Constants
      PROPHET_LIMITS,
      GROWTH_MODES,
      HOLIDAY_COUNTRIES,
      
      // Methods
      validateConfiguration,
      saveToPreferences,
      loadFromPreferences,
      resetToDefaults,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.simple-configuration {
  max-width: 800px;
}

.form-check-label {
  font-weight: 500;
}

.form-text {
  font-size: 0.875rem;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

pre code {
  font-size: 0.875rem;
  color: #495057;
}

.card-header h5,
.card-header h6 {
  color: #495057;
}

.form-range {
  cursor: pointer;
}

.form-check-input:checked {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.btn-primary:disabled {
  opacity: 0.6;
}
</style>