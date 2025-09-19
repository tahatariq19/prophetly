<template>
  <div class="advanced-configuration">
    <div class="row">
      <!-- Configuration Form -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Advanced Prophet Configuration</h5>
            <div class="btn-group btn-group-sm">
              <button 
                type="button" 
                class="btn btn-outline-secondary"
                @click="importConfiguration"
              >
                <i class="bi bi-upload me-1"></i>
                Import JSON
              </button>
              <button 
                type="button" 
                class="btn btn-outline-primary"
                @click="exportConfiguration"
                :disabled="!isValid"
              >
                <i class="bi bi-download me-1"></i>
                Export JSON
              </button>
            </div>
          </div>
          
          <div class="card-body">
            <form @submit.prevent="handleSubmit">
              <!-- Basic Parameters -->
              <div class="section-header">
                <h6>Basic Parameters</h6>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6">
                  <label for="horizon" class="form-label">
                    Forecast Horizon (days) <span class="text-danger">*</span>
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
                  <div v-if="errors.horizon" class="invalid-feedback">
                    {{ errors.horizon }}
                  </div>
                </div>
                
                <div class="col-md-6">
                  <label for="intervalWidth" class="form-label">
                    Confidence Interval Width
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    :class="{ 'is-invalid': errors.interval_width }"
                    id="intervalWidth"
                    v-model.number="config.interval_width"
                    :min="PROPHET_LIMITS.interval_width.min"
                    :max="PROPHET_LIMITS.interval_width.max"
                    step="0.01"
                  >
                  <div class="form-text">{{ Math.round(config.interval_width * 100) }}% confidence interval</div>
                  <div v-if="errors.interval_width" class="invalid-feedback">
                    {{ errors.interval_width }}
                  </div>
                </div>
              </div>

              <!-- Growth Parameters -->
              <div class="section-header">
                <h6>Growth Parameters</h6>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-4">
                  <label for="growth" class="form-label">Growth Mode</label>
                  <select
                    class="form-select"
                    id="growth"
                    v-model="config.growth"
                  >
                    <option v-for="mode in GROWTH_MODES" :key="mode.value" :value="mode.value">
                      {{ mode.label }}
                    </option>
                  </select>
                  <div class="form-text">{{ getGrowthDescription(config.growth) }}</div>
                </div>
                
                <div class="col-md-4" v-if="config.growth === 'logistic'">
                  <label for="cap" class="form-label">
                    Carrying Capacity <span class="text-danger">*</span>
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
                  <div v-if="errors.cap" class="invalid-feedback">
                    {{ errors.cap }}
                  </div>
                </div>
                
                <div class="col-md-4" v-if="config.growth === 'logistic'">
                  <label for="floor" class="form-label">Floor (Optional)</label>
                  <input
                    type="number"
                    class="form-control"
                    :class="{ 'is-invalid': errors.floor }"
                    id="floor"
                    v-model.number="config.floor"
                    step="0.01"
                  >
                  <div class="form-text">Minimum value (must be &lt; cap)</div>
                  <div v-if="errors.floor" class="invalid-feedback">
                    {{ errors.floor }}
                  </div>
                </div>
              </div>

              <!-- Changepoint Parameters -->
              <div class="section-header">
                <h6>Changepoint Parameters</h6>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6">
                  <label for="changepointPriorScale" class="form-label">
                    Changepoint Prior Scale
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    :class="{ 'is-invalid': errors.changepoint_prior_scale }"
                    id="changepointPriorScale"
                    v-model.number="config.changepoint_prior_scale"
                    :min="PROPHET_LIMITS.changepoint_prior_scale.min"
                    :max="PROPHET_LIMITS.changepoint_prior_scale.max"
                    step="0.001"
                  >
                  <div class="form-text">Controls trend flexibility (higher = more flexible)</div>
                  <div v-if="errors.changepoint_prior_scale" class="invalid-feedback">
                    {{ errors.changepoint_prior_scale }}
                  </div>
                </div>
                
                <div class="col-md-6">
                  <label for="changepointRange" class="form-label">
                    Changepoint Range
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    id="changepointRange"
                    v-model.number="config.changepoint_range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                  >
                  <div class="form-text">Proportion of history for changepoints</div>
                </div>
              </div>

              <!-- Seasonality Parameters -->
              <div class="section-header">
                <h6>Seasonality Parameters</h6>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Seasonality Mode</label>
                  <div class="btn-group w-100" role="group">
                    <input 
                      type="radio" 
                      class="btn-check" 
                      name="seasonalityMode" 
                      id="additive" 
                      value="additive"
                      v-model="config.seasonality_mode"
                    >
                    <label class="btn btn-outline-secondary" for="additive">Additive</label>
                    
                    <input 
                      type="radio" 
                      class="btn-check" 
                      name="seasonalityMode" 
                      id="multiplicative" 
                      value="multiplicative"
                      v-model="config.seasonality_mode"
                    >
                    <label class="btn btn-outline-secondary" for="multiplicative">Multiplicative</label>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <label for="seasonalityPriorScale" class="form-label">
                    Seasonality Prior Scale
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    :class="{ 'is-invalid': errors.seasonality_prior_scale }"
                    id="seasonalityPriorScale"
                    v-model.number="config.seasonality_prior_scale"
                    :min="PROPHET_LIMITS.seasonality_prior_scale.min"
                    :max="PROPHET_LIMITS.seasonality_prior_scale.max"
                    step="0.1"
                  >
                  <div class="form-text">Controls seasonality strength</div>
                  <div v-if="errors.seasonality_prior_scale" class="invalid-feedback">
                    {{ errors.seasonality_prior_scale }}
                  </div>
                </div>
              </div>

              <!-- Built-in Seasonalities -->
              <div class="row mb-3">
                <div class="col-12">
                  <label class="form-label">Built-in Seasonalities</label>
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
                          Yearly Seasonality
                        </label>
                      </div>
                      <small class="text-muted">Annual patterns and cycles</small>
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
                          Weekly Seasonality
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
                          Daily Seasonality
                        </label>
                      </div>
                      <small class="text-muted">Hour-of-day patterns</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Holiday Parameters -->
              <div class="section-header">
                <h6>Holiday Parameters</h6>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6">
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
                  
                  <div v-if="config.include_holidays">
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
                  </div>
                </div>
                
                <div class="col-md-6" v-if="config.include_holidays">
                  <label for="holidaysPriorScale" class="form-label">
                    Holidays Prior Scale
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    :class="{ 'is-invalid': errors.holidays_prior_scale }"
                    id="holidaysPriorScale"
                    v-model.number="config.holidays_prior_scale"
                    :min="PROPHET_LIMITS.holidays_prior_scale.min"
                    :max="PROPHET_LIMITS.holidays_prior_scale.max"
                    step="0.1"
                  >
                  <div class="form-text">Controls holiday effect strength</div>
                  <div v-if="errors.holidays_prior_scale" class="invalid-feedback">
                    {{ errors.holidays_prior_scale }}
                  </div>
                </div>
              </div>

              <!-- Advanced Parameters -->
              <div class="section-header">
                <h6>Advanced Parameters</h6>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6">
                  <label for="mcmcSamples" class="form-label">
                    MCMC Samples
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    :class="{ 'is-invalid': errors.mcmc_samples }"
                    id="mcmcSamples"
                    v-model.number="config.mcmc_samples"
                    :min="PROPHET_LIMITS.mcmc_samples.min"
                    :max="PROPHET_LIMITS.mcmc_samples.max"
                  >
                  <div class="form-text">0 = no MCMC, >0 = full Bayesian inference</div>
                  <div v-if="errors.mcmc_samples" class="invalid-feedback">
                    {{ errors.mcmc_samples }}
                  </div>
                </div>
                
                <div class="col-md-6">
                  <label for="uncertaintySamples" class="form-label">
                    Uncertainty Samples
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    id="uncertaintySamples"
                    v-model.number="config.uncertainty_samples"
                    min="100"
                    max="10000"
                  >
                  <div class="form-text">Number of simulations for uncertainty intervals</div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="d-flex justify-content-between mt-4">
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
                    @click="loadPreset"
                  >
                    Load Preset
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
      </div>

      <!-- Configuration Preview and Help -->
      <div class="col-lg-4">
        <!-- Configuration Preview -->
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0">Configuration Preview</h6>
          </div>
          <div class="card-body">
            <pre class="config-preview"><code>{{ configPreview }}</code></pre>
          </div>
        </div>

        <!-- Parameter Help -->
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">Parameter Guide</h6>
          </div>
          <div class="card-body">
            <div class="accordion accordion-flush" id="parameterHelp">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#growthHelp">
                    Growth Parameters
                  </button>
                </h2>
                <div id="growthHelp" class="accordion-collapse collapse" data-bs-parent="#parameterHelp">
                  <div class="accordion-body">
                    <strong>Linear:</strong> Constant growth rate<br>
                    <strong>Logistic:</strong> Growth with saturation point<br>
                    <strong>Flat:</strong> No trend component
                  </div>
                </div>
              </div>
              
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#seasonalityHelp">
                    Seasonality
                  </button>
                </h2>
                <div id="seasonalityHelp" class="accordion-collapse collapse" data-bs-parent="#parameterHelp">
                  <div class="accordion-body">
                    <strong>Additive:</strong> Seasonal effects are added to trend<br>
                    <strong>Multiplicative:</strong> Seasonal effects multiply trend<br>
                    Higher prior scale = stronger seasonality
                  </div>
                </div>
              </div>
              
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#changepointHelp">
                    Changepoints
                  </button>
                </h2>
                <div id="changepointHelp" class="accordion-collapse collapse" data-bs-parent="#parameterHelp">
                  <div class="accordion-body">
                    Control how flexible the trend can be. Higher values allow more trend changes but may overfit.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- File Input for Import (Hidden) -->
    <input
      type="file"
      ref="fileInput"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    >
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { PROPHET_DEFAULTS, PROPHET_LIMITS, GROWTH_MODES, HOLIDAY_COUNTRIES } from '@/utils/constants'
import { validateProphetConfig } from '@/utils/validation'
import { fileDownload } from '@/utils/storage'

export default {
  name: 'AdvancedConfiguration',
  
  props: {
    initialConfig: {
      type: Object,
      default: null
    }
  },
  
  emits: ['config-updated', 'config-applied'],
  
  setup(props, { emit }) {
    // Configuration state
    const config = ref({
      // Basic parameters
      horizon: PROPHET_DEFAULTS.horizon,
      interval_width: PROPHET_DEFAULTS.interval_width,
      
      // Growth parameters
      growth: PROPHET_DEFAULTS.growth,
      cap: null,
      floor: null,
      changepoint_prior_scale: PROPHET_DEFAULTS.changepoint_prior_scale,
      changepoint_range: PROPHET_DEFAULTS.changepoint_range,
      
      // Seasonality parameters
      yearly_seasonality: PROPHET_DEFAULTS.yearly_seasonality,
      weekly_seasonality: PROPHET_DEFAULTS.weekly_seasonality,
      daily_seasonality: PROPHET_DEFAULTS.daily_seasonality,
      seasonality_mode: PROPHET_DEFAULTS.seasonality_mode,
      seasonality_prior_scale: PROPHET_DEFAULTS.seasonality_prior_scale,
      
      // Holiday parameters
      include_holidays: false,
      holiday_country: '',
      holidays_prior_scale: PROPHET_DEFAULTS.holidays_prior_scale,
      
      // Advanced parameters
      mcmc_samples: PROPHET_DEFAULTS.mcmc_samples,
      uncertainty_samples: PROPHET_DEFAULTS.uncertainty_samples
    })
    
    // UI state
    const errors = ref({})
    const isValidating = ref(false)
    const fileInput = ref(null)
    
    // Computed properties
    const isValid = computed(() => {
      return Object.keys(errors.value).length === 0 && 
             config.value.horizon >= PROPHET_LIMITS.horizon.min &&
             config.value.horizon <= PROPHET_LIMITS.horizon.max &&
             (config.value.growth !== 'logistic' || config.value.cap > 0)
    })
    
    const configPreview = computed(() => {
      return JSON.stringify(config.value, null, 2)
    })
    
    // Methods
    function getGrowthDescription(growth) {
      const mode = GROWTH_MODES.find(m => m.value === growth)
      return mode ? mode.description : ''
    }
    
    async function validateConfiguration() {
      isValidating.value = true
      errors.value = {}
      
      try {
        const validationResult = validateProphetConfig(config.value)
        if (!validationResult.isValid) {
          validationResult.errors.forEach(error => {
            errors.value[error.field] = error.message
          })
        }
        
        if (Object.keys(errors.value).length === 0) {
          emit('config-updated', { ...config.value })
        }
      } catch (error) {
        console.error('Validation error:', error)
        errors.value.general = 'Configuration validation failed'
      } finally {
        isValidating.value = false
      }
    }
    
    function resetToDefaults() {
      config.value = {
        horizon: PROPHET_DEFAULTS.horizon,
        interval_width: PROPHET_DEFAULTS.interval_width,
        growth: PROPHET_DEFAULTS.growth,
        cap: null,
        floor: null,
        changepoint_prior_scale: PROPHET_DEFAULTS.changepoint_prior_scale,
        changepoint_range: PROPHET_DEFAULTS.changepoint_range,
        yearly_seasonality: PROPHET_DEFAULTS.yearly_seasonality,
        weekly_seasonality: PROPHET_DEFAULTS.weekly_seasonality,
        daily_seasonality: PROPHET_DEFAULTS.daily_seasonality,
        seasonality_mode: PROPHET_DEFAULTS.seasonality_mode,
        seasonality_prior_scale: PROPHET_DEFAULTS.seasonality_prior_scale,
        include_holidays: false,
        holiday_country: '',
        holidays_prior_scale: PROPHET_DEFAULTS.holidays_prior_scale,
        mcmc_samples: PROPHET_DEFAULTS.mcmc_samples,
        uncertainty_samples: PROPHET_DEFAULTS.uncertainty_samples
      }
      errors.value = {}
    }
    
    function loadPreset() {
      // Could implement preset configurations here
      console.log('Load preset functionality to be implemented')
    }
    
    function exportConfiguration() {
      const exportData = {
        configuration: config.value,
        metadata: {
          version: '1.0',
          mode: 'advanced',
          timestamp: new Date().toISOString(),
          description: 'Prophet Advanced Configuration'
        }
      }
      
      const filename = `prophet-advanced-config-${new Date().toISOString().split('T')[0]}.json`
      fileDownload.downloadJSON(exportData, filename)
    }
    
    function importConfiguration() {
      fileInput.value?.click()
    }
    
    function handleFileImport(event) {
      const file = event.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result)
          
          // Validate imported configuration
          let configToImport = importedData.configuration || importedData
          
          // Merge with defaults to ensure all required fields exist
          config.value = { ...config.value, ...configToImport }
          
          // Validate the imported configuration
          validateConfiguration()
          
          console.log('Configuration imported successfully')
        } catch (error) {
          console.error('Failed to import configuration:', error)
          errors.value.import = 'Invalid JSON file or configuration format'
        }
      }
      
      reader.readAsText(file)
      
      // Reset file input
      event.target.value = ''
    }
    
    function handleSubmit() {
      validateConfiguration().then(() => {
        if (isValid.value) {
          emit('config-applied', { ...config.value })
        }
      })
    }
    
    // Watchers for real-time validation
    watch(() => config.value.horizon, () => validateConfiguration(), { debounce: 300 })
    watch(() => config.value.interval_width, () => validateConfiguration(), { debounce: 300 })
    watch(() => config.value.cap, () => validateConfiguration(), { debounce: 300 })
    watch(() => config.value.floor, () => validateConfiguration(), { debounce: 300 })
    
    watch(() => config.value.growth, (newValue) => {
      if (newValue !== 'logistic') {
        config.value.cap = null
        config.value.floor = null
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
      validateConfiguration()
    })
    
    return {
      // State
      config,
      errors,
      isValidating,
      fileInput,
      
      // Computed
      isValid,
      configPreview,
      
      // Constants
      PROPHET_LIMITS,
      GROWTH_MODES,
      HOLIDAY_COUNTRIES,
      
      // Methods
      getGrowthDescription,
      validateConfiguration,
      resetToDefaults,
      loadPreset,
      exportConfiguration,
      importConfiguration,
      handleFileImport,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.advanced-configuration {
  max-width: 1200px;
}

.section-header {
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
}

.section-header h6 {
  color: #495057;
  font-weight: 600;
  margin-bottom: 0;
}

.config-preview {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  padding: 1rem;
  font-size: 0.875rem;
  max-height: 300px;
  overflow-y: auto;
}

.config-preview code {
  color: #495057;
  background: none;
}

.form-check-label {
  font-weight: 500;
}

.form-text {
  font-size: 0.875rem;
}

.btn-check:checked + .btn-outline-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.accordion-button {
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
}

.accordion-body {
  font-size: 0.875rem;
  padding: 1rem;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

.card-header h5,
.card-header h6 {
  color: #495057;
}

.btn-primary:disabled {
  opacity: 0.6;
}

.invalid-feedback {
  font-size: 0.875rem;
}

.form-control.is-invalid,
.form-select.is-invalid {
  border-color: #dc3545;
}

.btn-group .btn {
  flex: 1;
}
</style>