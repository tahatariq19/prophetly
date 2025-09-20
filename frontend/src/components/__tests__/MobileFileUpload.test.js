import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MobileFileUpload from '../MobileFileUpload.vue'

// Mock the mobile utilities
vi.mock('@/utils/mobile', () => ({
  deviceDetection: {
    isMobile: () => true,
    isTouchDevice: () => true
  },
  touchUtils: {
    addTouchListeners: vi.fn(() => vi.fn()),
    preventDoubleTabZoom: vi.fn(() => vi.fn())
  },
  mobileUI: {
    showMobileFilePicker: vi.fn(() => Promise.resolve([])),
    showMobileToast: vi.fn(),
    createMobileModal: vi.fn(() => ({ close: vi.fn() }))
  },
  mobilePrivacy: {
    showPrivacyNotice: vi.fn(() => ({ close: vi.fn() }))
  }
}))

// Mock the session store
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    dataPreview: null,
    hasSeenPrivacyNotice: false,
    setPrivacyNoticeShown: vi.fn(),
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

describe('MobileFileUpload', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders mobile upload interface correctly', () => {
    const wrapper = mount(MobileFileUpload)
    
    expect(wrapper.find('.mobile-privacy-banner').exists()).toBe(true)
    expect(wrapper.find('.mobile-upload-area').exists()).toBe(true)
    expect(wrapper.find('.upload-prompt').exists()).toBe(true)
  })

  it('shows privacy banner with correct information', () => {
    const wrapper = mount(MobileFileUpload)
    
    const privacyBanner = wrapper.find('.mobile-privacy-banner')
    expect(privacyBanner.text()).toContain('Your Privacy is Protected')
    expect(privacyBanner.text()).toContain('Never stored on servers')
    expect(privacyBanner.text()).toContain('Auto-deleted after session')
  })

  it('displays mobile upload options', () => {
    const wrapper = mount(MobileFileUpload)
    
    expect(wrapper.find('button').text()).toContain('Choose File')
    expect(wrapper.find('.upload-requirements').exists()).toBe(true)
  })

  it('handles file selection correctly', async () => {
    const wrapper = mount(MobileFileUpload)
    
    // Create a mock file
    const file = new File(['test content'], 'test.csv', { type: 'text/csv' })
    
    // Simulate file selection
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false
    })
    
    await fileInput.trigger('change')
    
    expect(wrapper.vm.selectedFile).toBe(file)
  })

  it('shows file selected state when file is chosen', async () => {
    const wrapper = mount(MobileFileUpload)
    
    // Set selected file
    wrapper.vm.selectedFile = new File(['test'], 'test.csv', { type: 'text/csv' })
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.file-selected').exists()).toBe(true)
    expect(wrapper.find('button').text()).toContain('Process File Securely')
  })

  it('displays uploading state correctly', async () => {
    const wrapper = mount(MobileFileUpload)
    
    wrapper.vm.isUploading = true
    wrapper.vm.uploadStatus = {
      stage: 'Processing...',
      progress: 50,
      message: 'Uploading file'
    }
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.uploading-state').exists()).toBe(true)
    expect(wrapper.find('.progress-bar').attributes('style')).toContain('width: 50%')
  })

  it('shows privacy reminders during upload', async () => {
    const wrapper = mount(MobileFileUpload)
    
    wrapper.vm.isUploading = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.privacy-reminder').exists()).toBe(true)
    expect(wrapper.find('.privacy-reminder').text()).toContain('Processing in secure memory only')
  })

  it('displays error messages with privacy assurance', async () => {
    const wrapper = mount(MobileFileUpload)
    
    wrapper.vm.errors = ['File too large']
    await wrapper.vm.$nextTick()
    
    const errorDisplay = wrapper.find('.mobile-error-display')
    expect(errorDisplay.exists()).toBe(true)
    expect(errorDisplay.text()).toContain('File too large')
    expect(errorDisplay.text()).toContain('Your data remains private')
  })

  it('emits correct events', async () => {
    const wrapper = mount(MobileFileUpload)
    
    // Test proceed to config event
    await wrapper.vm.proceedToConfig()
    expect(wrapper.emitted('proceed-to-config')).toBeTruthy()
  })

  it('handles mobile-specific interactions', () => {
    const wrapper = mount(MobileFileUpload)
    
    // Test mobile file picker
    wrapper.vm.selectFile()
    
    // Test camera capture (should show info message)
    wrapper.vm.captureFromCamera()
  })

  it('shows data preview with mobile-optimized layout', async () => {
    const wrapper = mount(MobileFileUpload)
    
    // Mock data preview
    wrapper.vm.$store = {
      dataPreview: {
        columns: ['date', 'value'],
        sampleRows: [{ date: '2023-01-01', value: 100 }],
        totalRows: 1,
        columnMapping: { dateColumn: 'date', valueColumn: 'value' },
        stats: { completeness: 100, missingValues: 0 }
      }
    }
    
    await wrapper.vm.$nextTick()
    
    // Should show mobile data preview components
    expect(wrapper.find('.mobile-data-stats').exists()).toBe(true)
    expect(wrapper.find('.mobile-column-detection').exists()).toBe(true)
    expect(wrapper.find('.mobile-data-table').exists()).toBe(true)
  })

  it('provides session notice with mobile-friendly layout', async () => {
    const wrapper = mount(MobileFileUpload)
    
    // Set data preview to show session notice
    wrapper.vm.$store = {
      dataPreview: { columns: ['date'], totalRows: 1 }
    }
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.mobile-session-notice').exists()).toBe(true)
    expect(wrapper.find('.mobile-session-notice').text()).toContain('Session Data Notice')
  })
})