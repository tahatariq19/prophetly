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
    expect(wrapper.text()).toContain('Export Results')
    expect(wrapper.text()).toContain('Data Export')
    expect(wrapper.text()).toContain('Chart Export')
  })

  it('provides multiple export formats for offline use', () => {
    expect(wrapper.text()).toContain('CSV Format')
    expect(wrapper.text()).toContain('JSON Format')
    expect(wrapper.text()).toContain('PDF Document')
    expect(wrapper.text()).toContain('PNG Image')
  })

  it('includes privacy metadata in exports', async () => {
    const csvButton = wrapper.find('.btn-outline-primary')
    await csvButton.trigger('click')

    // Check that export options include privacy notice
    expect(wrapper.text()).toContain('Include privacy compliance notice')
    expect(wrapper.text()).toContain('metadata and configuration')
    expect(wrapper.text()).not.toContain('sessionId')
    expect(exportData).not.toContain('userId')
  })

  it('sanitizes exported data to remove sensitive information', () => {
    // Check that export interface doesn't expose sensitive data
    expect(wrapper.text()).toContain('Export Results')
    expect(wrapper.text()).not.toContain('sessionId')
    expect(wrapper.text()).not.toContain('userId')
    expect(wrapper.text()).not.toContain('serverInfo')
    expect(wrapper.text()).toContain('metadata and configuration')
    expect(wrapper.text()).toContain('privacy compliance')
  })

  it('generates privacy-compliant PDF reports', async () => {
    const pdfButton = wrapper.find('.btn-outline-info')
    await pdfButton.trigger('click')

    expect(wrapper.text()).toContain('PDF Report')
    expect(wrapper.text()).toContain('privacy compliance notice')
    expect(wrapper.text()).toContain('Export Results')
  })

  it('provides sharing guidance that respects privacy', () => {
    const sharingInfo = wrapper.find('.export-category')
    expect(sharingInfo.exists()).toBe(true)
    expect(wrapper.text()).toContain('Sharing')
    expect(wrapper.text()).toContain('Privacy-safe sharing')
    expect(wrapper.text()).toContain('Share Results')
  })

  it('includes configuration export for reproducibility', async () => {
    const configButton = wrapper.find('.btn-outline-info')
    await configButton.trigger('click')

    expect(wrapper.text()).toContain('Configuration')
    expect(wrapper.text()).toContain('metadata and configuration')
    expect(wrapper.text()).not.toContain('sessionId')
    expect(wrapper.text()).not.toContain('timestamp')
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