import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Upload from '@/pages/Upload.vue'

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

describe('Upload Page Integration', () => {
  let wrapper
  let pinia
  let router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: Upload },
        { path: '/configure', component: { template: '<div>Configure</div>' } }
      ]
    })
    
    wrapper = mount(Upload, {
      global: {
        plugins: [pinia, router]
      }
    })
  })

  it('renders the upload page correctly', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.upload-page').exists()).toBe(true)
  })

  it('displays page header', () => {
    const header = wrapper.find('.page-header')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('Upload Your Data')
    expect(header.text()).toContain('Upload your time series data to get started with forecasting')
  })

  it('includes FileUpload component', () => {
    const fileUpload = wrapper.findComponent({ name: 'FileUpload' })
    expect(fileUpload.exists()).toBe(true)
  })

  it('displays help section', () => {
    const helpSection = wrapper.find('.help-section')
    expect(helpSection.exists()).toBe(true)
    
    const helpCards = wrapper.findAll('.help-card')
    expect(helpCards).toHaveLength(3)
    
    // Check help card content
    expect(helpCards[0].text()).toContain('CSV Format')
    expect(helpCards[1].text()).toContain('Date Column')
    expect(helpCards[2].text()).toContain('Value Column')
  })

  it('displays sample data section', () => {
    const sampleSection = wrapper.find('.sample-data-section')
    expect(sampleSection.exists()).toBe(true)
    expect(sampleSection.text()).toContain('Need Sample Data?')
    
    const sampleButtons = sampleSection.findAll('button')
    expect(sampleButtons).toHaveLength(3)
    expect(sampleButtons[0].text()).toContain('E-commerce Sales')
    expect(sampleButtons[1].text()).toContain('Website Traffic')
    expect(sampleButtons[2].text()).toContain('Financial Data')
  })

  it('handles file upload events', async () => {
    const fileUpload = wrapper.findComponent({ name: 'FileUpload' })
    
    // Simulate file upload event
    const uploadData = {
      file: new File(['date,value\n2023-01-01,100'], 'test.csv', { type: 'text/csv' }),
      data: [{ date: '2023-01-01', value: 100 }],
      preview: { totalRows: 1, columns: ['date', 'value'] }
    }
    
    await fileUpload.vm.$emit('file-uploaded', uploadData)
    
    expect(wrapper.vm.uploadStatus).toBe('success')
    expect(wrapper.vm.uploadError).toBe(null)
  })

  it('handles upload errors', async () => {
    const fileUpload = wrapper.findComponent({ name: 'FileUpload' })
    
    const error = new Error('Upload failed')
    await fileUpload.vm.$emit('upload-error', error)
    
    expect(wrapper.vm.uploadStatus).toBe('error')
    expect(wrapper.vm.uploadError).toBe(error)
  })

  it('handles proceed to configuration', async () => {
    const fileUpload = wrapper.findComponent({ name: 'FileUpload' })
    
    // Mock router push
    const pushSpy = vi.spyOn(router, 'push')
    
    await fileUpload.vm.$emit('proceed-to-config')
    
    expect(pushSpy).toHaveBeenCalledWith('/configure')
  })

  it('generates sample data correctly', async () => {
    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    }
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
    
    // Test sales data generation
    await wrapper.vm.downloadSampleData('sales')
    
    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(mockLink.download).toBe('sample_sales_data.csv')
    expect(mockLink.click).toHaveBeenCalled()
    
    // Test traffic data generation
    await wrapper.vm.downloadSampleData('traffic')
    expect(mockLink.download).toBe('sample_traffic_data.csv')
    
    // Test financial data generation
    await wrapper.vm.downloadSampleData('financial')
    expect(mockLink.download).toBe('sample_financial_data.csv')
  })


})