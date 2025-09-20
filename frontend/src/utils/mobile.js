/**
 * Mobile optimization utilities for Prophet Web Interface
 * Provides mobile-specific functionality with privacy-first approach
 */

// Device detection utilities
export const deviceDetection = {
  /**
   * Check if device is mobile
   */
  isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  },

  /**
   * Check if device is tablet
   */
  isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024
  },

  /**
   * Check if device supports touch
   */
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },

  /**
   * Get device type
   */
  getDeviceType() {
    if (this.isMobile()) return 'mobile'
    if (this.isTablet()) return 'tablet'
    return 'desktop'
  },

  /**
   * Check if device is in landscape mode
   */
  isLandscape() {
    return window.innerWidth > window.innerHeight
  },

  /**
   * Get safe area insets for devices with notches
   */
  getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement)
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0'),
      right: parseInt(style.getPropertyValue('--sar') || '0'),
      bottom: parseInt(style.getPropertyValue('--sab') || '0'),
      left: parseInt(style.getPropertyValue('--sal') || '0')
    }
  }
}

// Touch interaction utilities
export const touchUtils = {
  /**
   * Add touch-friendly event listeners
   */
  addTouchListeners(element, handlers) {
    if (!element) return

    const { onTap, onLongPress, onSwipe } = handlers

    let touchStartTime = 0
    let touchStartPos = { x: 0, y: 0 }
    let longPressTimer = null

    const handleTouchStart = (e) => {
      touchStartTime = Date.now()
      const touch = e.touches[0]
      touchStartPos = { x: touch.clientX, y: touch.clientY }

      // Long press detection
      if (onLongPress) {
        longPressTimer = setTimeout(() => {
          onLongPress(e)
        }, 500)
      }
    }

    const handleTouchEnd = (e) => {
      const touchEndTime = Date.now()
      const touchDuration = touchEndTime - touchStartTime

      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }

      // Tap detection
      if (touchDuration < 200 && onTap) {
        onTap(e)
      }

      // Swipe detection
      if (onSwipe && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0]
        const deltaX = touch.clientX - touchStartPos.x
        const deltaY = touch.clientY - touchStartPos.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        if (distance > 50) {
          const direction = Math.abs(deltaX) > Math.abs(deltaY) 
            ? (deltaX > 0 ? 'right' : 'left')
            : (deltaY > 0 ? 'down' : 'up')
          
          onSwipe({ direction, distance, deltaX, deltaY })
        }
      }
    }

    const handleTouchMove = (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchmove', handleTouchMove)
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  },

  /**
   * Prevent zoom on double tap for specific elements
   */
  preventDoubleTabZoom(element) {
    if (!element) return

    let lastTouchEnd = 0
    
    const handleTouchEnd = (e) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }

    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }
}

// Mobile-specific UI utilities
export const mobileUI = {
  /**
   * Show mobile-optimized file picker
   */
  showMobileFilePicker(options = {}) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = options.accept || '.csv,.txt'
      input.multiple = options.multiple || false

      // Add camera capture option on mobile
      if (deviceDetection.isMobile() && options.allowCamera) {
        input.capture = 'environment'
      }

      input.onchange = (e) => {
        const files = Array.from(e.target.files)
        if (files.length > 0) {
          resolve(files)
        } else {
          reject(new Error('No file selected'))
        }
      }

      input.click()
    })
  },

  /**
   * Create mobile-friendly modal
   */
  createMobileModal(content, options = {}) {
    const modal = document.createElement('div')
    modal.className = 'mobile-modal'
    modal.innerHTML = `
      <div class="mobile-modal-backdrop" ${options.dismissible !== false ? 'data-dismiss="true"' : ''}></div>
      <div class="mobile-modal-content">
        <div class="mobile-modal-header">
          <h5 class="mobile-modal-title">${options.title || ''}</h5>
          ${options.dismissible !== false ? '<button class="mobile-modal-close" data-dismiss="true">&times;</button>' : ''}
        </div>
        <div class="mobile-modal-body">
          ${content}
        </div>
        ${options.actions ? `<div class="mobile-modal-actions">${options.actions}</div>` : ''}
      </div>
    `

    // Add styles
    const style = document.createElement('style')
    style.textContent = `
      .mobile-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      
      .mobile-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
      }
      
      .mobile-modal-content {
        position: relative;
        background: white;
        border-radius: 16px 16px 0 0;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease-out;
      }
      
      .mobile-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
      }
      
      .mobile-modal-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
      }
      
      .mobile-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .mobile-modal-body {
        padding: 1rem;
      }
      
      .mobile-modal-actions {
        padding: 1rem;
        border-top: 1px solid #dee2e6;
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media (min-width: 768px) {
        .mobile-modal {
          align-items: center;
        }
        
        .mobile-modal-content {
          border-radius: 16px;
          max-width: 500px;
          max-height: 90vh;
        }
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(modal)

    // Handle dismissal
    if (options.dismissible !== false) {
      modal.addEventListener('click', (e) => {
        if (e.target.dataset.dismiss === 'true') {
          modal.remove()
          style.remove()
          if (options.onDismiss) options.onDismiss()
        }
      })
    }

    return {
      element: modal,
      close: () => {
        modal.remove()
        style.remove()
      }
    }
  },

  /**
   * Show mobile-optimized toast notification
   */
  showMobileToast(message, options = {}) {
    const toast = document.createElement('div')
    toast.className = `mobile-toast ${options.type || 'info'}`
    toast.innerHTML = `
      <div class="mobile-toast-content">
        ${options.icon ? `<i class="bi ${options.icon}"></i>` : ''}
        <span>${message}</span>
      </div>
    `

    // Add styles if not already present
    if (!document.querySelector('#mobile-toast-styles')) {
      const style = document.createElement('style')
      style.id = 'mobile-toast-styles'
      style.textContent = `
        .mobile-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 10000;
          animation: toastSlideUp 0.3s ease-out;
          max-width: calc(100vw - 40px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .mobile-toast.success {
          background: #198754;
        }
        
        .mobile-toast.error {
          background: #dc3545;
        }
        
        .mobile-toast.warning {
          background: #fd7e14;
        }
        
        .mobile-toast-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        @keyframes toastSlideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @media (max-width: 576px) {
          .mobile-toast {
            bottom: 10px;
            left: 10px;
            right: 10px;
            transform: none;
            max-width: none;
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(toast)

    // Auto remove
    const duration = options.duration || 3000
    setTimeout(() => {
      toast.style.animation = 'toastSlideUp 0.3s ease-out reverse'
      setTimeout(() => toast.remove(), 300)
    }, duration)

    return toast
  }
}

// Mobile-specific privacy utilities
export const mobilePrivacy = {
  /**
   * Show mobile privacy notice with enhanced visibility
   */
  showPrivacyNotice(message, options = {}) {
    const notice = mobileUI.createMobileModal(`
      <div class="privacy-notice-mobile">
        <div class="privacy-icon">
          <i class="bi bi-shield-lock-fill text-success" style="font-size: 2rem;"></i>
        </div>
        <h6 class="mt-3 mb-2">Privacy Protection Active</h6>
        <p class="text-muted mb-3">${message}</p>
        <div class="privacy-features">
          <div class="privacy-feature">
            <i class="bi bi-check-circle text-success"></i>
            <span>No data stored on servers</span>
          </div>
          <div class="privacy-feature">
            <i class="bi bi-check-circle text-success"></i>
            <span>Memory-only processing</span>
          </div>
          <div class="privacy-feature">
            <i class="bi bi-check-circle text-success"></i>
            <span>Automatic data cleanup</span>
          </div>
        </div>
      </div>
    `, {
      title: 'Privacy Notice',
      actions: `
        <button class="btn btn-primary w-100" data-dismiss="true">
          <i class="bi bi-check-lg me-1"></i>
          I Understand
        </button>
      `,
      ...options
    })

    // Add privacy notice styles
    const style = document.createElement('style')
    style.textContent = `
      .privacy-notice-mobile {
        text-align: center;
      }
      
      .privacy-features {
        text-align: left;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1rem;
      }
      
      .privacy-feature {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
      }
      
      .privacy-feature:last-child {
        margin-bottom: 0;
      }
    `
    document.head.appendChild(style)

    return notice
  },

  /**
   * Add privacy indicators to mobile UI elements
   */
  addPrivacyIndicator(element, message = 'Data processed privately') {
    if (!element) return

    const indicator = document.createElement('div')
    indicator.className = 'mobile-privacy-indicator'
    indicator.innerHTML = `
      <i class="bi bi-shield-check text-success"></i>
      <span>${message}</span>
    `

    // Add styles
    const style = document.createElement('style')
    style.textContent = `
      .mobile-privacy-indicator {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: #198754;
        background: rgba(25, 135, 84, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        margin-top: 0.5rem;
      }
    `
    
    if (!document.querySelector('#mobile-privacy-indicator-styles')) {
      style.id = 'mobile-privacy-indicator-styles'
      document.head.appendChild(style)
    }

    element.appendChild(indicator)
    return indicator
  }
}

// Viewport and orientation utilities
export const viewportUtils = {
  /**
   * Get viewport dimensions
   */
  getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      availableHeight: window.innerHeight - this.getKeyboardHeight()
    }
  },

  /**
   * Estimate keyboard height on mobile
   */
  getKeyboardHeight() {
    if (!deviceDetection.isMobile()) return 0
    
    const initialHeight = window.innerHeight
    const currentHeight = window.visualViewport?.height || window.innerHeight
    
    return Math.max(0, initialHeight - currentHeight)
  },

  /**
   * Handle viewport changes (orientation, keyboard)
   */
  onViewportChange(callback) {
    const handleResize = () => {
      callback({
        ...this.getViewportSize(),
        orientation: deviceDetection.isLandscape() ? 'landscape' : 'portrait',
        keyboardVisible: this.getKeyboardHeight() > 0
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    // Initial call
    handleResize()

    // Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }
}

// Performance utilities for mobile
export const mobilePerformance = {
  /**
   * Debounce function for touch events
   */
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  /**
   * Throttle function for scroll events
   */
  throttle(func, limit) {
    let inThrottle
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  /**
   * Lazy load images for mobile
   */
  lazyLoadImages(container) {
    if (!('IntersectionObserver' in window)) return

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.classList.remove('lazy')
          imageObserver.unobserve(img)
        }
      })
    })

    const images = container.querySelectorAll('img[data-src]')
    images.forEach(img => imageObserver.observe(img))

    return () => imageObserver.disconnect()
  }
}

export default {
  deviceDetection,
  touchUtils,
  mobileUI,
  mobilePrivacy,
  viewportUtils,
  mobilePerformance
}