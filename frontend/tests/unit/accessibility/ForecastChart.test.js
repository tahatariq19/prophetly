import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ForecastChart from '@/components/ForecastChart.vue'

describe('ForecastChart Accessibility Features', () => {
  let wrapper
  let pinia
  let mockChartData

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    mockChartData = {
      historical: [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 110 }
      ],
      forecast: [
        { date: '2023-01-03', value: 105, lower: 95, upper: 115 },
        { date: '2023-01-04', value: 108, lower: 98, upper: 118 }
      ]
    }
  })

  it('provides proper ARIA labels for chart elements', () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const chartContainer = wrapper.find('.chart-container')
    expect(chartContainer.attributes('role')).toBe('img')
    expect(chartContainer.attributes('aria-label')).toContain('Time series forecast chart')
    expect(chartContainer.attributes('aria-describedby')).toBe('chart-description')
  })

  it('includes comprehensive chart description for screen readers', () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const description = wrapper.find('#chart-description')
    expect(description.exists()).toBe(true)
    expect(description.text()).toContain('Forecast chart showing historical data from')
    expect(description.text()).toContain('predictions from')
    expect(description.text()).toContain('confidence intervals')
  })

  it('provides keyboard navigation for chart interactions', async () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const chartContainer = wrapper.find('.chart-container')
    expect(chartContainer.attributes('tabindex')).toBe('0')
    
    // Test keyboard navigation
    await chartContainer.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('dataPointFocus')).toBeTruthy()
    
    await chartContainer.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('dataPointSelect')).toBeTruthy()
  })

  it('provides alternative text representation of chart data', () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const dataTable = wrapper.find('.sr-only .data-table')
    expect(dataTable.exists()).toBe(true)
    
    // Should contain tabular representation for screen readers
    expect(dataTable.text()).toContain('Date')
    expect(dataTable.text()).toContain('Value')
    expect(dataTable.text()).toContain('2023-01-01')
    expect(dataTable.text()).toContain('100')
  })

  it('supports high contrast mode', () => {
    wrapper = mount(ForecastChart, {
      props: { 
        chartData: mockChartData,
        highContrast: true 
      },
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.classes()).toContain('high-contrast')
    
    // Verify high contrast colors are applied
    const chartElement = wrapper.find('.chart-canvas')
    expect(chartElement.attributes('data-high-contrast')).toBe('true')
  })

  it('provides zoom controls with accessibility features', () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const zoomControls = wrapper.find('.zoom-controls')
    expect(zoomControls.exists()).toBe(true)
    
    const zoomInButton = wrapper.find('[data-testid="zoom-in"]')
    expect(zoomInButton.attributes('aria-label')).toBe('Zoom in on chart')
    expect(zoomInButton.attributes('title')).toBe('Zoom in (Ctrl + Plus)')
    
    const zoomOutButton = wrapper.find('[data-testid="zoom-out"]')
    expect(zoomOutButton.attributes('aria-label')).toBe('Zoom out on chart')
    expect(zoomOutButton.attributes('title')).toBe('Zoom out (Ctrl + Minus)')
    
    const resetButton = wrapper.find('[data-testid="reset-zoom"]')
    expect(resetButton.attributes('aria-label')).toBe('Reset chart zoom')
    expect(resetButton.attributes('title')).toBe('Reset zoom (Ctrl + 0)')
  })

  it('announces chart updates to screen readers', async () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const liveRegion = wrapper.find('[aria-live="polite"]')
    expect(liveRegion.exists()).toBe(true)
    
    // Update chart data
    const newData = {
      ...mockChartData,
      forecast: [...mockChartData.forecast, { date: '2023-01-05', value: 112, lower: 102, upper: 122 }]
    }
    
    await wrapper.setProps({ chartData: newData })
    
    expect(liveRegion.text()).toContain('Chart updated with new forecast data')
  })

  it('provides keyboard shortcuts with proper announcements', async () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const chartContainer = wrapper.find('.chart-container')
    
    // Test keyboard shortcuts
    await chartContainer.trigger('keydown', { key: '+', ctrlKey: true })
    expect(wrapper.find('[aria-live="polite"]').text()).toContain('Zoomed in')
    
    await chartContainer.trigger('keydown', { key: '-', ctrlKey: true })
    expect(wrapper.find('[aria-live="polite"]').text()).toContain('Zoomed out')
    
    await chartContainer.trigger('keydown', { key: '0', ctrlKey: true })
    expect(wrapper.find('[aria-live="polite"]').text()).toContain('Zoom reset')
  })

  it('provides data point details on focus', async () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    // Simulate focusing on a data point
    await wrapper.vm.focusDataPoint(0)
    
    const focusedInfo = wrapper.find('.focused-data-point')
    expect(focusedInfo.exists()).toBe(true)
    expect(focusedInfo.attributes('aria-live')).toBe('assertive')
    expect(focusedInfo.text()).toContain('Date: 2023-01-01, Value: 100')
  })

  it('supports reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.vm.reducedMotion).toBe(true)
    expect(wrapper.classes()).toContain('reduced-motion')
  })

  it('provides comprehensive chart legend with accessibility', () => {
    wrapper = mount(ForecastChart, {
      props: { chartData: mockChartData },
      global: {
        plugins: [pinia]
      }
    })

    const legend = wrapper.find('.chart-legend')
    expect(legend.attributes('role')).toBe('list')
    expect(legend.attributes('aria-label')).toBe('Chart legend')
    
    const legendItems = wrapper.findAll('.legend-item')
    legendItems.forEach(item => {
      expect(item.attributes('role')).toBe('listitem')
      expect(item.attributes('tabindex')).toBe('0')
    })
  })

  it('handles chart loading states accessibly', () => {
    wrapper = mount(ForecastChart, {
      props: { 
        chartData: null,
        loading: true 
      },
      global: {
        plugins: [pinia]
      }
    })

    const loadingIndicator = wrapper.find('.loading-indicator')
    expect(loadingIndicator.attributes('role')).toBe('status')
    expect(loadingIndicator.attributes('aria-label')).toBe('Loading chart data')
    expect(loadingIndicator.text()).toContain('Loading forecast chart')
  })

  it('provides error states with accessibility support', () => {
    wrapper = mount(ForecastChart, {
      props: { 
        chartData: null,
        error: 'Failed to load chart data'
      },
      global: {
        plugins: [pinia]
      }
    })

    const errorMessage = wrapper.find('.chart-error')
    expect(errorMessage.attributes('role')).toBe('alert')
    expect(errorMessage.attributes('aria-live')).toBe('assertive')
    expect(errorMessage.text()).toContain('Chart loading failed')
  })
})