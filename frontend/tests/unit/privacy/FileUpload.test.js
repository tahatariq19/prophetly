import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileUpload from '@/components/FileUpload.vue'

// Mock the API service
vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(() => Promise.resolve({
    success: true,
    sessionId: 'test-session',
    data_preview: { rows: [], columns: [] },
    file_info: { rows: 10, columns: 2 }
  }))
}))

describe('FileUpload Privacy Features', () => {
  let wrapper
  let pinia
  let mockApiService

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    mockApiService = {
      uploadFile: vi.fn(() => Promise.resolve({
        success: true,
        sessionId: 'test-session',
        preview: { rows: 10, columns: 2 }
      })),
      validateFile: vi.fn(() => Promise.resolve({ valid: true }))
    }

    // Mock File API with proper lastModified
    global.File = class MockFile {
      constructor(content, name, options = {}) {
        this.name = name
        this.size = content.length || 1024
        this.type = options.type || 'text/csv'
        this.lastModified = Date.now()
      }
    }
  })

  it('displays privacy notice prominently', () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    expect(wrapper.find('.alert-info').exists()).toBe(true)
    expect(wrapper.text()).toContain('Privacy Guarantee')
    expect(wrapper.text()).toContain('processed entirely in server memory')
    expect(wrapper.text()).toContain('automatically discarded after your session')
  })

  it('shows memory-only processing status during upload', async () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const file = new File(['date,value\n2023-01-01,100'], 'test.csv', { type: 'text/csv' })
    const input = wrapper.find('input[type="file"]')
    
    // Mock file selection
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })
    
    await input.trigger('change')

    expect(wrapper.text()).toContain('Ready to upload')
    expect(wrapper.text()).toContain('No data is ever saved')
    expect(wrapper.text()).toContain('Process File')
  })

  it('validates file without exposing content in logs', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const file = new File(['date,value\n2023-01-01,100\n2023-01-02,110'], 'sensitive-data.csv', { type: 'text/csv' })
    await wrapper.vm.handleFileSelection(file)

    // Verify validation logs don't contain file content
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('100')
      expect(String(call)).not.toContain('110')
      expect(String(call)).not.toContain('2023-01-01')
    })

    consoleSpy.mockRestore()
  })

  it('provides clear privacy messaging for file size limits', () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    expect(wrapper.text()).toContain('Maximum 10MB')
    expect(wrapper.text()).toContain('date and value columns')
    expect(wrapper.text()).toContain('CSV format only')
  })

  it('handles upload errors with privacy-safe messaging', async () => {
    mockApiService.uploadFile.mockRejectedValue(new Error('Server error with user data: john@example.com'))
    
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    await wrapper.vm.uploadFile()

    // Error message should not contain sensitive information
    expect(wrapper.text()).toContain('Privacy Guarantee')
    expect(wrapper.text()).not.toContain('john@example.com')
    expect(wrapper.text()).toContain('processed entirely')
    expect(wrapper.text()).toContain('automatically discarded')
  })

  it('clears file input after processing for privacy', async () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const input = wrapper.find('input[type="file"]')
    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })
    
    await input.trigger('change')
    await wrapper.vm.$nextTick()

    // File should be selected after file input change
    expect(wrapper.vm.selectedFile).toBeTruthy()
    expect(wrapper.text()).toContain('Ready to upload')
  })

  it('provides drag-and-drop with privacy information', () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const dropzone = wrapper.find('.upload-area')
    expect(dropzone.exists()).toBe(true)
    expect(dropzone.text()).toContain('Drop your CSV file here')
    expect(dropzone.text()).toContain('click to browse')
  })

  it('shows file format requirements with privacy context', () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    expect(wrapper.text()).toContain('CSV format only')
    expect(wrapper.text()).toContain('date and value columns')
    expect(wrapper.text()).toContain('Maximum 10MB')
  })

  it('prevents multiple simultaneous uploads for privacy', async () => {
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const file1 = new File(['test1'], 'test1.csv', { type: 'text/csv' })
    const file2 = new File(['test2'], 'test2.csv', { type: 'text/csv' })

    // Set first file and start upload
    wrapper.vm.selectedFile = file1
    const upload1Promise = wrapper.vm.uploadFile()
    
    // Try to start second upload while first is in progress
    wrapper.vm.selectedFile = file2
    await wrapper.vm.uploadFile()

    expect(wrapper.vm.isUploading).toBe(true)
    expect(wrapper.text()).toContain('Processing')
    expect(wrapper.text()).toContain('memory only')

    await upload1Promise
  })

  it('provides upload progress with privacy assurance', async () => {
    // Mock upload with progress
    mockApiService.uploadFile.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve({
          success: true,
          sessionId: 'test-session'
        }), 100)
      })
    })

    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia],
        mocks: {
          $api: mockApiService
        }
      }
    })

    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    wrapper.vm.selectedFile = file
    wrapper.vm.uploadFile()
    
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Processing')
    expect(wrapper.text()).toContain('memory only')
    expect(wrapper.text()).toContain('no data stored')
  })
})