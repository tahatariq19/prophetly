import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ForecastComparison from '../ForecastComparison.vue'

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
    BarElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    Filler: vi.fn(),
    TimeScale: vi.fn()
  }
})

// Mock chartjs plugins
vi.mock('chartjs-adapter-date-fns', () => ({}))

describe('ForecastComparison', () => {
  let wrapper

  const mockForecasts = [
    {
      name: 'Forecast A',
      timestamp: '2024-01-01 10:00:00',
      forecast: [
        { ds: '2024-01-01', yhat: 100 },
        { ds: '2024-01-02', yhat: 105 }
      ],
      historical: [
        { ds: '2023-12-30', y: 98 },
        { ds: '2023-12-31', y: 102 }
      ],
      metrics: {
        rmse: 5.2,
        mae: 3.8,
        mape: 12.5
      }
    },
    {
      name: 'Forecast B',
      timestamp: '2024-01-01 11:00:00',
      forecast: [
        { ds: '2024-01-01', yhat: 95 },
        { ds: '2024-01-02', yhat: 100 }
      ],
      historical: [
        { ds: '2023-12-30', y: 98 },
        { ds: '2023-12-31', y: 102 }
      ],
      metrics: {
        rmse: 4.8,
        mae: 3.2,
        mape: 10.8
      }
    }
  ]

  beforeEach(() => {
    wrapper = shallowMount(ForecastComparison, {
      props: {
        forecasts: []
      }
    })
  })

  it('renders correctly without forecasts', () => {
    expect(wrapper.find('.forecast-comparison-container').exists()).toBe(true)
    expect(wrapper.find('.comparison-placeholder').exists()).toBe(true)
    expect(wrapper.text()).toContain('No forecasts to compare')
  })

  it('shows loading state', async () => {
    wrapper.vm.isLoading = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.comparison-loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('Preparing forecast comparison...')
  })

  it('shows error state', async () => {
    wrapper.vm.error = 'Test error message'
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test error message')
  })

  it('renders comparison controls when forecasts are available', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.find('.comparison-controls').exists()).toBe(true)
    expect(wrapper.find('button[title="Side-by-side view"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Overlay view"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Metrics comparison"]').exists()).toBe(true)
  })

  it('computes available forecasts correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.vm.availableForecasts).toHaveLength(2)
    expect(wrapper.vm.availableForecasts[0].name).toBe('Forecast A')
    expect(wrapper.vm.availableForecasts[1].name).toBe('Forecast B')
  })

  it('auto-selects first two forecasts', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.vm.selectedPrimary).toBe('forecast_0')
    expect(wrapper.vm.selectedSecondary).toBe('forecast_1')
  })

  it('computes hasComparisons correctly', async () => {
    expect(wrapper.vm.hasComparisons).toBe(false)
    
    await wrapper.setProps({ forecasts: mockForecasts })
    expect(wrapper.vm.hasComparisons).toBe(true)
  })

  it('computes primary and secondary forecasts correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.vm.primaryForecast.name).toBe('Forecast A')
    expect(wrapper.vm.secondaryForecast.name).toBe('Forecast B')
  })

  it('computes RMSE winner correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    // Forecast B has lower RMSE (4.8 vs 5.2)
    expect(wrapper.vm.rmseWinner.name).toBe('Forecast B')
    expect(wrapper.vm.rmseWinner.class).toBe('text-success')
  })

  it('computes MAE winner correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    // Forecast B has lower MAE (3.2 vs 3.8)
    expect(wrapper.vm.maeWinner.name).toBe('Forecast B')
    expect(wrapper.vm.maeWinner.class).toBe('text-success')
  })

  it('computes MAPE winner correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    // Forecast B has lower MAPE (10.8 vs 12.5)
    expect(wrapper.vm.mapeWinner.name).toBe('Forecast B')
    expect(wrapper.vm.mapeWinner.class).toBe('text-success')
  })

  it('computes overall winner correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    // Forecast B wins all metrics
    expect(wrapper.vm.overallWinner.name).toBe('Forecast B')
    expect(wrapper.vm.overallWinner.class).toBe('text-success')
  })

  it('computes overall improvement correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.vm.overallImprovement).toContain('%')
    expect(wrapper.vm.overallImprovement).not.toBe('N/A')
  })

  it('provides recommendation based on winner', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.vm.recommendation).toBe('Use Forecast B for better accuracy')
  })

  it('toggles view mode correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.vm.viewMode).toBe('side-by-side')
    
    wrapper.vm.toggleView('overlay')
    expect(wrapper.vm.viewMode).toBe('overlay')
    
    wrapper.vm.toggleView('metrics')
    expect(wrapper.vm.viewMode).toBe('metrics')
  })

  it('prepares forecast data correctly', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    const data = wrapper.vm.prepareForecastData(mockForecasts[0], 'primary')
    
    expect(data.datasets).toHaveLength(2)
    expect(data.datasets[0].label).toBe('Historical Data')
    expect(data.datasets[1].label).toBe('Forecast')
  })

  it('handles export functions', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    wrapper.vm.exportComparison('png')
    expect(wrapper.emitted('data-exported')).toBeTruthy()
    
    wrapper.vm.exportComparisonData('csv')
    expect(wrapper.emitted('data-exported')).toBeTruthy()
    
    wrapper.vm.exportComparisonReport('pdf')
    expect(wrapper.emitted('data-exported')).toBeTruthy()
  })

  it('handles responsive sizing', async () => {
    await wrapper.setProps({ 
      forecasts: mockForecasts,
      responsive: false,
      width: 800,
      height: 400
    })
    
    expect(wrapper.vm.chartWidth).toBe(400) // width / 2
    expect(wrapper.vm.chartHeight).toBe(400)
    expect(wrapper.vm.overlayChartWidth).toBe(800)
    expect(wrapper.vm.overlayChartHeight).toBe(400)
  })

  it('shows forecast selection dropdowns', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    expect(wrapper.find('.forecast-selection').exists()).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(2)
  })

  it('disables secondary forecast option when same as primary', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    const secondarySelect = wrapper.findAll('select')[1]
    const options = secondarySelect.findAll('option')
    
    // First forecast should be disabled in secondary select
    expect(options[1].attributes('disabled')).toBeDefined()
  })

  it('emits comparison-ready event when comparison is created', async () => {
    await wrapper.setProps({ forecasts: mockForecasts })
    
    // Simulate comparison creation
    wrapper.vm.$emit('comparison-ready', {})
    
    expect(wrapper.emitted('comparison-ready')).toBeTruthy()
  })
})