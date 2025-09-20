/**
 * Vue composable for accessibility features
 * Provides reactive accessibility state and methods
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { accessibilityService, screenReader, keyboardNavigation } from '@/services/accessibility'

export function useAccessibility() {
  // Reactive state
  const isKeyboardNavigating = ref(false)
  const isHighContrast = ref(false)
  const isReducedMotion = ref(false)
  const isScreenReaderActive = ref(false)
  const fontSize = ref('normal')
  const announcements = ref([])

  // Computed properties
  const accessibilityClasses = computed(() => ({
    'keyboard-navigation': isKeyboardNavigating.value,
    'high-contrast': isHighContrast.value,
    'reduced-motion': isReducedMotion.value,
    'screen-reader-active': isScreenReaderActive.value,
    [`font-size-${fontSize.value}`]: fontSize.value !== 'normal'
  }))

  const isAccessibilityEnabled = computed(() => 
    isHighContrast.value || 
    isReducedMotion.value || 
    isScreenReaderActive.value || 
    fontSize.value !== 'normal'
  )

  // Methods
  const announceToScreenReader = (message, priority = 'polite') => {
    screenReader.announce(message, priority)
    
    // Add to announcements history for debugging
    announcements.value.unshift({
      message,
      priority,
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 10 announcements
    if (announcements.value.length > 10) {
      announcements.value = announcements.value.slice(0, 10)
    }
  }

  const setKeyboardNavigation = (active) => {
    isKeyboardNavigating.value = active
    if (active) {
      document.body.classList.add('keyboard-navigation')
    } else {
      document.body.classList.remove('keyboard-navigation')
    }
  }

  const toggleHighContrast = () => {
    isHighContrast.value = !isHighContrast.value
    updateAccessibilityPreferences()
  }

  const toggleReducedMotion = () => {
    isReducedMotion.value = !isReducedMotion.value
    updateAccessibilityPreferences()
  }

  const setFontSize = (size) => {
    fontSize.value = size
    updateAccessibilityPreferences()
  }

  const updateAccessibilityPreferences = () => {
    const preferences = {
      highContrast: isHighContrast.value,
      reducedMotion: isReducedMotion.value,
      screenReaderOptimized: isScreenReaderActive.value,
      fontSize: fontSize.value
    }
    
    // Apply preferences immediately
    accessibilityService.applyPreferences(preferences)
    
    // Save to localStorage (privacy-compliant)
    try {
      localStorage.setItem('prophet-accessibility', JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error)
    }
  }

  const loadAccessibilityPreferences = () => {
    try {
      const stored = localStorage.getItem('prophet-accessibility')
      if (stored) {
        const preferences = JSON.parse(stored)
        isHighContrast.value = preferences.highContrast || false
        isReducedMotion.value = preferences.reducedMotion || false
        isScreenReaderActive.value = preferences.screenReaderOptimized || false
        fontSize.value = preferences.fontSize || 'normal'
        
        accessibilityService.applyPreferences(preferences)
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error)
    }
  }

  const detectSystemPreferences = () => {
    // Detect system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      isReducedMotion.value = true
    }
    
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      isHighContrast.value = true
    }
    
    // Detect screen reader (approximation)
    if (navigator.userAgent.includes('NVDA') || 
        navigator.userAgent.includes('JAWS') || 
        navigator.userAgent.includes('VoiceOver')) {
      isScreenReaderActive.value = true
    }
  }

  const setupKeyboardListeners = () => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true)
      }
    }

    const handleMouseDown = () => {
      setKeyboardNavigation(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }

  const setupMediaQueryListeners = () => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')

    const handleReducedMotionChange = (e) => {
      isReducedMotion.value = e.matches
      updateAccessibilityPreferences()
    }

    const handleHighContrastChange = (e) => {
      isHighContrast.value = e.matches
      updateAccessibilityPreferences()
    }

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
    highContrastQuery.addEventListener('change', handleHighContrastChange)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      highContrastQuery.removeEventListener('change', handleHighContrastChange)
    }
  }

  // Focus management
  const focusElement = (selector) => {
    const element = document.querySelector(selector)
    if (element) {
      element.focus()
      announceToScreenReader(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`)
    }
  }

  const trapFocus = (container) => {
    return keyboardNavigation.trapFocus(container)
  }

  // Chart accessibility
  const makeChartAccessible = (chartElement, data) => {
    if (!chartElement || !data) return

    screenReader.addChartDescription(chartElement, data)
    
    // Add keyboard navigation for charts
    chartElement.setAttribute('tabindex', '0')
    chartElement.setAttribute('role', 'img')
    
    const handleChartKeydown = (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          announceToScreenReader(screenReader.generateChartDescription(data))
          break
        case 'ArrowLeft':
          e.preventDefault()
          announceToScreenReader('Navigate left in chart')
          break
        case 'ArrowRight':
          e.preventDefault()
          announceToScreenReader('Navigate right in chart')
          break
      }
    }

    chartElement.addEventListener('keydown', handleChartKeydown)

    return () => {
      chartElement.removeEventListener('keydown', handleChartKeydown)
    }
  }

  // Table accessibility
  const makeTableAccessible = (tableElement, data) => {
    if (!tableElement || !data) return

    screenReader.addTableDescription(tableElement, data)
    
    // Ensure proper table structure
    const headers = tableElement.querySelectorAll('th')
    headers.forEach((header, index) => {
      if (!header.id) {
        header.id = `table-header-${index}`
      }
    })

    const cells = tableElement.querySelectorAll('td')
    cells.forEach(cell => {
      const headerIndex = Array.from(cell.parentNode.children).indexOf(cell)
      const header = headers[headerIndex]
      if (header) {
        cell.setAttribute('headers', header.id)
      }
    })
  }

  // Form accessibility
  const makeFormAccessible = (formElement) => {
    if (!formElement) return

    const inputs = formElement.querySelectorAll('input, select, textarea')
    inputs.forEach(input => {
      // Ensure labels are properly associated
      const label = formElement.querySelector(`label[for="${input.id}"]`)
      if (!label && input.id) {
        const labelText = input.getAttribute('placeholder') || input.getAttribute('aria-label')
        if (labelText) {
          input.setAttribute('aria-label', labelText)
        }
      }

      // Add required field announcements
      if (input.hasAttribute('required')) {
        const currentLabel = input.getAttribute('aria-label') || ''
        input.setAttribute('aria-label', `${currentLabel} (required)`.trim())
      }

      // Add error handling
      const handleInputError = () => {
        const isValid = input.checkValidity()
        if (!isValid) {
          announceToScreenReader(`Error in ${input.getAttribute('aria-label') || 'field'}: ${input.validationMessage}`, 'assertive')
        }
      }

      input.addEventListener('blur', handleInputError)
      input.addEventListener('invalid', handleInputError)
    })
  }

  // Privacy-compliant error announcements
  const announceError = (message, includePrivacyNote = true) => {
    let fullMessage = message
    if (includePrivacyNote) {
      fullMessage += '. Your data remains private and secure.'
    }
    announceToScreenReader(fullMessage, 'assertive')
  }

  const announceSuccess = (message, includePrivacyNote = true) => {
    let fullMessage = message
    if (includePrivacyNote) {
      fullMessage += '. All processing was done securely in memory.'
    }
    announceToScreenReader(fullMessage, 'polite')
  }

  // Lifecycle
  let keyboardCleanup = null
  let mediaQueryCleanup = null

  onMounted(() => {
    // Load saved preferences
    loadAccessibilityPreferences()
    
    // Detect system preferences
    detectSystemPreferences()
    
    // Setup event listeners
    keyboardCleanup = setupKeyboardListeners()
    mediaQueryCleanup = setupMediaQueryListeners()
    
    // Initialize accessibility service
    accessibilityService.init()
    
    // Announce app ready
    setTimeout(() => {
      announceToScreenReader('Prophet Web Interface loaded. Privacy-first forecasting application ready.')
    }, 1000)
  })

  onUnmounted(() => {
    if (keyboardCleanup) keyboardCleanup()
    if (mediaQueryCleanup) mediaQueryCleanup()
  })

  return {
    // State
    isKeyboardNavigating,
    isHighContrast,
    isReducedMotion,
    isScreenReaderActive,
    fontSize,
    announcements,
    
    // Computed
    accessibilityClasses,
    isAccessibilityEnabled,
    
    // Methods
    announceToScreenReader,
    setKeyboardNavigation,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    updateAccessibilityPreferences,
    loadAccessibilityPreferences,
    focusElement,
    trapFocus,
    makeChartAccessible,
    makeTableAccessible,
    makeFormAccessible,
    announceError,
    announceSuccess
  }
}

export default useAccessibility