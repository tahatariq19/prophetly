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
    expect(wrapper.text()).toContain('Session ID: test-session-123')
    expect(wrapper.text()).toContain('File: test-data.csv')
    expect(wrapper.text()).toContain('Size: 1.0 KB')
    
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

    expect(wrapper.text()).toContain('Session expires')
    expect(wrapper.text()).toContain('Automatic cleanup')
    expect(wrapper.text()).toContain('No server storage')
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

    const clearButton = wrapper.find('[data-testid="clear-session"]')
    expect(clearButton.exists()).toBe(true)
    
    await clearButton.trigger('click')
    
    // Should show confirmation dialog with privacy messaging
    expect(wrapper.text()).toContain('Permanently delete all session data')
    expect(wrapper.text()).toContain('This action cannot be undone')
    expect(wrapper.text()).toContain('Data will be securely removed from memory')
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

    await wrapper.find('[data-testid="clear-session"]').trigger('click')
    await wrapper.find('[data-testid="confirm-clear"]').trigger('click')

    expect(mockSessionStore.clearSession).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Session data securely deleted')
    expect(wrapper.text()).toContain('All data removed from memory')
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

    const downloadButton = wrapper.find('[data-testid="download-data"]')
    expect(downloadButton.exists()).toBe(true)
    
    // Should show privacy-focused download messaging
    expect(wrapper.text()).toContain('Download for backup')
    expect(wrapper.text()).toContain('Client-side processing only')
    expect(wrapper.text()).toContain('No server uploads')
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
    expect(wrapper.text()).toContain('Session Data: 1.0 KB')
    expect(wrapper.text()).toContain('Temporary storage only')
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

    expect(wrapper.text()).toContain('Privacy Guarantee')
    expect(wrapper.text()).toContain('No data persistence')
    expect(wrapper.text()).toContain('Memory-only processing')
    expect(wrapper.text()).toContain('Automatic cleanup')
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

    expect(wrapper.text()).toContain('Session Expired')
    expect(wrapper.text()).toContain('Data automatically removed')
    expect(wrapper.text()).toContain('Privacy protection active')
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
    wrapper.vm.loadSessionInfo()
    
    // Verify no sensitive data in logs
    const logCalls = consoleSpy.mock.calls.flat()
    logCalls.forEach(call => {
      expect(String(call)).not.toContain('test-data.csv')
      expect(String(call)).not.toContain('test-session-123')
    })

    consoleSpy.mockRestore()
  })
})