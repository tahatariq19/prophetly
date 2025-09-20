import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ForecastExecution from '@/components/ForecastExecution.vue'

describe('ForecastExecution Privacy Features', () => {
  let wrapper
  let pinia
  let mockApiService
  let mockSessionStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    mockApiService = {
      generateForecast: vi.fn(() => Promise.resolve({
        success: true,
        forecastId: 'forecast-123',
        status: 'completed'
      })),
      getForecastStatus: vi.fn(() => Promise.resolve({
        status: 'processing',
        progress: 50
      }))
    }

    mockSessionStore = {
      sessionData: {
        id: 'session-123',
        hasData: true
      },
      forecastConfig: {
        horizon: 30,
        seasonality: true
      },
      clearForecastResults: vi.fn()
    }
  })

  it('displays privacy assurance during forecast execution', () => {
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    expect(wrapper.text()).toContain('Processing in secure memory')
    expect(wrapper.text()).toContain('No data persistence')
    expect(wrapper.text()).toContain('Results stored temporarily only')
  })

  it('shows memory-safe processing status', async () => {
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')

    expect(wrapper.text()).toContain('Forecast Status: Processing')
    expect(wrapper.text()).toContain('Memory-only computation')
    expect(wrapper.text()).toContain('No server-side caching')
  })

  it('provides detailed privacy-focused progress updates', async () => {
    mockApiService.getForecastStatus
      .mockResolvedValueOnce({ status: 'processing', progress: 25, stage: 'data_validation' })
      .mockResolvedValueOnce({ status: 'processing', progress: 50, stage: 'model_fitting' })
      .mockResolvedValueOnce({ status: 'processing', progress: 75, stage: 'prediction' })
      .mockResolvedValueOnce({ status: 'completed', progress: 100, stage: 'cleanup' })

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')
    
    // Simulate progress updates
    await wrapper.vm.checkForecastProgress()

    expect(wrapper.text()).toContain('Stage: Data Validation')
    expect(wrapper.text()).toContain('Validating in memory')
    expect(wrapper.text()).toContain('No data logging')
  })

  it('handles forecast cancellation with secure cleanup', async () => {
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')
    await wrapper.find('[data-testid="cancel-forecast"]').trigger('click')

    expect(wrapper.text()).toContain('Forecast cancelled')
    expect(wrapper.text()).toContain('Memory securely cleared')
    expect(wrapper.text()).toContain('No partial results stored')
  })

  it('displays forecast completion with privacy information', async () => {
    mockApiService.generateForecast.mockResolvedValue({
      success: true,
      forecastId: 'forecast-123',
      status: 'completed',
      results: { /* mock results */ }
    })

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Forecast completed')
    expect(wrapper.text()).toContain('Results available in session only')
    expect(wrapper.text()).toContain('Download to save permanently')
  })

  it('handles forecast errors with privacy-safe messaging', async () => {
    mockApiService.generateForecast.mockRejectedValue(
      new Error('Prophet error with data: sensitive_value_123')
    )

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Forecast failed')
    expect(wrapper.text()).not.toContain('sensitive_value_123')
    expect(wrapper.text()).toContain('No data was compromised')
    expect(wrapper.text()).toContain('Memory automatically cleared')
  })

  it('provides memory usage information during processing', async () => {
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')

    expect(wrapper.text()).toContain('Memory Usage')
    expect(wrapper.text()).toContain('Session data only')
    expect(wrapper.text()).toContain('Temporary processing')
  })

  it('shows automatic cleanup notifications', async () => {
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    // Simulate forecast completion and cleanup
    await wrapper.vm.completeForecast()

    expect(wrapper.text()).toContain('Automatic cleanup in progress')
    expect(wrapper.text()).toContain('Temporary data being removed')
    expect(wrapper.text()).toContain('Memory optimization active')
  })

  it('prevents concurrent forecasts for privacy isolation', async () => {
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    // Start first forecast
    await wrapper.find('[data-testid="start-forecast"]').trigger('click')
    
    // Try to start second forecast
    const startButton = wrapper.find('[data-testid="start-forecast"]')
    expect(startButton.attributes('disabled')).toBeDefined()
    
    expect(wrapper.text()).toContain('Forecast in progress')
    expect(wrapper.text()).toContain('Prevents data mixing')
    expect(wrapper.text()).toContain('Session isolation active')
  })

  it('does not log sensitive forecast parameters', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')

    // Verify no sensitive data in logs
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('session-123')
      expect(String(call)).not.toContain('forecast-123')
    })

    consoleSpy.mockRestore()
  })

  it('provides session timeout warnings during long forecasts', async () => {
    // Mock long-running forecast
    mockApiService.generateForecast.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve({ success: true }), 5000)
      })
    })

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService,
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.find('[data-testid="start-forecast"]').trigger('click')
    
    // Simulate session timeout warning
    wrapper.vm.showSessionTimeoutWarning()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Session expires soon')
    expect(wrapper.text()).toContain('Forecast will be cancelled automatically')
    expect(wrapper.text()).toContain('Download results immediately when complete')
  })
})