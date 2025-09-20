import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SessionResultManager from '@/components/SessionResultManager.vue'

describe('SessionResultManager Component - Privacy Features', () => {
  let wrapper
  let pinia
  let mockSessionStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    mockSessionStore = {
      results: [],
      sessionId: 'test-session-123',
      isSessionActive: true,
      sessionExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      clearResults: vi.fn(),
      clearSession: vi.fn(),
      addResult: vi.fn()
    }

    wrapper = mount(SessionResultManager, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('displays session privacy information', () => {
    expect(wrapper.text()).toContain('Session-Only Results')
    expect(wrapper.text()).toContain('Results are stored temporarily in browser memory')
    expect(wrapper.text()).toContain('No server-side storage')
  })

  it('shows session expiry countdown', () => {
    expect(wrapper.find('.session-expiry').exists()).toBe(true)
    expect(wrapper.text()).toContain('Session expires in')
  })

  it('displays privacy-focused result management options', () => {
    expect(wrapper.text()).toContain('Download Results')
    expect(wrapper.text()).toContain('Clear Session Data')
    expect(wrapper.text()).toContain('Export for Manual Sharing')
  })

  it('warns about automatic data cleanup', () => {
    expect(wrapper.find('.alert-warning').exists()).toBe(true)
    expect(wrapper.text()).toContain('Automatic Cleanup')
    expect(wrapper.text()).toContain('All results will be permanently deleted')
  })

  it('provides manual download options for data continuity', () => {
    const downloadSection = wrapper.find('.download-options')
    expect(downloadSection.exists()).toBe(true)
    expect(downloadSection.text()).toContain('CSV Export')
    expect(downloadSection.text()).toContain('JSON Configuration')
    expect(downloadSection.text()).toContain('PDF Report')
  })

  it('clears session data on user request', async () => {
    const clearButton = wrapper.find('.btn-danger')
    await clearButton.trigger('click')

    expect(mockSessionStore.clearSession).toHaveBeenCalled()
    expect(wrapper.emitted('session-cleared')).toBeTruthy()
  })

  it('does not persist results beyond session', () => {
    // Verify no localStorage or sessionStorage calls for results
    expect(localStorage.setItem).not.toHaveBeenCalledWith(
      expect.stringMatching(/results/),
      expect.any(String)
    )
  })

  it('displays privacy compliance badges', () => {
    expect(wrapper.find('.privacy-badge').exists()).toBe(true)
    expect(wrapper.text()).toContain('GDPR Compliant')
    expect(wrapper.text()).toContain('No Data Retention')
    expect(wrapper.text()).toContain('Memory-Only Processing')
  })

  it('handles session expiry gracefully', async () => {
    // Simulate expired session
    mockSessionStore.isSessionActive = false
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-info').exists()).toBe(true)
    expect(wrapper.text()).toContain('Session Expired')
    expect(wrapper.text()).toContain('All data has been automatically cleared')
  })

  it('provides clear data handling explanations', () => {
    const infoSection = wrapper.find('.data-handling-info')
    expect(infoSection.exists()).toBe(true)
    expect(infoSection.text()).toContain('How Your Data is Handled')
    expect(infoSection.text()).toContain('Processed in browser memory only')
    expect(infoSection.text()).toContain('Never sent to external servers')
    expect(infoSection.text()).toContain('Automatically deleted on session end')
  })

  it('validates download functionality preserves privacy', async () => {
    const mockResult = {
      id: 'result-1',
      forecast: [{ date: '2023-01-01', value: 100 }],
      config: { horizon: 30 }
    }
    
    mockSessionStore.results = [mockResult]
    await wrapper.vm.$nextTick()

    const downloadButton = wrapper.find('.download-csv')
    await downloadButton.trigger('click')

    // Verify download doesn't expose session ID or sensitive metadata
    expect(wrapper.vm.generateDownloadData()).not.toContain('test-session-123')
    expect(wrapper.vm.generateDownloadData()).not.toContain('sessionId')
  })

  it('shows appropriate messaging for empty results', () => {
    mockSessionStore.results = []
    wrapper = mount(SessionResultManager, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    expect(wrapper.text()).toContain('No Results Yet')
    expect(wrapper.text()).toContain('Upload data and generate forecasts')
    expect(wrapper.text()).toContain('Privacy-first processing')
  })
})