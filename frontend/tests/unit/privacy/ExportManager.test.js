import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExportManager from '@/components/ExportManager.vue'

describe('ExportManager Component - Privacy Features', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    wrapper = mount(ExportManager, {
      props: {
        results: [
          {
            id: 'forecast-1',
            data: [{ date: '2023-01-01', value: 100, forecast: 105 }],
            config: { horizon: 30, seasonality: true }
          }
        ]
      },
      global: {
        plugins: [pinia]
      }
    })
  })

  it('displays privacy-focused export options', () => {
    expect(wrapper.text()).toContain('Privacy-Safe Export')
    expect(wrapper.text()).toContain('Client-Side Processing Only')
    expect(wrapper.text()).toContain('No Server Upload Required')
  })

  it('provides multiple export formats for offline use', () => {
    expect(wrapper.find('.export-csv').exists()).toBe(true)
    expect(wrapper.find('.export-json').exists()).toBe(true)
    expect(wrapper.find('.export-pdf').exists()).toBe(true)
    expect(wrapper.find('.export-png').exists()).toBe(true)
  })

  it('includes privacy metadata in exports', async () => {
    const csvButton = wrapper.find('.export-csv')
    await csvButton.trigger('click')

    const exportData = wrapper.vm.generateCSVExport()
    expect(exportData).toContain('# Privacy Notice: Data processed locally, no server storage')
    expect(exportData).toContain('# Generated on:')
    expect(exportData).not.toContain('sessionId')
    expect(exportData).not.toContain('userId')
  })

  it('sanitizes exported data to remove sensitive information', () => {
    const sanitizedData = wrapper.vm.sanitizeExportData({
      sessionId: 'secret-123',
      userId: 'user-456',
      forecast: [{ date: '2023-01-01', value: 100 }],
      config: { horizon: 30 },
      metadata: {
        serverInfo: 'internal-server-details',
        processingTime: '2.5s'
      }
    })

    expect(sanitizedData).not.toHaveProperty('sessionId')
    expect(sanitizedData).not.toHaveProperty('userId')
    expect(sanitizedData.metadata).not.toHaveProperty('serverInfo')
    expect(sanitizedData).toHaveProperty('forecast')
    expect(sanitizedData).toHaveProperty('config')
  })

  it('generates privacy-compliant PDF reports', async () => {
    const pdfButton = wrapper.find('.export-pdf')
    await pdfButton.trigger('click')

    expect(wrapper.vm.generatePDFContent()).toContain('Privacy-First Forecast Report')
    expect(wrapper.vm.generatePDFContent()).toContain('No data was stored on external servers')
    expect(wrapper.vm.generatePDFContent()).toContain('Generated locally in your browser')
  })

  it('provides sharing guidance that respects privacy', () => {
    const sharingInfo = wrapper.find('.sharing-guidance')
    expect(sharingInfo.exists()).toBe(true)
    expect(sharingInfo.text()).toContain('Manual Sharing Only')
    expect(sharingInfo.text()).toContain('Download and share files manually')
    expect(sharingInfo.text()).toContain('No automatic cloud uploads')
  })

  it('includes configuration export for reproducibility', async () => {
    const configButton = wrapper.find('.export-config')
    await configButton.trigger('click')

    const configData = wrapper.vm.generateConfigExport()
    expect(configData).toContain('horizon')
    expect(configData).toContain('seasonality')
    expect(configData).not.toContain('sessionId')
    expect(configData).not.toContain('timestamp')
  })

  it('validates export file naming excludes sensitive data', () => {
    const filename = wrapper.vm.generateExportFilename('csv')
    expect(filename).toMatch(/^prophet_forecast_\d{8}_\d{6}\.csv$/)
    expect(filename).not.toContain('session')
    expect(filename).not.toContain('user')
  })

  it('provides export progress feedback', async () => {
    const exportButton = wrapper.find('.export-pdf')
    await exportButton.trigger('click')

    expect(wrapper.find('.export-progress').exists()).toBe(true)
    expect(wrapper.text()).toContain('Generating export')
    expect(wrapper.text()).toContain('Processing locally')
  })

  it('handles export errors without exposing sensitive information', async () => {
    // Mock export failure
    vi.spyOn(wrapper.vm, 'generatePDFExport').mockRejectedValue(
      new Error('Export failed with session data: secret-123')
    )

    const pdfButton = wrapper.find('.export-pdf')
    await pdfButton.trigger('click')

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Export failed')
    expect(wrapper.text()).not.toContain('secret-123')
    expect(wrapper.text()).toContain('Please try again')
  })

  it('displays data retention policy in export interface', () => {
    expect(wrapper.text()).toContain('Data Retention Policy')
    expect(wrapper.text()).toContain('Exports are generated locally')
    expect(wrapper.text()).toContain('No copies retained on servers')
    expect(wrapper.text()).toContain('You control all exported data')
  })

  it('provides accessibility features for export options', () => {
    const exportButtons = wrapper.findAll('.export-button')
    exportButtons.forEach(button => {
      expect(button.attributes('aria-label')).toBeDefined()
      expect(button.attributes('role')).toBe('button')
    })

    expect(wrapper.find('[aria-describedby="export-privacy-info"]').exists()).toBe(true)
  })
})