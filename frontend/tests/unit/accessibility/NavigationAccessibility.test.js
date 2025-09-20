import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MobileNavigation from '@/components/MobileNavigation.vue'

describe('Navigation Accessibility Features', () => {
  let wrapper
  let router
  let pinia

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'Dashboard', component: { template: '<div>Dashboard</div>' } },
        { path: '/upload', name: 'Upload', component: { template: '<div>Upload</div>' } },
        { path: '/configure', name: 'Configure', component: { template: '<div>Configure</div>' } },
        { path: '/results', name: 'Results', component: { template: '<div>Results</div>' } }
      ]
    })
    
    await router.push('/')
  })

  it('provides proper ARIA navigation structure', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const nav = wrapper.find('nav')
    expect(nav.attributes('role')).toBe('navigation')
    expect(nav.attributes('aria-label')).toBe('Main navigation')
    
    const navList = wrapper.find('ul')
    expect(navList.attributes('role')).toBe('menubar')
  })

  it('includes skip navigation link for keyboard users', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const skipLink = wrapper.find('.skip-nav')
    expect(skipLink.exists()).toBe(true)
    expect(skipLink.attributes('href')).toBe('#main-content')
    expect(skipLink.text()).toBe('Skip to main content')
    expect(skipLink.classes()).toContain('sr-only-focusable')
  })

  it('provides keyboard navigation for menu items', async () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const menuItems = wrapper.findAll('[role="menuitem"]')
    expect(menuItems.length).toBeGreaterThan(0)
    
    // Test keyboard navigation
    const firstItem = menuItems[0]
    await firstItem.trigger('keydown', { key: 'ArrowDown' })
    
    // Should focus next item
    expect(wrapper.emitted('menuItemFocus')).toBeTruthy()
  })

  it('announces current page to screen readers', async () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.push('/upload')
    await wrapper.vm.$nextTick()

    const currentPageItem = wrapper.find('[aria-current="page"]')
    expect(currentPageItem.exists()).toBe(true)
    expect(currentPageItem.text()).toContain('Upload')
    expect(currentPageItem.attributes('aria-label')).toContain('Current page: Upload')
  })

  it('provides mobile menu toggle with accessibility', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const menuToggle = wrapper.find('.menu-toggle')
    expect(menuToggle.attributes('aria-expanded')).toBe('false')
    expect(menuToggle.attributes('aria-controls')).toBe('mobile-menu')
    expect(menuToggle.attributes('aria-label')).toBe('Toggle navigation menu')
  })

  it('manages focus when opening/closing mobile menu', async () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const menuToggle = wrapper.find('.menu-toggle')
    
    // Open menu
    await menuToggle.trigger('click')
    expect(menuToggle.attributes('aria-expanded')).toBe('true')
    
    // First menu item should receive focus
    const firstMenuItem = wrapper.find('[role="menuitem"]')
    expect(document.activeElement).toBe(firstMenuItem.element)
  })

  it('closes menu on Escape key', async () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    // Open menu
    await wrapper.find('.menu-toggle').trigger('click')
    expect(wrapper.find('.menu-toggle').attributes('aria-expanded')).toBe('true')
    
    // Press Escape
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.menu-toggle').attributes('aria-expanded')).toBe('false')
  })

  it('provides breadcrumb navigation with accessibility', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const breadcrumb = wrapper.find('.breadcrumb')
    expect(breadcrumb.attributes('aria-label')).toBe('Breadcrumb navigation')
    
    const breadcrumbList = wrapper.find('.breadcrumb ol')
    expect(breadcrumbList.exists()).toBe(true)
    
    const breadcrumbItems = wrapper.findAll('.breadcrumb li')
    breadcrumbItems.forEach((item, index) => {
      if (index === breadcrumbItems.length - 1) {
        expect(item.attributes('aria-current')).toBe('page')
      }
    })
  })

  it('supports high contrast mode for navigation', () => {
    wrapper = mount(MobileNavigation, {
      props: { highContrast: true },
      global: {
        plugins: [router, pinia]
      }
    })

    expect(wrapper.classes()).toContain('high-contrast')
    
    const navItems = wrapper.findAll('.nav-item')
    navItems.forEach(item => {
      expect(item.classes()).toContain('high-contrast-nav')
    })
  })

  it('provides focus indicators for all interactive elements', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const focusableElements = wrapper.findAll('a, button, [tabindex="0"]')
    focusableElements.forEach(element => {
      expect(element.classes()).toContain('focusable')
    })
  })

  it('announces navigation changes to screen readers', async () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const liveRegion = wrapper.find('[aria-live="polite"]')
    expect(liveRegion.exists()).toBe(true)
    
    // Navigate to different page
    await router.push('/upload')
    await wrapper.vm.$nextTick()
    
    expect(liveRegion.text()).toContain('Navigated to Upload page')
  })

  it('provides proper heading hierarchy', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    // Navigation should not interfere with page heading hierarchy
    const navHeadings = wrapper.findAll('h1, h2, h3, h4, h5, h6')
    expect(navHeadings.length).toBe(0) // Navigation should use aria-label instead
  })

  it('supports touch gestures with accessibility announcements', async () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    // Simulate swipe gesture
    await wrapper.trigger('touchstart', { touches: [{ clientX: 0 }] })
    await wrapper.trigger('touchmove', { touches: [{ clientX: 100 }] })
    await wrapper.trigger('touchend')

    const liveRegion = wrapper.find('[aria-live="polite"]')
    expect(liveRegion.text()).toContain('Swipe gesture detected')
  })

  it('provides context-sensitive help for navigation', () => {
    wrapper = mount(MobileNavigation, {
      global: {
        plugins: [router, pinia]
      }
    })

    const helpButton = wrapper.find('[data-testid="nav-help"]')
    expect(helpButton.attributes('aria-label')).toBe('Navigation help')
    expect(helpButton.attributes('aria-describedby')).toBe('nav-help-text')
    
    const helpText = wrapper.find('#nav-help-text')
    expect(helpText.text()).toContain('Use arrow keys to navigate menu items')
  })
})