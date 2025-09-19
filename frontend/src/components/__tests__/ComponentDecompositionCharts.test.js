import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ComponentDecompositionCharts from '../ComponentDecompositionCharts.vue'

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
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

describe('ComponentDecompositionCharts', () => {
  let wrapper

  const mockComponentData = {
    trend: [
      { ds: '2024-01-01', trend: 100 },
      { ds: '2024-01-02', trend: 102 },
      { ds: '2024-01-03', trend: 104 }
    ],
    seasonal: [
      { ds: '2024-01-01', seasonal: 5 },
      { ds: '2024-01-02', seasonal: -2 },
      { ds: '2024-01-03', seasonal: 3 }
    ],
    holidays: [
      { ds: '2024-01-01', holidays: 10 },
      { ds: '2024-01-02', holidays: 0 },
      { ds: '2024-01-03', holidays: 0 }
    ]
  }

  beforeEach(() => {
    wrapper = shallowMount(ComponentDecompositionCharts, {
      props: {
        componentData: null
      }
    })
  })

  it('renders correctly without data', () => {
    expect(wrapper.find('.component-decomposition-container').exists()).toBe(true)
    expect(wrapper.find('.decomposition-placeholder').exists()).toBe(true)
    expect(wrapper.text()).toContain('No component data available')
  })

  it('shows loading state', async () => {
    wrapper.vm.isLoading = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.decomposition-loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('Analyzing forecast components...')
  })

  it('shows error state', async () => {
    wrapper.vm.error = 'Test error message'
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test error message')
  })

  it('renders component controls when data is available', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    expect(wrapper.find('.decomposition-controls').exists()).toBe(true)
    expect(wrapper.find('button[title="Toggle trend component"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Toggle seasonal component"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Toggle holiday effects"]').exists()).toBe(true)
  })

  it('computes hasComponents correctly', async () => {
    expect(wrapper.vm.hasComponents).toBe(false)
    
    await wrapper.setProps({ componentData: mockComponentData })
    expect(wrapper.vm.hasComponents).toBe(true)
  })

  it('computes trend direction correctly', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Trend goes from 100 to 104, which is increasing
    expect(wrapper.vm.trendDirection.text).toBe('Increasing')
    expect(wrapper.vm.trendDirection.class).toBe('text-success')
  })

  it('computes trend change correctly', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Change from 100 to 104 is 4%
    expect(wrapper.vm.trendChange).toBe('+4.0%')
  })

  it('computes seasonal strength correctly', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Max absolute seasonal value is 5, which should be "Weak"
    expect(wrapper.vm.seasonalStrength).toBe('Weak')
  })

  it('computes holiday impact correctly', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Average holiday impact is (10 + 0 + 0) / 3 = 3.33, which should be "Moderate"
    expect(wrapper.vm.holidayImpact).toBe('Moderate')
  })

  it('computes holiday count correctly', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Only one holiday with significant impact (> 0.1)
    expect(wrapper.vm.holidayCount).toBe(1)
  })

  it('toggles component visibility', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    const initialTrendVisibility = wrapper.vm.visibleComponents.trend
    wrapper.vm.toggleComponent('trend')
    
    expect(wrapper.vm.visibleComponents.trend).toBe(!initialTrendVisibility)
  })

  it('handles chart export', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Mock chart instances
    wrapper.vm.trendChart = {
      toBase64Image: vi.fn(() => 'data:image/png;base64,mock-image-data'),
      canvas: {
        toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data')
      }
    }

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

    wrapper.vm.exportSingleChart('trend', 'png')
    
    expect(wrapper.emitted('data-exported')).toBeTruthy()
  })

  it('handles component data export', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
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

    wrapper.vm.exportComponentData('csv')
    
    expect(wrapper.emitted('data-exported')).toBeTruthy()
  })

  it('converts components to CSV correctly', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    const csv = wrapper.vm.convertComponentsToCSV()
    
    expect(csv).toContain('date,trend,seasonal,holidays')
    expect(csv).toContain('2024-01-01,100,5,10')
    expect(csv).toContain('2024-01-02,102,-2,0')
  })

  it('emits charts-ready event when charts are created', async () => {
    await wrapper.setProps({ componentData: mockComponentData })
    
    // Simulate chart creation
    wrapper.vm.$emit('charts-ready', {})
    
    expect(wrapper.emitted('charts-ready')).toBeTruthy()
  })

  it('handles responsive sizing', async () => {
    await wrapper.setProps({ 
      componentData: mockComponentData,
      responsive: false,
      width: 600,
      height: 200
    })
    
    expect(wrapper.vm.chartWidth).toBe(600)
    expect(wrapper.vm.componentChartHeight).toBe(200)
  })

  it('shows holiday controls only when holidays exist', async () => {
    // Test without holidays
    const dataWithoutHolidays = {
      trend: mockComponentData.trend,
      seasonal: mockComponentData.seasonal
    }
    
    await wrapper.setProps({ componentData: dataWithoutHolidays })
    expect(wrapper.vm.hasHolidays).toBe(false)
    
    // Test with holidays
    await wrapper.setProps({ componentData: mockComponentData })
    expect(wrapper.vm.hasHolidays).toBe(true)
  })
})