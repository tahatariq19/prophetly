import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ModelComparisonInterface from '../ModelComparisonInterface.vue'
import * as api from '../../services/api'

// Mock the API module
vi.mock('../../services/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn()
  }
  return {
    default: mockApi,
    getSessionModels: vi.fn(),
    compareModels: vi.fn(),
    getComparisonSummary: vi.fn(),
    getModelDetails: vi.fn(),
    deleteModel: vi.fn(),
    cleanupSessionModels: vi.fn()
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

describe('ModelComparisonInterface', () => {
  let wrapper
  const mockSessionId = 'test-session-123'

  const mockModels = [
    {
      model_id: 'model-1',
      name: 'Linear Growth Model',
      created_at: '2023-01-01T10:00:00Z',
      processing_time_seconds: 45.2,
      data_points: 1000,
      has_cv_metrics: true,
      has_training_metrics: true,
      has_forecast_data: true,
      has_components: true,
      config_summary: {
        growth: 'linear',
        yearly_seasonality: true,
        weekly_seasonality: true,
        daily_seasonality: false
      }
    },
    {
      model_id: 'model-2',
      name: 'Logistic Growth Model',
      created_at: '2023-01-01T11:00:00Z',
      processing_time_seconds: 52.8,
      data_points: 1000,
      has_cv_metrics: true,
      has_training_metrics: false,
      has_forecast_data: true,
      has_components: false,
      config_summary: {
        growth: 'logistic',
        yearly_seasonality: true,
        weekly_seasonality: false,
        daily_seasonality: false
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up default mock responses
    api.getSessionModels.mockResolvedValue(mockModels)
    
    wrapper = mount(ModelComparisonInterface, {
      props: {
        sessionId: mockSessionId
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
      expect(wrapper.find('.model-comparison-interface').exists()).toBe(true)
      expect(wrapper.find('.comparison-title').text()).toContain('Model Comparison & Analysis')
      expect(wrapper.find('.comparison-description').text()).toContain('memory only')
    })

    it('loads models on mount', async () => {
      await nextTick()
      expect(api.getSessionModels).toHaveBeenCalledWith(mockSessionId)
    })

    it('displays loading state initially', async () => {
      wrapper.vm.loading = true
      await nextTick()
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading models...')
    })

    it('displays empty state when no models available', async () => {
      api.getSessionModels.mockResolvedValue([])
      await wrapper.vm.loadModels()
      await nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('No models available for comparison')
    })
  })

  describe('Model Display', () => {
    beforeEach(async () => {
      await wrapper.vm.loadModels()
      await nextTick()
    })

    it('displays available models in grid', () => {
      const modelCards = wrapper.findAll('.model-card')
      expect(modelCards.length).toBe(2)
    })

    it('shows model information correctly', () => {
      const firstCard = wrapper.find('.model-card')
      expect(firstCard.text()).toContain('Linear Growth Model')
      expect(firstCard.text()).toContain('45s')
      expect(firstCard.text()).toContain('1,000')
    })

    it('shows configuration preview', () => {
      const firstCard = wrapper.find('.model-card')
      expect(firstCard.text()).toContain('linear')
      expect(firstCard.text()).toContain('Yearly, Weekly')
    })

    it('shows model status indicators', () => {
      const firstCard = wrapper.find('.model-card')
      expect(firstCard.find('.fa-check').exists()).toBe(true)
    })
  })

  describe('Model Selection', () => {
    beforeEach(async () => {
      await wrapper.vm.loadModels()
      await nextTick()
    })

    it('allows selecting individual models', async () => {
      const firstCard = wrapper.find('.model-card')
      await firstCard.trigger('click')

      expect(wrapper.vm.selectedModels).toContain('model-1')
      expect(firstCard.classes()).toContain('selected')
    })

    it('allows deselecting models', async () => {
      wrapper.vm.selectedModels = ['model-1']
      await nextTick()

      const firstCard = wrapper.find('.model-card')
      await firstCard.trigger('click')

      expect(wrapper.vm.selectedModels).not.toContain('model-1')
    })

    it('updates selection info display', async () => {
      wrapper.vm.selectedModels = ['model-1']
      await nextTick()

      expect(wrapper.text()).toContain('1 of 2 models selected')
    })

    it('enables compare button when 2+ models selected', async () => {
      wrapper.vm.selectedModels = ['model-1', 'model-2']
      await nextTick()

      const compareButton = wrapper.find('.btn-primary')
      expect(compareButton.attributes('disabled')).toBeUndefined()
    })

    it('disables compare button when less than 2 models selected', async () => {
      wrapper.vm.selectedModels = ['model-1']
      await nextTick()

      const compareButton = wrapper.find('.btn-primary')
      expect(compareButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Selection Actions', () => {
    beforeEach(async () => {
      await wrapper.vm.loadModels()
      await nextTick()
    })

    it('selects all models when select all clicked', async () => {
      const selectAllButton = wrapper.find('.btn-outline-secondary')
      await selectAllButton.trigger('click')

      expect(wrapper.vm.selectedModels).toEqual(['model-1', 'model-2'])
    })

    it('clears selection when clear selection clicked', async () => {
      wrapper.vm.selectedModels = ['model-1', 'model-2']
      await nextTick()

      const clearButton = wrapper.findAll('.btn-outline-secondary')[1]
      await clearButton.trigger('click')

      expect(wrapper.vm.selectedModels).toEqual([])
    })
  })

  describe('Model Comparison', () => {
    const mockComparisonResult = {
      success: true,
      message: 'Comparison completed successfully',
      models: mockModels,
      parameter_differences: [
        {
          parameter_name: 'growth',
          parameter_type: 'string',
          is_different: true,
          model_values: {
            'model-1': 'linear',
            'model-2': 'logistic'
          }
        }
      ],
      performance_comparison: [
        {
          metric_name: 'rmse',
          model_values: {
            'model-1': 10.5,
            'model-2': 12.3
          },
          best_model_id: 'model-1',
          worst_model_id: 'model-2',
          improvement_pct: 14.6
        }
      ],
      comparison_count: 2,
      processing_time_seconds: 2.5,
      created_at: '2023-01-01T12:00:00Z'
    }

    const mockSummary = {
      performance_winner: 'Linear Growth Model',
      recommendation: 'Linear Growth Model performs better overall',
      parameter_differences_count: 1,
      performance_metrics_count: 1,
      key_differences: ['Growth mode differs between models']
    }

    beforeEach(async () => {
      await wrapper.vm.loadModels()
      wrapper.vm.selectedModels = ['model-1', 'model-2']
      await nextTick()
    })

    it('calls comparison API when compare button clicked', async () => {
      api.compareModels.mockResolvedValue(mockComparisonResult)
      api.getComparisonSummary.mockResolvedValue(mockSummary)

      const compareButton = wrapper.find('.btn-primary')
      await compareButton.trigger('click')

      expect(api.compareModels).toHaveBeenCalledWith(
        mockSessionId,
        ['model-1', 'model-2'],
        wrapper.vm.comparisonOptions
      )
    })

    it('shows processing state during comparison', async () => {
      api.compareModels.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      const compareButton = wrapper.find('.btn-primary')
      await compareButton.trigger('click')

      expect(wrapper.vm.isComparing).toBe(true)
      expect(wrapper.find('.processing-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Comparing Models...')
    })

    it('displays comparison results when complete', async () => {
      api.compareModels.mockResolvedValue(mockComparisonResult)
      api.getComparisonSummary.mockResolvedValue(mockSummary)

      await wrapper.vm.compareSelectedModels()
      await nextTick()

      expect(wrapper.find('.comparison-results').exists()).toBe(true)
      expect(wrapper.find('.comparison-summary').exists()).toBe(true)
      expect(wrapper.text()).toContain('Linear Growth Model')
    })

    it('emits comparison-updated event when complete', async () => {
      api.compareModels.mockResolvedValue(mockComparisonResult)
      api.getComparisonSummary.mockResolvedValue(mockSummary)

      await wrapper.vm.compareSelectedModels()

      expect(wrapper.emitted('comparison-updated')).toBeTruthy()
      expect(wrapper.emitted('comparison-updated')[0][0]).toEqual(mockComparisonResult)
    })
  })

  describe('Comparison Results Display', () => {
    const mockComparisonResult = {
      models: mockModels,
      parameter_differences: [
        {
          parameter_name: 'growth',
          parameter_type: 'string',
          is_different: true,
          model_values: {
            'model-1': 'linear',
            'model-2': 'logistic'
          }
        }
      ],
      performance_comparison: [
        {
          metric_name: 'rmse',
          model_values: {
            'model-1': 10.5,
            'model-2': 12.3
          },
          best_model_id: 'model-1',
          worst_model_id: 'model-2',
          improvement_pct: 14.6
        }
      ]
    }

    beforeEach(async () => {
      wrapper.vm.comparisonResult = mockComparisonResult
      wrapper.vm.comparisonSummary = {
        performance_winner: 'Linear Growth Model',
        recommendation: 'Linear Growth Model performs better overall',
        parameter_differences_count: 1,
        performance_metrics_count: 1,
        key_differences: ['Growth mode differs between models']
      }
      await nextTick()
    })

    it('shows parameter comparison table', () => {
      expect(wrapper.find('.parameter-comparison').exists()).toBe(true)
      expect(wrapper.find('.parameters-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('growth')
      expect(wrapper.text()).toContain('linear')
      expect(wrapper.text()).toContain('logistic')
    })

    it('shows performance comparison table', () => {
      expect(wrapper.find('.performance-comparison').exists()).toBe(true)
      expect(wrapper.find('.performance-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('RMSE')
      expect(wrapper.text()).toContain('10.5000')
      expect(wrapper.text()).toContain('12.3000')
    })

    it('highlights best and worst performing models', () => {
      const metricCells = wrapper.findAll('.metric-value')
      expect(metricCells.some(cell => cell.classes().includes('best'))).toBe(true)
      expect(metricCells.some(cell => cell.classes().includes('worst'))).toBe(true)
    })

    it('shows comparison summary', () => {
      expect(wrapper.find('.comparison-summary').exists()).toBe(true)
      expect(wrapper.text()).toContain('Linear Growth Model')
      expect(wrapper.text()).toContain('performs better overall')
    })
  })

  describe('Export Functionality', () => {
    beforeEach(async () => {
      wrapper.vm.comparisonResult = {
        models: mockModels,
        parameter_differences: [],
        performance_comparison: [],
        comparison_count: 2,
        processing_time_seconds: 2.5,
        created_at: '2023-01-01T12:00:00Z'
      }
      wrapper.vm.comparisonSummary = {
        performance_winner: 'Linear Growth Model',
        recommendation: 'Linear Growth Model performs better overall',
        parameter_differences_count: 1,
        performance_metrics_count: 1,
        key_differences: ['Growth mode differs between models']
      }
      await nextTick()
    })

    it('shows export buttons when results available', () => {
      expect(wrapper.find('.results-actions').exists()).toBe(true)
      const exportButtons = wrapper.findAll('.results-actions .btn')
      expect(exportButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('exports comparison report when export button clicked', async () => {
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

      const exportButton = wrapper.find('.btn-outline-primary')
      await exportButton.trigger('click')

      expect(mockLink.click).toHaveBeenCalled()
      expect(mockLink.download).toContain('model_comparison_report_')
    })
  })

  describe('Model Details Modal', () => {
    const mockModelDetails = {
      model_id: 'model-1',
      name: 'Linear Growth Model',
      created_at: '2023-01-01T10:00:00Z',
      processing_time_seconds: 45.2,
      data_points: 1000,
      cv_metrics: {
        rmse: 10.5,
        mae: 8.2,
        mape: 15.3,
        coverage: 85.2
      },
      config: {
        growth: 'linear',
        yearly_seasonality: true
      },
      forecast_summary: {
        data_points: 1000,
        date_range: {
          start: '2022-01-01',
          end: '2023-12-31'
        },
        columns: ['ds', 'y', 'yhat', 'yhat_lower', 'yhat_upper']
      }
    }

    beforeEach(async () => {
      await wrapper.vm.loadModels()
      await nextTick()
    })

    it('opens modal when view details clicked', async () => {
      api.getModelDetails.mockResolvedValue(mockModelDetails)

      const viewButton = wrapper.find('.btn-icon')
      await viewButton.trigger('click')

      expect(api.getModelDetails).toHaveBeenCalledWith(mockSessionId, 'model-1')
    })

    it('displays model details in modal', async () => {
      wrapper.vm.selectedModelDetails = mockModelDetails
      wrapper.vm.showModelDetails = true
      await nextTick()

      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.model-details').exists()).toBe(true)
      expect(wrapper.text()).toContain('Linear Growth Model')
      expect(wrapper.text()).toContain('10.5000')
    })

    it('closes modal when close button clicked', async () => {
      wrapper.vm.showModelDetails = true
      await nextTick()

      const closeButton = wrapper.find('.modal-close')
      await closeButton.trigger('click')

      expect(wrapper.vm.showModelDetails).toBe(false)
    })
  })

  describe('Model Management', () => {
    beforeEach(async () => {
      await wrapper.vm.loadModels()
      await nextTick()
    })

    it('deletes model when delete button clicked', async () => {
      // Mock window.confirm
      global.confirm = vi.fn(() => true)
      api.deleteModel.mockResolvedValue({ message: 'Model deleted' })

      const deleteButton = wrapper.find('.btn-icon.delete')
      await deleteButton.trigger('click')

      expect(global.confirm).toHaveBeenCalled()
      expect(api.deleteModel).toHaveBeenCalledWith(mockSessionId, 'model-1')
    })

    it('does not delete model when user cancels', async () => {
      global.confirm = vi.fn(() => false)

      const deleteButton = wrapper.find('.btn-icon.delete')
      await deleteButton.trigger('click')

      expect(api.deleteModel).not.toHaveBeenCalled()
    })

    it('removes deleted model from local state', async () => {
      global.confirm = vi.fn(() => true)
      api.deleteModel.mockResolvedValue({ message: 'Model deleted' })

      await wrapper.vm.deleteModel('model-1')

      expect(wrapper.vm.availableModels.length).toBe(1)
      expect(wrapper.vm.availableModels[0].model_id).toBe('model-2')
    })
  })

  describe('Error Handling', () => {
    it('displays error when model loading fails', async () => {
      const mockError = new Error('Failed to load models')
      mockError.privacyMessage = 'Your data was not stored'
      api.getSessionModels.mockRejectedValue(mockError)

      await wrapper.vm.loadModels()
      await nextTick()

      expect(wrapper.find('.error-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load models')
      expect(wrapper.text()).toContain('Your data was not stored')
    })

    it('displays error when comparison fails', async () => {
      wrapper.vm.selectedModels = ['model-1', 'model-2']
      const mockError = new Error('Comparison failed')
      api.compareModels.mockRejectedValue(mockError)

      await wrapper.vm.compareSelectedModels()
      await nextTick()

      expect(wrapper.find('.error-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Comparison failed')
      expect(wrapper.vm.isComparing).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    it('formats dates correctly', () => {
      const formatted = wrapper.vm.formatDate('2023-01-01T10:00:00Z')
      expect(formatted).toContain('2023')
    })

    it('formats time correctly', () => {
      expect(wrapper.vm.formatTime(30)).toBe('30s')
      expect(wrapper.vm.formatTime(90)).toBe('1m 30s')
      expect(wrapper.vm.formatTime(0)).toBe('0s')
    })

    it('formats seasonality correctly', () => {
      const config = {
        yearly_seasonality: true,
        weekly_seasonality: true,
        daily_seasonality: false
      }
      expect(wrapper.vm.formatSeasonality(config)).toBe('Yearly, Weekly')
    })

    it('formats parameter values correctly', () => {
      expect(wrapper.vm.formatParameterValue(true)).toBe('Yes')
      expect(wrapper.vm.formatParameterValue(false)).toBe('No')
      expect(wrapper.vm.formatParameterValue(10.123456)).toBe('10.1235')
      expect(wrapper.vm.formatParameterValue(null)).toBe('N/A')
    })

    it('formats metric values correctly', () => {
      expect(wrapper.vm.formatMetricValue(10.123456)).toBe('10.1235')
      expect(wrapper.vm.formatMetricValue(null)).toBe('N/A')
    })
  })

  describe('Privacy Features', () => {
    it('shows privacy information in description', () => {
      expect(wrapper.text()).toContain('memory only')
      expect(wrapper.text()).toContain('no data is stored on the server')
    })

    it('displays privacy notice during processing', async () => {
      wrapper.vm.isComparing = true
      await nextTick()

      expect(wrapper.text()).toContain('All comparisons happen in memory only')
      expect(wrapper.text()).toContain('No data is stored on the server')
    })

    it('includes privacy message in error display', async () => {
      const mockError = new Error('Test error')
      mockError.privacyMessage = 'Your data remains private'
      
      wrapper.vm.error = mockError
      await nextTick()

      expect(wrapper.text()).toContain('Your data remains private')
    })
  })
})