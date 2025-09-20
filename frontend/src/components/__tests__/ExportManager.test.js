import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExportManager from '../ExportManager.vue'
import { useSessionStore } from '../../stores/session'

// Mock the export service
vi.mock('../../services/export', () => ({
  exportService: {
    exportForecastData: vi.fn(),
    exportConfiguration: vi.fn(),
    generateForecastReport: vi.fn(),
    downloadFile: vi.fn()
  }
}))

describe('ExportManager', () => {
  let wrapper
  let sessionStore

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    
    // Set up mock session data
    sessionStore.sessionId = 'test-session-123'
    sessionStore.forecastResults = {
      forecast_data: [
        { ds: '2023-01-01', yhat: 100, yhat_lower: 90, yhat_upper: 110 }
      ],
      model_summary: {
        horizon: 30,
        growth: 'linear',
        seasonality_mode: 'additive'
      },
      performance_metrics: {
        mae: 5.2,
        rmse: 7.8,
        mape: 0.12
      }
    }
    sessionStore.forecastConfig = {
      horizon: 30,
      growth: 'linear',
      seasonality_mode: 'additive',
      interval_width: 0.8
    }
    sessionStore.uploadedData = new Array(365).fill({}).map((_, i) => ({
      date: `2023-01-${String(i + 1).padStart(2, '0')}`,
      value: Math.random() * 100
    }))

    wrapper = mount(ExportManager, {
      global: {
        plugins: [createPinia()]
      }
    })
  })

  it('renders export categories correctly', () => {
    expect(wrapper.find('.export-manager').exists()).toBe(true)
    expect(wrapper.text()).toContain('Export Results')
    expect(wrapper.text()).toContain('Data Export')
    expect(wrapper.text()).toContain('Chart Export')
    expect(wrapper.text()).toContain('Report Export')
    expect(wrapper.text()).toContain('Sharing')
  })

  it('shows export options when results are available', () => {
    expect(wrapper.find('button:contains("CSV Format")').exists()).toBe(true)
    expect(wrapper.find('button:contains("JSON Format")').exists()).toBe(true)
    expect(wrapper.find('button:contains("PNG Image")').exists()).toBe(true)
    expect(wrapper.find('button:contains("PDF Report")').exists()).toBe(true)
  })

  it('disables export buttons when no results available', async () => {
    sessionStore.forecastResults = null
    await wrapper.vm.$nextTick()
    
    const csvButton = wrapper.find('button').element
    expect(csvButton.disabled).toBe(true)
  })

  it('shows export progress when exporting', async () => {
    wrapper.vm.isExporting = true
    wrapper.vm.exportStatus = 'Preparing export...'
    wrapper.vm.exportProgress = 50
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Preparing export...')
    expect(wrapper.text()).toContain('50%')
  })

  it('handles export completion correctly', () => {
    const exportResult = {
      data: 'test-data',
      filename: 'test.csv',
      mimeType: 'text/csv'
    }
    
    wrapper.vm.addToHistory(exportResult, 'Data (CSV)')
    
    expect(wrapper.vm.exportHistory).toHaveLength(1)
    expect(wrapper.vm.exportHistory[0].filename).toBe('test.csv')
    expect(wrapper.vm.exportHistory[0].type).toBe('Data (CSV)')
  })

  it('formats file sizes correctly', () => {
    expect(wrapper.vm.formatFileSize(1024)).toBe('1 KB')
    expect(wrapper.vm.formatFileSize(1048576)).toBe('1 MB')
    expect(wrapper.vm.formatFileSize(500)).toBe('500 Bytes')
  })

  it('opens sharing manager modal', async () => {
    const shareButton = wrapper.find('button:contains("Share Results")')
    await shareButton.trigger('click')
    
    expect(wrapper.vm.showSharingManager).toBe(true)
  })

  it('handles export errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    const error = { type: 'data', format: 'csv', error: 'Test error' }
    wrapper.vm.$emit('export-error', error)
    
    expect(consoleSpy).toHaveBeenCalled()
    
    consoleSpy.mockRestore()
    alertSpy.mockRestore()
  })
})