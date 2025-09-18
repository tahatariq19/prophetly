import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileUpload from '@/components/FileUpload.vue'

// Mock the API service
vi.mock('@/services/api', () => ({
  uploadFile: vi.fn()
}))

// Mock the session store
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    dataPreview: null,
    setUploadedData: vi.fn()
  })
}))

describe('FileUpload Component', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    wrapper = mount(FileUpload, {
      global: {
        plugins: [pinia]
      }
    })
  })

  it('renders the component correctly', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.file-upload-component').exists()).toBe(true)
  })

  it('displays privacy notice', () => {
    const privacyNotice = wrapper.find('.alert-info')
    expect(privacyNotice.exists()).toBe(true)
    expect(privacyNotice.text()).toContain('Privacy Guarantee')
    expect(privacyNotice.text()).toContain('processed entirely in server memory')
  })

  it('shows upload prompt when no file is selected', () => {
    const uploadPrompt = wrapper.find('.upload-prompt')
    expect(uploadPrompt.exists()).toBe(true)
    expect(uploadPrompt.text()).toContain('Drop your CSV file here')
    expect(uploadPrompt.text()).toContain('or click to browse files')
  })

  it('displays upload requirements', () => {
    const requirements = wrapper.find('.upload-requirements')
    expect(requirements.exists()).toBe(true)
    expect(requirements.text()).toContain('CSV format only')
    expect(requirements.text()).toContain('Maximum 10MB')
    expect(requirements.text()).toContain('Must contain date and value columns')
  })

  it('handles file input click', async () => {
    const uploadArea = wrapper.find('.upload-area')
    const fileInput = wrapper.find('input[type="file"]')
    
    // Mock the click method
    const clickSpy = vi.spyOn(fileInput.element, 'click')
    
    await uploadArea.trigger('click')
    
    expect(clickSpy).toHaveBeenCalled()
  })

  it('handles drag and drop events', async () => {
    const uploadArea = wrapper.find('.upload-area')
    
    // Test drag over
    await uploadArea.trigger('dragover')
    expect(wrapper.vm.isDragOver).toBe(true)
    
    // Test drag leave
    await uploadArea.trigger('dragleave')
    // Note: In real implementation, this depends on event.relatedTarget
    
    // Test drag enter
    await uploadArea.trigger('dragenter')
    expect(wrapper.vm.isDragOver).toBe(true)
  })

  it('validates file selection', async () => {
    // Create a mock CSV file
    const csvFile = new File(['date,value\n2023-01-01,100'], 'test.csv', {
      type: 'text/csv'
    })

    // Mock file input change event
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [csvFile],
      writable: false
    })

    await fileInput.trigger('change')
    
    expect(wrapper.vm.selectedFile).toBeTruthy()
    expect(wrapper.vm.hasError).toBe(false)
  })

  it('shows error for invalid file type', async () => {
    // Create a mock invalid file (not CSV and not .txt extension)
    const invalidFile = new File(['invalid content'], 'test.pdf', {
      type: 'application/pdf'
    })

    // Simulate file selection with invalid file
    await wrapper.vm.handleFileSelection(invalidFile)
    
    expect(wrapper.vm.hasError).toBe(true)
    expect(wrapper.vm.errors).toContain('Invalid file type. Please upload a CSV file.')
  })

  it('shows error for oversized file', async () => {
    // Create a mock oversized file (simulate 15MB)
    const oversizedFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.csv', {
      type: 'text/csv'
    })

    await wrapper.vm.handleFileSelection(oversizedFile)
    
    expect(wrapper.vm.hasError).toBe(true)
    expect(wrapper.vm.errors.some(error => error.includes('File too large'))).toBe(true)
  })

  it('emits events correctly', async () => {
    const csvFile = new File(['date,value\n2023-01-01,100'], 'test.csv', {
      type: 'text/csv'
    })

    await wrapper.vm.handleFileSelection(csvFile)
    
    expect(wrapper.emitted('file-uploaded')).toBeTruthy()
    expect(wrapper.emitted('file-uploaded')[0][0]).toMatchObject({
      file: csvFile,
      validation: expect.any(Object)
    })
  })

  it('clears file selection', async () => {
    const csvFile = new File(['date,value\n2023-01-01,100'], 'test.csv', {
      type: 'text/csv'
    })

    await wrapper.vm.handleFileSelection(csvFile)
    expect(wrapper.vm.selectedFile).toBeTruthy()

    await wrapper.vm.clearFile()
    expect(wrapper.vm.selectedFile).toBe(null)
    expect(wrapper.vm.hasError).toBe(false)
  })

  it('formats cell values correctly', () => {
    expect(wrapper.vm.formatCellValue(null)).toBe('-')
    expect(wrapper.vm.formatCellValue(undefined)).toBe('-')
    expect(wrapper.vm.formatCellValue(1234)).toBe('1,234')
    expect(wrapper.vm.formatCellValue('test')).toBe('test')
  })

  it('handles proceed to configuration', async () => {
    await wrapper.vm.proceedToConfiguration()
    
    expect(wrapper.emitted('proceed-to-config')).toBeTruthy()
  })
})