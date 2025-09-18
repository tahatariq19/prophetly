import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Cookie utilities for privacy-compliant preference storage
const COOKIE_PREFIX = 'prophet_'
const COOKIE_EXPIRY_DAYS = 30

function setCookie(name, value, days = COOKIE_EXPIRY_DAYS) {
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${COOKIE_PREFIX}${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/;SameSite=Strict`
}

function getCookie(name) {
  const nameEQ = `${COOKIE_PREFIX}${name}=`
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)))
      } catch (e) {
        return null
      }
    }
  }
  return null
}

function deleteCookie(name) {
  document.cookie = `${COOKIE_PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // Default preferences
  const defaultPreferences = {
    theme: 'light',
    defaultHorizon: 30,
    preferredMode: 'simple', // 'simple' or 'advanced'
    chartPreferences: {
      showConfidenceIntervals: true,
      showComponents: true,
      chartType: 'line',
      colorScheme: 'default'
    },
    notificationSettings: {
      showProgressNotifications: true,
      showCompletionNotifications: true,
      autoHideNotifications: true
    },
    privacySettings: {
      acceptedPrivacyNotice: false,
      showPrivacyReminders: true
    }
  }

  // State - initialize from cookies
  const theme = ref(getCookie('theme') || defaultPreferences.theme)
  const defaultHorizon = ref(getCookie('defaultHorizon') || defaultPreferences.defaultHorizon)
  const preferredMode = ref(getCookie('preferredMode') || defaultPreferences.preferredMode)
  const chartPreferences = ref(getCookie('chartPreferences') || defaultPreferences.chartPreferences)
  const notificationSettings = ref(getCookie('notificationSettings') || defaultPreferences.notificationSettings)
  const privacySettings = ref(getCookie('privacySettings') || defaultPreferences.privacySettings)

  // Watch for changes and save to cookies
  watch(theme, (newValue) => setCookie('theme', newValue), { immediate: false })
  watch(defaultHorizon, (newValue) => setCookie('defaultHorizon', newValue), { immediate: false })
  watch(preferredMode, (newValue) => setCookie('preferredMode', newValue), { immediate: false })
  watch(chartPreferences, (newValue) => setCookie('chartPreferences', newValue), { deep: true, immediate: false })
  watch(notificationSettings, (newValue) => setCookie('notificationSettings', newValue), { deep: true, immediate: false })
  watch(privacySettings, (newValue) => setCookie('privacySettings', newValue), { deep: true, immediate: false })

  // Actions
  function updateTheme(newTheme) {
    theme.value = newTheme
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  function updateDefaultHorizon(horizon) {
    if (horizon > 0 && horizon <= 365) {
      defaultHorizon.value = horizon
    }
  }

  function updatePreferredMode(mode) {
    if (['simple', 'advanced'].includes(mode)) {
      preferredMode.value = mode
    }
  }

  function updateChartPreferences(preferences) {
    chartPreferences.value = { ...chartPreferences.value, ...preferences }
  }

  function updateNotificationSettings(settings) {
    notificationSettings.value = { ...notificationSettings.value, ...settings }
  }

  function updatePrivacySettings(settings) {
    privacySettings.value = { ...privacySettings.value, ...settings }
  }

  function acceptPrivacyNotice() {
    privacySettings.value.acceptedPrivacyNotice = true
  }

  function resetPreferences() {
    // Clear all cookies
    Object.keys(defaultPreferences).forEach(key => {
      deleteCookie(key)
    })
    
    // Reset to defaults
    theme.value = defaultPreferences.theme
    defaultHorizon.value = defaultPreferences.defaultHorizon
    preferredMode.value = defaultPreferences.preferredMode
    chartPreferences.value = { ...defaultPreferences.chartPreferences }
    notificationSettings.value = { ...defaultPreferences.notificationSettings }
    privacySettings.value = { ...defaultPreferences.privacySettings }
  }

  function exportPreferences() {
    return {
      theme: theme.value,
      defaultHorizon: defaultHorizon.value,
      preferredMode: preferredMode.value,
      chartPreferences: chartPreferences.value,
      notificationSettings: notificationSettings.value,
      privacySettings: privacySettings.value
    }
  }

  function importPreferences(preferences) {
    if (preferences.theme) updateTheme(preferences.theme)
    if (preferences.defaultHorizon) updateDefaultHorizon(preferences.defaultHorizon)
    if (preferences.preferredMode) updatePreferredMode(preferences.preferredMode)
    if (preferences.chartPreferences) updateChartPreferences(preferences.chartPreferences)
    if (preferences.notificationSettings) updateNotificationSettings(preferences.notificationSettings)
    if (preferences.privacySettings) updatePrivacySettings(preferences.privacySettings)
  }

  // Initialize theme on store creation
  document.documentElement.setAttribute('data-theme', theme.value)

  return {
    // State
    theme,
    defaultHorizon,
    preferredMode,
    chartPreferences,
    notificationSettings,
    privacySettings,
    
    // Actions
    updateTheme,
    updateDefaultHorizon,
    updatePreferredMode,
    updateChartPreferences,
    updateNotificationSettings,
    updatePrivacySettings,
    acceptPrivacyNotice,
    resetPreferences,
    exportPreferences,
    importPreferences
  }
})