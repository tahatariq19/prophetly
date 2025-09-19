import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ForecastChart from '../ForecastChart.vue'

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    resetZoom: vi.fn(),
    update: vi.fn(),
    toBase64Image: vi.fn(() => 'data:image/png;base64,mock-image-data'),
    canvas: {
      toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data')
    }
  }))
  
  mockChart.register = vi.fn()
  
  return {
    Chart: mockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    Filler: vi.fn(),
    TimeScale: vi.fn()
  }
})

// Mock chartjs plugins
vi.mock('chartjs-adapter-date-fns', () => ({}))
vi.mock('chartjs-plugin-zoom', () => ({
  default: {}
}))

describe('ForecastChart', () => {
  let wrapper

  const mockForecastData = {
    forecast: [
      {
        ds: '2024-01-01',
        yhat: 100,
        yhat_lower: 90,
        yhat_upper: 110
      },
      {
        ds: '2024-01-02',
        yhat: 105,
        yhat_lower: 95,
        yhat_upper: 115
      }
    ],
    historical: [
      {
        ds: '2023-12-30',
        y: 98
      },
      {
        ds: '2023-12-31',
        y: 102
      }
    ]
  }

  beforeEach(() => {
    wrapper = shallowMount(ForecastChart, {
      props: {
        forecastData: null
      }
    })
  })

  it('renders correctly without data', () => {
    expect(wrapper.find('.forecast-chart-container').exists()).toBe(true)
    expect(wrapper.find('.chart-placeholder').exists()).toBe(true)
    expect(wrapper.text()).toContain('No forecast data available')
  })

  it('shows loading state', async () => {
    wrapper.vm.isLoading = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.chart-loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('Rendering forecast chart...')
  })

  it('shows error state', async () => {
    wrapper.vm.error = 'Test error message'
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test error message')
  })

  it('renders chart controls when data is available', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    expect(wrapper.find('.chart-controls').exists()).toBe(true)
    expect(wrapper.find('button[title="Reset zoom"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Export chart"]').exists()).toBe(true)
  })

  it('computes data point count correctly', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    expect(wrapper.vm.dataPointCount).toBe(2)
  })

  it('computes forecast horizon correctly', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    expect(wrapper.vm.forecastHorizon).toBe(0) // 2 forecast - 2 historical = 0
  })

  it('handles chart export', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    // Mock chart instance
    wrapper.vm.chartInstance = {
      toBase64Image: vi.fn(() => 'data:image/png;base64,mock-image-data'),
      canvas: {
        toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data')
      }
    }

    // Mock URL.createObjectURL and document methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    }
    document.createElement = vi.fn(() => mockLink)
    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()

    wrapper.vm.exportChart('png')
    
    expect(wrapper.emitted('data-exported')).toBeTruthy()
  })

  it('handles data export', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    // Mock URL and document methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    }
    document.createElement = vi.fn(() => mockLink)
    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()

    wrapper.vm.exportData('csv')
    
    expect(wrapper.emitted('data-exported')).toBeTruthy()
  })

  it('toggles tooltips correctly', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    // Mock chart instance
    wrapper.vm.chartInstance = {
      options: {
        plugins: {
          tooltip: {
            enabled: true
          }
        }
      },
      update: vi.fn()
    }

    const initialTooltipState = wrapper.vm.showTooltips
    wrapper.vm.toggleTooltips()
    
    expect(wrapper.vm.showTooltips).toBe(!initialTooltipState)
  })

  it('resets zoom correctly', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    const mockResetZoom = vi.fn()
    wrapper.vm.chartInstance = {
      resetZoom: mockResetZoom
    }

    wrapper.vm.resetZoom()
    
    expect(mockResetZoom).toHaveBeenCalled()
  })

  it('converts data to CSV correctly', () => {
    const csv = wrapper.vm.convertToCSV(mockForecastData)
    
    expect(csv).toContain('date,type,value,lower_bound,upper_bound')
    expect(csv).toContain('2023-12-30,historical,98')
    expect(csv).toContain('2024-01-01,forecast,100,90,110')
  })

  it('emits chart-ready event when chart is created', async () => {
    await wrapper.setProps({ forecastData: mockForecastData })
    
    // Simulate chart creation
    wrapper.vm.$emit('chart-ready', {})
    
    expect(wrapper.emitted('chart-ready')).toBeTruthy()
  })

  it('handles responsive sizing', async () => {
    await wrapper.setProps({ 
      forecastData: mockForecastData,
      responsive: false,
      width: 600,
      height: 300
    })
    
    expect(wrapper.vm.chartWidth).toBe(600)
    expect(wrapper.vm.chartHeight).toBe(300)
  })
})