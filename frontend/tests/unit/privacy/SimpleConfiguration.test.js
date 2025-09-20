import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SimpleConfiguration from '@/components/SimpleConfiguration.vue'

// Mock the stores
vi.mock('@/stores/userPreferences', () => ({
  useUserPreferencesStore: () => ({
    defaultHorizon: 30,
    updateDefaultHorizon: vi.fn()
  })
}))

// Mock the utilities
vi.mock('@/utils/constants', () => ({
  PROPHET_DEFAULTS: {
    horizon: 30,
    interval_width: 0.8,
    growth: 'linear'
  },
  PROPHET_LIMITS: {
    horizon: { min: 1, max: 365 },
    interval_width: { min: 0.01, max: 0.99 }
  },
  GROWTH_MODES: [
    { value: 'linear', label: 'Linear', description: 'Constant growth rate' },
    { value: 'logistic', label: 'Logistic', description: 'Growth with ceiling' }
  ],
  HOLIDAY_COUNTRIES: [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' }
  ]
}))

vi.mock('@/utils/validation', () => ({
  validateProphetConfig: vi.fn(() => ({ isValid: true, errors: [] }))
}))

vi.mock('@/utils/storage', () => ({
  cookies: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}))

describe('SimpleConfiguration Privacy Features', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('displays privacy information about settings storage', () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.text()).toContain('Remember preferences')
    expect(wrapper.text()).toContain('Simple Configuration')
  })

  it('stores configuration preferences in cookies only', async () => {
    const { cookies } = await import('@/utils/storage')
    
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Change configuration
    const horizonInput = wrapper.find('#horizon')
    await horizonInput.setValue('45')
    
    // Enable remember preferences
    const rememberCheckbox = wrapper.find('#rememberPreferences')
    await rememberCheckbox.setChecked(true)
    
    // Submit form to save preferences
    await wrapper.find('form').trigger('submit')

    // Verify cookies.set was called
    expect(cookies.set).toHaveBeenCalledWith('simple_config', expect.any(Object), { days: 30 })
  })

  it('loads preferences from cookies without exposing data', async () => {
    const { cookies } = await import('@/utils/storage')
    cookies.get.mockReturnValue({
      horizon: 14,
      yearly_seasonality: true,
      weekly_seasonality: false
    })

    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Call loadFromPreferences to load the mocked data
    await wrapper.vm.loadFromPreferences()
    await wrapper.vm.$nextTick()

    // Verify preferences loaded
    expect(wrapper.find('#horizon').element.value).toBe('14')
    expect(wrapper.find('#yearlySeasonality').element.checked).toBe(true)
    
    // Verify no sensitive data in component state
    expect(wrapper.vm.config).not.toHaveProperty('userId')
    expect(wrapper.vm.config).not.toHaveProperty('sessionData')
  })

  it('provides configuration validation without exposing values', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Set invalid horizon
    const horizonInput = wrapper.find('#horizon')
    await horizonInput.setValue('-5')

    // Check for validation error
    expect(wrapper.vm.errors.horizon).toBeDefined()
    expect(wrapper.vm.errors.horizon).toContain('must be between')
    expect(wrapper.vm.errors.horizon).not.toContain('-5') // Don't expose the actual value
  })

  it('handles form reset with privacy compliance', async () => {
    const { cookies } = await import('@/utils/storage')
    
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Set some values
    await wrapper.find('#horizon').setValue('45')
    await wrapper.find('#yearlySeasonality').setChecked(true)

    // Reset form
    await wrapper.vm.resetToDefaults()

    // Verify form reset to defaults
    expect(wrapper.find('#horizon').element.value).toBe('30') // Default value
    expect(wrapper.find('#yearlySeasonality').element.checked).toBe(true) // Default value
  })

  it('validates configuration without logging sensitive information', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Trigger validation
    await wrapper.vm.validateConfiguration()
    
    // Verify no sensitive data in logs
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('horizon')
      expect(String(call)).not.toContain('30')
    })

    consoleSpy.mockRestore()
  })

  it('provides privacy-compliant validation messages', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Set invalid value
    await wrapper.find('#horizon').setValue('999')

    // Check validation error message
    expect(wrapper.vm.errors.horizon).toBeDefined()
    expect(wrapper.vm.errors.horizon).toContain('must be between')
    expect(wrapper.vm.errors.horizon).not.toContain('999') // Don't echo back user input
  })

  it('handles logistic growth configuration securely', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Select logistic growth
    const logisticRadio = wrapper.find('#growth-logistic')
    await logisticRadio.setChecked(true)

    // Verify carrying capacity field appears
    expect(wrapper.find('#cap').exists()).toBe(true)
    
    // Set carrying capacity
    await wrapper.find('#cap').setValue('1000')
    
    // Verify no sensitive data in component state
    expect(wrapper.vm.config.cap).toBe(1000)
    expect(wrapper.vm.config).not.toHaveProperty('userId')
  })

  it('provides secure configuration preview', async () => {
    wrapper = mount(SimpleConfiguration, {
      global: {
        plugins: [pinia]
      }
    })

    // Trigger validation to show preview
    await wrapper.vm.validateConfiguration()
    
    if (wrapper.vm.showPreview) {
      const preview = wrapper.vm.configPreview
      expect(preview).toBeDefined()
      expect(preview).not.toContain('userId')
      expect(preview).not.toContain('sessionId')
      expect(preview).toContain('horizon')
    }
  })
})