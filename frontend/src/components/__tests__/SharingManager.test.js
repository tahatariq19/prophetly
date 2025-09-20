import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SharingManager from '../SharingManager.vue'
import { useSessionStore } from '../../stores/session'

// Mock the export service
vi.mock('../../services/export', () => ({
  exportService: {
    generateForecastReport: vi.fn(),
    downloadFile: vi.fn()
  }
}))

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

describe('SharingManager', () => {
  let wrapper
  let sessionStore

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    
    // Set up mock session data
    sessionStore.sessionId = 'test-session-123'
    sessionStore.forecastResults = {
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

    wrapper = mount(SharingManager, {
      global: {
        plugins: [createPinia()]
      }
    })
  })

  it('renders sharing categories correctly', () => {
    expect(wrapper.find('.sharing-manager').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sharing & Documentation')
    expect(wrapper.text()).toContain('Quick Share')
    expect(wrapper.text()).toContain('Documentation')
    expect(wrapper.text()).toContain('Collaboration')
  })

  it('shows privacy notice', () => {
    expect(wrapper.text()).toContain('Privacy-First Sharing')
    expect(wrapper.text()).toContain('no raw user data')
  })

  it('generates executive summary correctly', () => {
    const summary = wrapper.vm.generateExecutiveSummary()
    
    expect(summary).toContain('30 period predictions')
    expect(summary).toContain('365 historical data points')
    expect(summary).toContain('linear growth')
    expect(summary).toContain('additive seasonality')
  })

  it('generates technical summary correctly', () => {
    const summary = wrapper.vm.generateTechnicalSummary()
    
    expect(summary).toContain('Growth=linear')
    expect(summary).toContain('Seasonality=additive')
    expect(summary).toContain('Confidence=80%')
  })

  it('adds comments correctly', async () => {
    wrapper.vm.newComment.text = 'Test comment'
    wrapper.vm.newComment.type = 'insight'
    wrapper.vm.newComment.title = 'Test Title'
    
    wrapper.vm.addComment()
    
    expect(wrapper.vm.userComments).toHaveLength(1)
    expect(wrapper.vm.userComments[0].text).toBe('Test comment')
    expect(wrapper.vm.userComments[0].type).toBe('insight')
    expect(wrapper.vm.userComments[0].title).toBe('Test Title')
  })

  it('removes comments correctly', () => {
    wrapper.vm.userComments = [
      { id: 1, text: 'Comment 1', type: 'general' },
      { id: 2, text: 'Comment 2', type: 'insight' }
    ]
    
    wrapper.vm.removeComment(0)
    
    expect(wrapper.vm.userComments).toHaveLength(1)
    expect(wrapper.vm.userComments[0].text).toBe('Comment 2')
  })

  it('copies summary to clipboard', async () => {
    await wrapper.vm.shareToClipboard()
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })

  it('handles sharing errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    const error = { type: 'sharing', error: 'Test error' }
    wrapper.vm.$emit('sharing-error', error)
    
    consoleSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('opens annotation modal', async () => {
    const annotateButton = wrapper.find('button:contains("Add Comments")')
    await annotateButton.trigger('click')
    
    expect(wrapper.vm.showAnnotationModal).toBe(true)
  })

  it('saves detailed annotations', () => {
    wrapper.vm.detailedAnnotation.title = 'Detailed Test'
    wrapper.vm.detailedAnnotation.content = 'Detailed content'
    wrapper.vm.detailedAnnotation.category = 'analysis'
    
    wrapper.vm.saveDetailedAnnotation()
    
    expect(wrapper.vm.userComments).toHaveLength(1)
    expect(wrapper.vm.userComments[0].title).toBe('Detailed Test')
    expect(wrapper.vm.userComments[0].text).toBe('Detailed content')
    expect(wrapper.vm.userComments[0].detailed).toBe(true)
  })

  it('formats dates correctly', () => {
    const testDate = new Date('2023-12-01T10:30:00Z')
    const formatted = wrapper.vm.formatDate(testDate)
    
    expect(formatted).toMatch(/Dec \d+, \d+:\d+ [AP]M/)
  })
})