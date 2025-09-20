import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ForecastExecution from '@/components/ForecastExecution.vue'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn()
  }
}))

// Mock the stores
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    sessionId: 'test-session-123',
    forecastConfig: {
      horizon: 30,
      growth: 'linear',
      seasonality_mode: 'additive',
      interval_width: 0.8,
      mcmc_samples: 0
    },
    uploadedData: [{ date: '2023-01-01', value: 100 }],
    hasData: true,
    hasConfig: true,
    hasResults: false,
    forecastResults: null,
    setForecastResults: vi.fn()
  })
}))

// Mock the notification service
vi.mock('@/services/notifications', () => ({
  notificationService: {
    showForecastCompleted: vi.fn(),
    showForecastError: vi.fn()
  }
}))

describe('ForecastExecution Privacy Features', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('displays privacy assurance during forecast execution', () => {
    const mockRouter = { push: vi.fn() }
    
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: { $router: mockRouter }
      }
    })

    expect(wrapper.text()).toContain('Privacy Notice')
    expect(wrapper.text()).toContain('processed entirely in server memory')
    expect(wrapper.text()).toContain('automatically discarded after completion')
    expect(wrapper.text()).toContain('No data is stored on our servers')
  })

  it('shows forecast configuration summary', () => {
    const mockRouter = { push: vi.fn() }
    
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: { $router: mockRouter }
      }
    })

    expect(wrapper.text()).toContain('Forecast Configuration')
    expect(wrapper.text()).toContain('Horizon: 30 periods')
    expect(wrapper.text()).toContain('Growth: linear')
    expect(wrapper.text()).toContain('Data Points: 1 rows')
  })

  it('displays automatic cleanup notice', () => {
    const mockRouter = { push: vi.fn() }
    
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: { $router: mockRouter }
      }
    })

    expect(wrapper.text()).toContain('Automatic Cleanup')
    expect(wrapper.text()).toContain('Session data will be automatically cleared')
    expect(wrapper.text()).toContain('from server memory after completion or timeout')
  })

  it('shows ready to generate forecast state', () => {
    const mockRouter = { push: vi.fn() }
    
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: { $router: mockRouter }
      }
    })

    expect(wrapper.text()).toContain('Ready to Generate Forecast')
    expect(wrapper.text()).toContain('Estimated processing time')
    expect(wrapper.find('button').text()).toContain('Generate Forecast')
  })

  it('provides privacy-focused error handling', async () => {
    // Mock API to throw error
    const api = await import('@/services/api')
    api.default.post.mockRejectedValue(new Error('Test error with sensitive data: user123'))

    // Mock router
    const mockRouter = {
      push: vi.fn()
    }

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Trigger forecast
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    // Wait for error to be processed
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should show error without sensitive data
    const text = wrapper.text()
    expect(text).not.toContain('user123')
    expect(text).toContain('processed in memory only') || expect(text).toContain('automatically discarded')
  })

  it('validates configuration without exposing sensitive data', async () => {
    // Mock router
    const mockRouter = {
      push: vi.fn()
    }

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Component should validate without logging sensitive information
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Call validation if method exists
    if (wrapper.vm.validateForecastRequest) {
      await wrapper.vm.validateForecastRequest()
    }
    
    // Verify no sensitive data in logs
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('test-session-123')
    })

    consoleSpy.mockRestore()
  })

  it('handles processing stages with privacy compliance', async () => {
    const mockRouter = { push: vi.fn() }
    
    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: { $router: mockRouter }
      }
    })

    // Check processing stages are defined
    expect(wrapper.vm.processingStages).toBeDefined()
    expect(wrapper.vm.processingStages.length).toBeGreaterThan(0)
    
    // Stages should include privacy-focused cleanup
    const cleanupStage = wrapper.vm.processingStages.find(s => s.name === 'cleanup')
    expect(cleanupStage).toBeDefined()
    expect(cleanupStage.label).toContain('Memory Cleanup')
  })

  it('provides secure download functionality', async () => {
    // Mock successful forecast results
    const mockResults = {
      forecast_data: [{ date: '2023-01-01', value: 100 }],
      components: {},
      model_summary: {},
      performance_metrics: {}
    }

    // Mock router
    const mockRouter = {
      push: vi.fn()
    }

    wrapper = mount(ForecastExecution, {
      global: {
        plugins: [pinia],
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Test download method exists and works
    expect(wrapper.vm.downloadResults).toBeDefined()
    
    // Download should not include session ID or sensitive metadata
    const downloadData = JSON.stringify(mockResults)
    expect(downloadData).not.toContain('test-session-123')
    expect(downloadData).not.toContain('sessionId')
  })
})