// Browser storage utilities for privacy-compliant data management

/**
 * LocalStorage utilities for temporary session data
 * Note: This is for UI state only, not user data
 */
export const localStorage = {
  /**
   * Set item in localStorage with error handling
   */
  setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value)
      window.localStorage.setItem(key, serializedValue)
      return true
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
      return false
    }
  },

  /**
   * Get item from localStorage with error handling
   */
  getItem(key, defaultValue = null) {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
      return defaultValue
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem(key) {
    try {
      window.localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
      return false
    }
  },

  /**
   * Clear all localStorage items with optional prefix filter
   */
  clear(prefix = null) {
    try {
      if (prefix) {
        const keys = Object.keys(window.localStorage)
        keys.forEach(key => {
          if (key.startsWith(prefix)) {
            window.localStorage.removeItem(key)
          }
        })
      } else {
        window.localStorage.clear()
      }
      return true
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
      return false
    }
  }
}

/**
 * SessionStorage utilities for temporary data within browser session
 */
export const sessionStorage = {
  /**
   * Set item in sessionStorage with error handling
   */
  setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value)
      window.sessionStorage.setItem(key, serializedValue)
      return true
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error)
      return false
    }
  },

  /**
   * Get item from sessionStorage with error handling
   */
  getItem(key, defaultValue = null) {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn('Failed to read from sessionStorage:', error)
      return defaultValue
    }
  },

  /**
   * Remove item from sessionStorage
   */
  removeItem(key) {
    try {
      window.sessionStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn('Failed to remove from sessionStorage:', error)
      return false
    }
  },

  /**
   * Clear all sessionStorage items
   */
  clear() {
    try {
      window.sessionStorage.clear()
      return true
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error)
      return false
    }
  }
}

/**
 * Cookie utilities for user preferences (privacy-compliant)
 */
export const cookies = {
  /**
   * Set cookie with privacy-compliant defaults
   */
  set(name, value, options = {}) {
    const defaults = {
      days: 30,
      path: '/',
      sameSite: 'Strict',
      secure: window.location.protocol === 'https:'
    }
    
    const config = { ...defaults, ...options }
    
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(JSON.stringify(value))}`
    
    if (config.days) {
      const expires = new Date()
      expires.setTime(expires.getTime() + (config.days * 24 * 60 * 60 * 1000))
      cookieString += `;expires=${expires.toUTCString()}`
    }
    
    if (config.path) {
      cookieString += `;path=${config.path}`
    }
    
    if (config.sameSite) {
      cookieString += `;SameSite=${config.sameSite}`
    }
    
    if (config.secure) {
      cookieString += ';Secure'
    }
    
    document.cookie = cookieString
  },

  /**
   * Get cookie value
   */
  get(name) {
    const nameEQ = `${encodeURIComponent(name)}=`
    const cookies = document.cookie.split(';')
    
    for (let cookie of cookies) {
      let c = cookie.trim()
      if (c.indexOf(nameEQ) === 0) {
        try {
          const value = c.substring(nameEQ.length)
          return JSON.parse(decodeURIComponent(value))
        } catch (error) {
          console.warn('Failed to parse cookie:', error)
          return null
        }
      }
    }
    return null
  },

  /**
   * Remove cookie
   */
  remove(name, path = '/') {
    document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};`
  },

  /**
   * Check if cookies are available
   */
  isAvailable() {
    try {
      const testKey = '__cookie_test__'
      this.set(testKey, 'test', { days: 1 })
      const result = this.get(testKey) === 'test'
      this.remove(testKey)
      return result
    } catch (error) {
      return false
    }
  }
}

/**
 * File download utilities for data export
 */
export const fileDownload = {
  /**
   * Download data as JSON file
   */
  downloadJSON(data, filename = 'data.json') {
    try {
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      this.downloadBlob(blob, filename)
    } catch (error) {
      console.error('Failed to download JSON:', error)
      throw new Error('Failed to prepare JSON download')
    }
  },

  /**
   * Download data as CSV file
   */
  downloadCSV(data, filename = 'data.csv') {
    try {
      let csvContent = ''
      
      if (Array.isArray(data) && data.length > 0) {
        // Get headers from first object
        const headers = Object.keys(data[0])
        csvContent += headers.join(',') + '\n'
        
        // Add data rows
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          csvContent += values.join(',') + '\n'
        })
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      this.downloadBlob(blob, filename)
    } catch (error) {
      console.error('Failed to download CSV:', error)
      throw new Error('Failed to prepare CSV download')
    }
  },

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    try {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file:', error)
      throw new Error('Failed to download file')
    }
  }
}

/**
 * Privacy-compliant data validation
 */
export const dataValidation = {
  /**
   * Check if data contains potential PII
   */
  containsPII(data) {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone pattern
    ]
    
    const dataString = JSON.stringify(data).toLowerCase()
    return piiPatterns.some(pattern => pattern.test(dataString))
  },

  /**
   * Sanitize data for privacy compliance
   */
  sanitizeForLogging(data) {
    if (typeof data === 'string') {
      return data.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
                .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
                .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
    }
    return data
  }
}

/**
 * Memory management utilities
 */
export const memoryUtils = {
  /**
   * Clear all browser storage (for privacy compliance)
   */
  clearAllStorage() {
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear all cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
      cookies.remove(name.trim())
    })
  },

  /**
   * Get memory usage estimate (approximate)
   */
  getStorageUsage() {
    let localStorageSize = 0
    let sessionStorageSize = 0
    
    try {
      for (let key in window.localStorage) {
        if (Object.prototype.hasOwnProperty.call(window.localStorage, key)) {
          localStorageSize += window.localStorage[key].length + key.length
        }
      }
      
      for (let key in window.sessionStorage) {
        if (Object.prototype.hasOwnProperty.call(window.sessionStorage, key)) {
          sessionStorageSize += window.sessionStorage[key].length + key.length
        }
      }
    } catch (error) {
      console.warn('Failed to calculate storage usage:', error)
    }
    
    return {
      localStorage: localStorageSize,
      sessionStorage: sessionStorageSize,
      total: localStorageSize + sessionStorageSize
    }
  }
}