<template>
  <div class="mobile-navigation">
    <!-- Mobile Top Bar -->
    <div class="mobile-top-bar">
      <div class="top-bar-content">
        <div class="brand-section">
          <router-link to="/" class="mobile-brand">
            <i class="bi bi-graph-up-arrow me-2"></i>
            <span class="brand-text">Prophet</span>
          </router-link>
        </div>
        
        <div class="top-bar-actions">
          <!-- Privacy Status Indicator -->
          <div class="privacy-status" :class="{ 'active': hasActiveSession }">
            <i class="bi bi-shield-lock-fill"></i>
            <span class="status-text">{{ privacyStatusText }}</span>
          </div>
          
          <!-- Menu Toggle -->
          <button 
            class="mobile-menu-toggle"
            @click="toggleMenu"
            :class="{ 'active': isMenuOpen }"
            :aria-expanded="isMenuOpen"
            aria-label="Toggle navigation menu"
          >
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div 
      class="mobile-menu-overlay"
      :class="{ 'active': isMenuOpen }"
      @click="closeMenu"
    ></div>

    <!-- Mobile Menu Panel -->
    <div 
      class="mobile-menu-panel"
      :class="{ 'active': isMenuOpen }"
      ref="menuPanel"
    >
      <!-- Menu Header -->
      <div class="menu-header">
        <div class="menu-title">
          <i class="bi bi-list me-2"></i>
          Navigation
        </div>
        <button 
          class="menu-close"
          @click="closeMenu"
          aria-label="Close menu"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Privacy Notice in Menu -->
      <div class="menu-privacy-notice">
        <div class="privacy-icon">
          <i class="bi bi-shield-check text-success"></i>
        </div>
        <div class="privacy-text">
          <strong>Privacy Protected</strong>
          <p>Your data is processed in memory only and never stored on our servers.</p>
        </div>
      </div>

      <!-- Navigation Items -->
      <nav class="mobile-nav-items" role="navigation">
        <div class="nav-section">
          <div class="nav-section-title">Main</div>
          
          <router-link 
            to="/" 
            class="nav-item"
            :class="{ 'active': $route.path === '/' }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-house-door"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Dashboard</div>
              <div class="nav-item-subtitle">Overview and status</div>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </router-link>

          <router-link 
            to="/upload" 
            class="nav-item"
            :class="{ 'active': $route.path === '/upload' }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-cloud-upload"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Upload Data</div>
              <div class="nav-item-subtitle">Import your CSV files</div>
            </div>
            <div class="nav-item-badge" v-if="!hasUploadedData">
              <span class="badge bg-primary">Start</span>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </router-link>

          <router-link 
            to="/data" 
            class="nav-item"
            :class="{ 'active': $route.path === '/data', 'disabled': !hasUploadedData }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-table"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Data Management</div>
              <div class="nav-item-subtitle">Review and clean data</div>
            </div>
            <div class="nav-item-badge" v-if="hasDataQualityIssues">
              <span class="badge bg-warning">Issues</span>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </router-link>

          <router-link 
            to="/configure" 
            class="nav-item"
            :class="{ 'active': $route.path === '/configure', 'disabled': !hasUploadedData }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-gear"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Configure Forecast</div>
              <div class="nav-item-subtitle">Set Prophet parameters</div>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </router-link>

          <router-link 
            to="/results" 
            class="nav-item"
            :class="{ 'active': $route.path === '/results', 'disabled': !hasForecastResults }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-graph-up"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Results</div>
              <div class="nav-item-subtitle">View forecasts and charts</div>
            </div>
            <div class="nav-item-badge" v-if="hasForecastResults">
              <span class="badge bg-success">Ready</span>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </router-link>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Advanced</div>
          
          <router-link 
            to="/diagnostics" 
            class="nav-item"
            :class="{ 'active': $route.path === '/diagnostics', 'disabled': !hasForecastResults }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-clipboard-data"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Diagnostics</div>
              <div class="nav-item-subtitle">Model validation</div>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </router-link>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Settings</div>
          
          <button 
            class="nav-item nav-button"
            @click="openPreferences"
          >
            <div class="nav-item-icon">
              <i class="bi bi-sliders"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Preferences</div>
              <div class="nav-item-subtitle">Theme and settings</div>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </button>

          <router-link 
            to="/privacy" 
            class="nav-item"
            :class="{ 'active': $route.path === '/privacy' }"
            @click="closeMenu"
          >
            <div class="nav-item-icon">
              <i class="bi bi-shield-lock"></i>
            </div>
            <div class="nav-item-content">
              <div class="nav-item-title">Privacy Policy</div>
              <div class="nav-item-subtitle">Data protection info</div>
            </div>
            <div class="nav-item-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </button>
        </div>
      </nav>

      <!-- Session Info -->
      <div class="menu-session-info">
        <div class="session-header">
          <i class="bi bi-clock me-2"></i>
          Session Status
        </div>
        <div class="session-details">
          <div class="session-item">
            <span class="session-label">Session ID:</span>
            <span class="session-value">{{ sessionId || 'None' }}</span>
          </div>
          <div class="session-item">
            <span class="session-label">Data Status:</span>
            <span class="session-value" :class="hasUploadedData ? 'text-success' : 'text-muted'">
              {{ hasUploadedData ? 'Loaded' : 'None' }}
            </span>
          </div>
          <div class="session-item">
            <span class="session-label">Expires:</span>
            <span class="session-value">{{ sessionExpiry || 'N/A' }}</span>
          </div>
        </div>
        
        <div class="session-actions" v-if="hasActiveSession">
          <button class="btn btn-outline-warning btn-sm w-100 mb-2" @click="extendSession">
            <i class="bi bi-clock-history me-1"></i>
            Extend Session
          </button>
          <button class="btn btn-outline-danger btn-sm w-100" @click="clearSession">
            <i class="bi bi-trash me-1"></i>
            Clear Session
          </button>
        </div>
      </div>

      <!-- Menu Footer -->
      <div class="menu-footer">
        <div class="app-version">
          <small class="text-muted">
            Prophet Web Interface v1.0.0<br>
            Privacy-First Forecasting
          </small>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation Bar (Alternative) -->
    <div class="mobile-bottom-nav" v-if="showBottomNav">
      <router-link 
        to="/" 
        class="bottom-nav-item"
        :class="{ 'active': $route.path === '/' }"
      >
        <i class="bi bi-house-door"></i>
        <span>Home</span>
      </router-link>
      
      <router-link 
        to="/upload" 
        class="bottom-nav-item"
        :class="{ 'active': $route.path === '/upload' }"
      >
        <i class="bi bi-cloud-upload"></i>
        <span>Upload</span>
      </router-link>
      
      <router-link 
        to="/configure" 
        class="bottom-nav-item"
        :class="{ 'active': $route.path === '/configure', 'disabled': !hasUploadedData }"
      >
        <i class="bi bi-gear"></i>
        <span>Config</span>
      </router-link>
      
      <router-link 
        to="/results" 
        class="bottom-nav-item"
        :class="{ 'active': $route.path === '/results', 'disabled': !hasForecastResults }"
      >
        <i class="bi bi-graph-up"></i>
        <span>Results</span>
      </router-link>
      
      <button 
        class="bottom-nav-item nav-button"
        @click="toggleMenu"
      >
        <i class="bi bi-list"></i>
        <span>More</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useUserPreferencesStore } from '@/stores/userPreferences'
import { deviceDetection, touchUtils, mobileUI } from '@/utils/mobile'

export default {
  name: 'MobileNavigation',
  props: {
    showBottomNav: {
      type: Boolean,
      default: false
    }
  },
  emits: ['preferences-opened', 'session-extended', 'session-cleared'],
  setup(props, { emit }) {
    const route = useRoute()
    const sessionStore = useSessionStore()
    const preferencesStore = useUserPreferencesStore()
    
    // Reactive state
    const isMenuOpen = ref(false)
    const menuPanel = ref(null)
    
    // Touch cleanup
    let touchCleanup = null

    // Computed properties
    const hasActiveSession = computed(() => !!sessionStore.sessionId)
    const hasUploadedData = computed(() => sessionStore.hasUploadedData)
    const hasForecastResults = computed(() => sessionStore.hasForecastResults)
    const hasDataQualityIssues = computed(() => {
      const preview = sessionStore.dataPreview
      return preview && (
        (preview.stats?.missingValues || 0) > 0 ||
        (preview.stats?.completeness || 100) < 95
      )
    })
    
    const sessionId = computed(() => {
      const id = sessionStore.sessionId
      return id ? id.substring(0, 8) + '...' : null
    })
    
    const sessionExpiry = computed(() => {
      const expiry = sessionStore.sessionExpiry
      if (!expiry) return null
      
      const now = new Date()
      const expiryDate = new Date(expiry)
      const diffMinutes = Math.floor((expiryDate - now) / (1000 * 60))
      
      if (diffMinutes < 0) return 'Expired'
      if (diffMinutes < 60) return `${diffMinutes}m`
      
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return `${hours}h ${minutes}m`
    })
    
    const privacyStatusText = computed(() => {
      if (hasActiveSession.value) {
        return 'Session Active'
      }
      return 'No Data Stored'
    })

    // Menu methods
    const toggleMenu = () => {
      isMenuOpen.value = !isMenuOpen.value
      
      if (isMenuOpen.value) {
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden'
        
        // Add touch listeners for swipe to close
        if (menuPanel.value && deviceDetection.isTouchDevice()) {
          touchCleanup = touchUtils.addTouchListeners(menuPanel.value, {
            onSwipe: ({ direction }) => {
              if (direction === 'left') {
                closeMenu()
              }
            }
          })
        }
      } else {
        document.body.style.overflow = ''
        if (touchCleanup) {
          touchCleanup()
          touchCleanup = null
        }
      }
    }

    const closeMenu = () => {
      isMenuOpen.value = false
      document.body.style.overflow = ''
      
      if (touchCleanup) {
        touchCleanup()
        touchCleanup = null
      }
    }

    // Action methods
    const openPreferences = () => {
      closeMenu()
      emit('preferences-opened')
    }

    const extendSession = () => {
      sessionStore.extendSession()
      mobileUI.showMobileToast('Session extended for 2 more hours', { 
        type: 'success',
        icon: 'bi-clock-history'
      })
      emit('session-extended')
    }

    const clearSession = () => {
      const modal = mobileUI.createMobileModal(`
        <div class="text-center">
          <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
          <h6 class="mt-3 mb-2">Clear Session Data?</h6>
          <p class="text-muted mb-3">
            This will remove all uploaded data and forecast results from memory. 
            This action cannot be undone.
          </p>
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            <small>Your data is already secure and will be automatically cleared when you close the browser.</small>
          </div>
        </div>
      `, {
        title: 'Confirm Clear Session',
        actions: `
          <button class="btn btn-secondary me-2" data-dismiss="true">Cancel</button>
          <button class="btn btn-danger" onclick="this.closest('.mobile-modal').dispatchEvent(new CustomEvent('confirm'))">
            <i class="bi bi-trash me-1"></i>Clear Session
          </button>
        `,
        dismissible: true
      })

      modal.element.addEventListener('confirm', () => {
        sessionStore.clearSession()
        mobileUI.showMobileToast('Session cleared successfully', { 
          type: 'success',
          icon: 'bi-check-circle'
        })
        emit('session-cleared')
        modal.close()
        closeMenu()
      })
    }

    // Handle escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isMenuOpen.value) {
        closeMenu()
      }
    }

    // Lifecycle
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
      
      if (touchCleanup) {
        touchCleanup()
      }
    })

    return {
      // Refs
      menuPanel,
      
      // State
      isMenuOpen,
      
      // Computed
      hasActiveSession,
      hasUploadedData,
      hasForecastResults,
      hasDataQualityIssues,
      sessionId,
      sessionExpiry,
      privacyStatusText,
      
      // Methods
      toggleMenu,
      closeMenu,
      openPreferences,
      extendSession,
      clearSession
    }
  }
}
</script>

<style scoped>
.mobile-navigation {
  position: relative;
}

/* Mobile Top Bar */
.mobile-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #ffffff;
  border-bottom: 1px solid #dee2e6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.top-bar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  max-width: 100%;
}

.brand-section {
  flex: 1;
}

.mobile-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #0d6efd;
  font-weight: 700;
  font-size: 1.1rem;
}

.brand-text {
  display: none;
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Privacy Status Indicator */
.privacy-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #6c757d;
  transition: all 0.2s ease;
}

.privacy-status.active {
  background: rgba(25, 135, 84, 0.1);
  color: #198754;
}

.privacy-status i {
  font-size: 0.875rem;
}

.status-text {
  display: none;
}

/* Mobile Menu Toggle */
.mobile-menu-toggle {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;
}

.hamburger-line {
  width: 20px;
  height: 2px;
  background: #495057;
  margin: 2px 0;
  transition: all 0.3s ease;
  border-radius: 1px;
}

.mobile-menu-toggle.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.mobile-menu-toggle.active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.mobile-menu-toggle.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* Mobile Menu Overlay */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.mobile-menu-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Mobile Menu Panel */
.mobile-menu-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  max-width: 85vw;
  height: 100%;
  background: #ffffff;
  z-index: 1002;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
}

.mobile-menu-panel.active {
  transform: translateX(0);
}

/* Menu Header */
.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.menu-title {
  font-weight: 600;
  color: #495057;
}

.menu-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.menu-close:hover {
  background: #e9ecef;
}

/* Menu Privacy Notice */
.menu-privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #d1ecf1, #bee5eb);
  border-bottom: 1px solid #dee2e6;
}

.privacy-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.privacy-text strong {
  display: block;
  color: #0c5460;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.privacy-text p {
  color: #0c5460;
  font-size: 0.8rem;
  line-height: 1.3;
  margin: 0;
}

/* Navigation Items */
.mobile-nav-items {
  padding: 0;
}

.nav-section {
  border-bottom: 1px solid #f1f3f4;
}

.nav-section-title {
  padding: 0.75rem 1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: #495057;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.nav-item:hover {
  background: #f8f9fa;
  color: #495057;
}

.nav-item.active {
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
  border-right: 3px solid #0d6efd;
}

.nav-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.nav-item.active .nav-item-icon {
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}

.nav-item-icon i {
  font-size: 1.1rem;
}

.nav-item-content {
  flex: 1;
  min-width: 0;
}

.nav-item-title {
  font-weight: 500;
  font-size: 0.9rem;
  line-height: 1.2;
  margin-bottom: 0.125rem;
}

.nav-item-subtitle {
  font-size: 0.75rem;
  color: #6c757d;
  line-height: 1.2;
}

.nav-item-badge {
  margin-right: 0.5rem;
}

.nav-item-arrow {
  color: #adb5bd;
  font-size: 0.875rem;
}

.nav-item.active .nav-item-arrow {
  color: #0d6efd;
}

/* Session Info */
.menu-session-info {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  margin-top: auto;
}

.session-header {
  font-weight: 600;
  font-size: 0.875rem;
  color: #495057;
  margin-bottom: 0.75rem;
}

.session-details {
  margin-bottom: 1rem;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.session-item:last-child {
  margin-bottom: 0;
}

.session-label {
  color: #6c757d;
}

.session-value {
  font-weight: 500;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.session-actions {
  margin-top: 1rem;
}

/* Menu Footer */
.menu-footer {
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #dee2e6;
}

/* Bottom Navigation */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #dee2e6;
  display: flex;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.25rem;
  text-decoration: none;
  color: #6c757d;
  font-size: 0.75rem;
  transition: color 0.2s ease;
  border: none;
  background: none;
  cursor: pointer;
}

.bottom-nav-item:hover {
  color: #495057;
}

.bottom-nav-item.active {
  color: #0d6efd;
}

.bottom-nav-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.bottom-nav-item i {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.bottom-nav-item span {
  font-weight: 500;
  line-height: 1;
}

/* Responsive Adjustments */
@media (min-width: 576px) {
  .brand-text {
    display: inline;
  }
  
  .status-text {
    display: inline;
  }
  
  .mobile-menu-panel {
    width: 360px;
  }
}

@media (max-width: 320px) {
  .mobile-menu-panel {
    width: 100vw;
    max-width: 100vw;
  }
  
  .top-bar-content {
    padding: 0.5rem 0.75rem;
  }
  
  .nav-item {
    padding: 0.625rem 0.75rem;
  }
  
  .nav-item-icon {
    width: 36px;
    height: 36px;
    margin-right: 0.5rem;
  }
}

/* Dark Theme Support */
@media (prefers-color-scheme: dark) {
  .mobile-top-bar,
  .mobile-menu-panel,
  .mobile-bottom-nav {
    background: #2d2d2d;
    border-color: #495057;
    color: #ffffff;
  }

  .menu-header,
  .menu-session-info {
    background: #3d3d3d;
    border-color: #495057;
  }

  .mobile-brand {
    color: #66b3ff;
  }

  .nav-item {
    color: #ffffff;
  }

  .nav-item:hover {
    background: #3d3d3d;
    color: #ffffff;
  }

  .nav-item-icon {
    background: #3d3d3d;
  }

  .nav-item.active .nav-item-icon {
    background: rgba(102, 179, 255, 0.1);
    color: #66b3ff;
  }

  .hamburger-line {
    background: #ffffff;
  }

  .privacy-status {
    background: #3d3d3d;
    color: #adb5bd;
  }

  .privacy-status.active {
    background: rgba(102, 179, 255, 0.1);
    color: #66b3ff;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .mobile-top-bar,
  .mobile-menu-panel,
  .mobile-bottom-nav {
    border-width: 2px;
  }

  .nav-item.active {
    border-right-width: 4px;
  }

  .nav-item-icon {
    border: 1px solid currentColor;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .mobile-menu-panel,
  .mobile-menu-overlay,
  .mobile-menu-toggle,
  .hamburger-line,
  .nav-item {
    transition: none;
  }
}

/* Safe Area Support for devices with notches */
@supports (padding: max(0px)) {
  .mobile-top-bar {
    padding-top: max(0.75rem, env(safe-area-inset-top));
  }
  
  .mobile-bottom-nav {
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
}
</style>