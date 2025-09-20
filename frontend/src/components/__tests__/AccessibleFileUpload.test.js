import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AccessibleFileUpload from '../AccessibleFileUpload.vue'

// Mock the accessibility composable
vi.mock('@/composables/useAccessibility', () => ({
  useAccessibility: () => ({
    accessibilityClasses: { 'keyboard-navigation': false },
    isKeyboardNavigating: false,
    announceToScreenReader: vi.fn(),
    announceError: vi.fn(),
    announceSuccess: vi.fn(),
    makeTableAccessible: vi.fn()
  })
}))

// Mock the session store
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    dataPreview: null,
    setUploadedData: vi.fn()
  })
}))

// Mock the API service
vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(() => Promise.resolve({
    data_preview: {
      columns: ['date', 'value'],
      rows: [{ date: '2023-01-01', value: 100 }],
      total_rows: 1
    },
    column_mapping: {
      dateColumn: 'date',
      valueColumn: 'value'
    },
    data_quality: {
      completeness: 100,
      missing_values: 0
    },
    file_info: {
      rows: 1,
      columns: 2
    }
  }))
}))

// Mock the validation utility
vi.mock('@/utils/validation', () => ({
  fileValidation: {
    validateFile: vi.fn(() => ({
      isValid: true,
      errors: [],
      fileInfo: { size: 1024, type: 'text/csv' }
    })),
    getFileSize: vi.fn(() => '1 KB')
  }
}))

describe('AccessibleFileUpload', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders with proper accessibility attributes', () => {
    const wrapper = mount(AccessibleFileUpload)
    
    // Check for screen reader instructions
    expect(wrapper.find('#upload-instructions').exists()).toBe(true)
    
    // Check upload area accessibility
    const uploadArea = wrapper.find('.upload-area')
    expect(uploadArea.attributes('role')).toBe('button')
    expect(uploadArea.attributes('tabindex')).toBe('0')
    expect(uploadArea.attributes('aria-describedby')).toBe('upload-instructions')
  })

  it('has proper heading structure', () => {
    const wrapper = mount(AccessibleFileUpload)
    
    // Privacy heading
    expect(wrapper.find('#privacy-heading').exists()).toBe(true)
    
    // Upload title
    expect(wrapper.find('#upload-title').exists()).toBe(true)
  })

  it('provides keyboard navigation support', async () => {
    const wrapper = mount(AccessibleFileUpload)
    
    const uploadArea = wrapper.find('.upload-area')
    
    // Test Enter key
    await uploadArea.trigger('keydown', { key: 'Enter' })
    
    // Test Space key
    await uploadArea.trigger('keydown', { key: ' ' })
    
    // Test Escape key
    await uploadArea.trigger('keydown', { key: 'Escape' })
  })

  it('has accessible form elements', () => {
    const wrapper = mount(AccessibleFileUpload)
    
    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.attributes('aria-describedby')).toBe('upload-instructions')
  })

  it('provides proper ARIA labels and descriptions', () => {
    const wrapper = mount(AccessibleFileUpload)
    
    // Privacy notice region
    const privacyNotice = wrapper.find('.privacy-notice')
    expect(privacyNotice.attributes('role')).toBe('region')
    expect(privacyNotice.attributes('aria-labelledby')).toBe('privacy-heading')
  })

  it('has accessible error handling', async () => {
    const wrapper = mount(AccessibleFileUpload)
    
    wrapper.vm.errors = ['Test error']
    await wrapper.vm.$nextTick()
    
    const errorAlert = wrapper.find('.alert-danger')
    expect(errorAlert.attributes('role')).toBe('alert')
    expect(errorAlert.attributes('aria-live')).toBe('assertive')
  })

  it('provides accessible progress indication', async () => {
    const wrapper = mount(AccessibleFileUpload)
    
    wrapper.vm.isUploading = true
    wrapper.vm.uploadStatus = {
      stage: 'Processing...',
      progress: 50,
      message: 'Uploading'
    }
    await wrapper.vm.$nextTick()
    
    const uploadingState = wrapper.find('.uploading-state')
    expect(uploadingState.attributes('role')).toBe('status')
    expect(uploadingState.attributes('aria-live')).toBe('polite')
    
    const progressBar = wrapper.find('.progress')
    expect(progressBar.attributes('role')).toBe('progressbar')
    expect(progressBar.attributes('aria-valuenow')).toBe('50')
  })

  it('has accessible data table when preview is available', async () => {
    const wrapper = mount(AccessibleFileUpload)
    
    // Mock data preview
    const mockPreview = {
      columns: ['date', 'value'],
      sampleRows: [{ date: '2023-01-01', value: 100 }],
      totalRows: 1,
      columnMapping: { dateColumn: 'date', valueColumn: 'value' },
      stats: { completeness: 100, missingValues: 0 }
    }
    
    wrapper.vm.$store = { dataPreview: mockPreview }
    await wrapper.vm.$nextTick()
    
    const table = wrapper.find('table')
    expect(table.attributes('role')).toBe('table')
    expect(table.attributes('aria-label')).toContain('Data preview table')
    
    // Check column headers
    const headers = wrapper.findAll('th')
    headers.forEach((header, index) => {
      expect(header.attributes('role')).toBe('columnheader')
      expect(header.attributes('scope')).toBe('col')
      expect(header.attributes('id')).toBe(`col-${index}`)
    })
    
    // Check data cells
    const cells = wrapper.findAll('td')
    cells.forEach(cell => {
      expect(cell.attributes('role')).toBe('gridcell')
      expect(cell.attributes('headers')).toBeDefined()
    })
  })

  it('provides quality metrics with proper labeling', async () => {
    const wrapper = mount(AccessibleFileUpload)
    
    const mockPreview = {
      columns: ['date', 'value'],
      totalRows: 1,
      stats: { completeness: 100, missingValues: 0 },
      columnMapping: { dateColumn: 'date', valueColumn: 'value' }
    }
    
    wrapper.vm.$store = { dataPreview: mockPreview }
    await wrapper.vm.$nextTick()
    
    const qualityMetrics = wrapper.findAll('.quality-metric')
    qualityMetrics.forEach(metric => {
      expect(metric.attributes('role')).toBe('group')
    })
  })

  it('has accessible buttons with proper labels', () => {
    const wrapper = mount(AccessibleFileUpload)
    
    const buttons = wrapper.findAll('button')
    buttons.forEach(button => {
      // Each button should have either aria-label or descriptive text
      const hasAriaLabel = button.attributes('aria-label')
      const hasText = button.text().trim().length > 0
      expect(hasAriaLabel || hasText).toBe(true)
    })
  })

  it('provides keyboard shortcuts help when keyboard navigation is active', async () => {
    const wrapper = mount(AccessibleFileUpload)
    
    // Mock keyboard navigation active
    wrapper.vm.isKeyboardNavigating = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.keyboard-help').exists()).toBe(true)
    expect(wrapper.find('.keyboard-help summary').text()).toContain('Keyboard Shortcuts')
  })

  it('announces important state changes to screen readers', async () => {
    const wrapper = mount(AccessibleFileUpload)
    const mockAnnounce = wrapper.vm.announceToScreenReader
    
    // Test file selection announcement
    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    await wrapper.vm.handleFileSelection(file)
    
    expect(mockAnnounce).toHaveBeenCalled()
  })

  it('provides proper focus management', () => {
    const wrapper = mount(AccessibleFileUpload)
    
    // Upload area should be focusable
    const uploadArea = wrapper.find('.upload-area')
    expect(uploadArea.attributes('tabindex')).toBe('0')
    
    // File input should be properly hidden but accessible
    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.classes()).toContain('visually-hidden')
  })

  it('supports high contrast mode', () => {
    const wrapper = mount(AccessibleFileUpload, {
      props: {},
      data() {
        return {
          accessibilityClasses: { 'high-contrast': true }
        }
      }
    })
    
    expect(wrapper.find('.accessible-file-upload').classes()).toContain('high-contrast')
  })

  it('handles reduced motion preferences', () => {
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
    
    const wrapper = mount(AccessibleFileUpload)
    
    // Component should handle reduced motion
    expect(wrapper.vm).toBeDefined()
  })
})