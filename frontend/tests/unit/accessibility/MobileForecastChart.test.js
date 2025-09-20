import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MobileForecastChart from '@/components/MobileForecastChart.vue'

describe('MobileForecastChart Component - Mobile Accessibility', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Mock touch device
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 5
    })

    wrapper = mount(MobileForecastChart, {
      props: {
        forecastData: [
          { date: '2023-01-01', actual: 100, forecast: 105, lower: 95, upper: 115 },
          { date: '2023-01-02', actual: 110, forecast: 112, lower: 102, upper: 122 }
        ]
      },
      global: {
        plugins: [pinia]
      }
    })
  })

  it('has appropriate touch targets for mobile', () => {
    const touchTargets = wrapper.findAll('.touch-target')
    touchTargets.forEach(target => {
      const rect = target.element.getBoundingClientRect()
      // Minimum 44px touch target (WCAG AA)
      expect(rect.width).toBeGreaterThanOrEqual(44)
      expect(rect.height).toBeGreaterThanOrEqual(44)
    })
  })

  it('supports touch gestures with accessibility feedback', async () => {
    const chartContainer = wrapper.find('.chart-container')
    
    // Test pinch zoom
    await chartContainer.trigger('touchstart', {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 }
      ]
    })

    const ariaLive = wrapper.find('[aria-live="polite"]')
    expect(ariaLive.text()).toContain('Zoom gesture detected')
  })

  it('provides alternative navigation for screen readers', () => {
    const dataTable = wrapper.find('.sr-only table')
    expect(dataTable.exists()).toBe(true)
    
    const headers = dataTable.findAll('th')
    expect(headers).toHaveLength(4) // Date, Actual, Forecast, Confidence Interval
    
    headers.forEach(header => {
      expect(header.attributes('scope')).toBe('col')
    })
  })

  it('has proper ARIA labels for chart interactions', () => {
    const chartElement = wrapper.find('.chart-canvas')
    expect(chartElement.attributes('role')).toBe('img')
    expect(chartElement.attributes('aria-label')).toContain('Forecast chart')
    expect(chartElement.attributes('aria-describedby')).toBeDefined()
  })

  it('supports voice-over navigation on iOS', () => {
    const chartContainer = wrapper.find('.chart-container')
    expect(chartContainer.attributes('aria-roledescription')).toBe('interactive chart')
    
    // Check for VoiceOver specific attributes
    expect(chartContainer.attributes('data-voiceover-label')).toBeDefined()
  })

  it('provides haptic feedback indicators', async () => {
    // Mock vibration API
    navigator.vibrate = vi.fn()
    
    const dataPoint = wrapper.find('.data-point')
    await dataPoint.trigger('touchstart')
    
    expect(navigator.vibrate).toHaveBeenCalledWith(50) // Short vibration
  })

  it('has responsive text sizing for accessibility', () => {
    const textElements = wrapper.findAll('.chart-text')
    textElements.forEach(element => {
      const fontSize = window.getComputedStyle(element.element).fontSize
      const fontSizeValue = parseInt(fontSize)
      expect(fontSizeValue).toBeGreaterThanOrEqual(16) // Minimum readable size
    })
  })

  it('supports high contrast mode on mobile', () => {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })

    wrapper = mount(MobileForecastChart, {
      props: {
        forecastData: [
          { date: '2023-01-01', actual: 100, forecast: 105 }
        ]
      },
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.classes()).toContain('high-contrast-mobile')
  })

  it('provides keyboard navigation fallback', async () => {
    const chartContainer = wrapper.find('.chart-container')
    
    // Test arrow key navigation
    await chartContainer.trigger('keydown.arrowright')
    
    const announcement = wrapper.find('[aria-live="assertive"]')
    expect(announcement.text()).toContain('Next data point')
  })

  it('has proper focus indicators for mobile keyboards', () => {
    const focusableElements = wrapper.findAll('[tabindex="0"]')
    focusableElements.forEach(element => {
      expect(element.classes()).toContain('mobile-focus-indicator')
    })
  })

  it('supports switch control navigation', () => {
    const switchTargets = wrapper.findAll('.switch-target')
    switchTargets.forEach(target => {
      expect(target.attributes('data-switch-group')).toBeDefined()
      expect(target.attributes('aria-label')).toBeDefined()
    })
  })

  it('provides orientation change handling', async () => {
    // Mock orientation change
    window.dispatchEvent(new Event('orientationchange'))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.handleOrientationChange).toHaveBeenCalled()
    expect(wrapper.find('.orientation-landscape').exists()).toBe(true)
  })

  it('has proper semantic markup for assistive technology', () => {
    // Check for proper landmark roles
    expect(wrapper.find('[role="main"]').exists()).toBe(true)
    expect(wrapper.find('[role="region"]').exists()).toBe(true)
    
    // Check for proper heading structure
    const headings = wrapper.findAll('h1, h2, h3, h4, h5, h6')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('supports reduced motion on mobile devices', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })

    wrapper = mount(MobileForecastChart, {
      props: {
        forecastData: [
          { date: '2023-01-01', actual: 100, forecast: 105 }
        ]
      },
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.vm.animationsEnabled).toBe(false)
    expect(wrapper.classes()).toContain('reduced-motion')
  })
})