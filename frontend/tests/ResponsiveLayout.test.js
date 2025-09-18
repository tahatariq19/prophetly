import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../src/App.vue'
import ErrorBoundary from '../src/components/ErrorBoundary.vue'

// Mock Bootstrap
global.bootstrap = {
  Collapse: vi.fn().mockImplementation(() => ({
    hide: vi.fn()
  })),
  Tooltip: vi.fn()
}

// Mock API
vi.mock('../src/services/api', () => ({
  checkHealth: vi.fn().mockResolvedValue({
    healthy: true,
    environment: 'test'
  })
}))

describe('Responsive Layout and Error Boundaries', () => {
  let wrapper
  let pinia
  let router

  beforeEach(() => {
    pinia = createPinia()
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Dashboard</div>' } },
        { path: '/upload', component: { template: '<div>Upload</div>' } },
        { path: '/configure', component: { template: '<div>Configure</div>' } },
        { path: '/results', component: { template: '<div>Results</div>' } },
        { path: '/privacy', component: { template: '<div>Privacy</div>' } }
      ]
    })
  })

  it('renders responsive navigation with mobile-friendly elements', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    await wrapper.vm.$nextTick()

    // Check for mobile navigation elements
    expect(wrapper.find('.navbar-toggler').exists()).toBe(true)
    expect(wrapper.find('.navbar-collapse').exists()).toBe(true)
    
    // Check for mobile dropdown
    expect(wrapper.find('#mobileSettingsDropdown').exists()).toBe(true)
    
    // Check for responsive navigation links with icons
    const navLinks = wrapper.findAll('.nav-link')
    expect(navLinks.length).toBeGreaterThan(0)
  })

  it('displays theme toggle functionality', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    await wrapper.vm.$nextTick()

    // Find theme toggle buttons (both mobile and desktop)
    const themeButtons = wrapper.findAll('button').filter(button => 
      button.text().includes('Dark') || button.text().includes('Light') || 
      button.html().includes('bi-moon') || button.html().includes('bi-sun')
    )
    
    expect(themeButtons.length).toBeGreaterThan(0)
  })

  it('shows loading overlay with privacy message', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    // Simulate loading state
    const appStore = wrapper.vm.$pinia._s.get('app')
    appStore.setLoading(true)

    await wrapper.vm.$nextTick()

    const loadingOverlay = wrapper.find('.loading-overlay')
    expect(loadingOverlay.exists()).toBe(true)
    expect(loadingOverlay.text()).toContain('never stored')
  })

  it('displays error boundary with privacy assurance', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    // Simulate error state
    const appStore = wrapper.vm.$pinia._s.get('app')
    appStore.setError('Test error message')

    await wrapper.vm.$nextTick()

    const errorBoundary = wrapper.find('.error-boundary')
    expect(errorBoundary.exists()).toBe(true)
    expect(errorBoundary.text()).toContain('data remains private')
  })

  it('handles mobile navigation collapse', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    await wrapper.vm.$nextTick()

    // Mock DOM element for navbar collapse
    const mockNavbar = {
      classList: {
        contains: vi.fn().mockReturnValue(true)
      }
    }
    
    vi.spyOn(document, 'getElementById').mockReturnValue(mockNavbar)

    // Test mobile navigation close function
    wrapper.vm.closeNavbarOnMobile()
    
    expect(global.bootstrap.Collapse).toHaveBeenCalled()
  })

  it('manages user preferences with cookies', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    await wrapper.vm.$nextTick()

    const preferencesStore = wrapper.vm.$pinia._s.get('userPreferences')
    
    // Test theme change
    const initialTheme = preferencesStore.theme
    wrapper.vm.toggleTheme()
    
    expect(preferencesStore.theme).not.toBe(initialTheme)
  })

  it('displays API status indicator', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    await wrapper.vm.$nextTick()

    const statusIndicator = wrapper.find('.badge')
    expect(statusIndicator.exists()).toBe(true)
  })

  it('shows notifications container in responsive position', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    await wrapper.vm.$nextTick()

    const notificationsContainer = wrapper.find('.notifications-container')
    expect(notificationsContainer.exists()).toBe(true)
  })
})

describe('ErrorBoundary Component', () => {
  let wrapper
  let pinia
  let router

  beforeEach(() => {
    pinia = createPinia()
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } }
      ]
    })
  })

  it('renders children when no error', () => {
    wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="test-content">Test Content</div>'
      },
      global: {
        plugins: [pinia, router]
      }
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.error-boundary-component').exists()).toBe(false)
  })

  it('displays error UI with privacy assurance', async () => {
    wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Test Content</div>'
      },
      global: {
        plugins: [pinia, router]
      }
    })

    // Simulate error state
    wrapper.vm.hasError = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-boundary-component').exists()).toBe(true)
    expect(wrapper.text()).toContain('Your Privacy is Protected')
    expect(wrapper.text()).toContain('No data was stored')
  })

  it('provides retry functionality', async () => {
    wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Test Content</div>'
      },
      global: {
        plugins: [pinia, router]
      }
    })

    // Simulate error state
    wrapper.vm.hasError = true
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    const retryButton = buttons.find(button => button.text().includes('Try Again'))
    expect(retryButton).toBeTruthy()

    await retryButton.trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('provides clear data functionality', async () => {
    wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Test Content</div>'
      },
      global: {
        plugins: [pinia, router]
      }
    })

    // Simulate error state
    wrapper.vm.hasError = true
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(button => button.text().includes('Clear All Data'))
    expect(clearButton).toBeTruthy()
  })
})