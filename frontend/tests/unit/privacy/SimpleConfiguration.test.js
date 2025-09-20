import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SimpleConfiguration from '@/components/SimpleConfiguration.vue'

describe('SimpleConfiguration Privacy Features', () => {
  let wrapper
  let pinia
  let mockCookieService

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    mockCookieService = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  })

  it('stores configuration preferences in cookies only', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    // Change configuration
    await wrapper.find('[data-testid="horizon-input"]').setValue('30')
    await wrapper.find('[data-testid="yearly-seasonality"]').setChecked(true)

    // Verify preferences saved to cookies
    expect(mockCookieService.set).toHaveBeenCalledWith('prophet_horizon_preference', '30')
    expect(mockCookieService.set).toHaveBeenCalledWith('prophet_seasonality_preference', expect.any(Object))
  })

  it('displays privacy information about settings storage', () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    expect(wrapper.text()).toContain('Settings stored in browser cookies only')
    expect(wrapper.text()).toContain('No server-side preference storage')
    expect(wrapper.text()).toContain('Preferences remain on your device')
  })

  it('loads preferences from cookies without exposing data', () => {
    mockCookieService.get.mockImplementation(key => {
      if (key === 'prophet_horizon_preference') return '14'
      if (key === 'prophet_seasonality_preference') return { yearly: true, weekly: false }
      return null
    })

    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    // Verify preferences loaded
    expect(wrapper.find('[data-testid="horizon-input"]').element.value).toBe('14')
    expect(wrapper.find('[data-testid="yearly-seasonality"]').element.checked).toBe(true)
    
    // Verify no sensitive data in component state
    expect(wrapper.vm.$data).not.toHaveProperty('userData')
    expect(wrapper.vm.$data).not.toHaveProperty('sessionData')
  })

  it('provides configuration export without sensitive data', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    await wrapper.find('[data-testid="horizon-input"]').setValue('30')
    
    const exportedConfig = wrapper.vm.exportConfiguration()
    
    // Should contain only configuration parameters
    expect(exportedConfig).toHaveProperty('horizon', 30)
    expect(exportedConfig).toHaveProperty('seasonality')
    
    // Should not contain any user or session data
    expect(exportedConfig).not.toHaveProperty('userId')
    expect(exportedConfig).not.toHaveProperty('sessionId')
    expect(exportedConfig).not.toHaveProperty('userData')
  })

  it('handles configuration import with privacy validation', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    const configWithSensitiveData = {
      horizon: 30,
      seasonality: { yearly: true },
      userId: 'user123', // Should be filtered out
      sessionData: { data: 'sensitive' } // Should be filtered out
    }

    await wrapper.vm.importConfiguration(configWithSensitiveData)

    // Verify only safe configuration imported
    expect(wrapper.find('[data-testid="horizon-input"]').element.value).toBe('30')
    
    // Verify sensitive data was not imported
    expect(wrapper.vm.configuration).not.toHaveProperty('userId')
    expect(wrapper.vm.configuration).not.toHaveProperty('sessionData')
  })

  it('clears configuration without logging sensitive information', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    await wrapper.find('[data-testid="horizon-input"]').setValue('30')
    await wrapper.find('[data-testid="clear-config"]').trigger('click')

    // Verify configuration cleared
    expect(wrapper.find('[data-testid="horizon-input"]').element.value).toBe('')
    
    // Verify no sensitive data in logs
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('30')
      expect(String(call)).not.toContain('horizon')
    })

    consoleSpy.mockRestore()
  })

  it('validates configuration parameters without exposing values', () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    // Test invalid horizon
    wrapper.vm.validateHorizon(-5)
    
    const errorMessage = wrapper.find('.validation-error')
    expect(errorMessage.text()).toContain('Invalid horizon value')
    expect(errorMessage.text()).not.toContain('-5') // Don't expose the actual value
  })

  it('provides privacy-focused help and tooltips', () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    const helpTooltips = wrapper.findAll('.help-tooltip')
    helpTooltips.forEach(tooltip => {
      expect(tooltip.text()).toContain('stored locally')
      expect(tooltip.text()).not.toContain('server')
      expect(tooltip.text()).not.toContain('database')
    })
  })

  it('handles form reset with privacy compliance', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    // Set some values
    await wrapper.find('[data-testid="horizon-input"]').setValue('30')
    await wrapper.find('[data-testid="yearly-seasonality"]').setChecked(true)

    // Reset form
    await wrapper.find('[data-testid="reset-form"]').trigger('click')

    // Verify form reset
    expect(wrapper.find('[data-testid="horizon-input"]').element.value).toBe('')
    expect(wrapper.find('[data-testid="yearly-seasonality"]').element.checked).toBe(false)

    // Verify cookies cleared
    expect(mockCookieService.remove).toHaveBeenCalledWith('prophet_horizon_preference')
    expect(mockCookieService.remove).toHaveBeenCalledWith('prophet_seasonality_preference')
  })

  it('provides configuration templates without user data', () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    const templates = wrapper.vm.getConfigurationTemplates()
    
    templates.forEach(template => {
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('config')
      
      // Templates should not contain any user-specific data
      expect(template.config).not.toHaveProperty('userId')
      expect(template.config).not.toHaveProperty('sessionId')
      expect(template.config).not.toHaveProperty('userData')
    })
  })

  it('shows privacy-compliant validation messages', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia],
        mocks: {
          $cookies: mockCookieService
        }
      }
    })

    // Trigger validation error
    await wrapper.find('[data-testid="horizon-input"]').setValue('invalid')

    const validationMessage = wrapper.find('.validation-message')
    expect(validationMessage.text()).toContain('Please enter a valid number')
    expect(validationMessage.text()).not.toContain('invalid') // Don't echo back user input
    expect(validationMessage.text()).toContain('No data is transmitted during validation')
  })
})