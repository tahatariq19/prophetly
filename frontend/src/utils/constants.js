// Application constants for the Prophet Web Interface

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '/api',
  TIMEOUT: 60000, // 60 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FILE_TYPES: ['text/csv', 'application/csv', 'text/plain'],
  SUPPORTED_EXTENSIONS: ['.csv', '.txt']
}

/**
 * Prophet Configuration Defaults
 */
export const PROPHET_DEFAULTS = {
  // Basic parameters
  horizon: 30,
  interval_width: 0.8,
  
  // Growth parameters
  growth: 'linear',
  changepoint_prior_scale: 0.05,
  changepoint_range: 0.8,
  
  // Seasonality parameters
  yearly_seasonality: 'auto',
  weekly_seasonality: 'auto',
  daily_seasonality: 'auto',
  seasonality_mode: 'additive',
  seasonality_prior_scale: 10.0,
  
  // Holiday parameters
  holidays_prior_scale: 10.0,
  
  // Advanced parameters
  mcmc_samples: 0,
  uncertainty_samples: 1000,
  stan_backend: null
}

/**
 * Prophet Parameter Limits
 */
export const PROPHET_LIMITS = {
  horizon: { min: 1, max: 365 },
  interval_width: { min: 0.01, max: 0.99 },
  changepoint_prior_scale: { min: 0.001, max: 0.5 },
  changepoint_range: { min: 0.1, max: 1.0 },
  seasonality_prior_scale: { min: 0.01, max: 100 },
  holidays_prior_scale: { min: 0.01, max: 100 },
  mcmc_samples: { min: 0, max: 2000 },
  uncertainty_samples: { min: 100, max: 10000 }
}

/**
 * Growth Mode Options
 */
export const GROWTH_MODES = [
  { value: 'linear', label: 'Linear', description: 'Constant growth rate' },
  { value: 'logistic', label: 'Logistic', description: 'Growth with carrying capacity' },
  { value: 'flat', label: 'Flat', description: 'No growth trend' }
]

/**
 * Seasonality Mode Options
 */
export const SEASONALITY_MODES = [
  { value: 'additive', label: 'Additive', description: 'Seasonal effects are added to the trend' },
  { value: 'multiplicative', label: 'Multiplicative', description: 'Seasonal effects multiply the trend' }
]

/**
 * Built-in Holiday Countries
 */
export const HOLIDAY_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AU', name: 'Australia' }
]

/**
 * Chart Configuration
 */
export const CHART_CONFIG = {
  colors: {
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0',
    light: '#f8f9fa',
    dark: '#212529'
  },
  
  forecast: {
    historical: '#0d6efd',
    predicted: '#198754',
    confidence: 'rgba(25, 135, 84, 0.2)',
    trend: '#dc3545',
    seasonal: '#ffc107'
  },
  
  defaultOptions: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#0d6efd',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            day: 'MMM DD',
            week: 'MMM DD',
            month: 'MMM YYYY'
          }
        }
      },
      y: {
        beginAtZero: false
      }
    }
  }
}

/**
 * User Interface Constants
 */
export const UI_CONFIG = {
  themes: ['light', 'dark'],
  modes: ['simple', 'advanced'],
  
  notifications: {
    duration: 5000, // 5 seconds
    maxVisible: 5
  },
  
  session: {
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  },
  
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    chunkSize: 1024 * 1024, // 1MB chunks
    allowedTypes: ['text/csv', 'application/csv']
  }
}

/**
 * Privacy and Security Constants
 */
export const PRIVACY_CONFIG = {
  cookiePrefix: 'prophet_',
  cookieExpiry: 30, // days
  
  headers: {
    privacyMode: 'X-Privacy-Mode',
    noLogging: 'X-No-Logging',
    sessionOnly: 'X-Session-Only',
    memoryOnly: 'X-Memory-Only'
  },
  
  messages: {
    dataProcessed: 'Your data was processed in memory only and has been automatically discarded.',
    noStorage: 'No data is stored on our servers.',
    sessionExpired: 'Your session has expired. All data has been automatically cleared.',
    privacyCompliant: 'All processing is privacy-compliant and stateless.'
  }
}

/**
 * Validation Constants
 */
export const VALIDATION_CONFIG = {
  file: {
    maxSize: 10 * 1024 * 1024, // 10MB
    minRows: 10,
    maxRows: 100000,
    requiredColumns: ['date', 'value'],
    supportedFormats: ['csv', 'txt']
  },
  
  data: {
    minDataPoints: 10,
    maxMissingPercent: 10, // 10%
    dateFormats: [
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY',
      'YYYY-MM-DD HH:mm:ss',
      'MM/DD/YYYY HH:mm:ss'
    ]
  },
  
  prophet: {
    minHorizon: 1,
    maxHorizon: 365,
    minInterval: 0.01,
    maxInterval: 0.99,
    minPriorScale: 0.001,
    maxPriorScale: 100
  }
}

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  network: 'Network connection error. Please check your connection and try again.',
  timeout: 'Request timeout. Your data was not stored and processing was stopped.',
  fileSize: 'File too large. Maximum size is 10MB.',
  fileType: 'Invalid file type. Please upload a CSV file.',
  invalidData: 'Invalid data format. Please check your CSV file.',
  serverError: 'Server error. Your data was not stored and processing was stopped.',
  privacyError: 'Privacy compliance error. All data has been automatically cleared.',
  validationError: 'Data validation failed. Please check your input.',
  configError: 'Invalid configuration. Please check your parameters.'
}

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  fileUploaded: 'File uploaded successfully. Data processed in memory only.',
  forecastGenerated: 'Forecast generated successfully. Results are temporary.',
  configSaved: 'Configuration saved to browser storage.',
  dataExported: 'Data exported successfully.',
  privacyCompliant: 'All operations completed with privacy compliance.'
}

/**
 * Route Names and Paths
 */
export const ROUTES = {
  dashboard: { name: 'Dashboard', path: '/' },
  upload: { name: 'Upload', path: '/upload' },
  configure: { name: 'Configure', path: '/configure' },
  results: { name: 'Results', path: '/results' },
  privacy: { name: 'Privacy', path: '/privacy' }
}

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  userPreferences: 'prophet_preferences',
  sessionData: 'prophet_session',
  chartSettings: 'prophet_charts',
  recentConfigs: 'prophet_recent_configs'
}

/**
 * Export formats
 */
export const EXPORT_FORMATS = {
  csv: { extension: 'csv', mimeType: 'text/csv', label: 'CSV File' },
  json: { extension: 'json', mimeType: 'application/json', label: 'JSON File' },
  png: { extension: 'png', mimeType: 'image/png', label: 'PNG Image' },
  svg: { extension: 'svg', mimeType: 'image/svg+xml', label: 'SVG Image' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf', label: 'PDF Report' }
}