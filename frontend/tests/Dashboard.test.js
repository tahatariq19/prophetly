import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Dashboard from '../src/pages/Dashboard.vue'

describe('Dashboard', () => {
  it('renders privacy notice', () => {
    const wrapper = mount(Dashboard)
    expect(wrapper.text()).toContain('Privacy Notice')
    expect(wrapper.text()).toContain('No data is stored on our servers')
  })

  it('displays main title', () => {
    const wrapper = mount(Dashboard)
    expect(wrapper.find('h1').text()).toBe('Prophet Web Interface')
  })
})