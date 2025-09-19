import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CrossValidationInterface from '../CrossValidationInterface.vue'
import api from '../../services/api'

// Mock the API module
vi.mock('../../services/api', () => {
  const mockApi = {
    post: vi.fn()
  }
  return {
    default: mockApi,
    validateCrossValidationConfig: vi.fn(),
    performCrossValidation: vi.fn()
  }
})

// Mock Chart.js
vi.mock('chart.js', () => {
  const Chart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn()
  }))
  Chart.register = vi.fn()
  
  return {
    Chart,
    registerables: []
  }
})

describe('CrossValidationInterface', () => {
  let wrapper
  const mockSessionId = 'test-session-123'
  const mockForecastConfig = {
    growth: 'linear',
    seasonality_mode: 'additive',
    yearly_seasonality: true,
    weekly_seasonality: true,
    daily_seasonality: false,
    horizon: 365,
    interval_width: 0.8
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up default mock response to prevent auto-validation errors
    api.post.mockResolvedValue({ 
      data: { 
        is_valid: true, 
        errors: [], 
        warnings: [], 
        recommendations: [] 
      } 
    })
    
    wrapper = mount(CrossValidationInterface, {
      props: {
        sessionId: mockSessionId,
        forecastConfig: mockForecastConfig
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('renders correctly with required props', () => {
      expect(wrapper.find('.cross-validation-interface').exists()).toBe(true)
      expect(wrapper.find('.cv-title').text()).toContain('Cross-Validation & Model Diagnostics')
      expect(wrapper.find('.cv-description').text()).toContain('memory only')
    })

    it('initializes with default configuration values', () => {
      const initialInput = wrapper.find('#initial-period')
      const periodInput = wrapper.find('#period')
      const horizonInput = wrapper.find('#horizon')

      expect(initialInput.element.value).toBe('730 days')
      expect(periodInput.element.value).toBe('180 days')
      expect(horizonInput.element.value).toBe('365 days')
    })

    it('shows validation button as enabled when config is valid', () => {
      const validateButton = wrapper.find('.btn-outline-primary')
      expect(validateButton.attributes('disabled')).toBeUndefined()
    })

    it('shows execute button as disabled initially', () => {
      const executeButton = wrapper.find('.btn-primary')
      expect(executeButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Configuration Management', () => {
    it('updates configuration values when inputs change', async () => {
      const initialInput = wrapper.find('#initial-period')
      
      await initialInput.setValue('365 days')
      expect(wrapper.vm.config.initial).toBe('365 days')
    })

    it('toggles custom cutoffs section', async () => {
      const checkbox = wrapper.find('input[type="checkbox"]')
      
      expect(wrapper.find('.cutoffs-input').exists()).toBe(false)
      
      await checkbox.setChecked(true)
      await nextTick()
      
      expect(wrapper.find('.cutoffs-input').exists()).toBe(true)
    })

    it('handles parallel processing selection', async () => {
      const select = wrapper.find('#parallel')
      
      await select.setValue('processes')
      expect(wrapper.vm.config.parallel).toBe('processes')
    })
  })

  describe('Configuration Validation', () => {
    it('calls validation API when validate button is clicked', async () => {
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
        recommendations: [],
        data_points: 1000,
        estimated_cutoffs: 5,
        estimated_processing_time_seconds: 120,
        estimated_memory_mb: 256
      }

      api.post.mockResolvedValue({ data: mockValidationResult })

      const validateButton = wrapper.find('.btn-outline-primary')
      await validateButton.trigger('click')
      await nextTick()

      expect(api.post).toHaveBeenCalledWith('/cross-validation/validate-config', {
        session_id: mockSessionId,
        config: {
          initial: '730 days',
          period: '180 days',
          horizon: '365 days',
          parallel: null,
          cutoffs: null
        },
        forecast_config: mockForecastConfig
      })
    })

    it('displays validation results when validation succeeds', async () => {
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: ['Test warning'],
        recommendations: ['Test recommendation'],
        data_points: 1000,
        estimated_cutoffs: 5,
        estimated_processing_time_seconds: 120,
        estimated_memory_mb: 256
      }

      wrapper.vm.validationResult = mockValidationResult
      await nextTick()

      expect(wrapper.find('.validation-results').exists()).toBe(true)
      expect(wrapper.find('.validation-status.valid').exists()).toBe(true)
      expect(wrapper.find('.validation-warnings').exists()).toBe(true)
      expect(wrapper.find('.validation-recommendations').exists()).toBe(true)
    })

    it('displays validation errors when validation fails', async () => {
      const mockValidationResult = {
        is_valid: false,
        errors: ['Insufficient data for cross-validation'],
        warnings: [],
        recommendations: ['Upload more data']
      }

      wrapper.vm.validationResult = mockValidationResult
      await nextTick()

      expect(wrapper.find('.validation-status.invalid').exists()).toBe(true)
      expect(wrapper.find('.validation-errors').exists()).toBe(true)
      expect(wrapper.text()).toContain('Insufficient data for cross-validation')
    })

    it('enables execute button when validation passes', async () => {
      wrapper.vm.validationResult = { is_valid: true }
      await nextTick()

      const executeButton = wrapper.find('.btn-primary')
      expect(executeButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Cross-Validation Execution', () => {
    beforeEach(async () => {
      // Set up valid validation result
      wrapper.vm.validationResult = { is_valid: true }
      await nextTick()
    })

    it('calls cross-validation API when execute button is clicked', async () => {
      const mockCvResult = {
        success: true,
        message: 'Cross-validation completed successfully',
        config: wrapper.vm.config,
        metrics: {
          rmse: 10.5,
          mae: 8.2,
          mape: 15.3,
          coverage: 85.2
        },
        results: [],
        cutoff_count: 5,
        total_predictions: 100,
        processing_time_seconds: 45.2
      }

      api.post.mockResolvedValue({ data: mockCvResult })

      const executeButton = wrapper.find('.btn-primary')
      await executeButton.trigger('click')

      expect(api.post).toHaveBeenCalledWith('/cross-validation/execute', {
        session_id: mockSessionId,
        config: {
          initial: '730 days',
          period: '180 days',
          horizon: '365 days',
          parallel: null,
          cutoffs: null
        },
        forecast_config: mockForecastConfig
      })
    })

    it('shows processing state during execution', async () => {
      // Mock a delayed response
      api.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      const executeButton = wrapper.find('.btn-primary')
      await executeButton.trigger('click')

      expect(wrapper.vm.isProcessing).toBe(true)
      expect(wrapper.find('.processing-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Cross-Validation in Progress')
    })

    it('displays results when cross-validation completes', async () => {
      const mockCvResult = {
        success: true,
        message: 'Cross-validation completed successfully',
        metrics: {
          rmse: 10.5,
          mae: 8.2,
          mape: 15.3,
          coverage: 85.2
        },
        results: [
          {
            ds: '2023-01-01',
            cutoff: '2022-12-01',
            y: 100,
            yhat: 95,
            yhat_lower: 85,
            yhat_upper: 105,
            horizon_days: 31,
            error: -5,
            abs_error: 5,
            pct_error: 5.0
          }
        ],
        cutoff_count: 5,
        total_predictions: 100,
        processing_time_seconds: 45.2
      }

      wrapper.vm.cvResults = mockCvResult
      wrapper.vm.isProcessing = false
      await nextTick()

      expect(wrapper.find('.results-section').exists()).toBe(true)
      expect(wrapper.find('.metrics-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('10.5000') // RMSE value
      expect(wrapper.text()).toContain('8.2000')  // MAE value
    })

    it('emits results-updated event when cross-validation completes', async () => {
      const mockCvResult = {
        success: true,
        metrics: { rmse: 10.5 }
      }

      api.post.mockResolvedValue({ data: mockCvResult })

      const executeButton = wrapper.find('.btn-primary')
      await executeButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('results-updated')).toBeTruthy()
      expect(wrapper.emitted('results-updated')[0][0]).toEqual(mockCvResult)
    })
  })

  describe('Error Handling', () => {
    it('displays error when validation fails', async () => {
      const mockError = new Error('Validation failed')
      mockError.message = 'Session not found'
      mockError.privacyMessage = 'Your data was not stored'

      api.post.mockRejectedValue(mockError)

      const validateButton = wrapper.find('.btn-outline-primary')
      await validateButton.trigger('click')
      await nextTick()

      expect(wrapper.find('.error-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Session not found')
      expect(wrapper.text()).toContain('Your data was not stored')
    })

    it('displays error when cross-validation execution fails', async () => {
      wrapper.vm.validationResult = { is_valid: true }
      await nextTick()

      const mockError = new Error('Cross-validation failed')
      mockError.message = 'Insufficient data'
      api.post.mockRejectedValue(mockError)

      const executeButton = wrapper.find('.btn-primary')
      await executeButton.trigger('click')
      await nextTick()

      expect(wrapper.find('.error-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Insufficient data')
      expect(wrapper.vm.isProcessing).toBe(false)
    })
  })

  describe('Export Functionality', () => {
    beforeEach(async () => {
      // Set up results for export testing
      wrapper.vm.cvResults = {
        success: true,
        metrics: {
          rmse: 10.5,
          mae: 8.2,
          mape: 15.3,
          coverage: 85.2
        },
        results: [
          {
            ds: '2023-01-01',
            cutoff: '2022-12-01',
            y: 100,
            yhat: 95,
            yhat_lower: 85,
            yhat_upper: 105,
            horizon_days: 31,
            error: -5,
            abs_error: 5,
            pct_error: 5.0
          }
        ],
        cutoff_count: 5,
        total_predictions: 100,
        processing_time_seconds: 45.2
      }
      await nextTick()
    })

    it('shows export buttons when results are available', () => {
      const exportButtons = wrapper.findAll('.results-actions .btn')
      expect(exportButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('calls export function when export results button is clicked', async () => {
      // Mock URL.createObjectURL and related functions
      global.URL.createObjectURL = vi.fn(() => 'mock-url')
      global.URL.revokeObjectURL = vi.fn()
      
      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

      const exportButton = wrapper.find('.results-actions .btn-outline-primary')
      await exportButton.trigger('click')

      expect(mockLink.click).toHaveBeenCalled()
      expect(mockLink.download).toContain('cross_validation_results_')
    })
  })

  describe('Utility Functions', () => {
    it('formats metrics correctly', async () => {
      await nextTick() // Wait for component to be fully mounted
      expect(wrapper.vm.formatMetric(10.123456)).toBe('10.1235')
      expect(wrapper.vm.formatMetric(15.5, '%')).toBe('15.5000%')
      expect(wrapper.vm.formatMetric(null)).toBe('N/A')
    })

    it('formats time correctly', async () => {
      await nextTick()
      expect(wrapper.vm.formatTime(30)).toBe('30s')
      expect(wrapper.vm.formatTime(90)).toBe('1m 30s')
      expect(wrapper.vm.formatTime(0)).toBe('0s')
    })

    it('parses custom cutoffs correctly', async () => {
      await nextTick()
      wrapper.vm.customCutoffsText = '2023-01-01\n2023-06-01\n2024-01-01'
      
      const cutoffs = wrapper.vm.parseCustomCutoffs()
      expect(cutoffs).toEqual(['2023-01-01', '2023-06-01', '2024-01-01'])
    })

    it('handles empty custom cutoffs', async () => {
      await nextTick()
      wrapper.vm.customCutoffsText = ''
      
      const cutoffs = wrapper.vm.parseCustomCutoffs()
      expect(cutoffs).toBeNull()
    })
  })

  describe('Privacy Features', () => {
    it('displays privacy notices in processing section', async () => {
      await nextTick()
      wrapper.vm.isProcessing = true
      await nextTick()

      expect(wrapper.text()).toContain('processed in memory only')
      expect(wrapper.text()).toContain('automatically discarded')
    })

    it('includes privacy message in error display', async () => {
      await nextTick()
      const mockError = new Error('Test error')
      mockError.privacyMessage = 'Your data remains private'
      
      wrapper.vm.error = mockError
      await nextTick()

      expect(wrapper.text()).toContain('Your data remains private')
    })

    it('shows privacy information in description', async () => {
      await nextTick()
      expect(wrapper.text()).toContain('memory only')
    })
  })

  describe('Responsive Behavior', () => {
    it('maintains functionality on mobile viewport', async () => {
      await nextTick()
      
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      // Component should still be functional
      expect(wrapper.find('.cross-validation-interface').exists()).toBe(true)
      expect(wrapper.find('#initial-period').exists()).toBe(true)
      
      // Buttons should still be clickable
      const validateButton = wrapper.find('.btn-outline-primary')
      expect(validateButton.exists()).toBe(true)
    })
  })
})