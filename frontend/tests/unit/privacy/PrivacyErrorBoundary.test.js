import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrivacyErrorBoundary from '@/components/PrivacyErrorBoundary.vue'

describe('PrivacyErrorBoundary Component', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders children when no error occurs', () => {
    wrapper = mount(PrivacyErrorBoundary, {
      slots: {
        default: '<div class="test-content">Test Content</div>'
      },
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test Content')
  })

  it('displays privacy-focused error message when error occurs', async () => {
    wrapper = mount(PrivacyErrorBoundary, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate error
    await wrapper.vm.handleError(new Error('Test error'), {})

    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Privacy Protection Active')
    expect(wrapper.text()).toContain('No user data has been compromised')
    expect(wrapper.text()).toContain('All session data remains secure')
  })

  it('provides error recovery options', async () => {
    wrapper = mount(PrivacyErrorBoundary, {
      global: {
        plugins: [pinia]
      }
    })

    await wrapper.vm.handleError(new Error('Test error'), {})

    expect(wrapper.find('.btn-primary').exists()).toBe(true)
    expect(wrapper.text()).toContain('Try Again')
    expect(wrapper.text()).toContain('Clear Session Data')
  })

  it('clears session data on recovery', async () => {
    const mockSessionStore = {
      clearSession: vi.fn(),
      clearAllData: vi.fn()
    }

    wrapper = mount(PrivacyErrorBoundary, {
      global: {
        plugins: [pinia],
        mocks: {
          $sessionStore: mockSessionStore
        }
      }
    })

    await wrapper.vm.handleError(new Error('Test error'), {})
    await wrapper.find('.btn-outline-secondary').trigger('click')

    expect(mockSessionStore.clearSession).toHaveBeenCalled()
  })

  it('does not log sensitive information in error handling', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    wrapper = mount(PrivacyErrorBoundary, {
      global: {
        plugins: [pinia]
      }
    })

    const sensitiveError = new Error('User data: john@example.com')
    await wrapper.vm.handleError(sensitiveError, {})

    // Verify error is logged but without sensitive data
    expect(consoleSpy).toHaveBeenCalled()
    const loggedMessage = consoleSpy.mock.calls[0][0]
    expect(loggedMessage).not.toContain('john@example.com')
    expect(loggedMessage).toContain('[REDACTED]')

    consoleSpy.mockRestore()
  })

  it('provides privacy compliance information', async () => {
    wrapper = mount(PrivacyErrorBoundary, {
      global: {
        plugins: [pinia]
      }
    })

    await wrapper.vm.handleError(new Error('Test error'), {})

    expect(wrapper.text()).toContain('Privacy Guarantee')
    expect(wrapper.text()).toContain('memory-only processing')
    expect(wrapper.text()).toContain('no data persistence')
  })
})