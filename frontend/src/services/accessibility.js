/**
 * Accessibility service for Prophet Web Interface
 * Provides comprehensive accessibility features with privacy compliance
 */

import { deviceDetection } from '@/utils/mobile'

// Accessibility preferences management
export const accessibilityPreferences = {
  /**
   * Get user accessibility preferences from localStorage
   */
  getPreferences() {
    try {
      const stored = localStorage.getItem('prophet-accessibility-prefs')
      return stored ? JSON.parse(stored) : this.getDefaultPreferences()
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error)
      return this.getDefaultPreferences()
    }
  },

  /**
   * Save accessibility preferences to localStorage
   */
  savePreferences(preferences) {
    try {
      localStorage.setItem('prophet-accessibility-prefs', JSON.stringify(preferences))
      this.applyPreferences(preferences)
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error)
    }
  },

  /**
   * Get default accessibility preferences
   */
  getDefaultPreferences() {
    return {
      highContrast: false,
      largeText: false,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenReaderOptimized: false,
      keyboardNavigation: true,
      focusIndicators: true,
      colorBlindFriendly: false,
      announcements: true,
      tooltipDelay: 500,
      fontSize: 'normal', // 'small', 'normal', 'large', 'extra-large'
      theme: 'auto' // 'light', 'dark', 'auto', 'high-contrast'
    }
  },

  /**
   * Apply accessibility preferences to the document
   */
  applyPreferences(preferences) {
    const root = document.documentElement

    // High contrast mode
    if (preferences.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Large text
    if (preferences.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }

    // Reduced motion
    if (preferences.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    // Screen reader optimization
    if (preferences.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized')
    } else {
      root.classList.remove('screen-reader-optimized')
    }

    // Color blind friendly
    if (preferences.colorBlindFriendly) {
      root.classList.add('color-blind-friendly')
    } else {
      root.classList.remove('color-blind-friendly')
    }

    // Font size
    root.setAttribute('data-font-size', preferences.fontSize)

    // Theme
    if (preferences.theme !== 'auto') {
      root.setAttribute('data-theme', preferences.theme)
    }

    // Custom CSS properties
    root.style.setProperty('--tooltip-delay', `${preferences.tooltipDelay}ms`)
  },

  /**
   * Detect system accessibility preferences
   */
  detectSystemPreferences() {
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      largeText: window.matchMedia('(min-resolution: 2dppx)').matches // Approximation
    }
  }
}

// Keyboard navigation utilities
export const keyboardNavigation = {
  /**
   * Initialize keyboard navigation
   */
  init() {
    this.setupFocusManagement()
    this.setupKeyboardShortcuts()
    this.setupFocusTrapping()
  },

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Track focus method (mouse vs keyboard)
    let isUsingKeyboard = false

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        isUsingKeyboard = true
        document.body.classList.add('keyboard-navigation')
      }
    })

    document.addEventListener('mousedown', () => {
      isUsingKeyboard = false
      document.body.classList.remove('keyboard-navigation')
    })

    // Enhance focus visibility
    document.addEventListener('focusin', (e) => {
      if (isUsingKeyboard) {
        e.target.classList.add('keyboard-focused')
      }
    })

    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('keyboard-focused')
    })
  },

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if (e.target.matches('input, textarea, select, [contenteditable]')) {
        return
      }

      // Alt + key shortcuts
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            this.navigateTo('/')
            break
          case '2':
            e.preventDefault()
            this.navigateTo('/upload')
            break
          case '3':
            e.preventDefault()
            this.navigateTo('/configure')
            break
          case '4':
            e.preventDefault()
            this.navigateTo('/results')
            break
          case 'm':
            e.preventDefault()
            this.toggleMobileMenu()
            break
          case 'h':
            e.preventDefault()
            this.showKeyboardHelp()
            break
        }
      }

      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscape()
      }
    })
  },

  /**
   * Setup focus trapping for modals
   */
  setupFocusTrapping() {
    // This will be called when modals are opened
    this.trapFocus = (container) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement.focus()
            }
          }
        }
      }

      container.addEventListener('keydown', handleTabKey)
      firstElement.focus()

      return () => {
        container.removeEventListener('keydown', handleTabKey)
      }
    }
  },

  /**
   * Navigate to a route (to be implemented with router)
   */
  navigateTo(path) {
    // This would use Vue Router in the actual implementation
    console.log('Navigate to:', path)
  },

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle')
    if (menuToggle) {
      menuToggle.click()
    }
  },

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardHelp() {
    const helpContent = `
      <div class="keyboard-help">
        <h6>Keyboard Shortcuts</h6>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Alt + 1</kbd>
            <span>Go to Dashboard</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt + 2</kbd>
            <span>Go to Upload</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt + 3</kbd>
            <span>Go to Configure</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt + 4</kbd>
            <span>Go to Results</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt + M</kbd>
            <span>Toggle Menu</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt + H</kbd>
            <span>Show this help</span>
          </div>
          <div class="shortcut-item">
            <kbd>Escape</kbd>
            <span>Close dialogs</span>
          </div>
          <div class="shortcut-item">
            <kbd>Tab</kbd>
            <span>Navigate elements</span>
          </div>
        </div>
      </div>
    `

    // This would use the mobile UI service to show the modal
    console.log('Show keyboard help modal')
  },

  /**
   * Handle escape key
   */
  handleEscape() {
    // Close any open modals, dropdowns, etc.
    const openModal = document.querySelector('.modal.show, .mobile-modal')
    if (openModal) {
      const closeButton = openModal.querySelector('[data-dismiss], .modal-close, .mobile-modal-close')
      if (closeButton) {
        closeButton.click()
      }
    }

    // Close mobile menu
    const mobileMenu = document.querySelector('.mobile-menu-panel.active')
    if (mobileMenu) {
      this.toggleMobileMenu()
    }
  }
}

// Screen reader utilities
export const screenReader = {
  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    const announcer = this.getAnnouncer(priority)
    announcer.textContent = message
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = ''
    }, 1000)
  },

  /**
   * Get or create screen reader announcer element
   */
  getAnnouncer(priority = 'polite') {
    const id = `sr-announcer-${priority}`
    let announcer = document.getElementById(id)
    
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = id
      announcer.setAttribute('aria-live', priority)
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `
      document.body.appendChild(announcer)
    }
    
    return announcer
  },

  /**
   * Add screen reader descriptions to charts
   */
  addChartDescription(chartElement, data) {
    if (!chartElement || !data) return

    const description = this.generateChartDescription(data)
    
    // Add aria-label or aria-describedby
    const descriptionId = `chart-desc-${Date.now()}`
    const descElement = document.createElement('div')
    descElement.id = descriptionId
    descElement.className = 'sr-only'
    descElement.textContent = description
    
    chartElement.parentNode.insertBefore(descElement, chartElement.nextSibling)
    chartElement.setAttribute('aria-describedby', descriptionId)
    chartElement.setAttribute('role', 'img')
    chartElement.setAttribute('aria-label', 'Forecast chart')
  },

  /**
   * Generate chart description for screen readers
   */
  generateChartDescription(data) {
    if (!data.forecast) return 'Chart data not available'

    const forecast = data.forecast
    const historical = data.historical || []
    
    const totalPoints = forecast.length
    const forecastPoints = totalPoints - historical.length
    const firstDate = forecast[0]?.ds || forecast[0]?.date
    const lastDate = forecast[forecast.length - 1]?.ds || forecast[forecast.length - 1]?.date
    
    let description = `Forecast chart showing ${totalPoints} data points from ${firstDate} to ${lastDate}. `
    
    if (historical.length > 0) {
      description += `${historical.length} historical data points and ${forecastPoints} forecast points. `
    }
    
    // Add trend information
    if (forecast.length >= 2) {
      const firstValue = forecast[0]?.yhat || forecast[0]?.forecast || 0
      const lastValue = forecast[forecast.length - 1]?.yhat || forecast[forecast.length - 1]?.forecast || 0
      const trend = lastValue > firstValue ? 'increasing' : lastValue < firstValue ? 'decreasing' : 'stable'
      description += `Overall trend is ${trend}. `
    }
    
    return description
  },

  /**
   * Add table descriptions for data previews
   */
  addTableDescription(tableElement, data) {
    if (!tableElement || !data) return

    const rows = data.totalRows || 0
    const columns = data.columns?.length || 0
    
    const description = `Data table with ${rows} rows and ${columns} columns. ${data.stats?.completeness || 0}% complete data.`
    
    tableElement.setAttribute('aria-label', description)
    
    // Add column headers if missing
    const headers = tableElement.querySelectorAll('th')
    headers.forEach((header, index) => {
      if (!header.id) {
        header.id = `col-header-${index}`
      }
    })
  }
}

// Color and contrast utilities
export const colorAccessibility = {
  /**
   * Check color contrast ratio
   */
  getContrastRatio(color1, color2) {
    const l1 = this.getLuminance(color1)
    const l2 = this.getLuminance(color2)
    
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  },

  /**
   * Get relative luminance of a color
   */
  getLuminance(color) {
    const rgb = this.hexToRgb(color)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  },

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  },

  /**
   * Get accessible color palette for charts
   */
  getAccessibleChartColors() {
    return {
      normal: [
        '#1f77b4', // Blue
        '#ff7f0e', // Orange
        '#2ca02c', // Green
        '#d62728', // Red
        '#9467bd', // Purple
        '#8c564b', // Brown
        '#e377c2', // Pink
        '#7f7f7f', // Gray
        '#bcbd22', // Olive
        '#17becf'  // Cyan
      ],
      colorBlindFriendly: [
        '#1f77b4', // Blue
        '#ff7f0e', // Orange
        '#2ca02c', // Green
        '#d62728', // Red
        '#9467bd', // Purple
        '#8c564b', // Brown
        '#e377c2', // Pink
        '#7f7f7f', // Gray
        '#bcbd22', // Olive
        '#17becf'  // Cyan
      ],
      highContrast: [
        '#000000', // Black
        '#ffffff', // White
        '#ff0000', // Red
        '#00ff00', // Green
        '#0000ff', // Blue
        '#ffff00', // Yellow
        '#ff00ff', // Magenta
        '#00ffff'  // Cyan
      ]
    }
  }
}

// Touch and gesture accessibility
export const touchAccessibility = {
  /**
   * Make elements touch-accessible
   */
  makeTouchAccessible(element) {
    if (!element) return

    // Ensure minimum touch target size (44px)
    const rect = element.getBoundingClientRect()
    if (rect.width < 44 || rect.height < 44) {
      element.style.minWidth = '44px'
      element.style.minHeight = '44px'
    }

    // Add touch feedback
    element.addEventListener('touchstart', this.addTouchFeedback, { passive: true })
    element.addEventListener('touchend', this.removeTouchFeedback, { passive: true })
    element.addEventListener('touchcancel', this.removeTouchFeedback, { passive: true })
  },

  /**
   * Add visual feedback on touch
   */
  addTouchFeedback(e) {
    e.currentTarget.classList.add('touch-active')
  },

  /**
   * Remove visual feedback
   */
  removeTouchFeedback(e) {
    setTimeout(() => {
      e.currentTarget.classList.remove('touch-active')
    }, 150)
  },

  /**
   * Setup gesture alternatives for mobile
   */
  setupGestureAlternatives() {
    // Add buttons for common gestures
    const charts = document.querySelectorAll('canvas')
    charts.forEach(chart => {
      this.addChartControls(chart)
    })
  },

  /**
   * Add accessible controls for chart interactions
   */
  addChartControls(chartElement) {
    if (!chartElement) return

    const controlsContainer = document.createElement('div')
    controlsContainer.className = 'chart-accessibility-controls'
    controlsContainer.innerHTML = `
      <button type="button" class="btn btn-sm btn-outline-secondary me-2" data-action="zoom-in">
        <i class="bi bi-zoom-in" aria-hidden="true"></i>
        <span class="sr-only">Zoom in</span>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary me-2" data-action="zoom-out">
        <i class="bi bi-zoom-out" aria-hidden="true"></i>
        <span class="sr-only">Zoom out</span>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary me-2" data-action="reset">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        <span class="sr-only">Reset zoom</span>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-action="describe">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        <span class="sr-only">Describe chart</span>
      </button>
    `

    chartElement.parentNode.insertBefore(controlsContainer, chartElement.nextSibling)

    // Add event listeners
    controlsContainer.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action
      if (action) {
        this.handleChartAction(chartElement, action)
      }
    })
  },

  /**
   * Handle chart accessibility actions
   */
  handleChartAction(chartElement, action) {
    // This would integrate with the chart library
    console.log('Chart action:', action, 'on', chartElement)
    
    switch (action) {
      case 'describe':
        // Announce chart description
        screenReader.announce('Chart shows forecast data with historical and predicted values')
        break
      case 'zoom-in':
        screenReader.announce('Zoomed in')
        break
      case 'zoom-out':
        screenReader.announce('Zoomed out')
        break
      case 'reset':
        screenReader.announce('Chart view reset')
        break
    }
  }
}

// Privacy-compliant accessibility service
export const accessibilityService = {
  /**
   * Initialize accessibility features
   */
  init() {
    // Load and apply preferences
    const preferences = accessibilityPreferences.getPreferences()
    accessibilityPreferences.applyPreferences(preferences)

    // Initialize keyboard navigation
    keyboardNavigation.init()

    // Setup touch accessibility on mobile
    if (deviceDetection.isTouchDevice()) {
      touchAccessibility.setupGestureAlternatives()
    }

    // Listen for system preference changes
    this.setupSystemPreferenceListeners()

    // Add accessibility styles
    this.addAccessibilityStyles()

    console.log('Accessibility service initialized with privacy compliance')
  },

  /**
   * Setup listeners for system accessibility preference changes
   */
  setupSystemPreferenceListeners() {
    // Reduced motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionQuery.addEventListener('change', (e) => {
      const preferences = accessibilityPreferences.getPreferences()
      preferences.reducedMotion = e.matches
      accessibilityPreferences.savePreferences(preferences)
    })

    // High contrast
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    highContrastQuery.addEventListener('change', (e) => {
      const preferences = accessibilityPreferences.getPreferences()
      preferences.highContrast = e.matches
      accessibilityPreferences.savePreferences(preferences)
    })

    // Dark mode
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeQuery.addEventListener('change', (e) => {
      const preferences = accessibilityPreferences.getPreferences()
      if (preferences.theme === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
    })
  },

  /**
   * Add accessibility-specific CSS
   */
  addAccessibilityStyles() {
    const style = document.createElement('style')
    style.id = 'accessibility-styles'
    style.textContent = `
      /* Keyboard navigation styles */
      .keyboard-navigation *:focus {
        outline: 2px solid #0d6efd !important;
        outline-offset: 2px !important;
      }

      .keyboard-focused {
        box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25) !important;
      }

      /* High contrast mode */
      .high-contrast {
        --bs-body-bg: #000000 !important;
        --bs-body-color: #ffffff !important;
        --bs-primary: #ffffff !important;
        --bs-secondary: #ffff00 !important;
        --bs-success: #00ff00 !important;
        --bs-danger: #ff0000 !important;
        --bs-warning: #ffff00 !important;
        --bs-info: #00ffff !important;
      }

      .high-contrast .btn {
        border-width: 2px !important;
      }

      .high-contrast .card {
        border-width: 2px !important;
      }

      /* Large text mode */
      .large-text {
        font-size: 1.25em !important;
      }

      .large-text .btn {
        padding: 0.75rem 1.5rem !important;
        font-size: 1.1em !important;
      }

      /* Reduced motion */
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      /* Screen reader optimizations */
      .screen-reader-optimized .sr-only {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: 0.25rem 0.5rem !important;
        margin: 0 !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
        background: #f8f9fa !important;
        border: 1px solid #dee2e6 !important;
        border-radius: 0.25rem !important;
        font-size: 0.875rem !important;
      }

      /* Touch accessibility */
      .touch-active {
        background-color: rgba(0, 0, 0, 0.1) !important;
        transform: scale(0.98) !important;
      }

      /* Chart accessibility controls */
      .chart-accessibility-controls {
        margin-top: 0.5rem;
        text-align: center;
      }

      /* Color blind friendly adjustments */
      .color-blind-friendly .text-success {
        color: #0066cc !important;
      }

      .color-blind-friendly .text-danger {
        color: #cc0000 !important;
      }

      .color-blind-friendly .text-warning {
        color: #ff6600 !important;
      }

      /* Font size variations */
      [data-font-size="small"] {
        font-size: 0.875em;
      }

      [data-font-size="large"] {
        font-size: 1.125em;
      }

      [data-font-size="extra-large"] {
        font-size: 1.25em;
      }

      /* Keyboard shortcuts help */
      .keyboard-help .shortcut-list {
        display: grid;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .keyboard-help .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 0.25rem;
      }

      .keyboard-help kbd {
        background: #212529;
        color: #ffffff;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875em;
      }

      /* Privacy-compliant focus indicators */
      .privacy-focus:focus {
        outline: 2px solid #198754 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.25) !important;
      }
    `

    document.head.appendChild(style)
  },

  /**
   * Create accessibility settings panel
   */
  createSettingsPanel() {
    const preferences = accessibilityPreferences.getPreferences()
    
    return `
      <div class="accessibility-settings">
        <h6 class="mb-3">
          <i class="bi bi-universal-access me-2"></i>
          Accessibility Settings
        </h6>
        
        <div class="setting-group mb-3">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" id="high-contrast" ${preferences.highContrast ? 'checked' : ''}>
            <span class="form-check-label">High Contrast Mode</span>
          </label>
          <small class="form-text text-muted">Increases contrast for better visibility</small>
        </div>

        <div class="setting-group mb-3">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" id="large-text" ${preferences.largeText ? 'checked' : ''}>
            <span class="form-check-label">Large Text</span>
          </label>
          <small class="form-text text-muted">Increases text size throughout the app</small>
        </div>

        <div class="setting-group mb-3">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" id="reduced-motion" ${preferences.reducedMotion ? 'checked' : ''}>
            <span class="form-check-label">Reduce Motion</span>
          </label>
          <small class="form-text text-muted">Minimizes animations and transitions</small>
        </div>

        <div class="setting-group mb-3">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" id="screen-reader" ${preferences.screenReaderOptimized ? 'checked' : ''}>
            <span class="form-check-label">Screen Reader Optimization</span>
          </label>
          <small class="form-text text-muted">Optimizes interface for screen readers</small>
        </div>

        <div class="setting-group mb-3">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" id="color-blind" ${preferences.colorBlindFriendly ? 'checked' : ''}>
            <span class="form-check-label">Color Blind Friendly</span>
          </label>
          <small class="form-text text-muted">Uses color blind friendly palette</small>
        </div>

        <div class="setting-group mb-3">
          <label for="font-size" class="form-label">Font Size</label>
          <select class="form-select" id="font-size">
            <option value="small" ${preferences.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="normal" ${preferences.fontSize === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="large" ${preferences.fontSize === 'large' ? 'selected' : ''}>Large</option>
            <option value="extra-large" ${preferences.fontSize === 'extra-large' ? 'selected' : ''}>Extra Large</option>
          </select>
        </div>

        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          <small>
            Accessibility settings are stored locally in your browser and never sent to our servers.
          </small>
        </div>
      </div>
    `
  },

  /**
   * Handle accessibility settings changes
   */
  handleSettingsChange(formData) {
    const preferences = accessibilityPreferences.getPreferences()
    
    preferences.highContrast = formData.get('high-contrast') === 'on'
    preferences.largeText = formData.get('large-text') === 'on'
    preferences.reducedMotion = formData.get('reduced-motion') === 'on'
    preferences.screenReaderOptimized = formData.get('screen-reader') === 'on'
    preferences.colorBlindFriendly = formData.get('color-blind') === 'on'
    preferences.fontSize = formData.get('font-size') || 'normal'
    
    accessibilityPreferences.savePreferences(preferences)
    
    screenReader.announce('Accessibility settings updated', 'polite')
  }
}

export default {
  accessibilityPreferences,
  keyboardNavigation,
  screenReader,
  colorAccessibility,
  touchAccessibility,
  accessibilityService
}