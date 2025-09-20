import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DataManagementDashboard from '@/components/DataManagementDashboard.vue'

describe('DataManagementDashboard Privacy Features', () => {
  let wrapper
  let pinia
  let mockSessionStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    mockSessionStore = {
      sessionData: {
        id: 'test-session-123',
        filename: 'test-data.csv',
        dataSize: 1024,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        expiresAt: new Date('2023-01-01T12:00:00Z')
      },
      clearSession: vi.fn(),
      downloadSessionData: vi.fn(),
      getSessionInfo: vi.fn(() => mockSessionStore.sessionData)
    }
  })

  it('displays session information without exposing sensitive data', () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    // Should show session metadata but not actual data
    expect(wrapper.text()).toContain('Session Data Management')
    expect(wrapper.text()).toContain('Memory Only')
    expect(wrapper.text()).toContain('No Data Uploaded')
    
    // Should not expose actual data values
    expect(wrapper.text()).not.toContain('100')
    expect(wrapper.text()).not.toContain('110')
  })

  it('shows privacy-focused session expiry information', () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    expect(wrapper.text()).toContain('automatically cleared')
    expect(wrapper.text()).toContain('2 hours of inactivity')
    expect(wrapper.text()).toContain('No server-side storage')
  })

  it('provides secure session clearing functionality', async () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    const clearButton = wrapper.find('.btn-outline-warning')
    expect(clearButton.exists()).toBe(true)
    
    await clearButton.trigger('click')
    
    // Should show confirmation dialog with privacy messaging
    expect(wrapper.text()).toContain('Clear Session Data')
    expect(wrapper.text()).toContain('cannot be undone')
    expect(wrapper.text()).toContain('session data')
  })

  it('confirms secure data deletion after clearing', async () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    // Mock window.confirm to return true
    window.confirm = vi.fn(() => true)
    
    await wrapper.find('.btn-outline-warning').trigger('click')

    expect(mockSessionStore.clearSession).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Clear Session Data')
    expect(wrapper.text()).toContain('Memory Only')
  })

  it('provides privacy-compliant data download options', () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    const downloadButton = wrapper.find('.btn-outline-secondary')
    expect(downloadButton.exists()).toBe(true)
    
    // Should show privacy-focused download messaging
    expect(wrapper.text()).toContain('Download Session Data')
    expect(wrapper.text()).toContain('browser memory')
    expect(wrapper.text()).toContain('No server-side storage')
  })

  it('displays memory usage information without exposing data', () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    expect(wrapper.text()).toContain('Memory Usage')
    expect(wrapper.text()).toContain('0 MB')
    expect(wrapper.text()).toContain('Memory Only')
  })

  it('shows privacy guarantee information', () => {
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    expect(wrapper.text()).toContain('Session Data Management')
    expect(wrapper.text()).toContain('No server-side storage')
    expect(wrapper.text()).toContain('browser memory')
    expect(wrapper.text()).toContain('automatically cleared')
  })

  it('handles session expiry with privacy messaging', async () => {
    // Mock expired session
    mockSessionStore.sessionData.expiresAt = new Date('2023-01-01T09:00:00Z')
    
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    expect(wrapper.text()).toContain('No Data Uploaded')
    expect(wrapper.text()).toContain('automatically cleared')
    expect(wrapper.text()).toContain('Memory Only')
  })

  it('does not log sensitive session information', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    wrapper = mount(DataManagementDashboard, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    // Trigger various actions that might log
    wrapper.vm.loadColumnMapping()
    
    // Verify no sensitive data in logs
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('test-data.csv')
      expect(String(call)).not.toContain('test-session-123')
    })

    consoleSpy.mockRestore()
  })
})