import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../src/pages/Dashboard.vue'

// Mock API service
vi.mock('../src/services/api', () => ({
  checkHealth: vi.fn().mockResolvedValue({
    status: 'healthy',
    environment: 'test',
    privacy: 'stateless'
  })
}))

describe('Dashboard', () => {
  let pinia
  let router

  beforeEach(() => {
    pinia = createPinia()
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: Dashboard },
        { path: '/privacy', component: { template: '<div>Privacy</div>' } },
        { path: '/upload', component: { template: '<div>Upload</div>' } },
        { path: '/configure', component: { template: '<div>Configure</div>' } },
        { path: '/results', component: { template: '<div>Results</div>' } }
      ]
    })
  })

  const createWrapper = () => {
    return mount(Dashboard, {
      global: {
        plugins: [pinia, router],
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
            props: ['to']
          }
        }
      }
    })
  }

  it('renders main title', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('h1').text()).toBe('Prophet Web Interface')
  })

  it('displays privacy notice when not accepted', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Privacy Notice')
    expect(wrapper.text()).toContain('No data is stored on our servers')
  })

  it('shows quick action cards', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Upload Data')
    expect(wrapper.text()).toContain('Configure')
    expect(wrapper.text()).toContain('Results')
    expect(wrapper.text()).toContain('Privacy')
  })

  it('displays API status', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('API Status')
  })

  it('displays session status', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Session Status')
  })
})