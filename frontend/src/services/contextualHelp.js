// Contextual help system with privacy-focused guidance
import { ref, computed, reactive } from 'vue'

/**
 * Help content categories
 */
export const HELP_CATEGORIES = {
  DATA_UPLOAD: 'data_upload',
  DATA_QUALITY: 'data_quality',
  PROPHET_CONFIG: 'prophet_config',
  FORECASTING: 'forecasting',
  RESULTS: 'results',
  PRIVACY: 'privacy',
  TROUBLESHOOTING: 'troubleshooting'
}

/**
 * Help content database with privacy-focused explanations
 */
const helpContent = {
  // Data Upload Help
  [HELP_CATEGORIES.DATA_UPLOAD]: {
    file_format: {
      title: 'File Format Requirements',
      content: 'Upload CSV files with date and value columns. Your file is processed in memory only and never stored on our servers.',
      examples: [
        'CSV files with comma-separated values',
        'Date column (ds, date, timestamp)',
        'Value column (y, value, sales, count)'
      ],
      privacyNote: 'Files are processed entirely in browser memory when possible, with server processing only in volatile memory.'
    },
    file_size: {
      title: 'File Size Limits',
      content: 'Maximum file size is 10MB for privacy and performance. Larger files require more memory and processing time.',
      tips: [
        'Remove unnecessary columns to reduce size',
        'Use date ranges to focus on relevant periods',
        'Consider aggregating high-frequency data'
      ],
      privacyNote: 'Size limits protect both performance and privacy by preventing excessive memory usage.'
    },
    column_detection: {
      title: 'Automatic Column Detection',
      content: 'The system automatically detects date and value columns, but you can manually select them if needed.',
      tips: [
        'Date columns: ds, date, timestamp, time',
        'Value columns: y, value, target, sales, count',
        'Additional columns can be used as regressors'
      ],
      privacyNote: 'Column detection happens during processing and no column information is stored permanently.'
    }
  },

  // Data Quality Help
  [HELP_CATEGORIES.DATA_QUALITY]: {
    missing_values: {
      title: 'Handling Missing Values',
      content: 'Prophet can handle missing values, but data quality affects forecast accuracy. Review and clean your data as needed.',
      strategies: [
        'Remove rows with missing dates',
        'Interpolate missing values',
        'Use forward/backward fill for short gaps',
        'Consider the impact on forecast quality'
      ],
      privacyNote: 'Data quality analysis happens in memory only. No data quality information is stored.'
    },
    outliers: {
      title: 'Outlier Detection',
      content: 'Outliers can significantly impact forecasts. Review detected outliers and decide whether to keep, remove, or adjust them.',
      approaches: [
        'Statistical outlier detection',
        'Domain knowledge validation',
        'Impact assessment on forecasts',
        'Seasonal pattern consideration'
      ],
      privacyNote: 'Outlier detection is performed on session data only and results are not retained.'
    },
    data_frequency: {
      title: 'Data Frequency',
      content: 'Prophet works with various frequencies: daily, weekly, monthly, etc. Consistent frequency improves forecast quality.',
      recommendations: [
        'Daily data: at least 2 years of history',
        'Weekly data: at least 2-3 years',
        'Monthly data: at least 3-5 years',
        'Irregular data: consider resampling'
      ],
      privacyNote: 'Frequency analysis is temporary and performed only during active sessions.'
    }
  },

  // Prophet Configuration Help
  [HELP_CATEGORIES.PROPHET_CONFIG]: {
    growth_modes: {
      title: 'Growth Modes',
      content: 'Choose the growth pattern that best fits your data: linear for steady growth, logistic for saturating growth.',
      modes: {
        linear: 'Constant rate of growth (default)',
        logistic: 'Growth that saturates at a carrying capacity',
        flat: 'No growth trend'
      },
      tips: [
        'Linear: most common, good default choice',
        'Logistic: when growth has natural limits',
        'Flat: for stationary time series'
      ],
      privacyNote: 'Configuration choices are stored in browser cookies only for convenience.'
    },
    seasonality: {
      title: 'Seasonality Settings',
      content: 'Prophet automatically detects yearly, weekly, and daily patterns. You can customize or add custom seasonalities.',
      types: {
        yearly: 'Annual patterns (holidays, seasons)',
        weekly: 'Day-of-week patterns',
        daily: 'Hour-of-day patterns (for sub-daily data)',
        custom: 'User-defined seasonal patterns'
      },
      tips: [
        'Start with automatic detection',
        'Add custom seasonalities for domain-specific patterns',
        'Consider multiplicative vs additive seasonality'
      ],
      privacyNote: 'Seasonality settings are part of your model configuration and not stored permanently.'
    },
    holidays: {
      title: 'Holiday Effects',
      content: 'Include holidays that affect your time series. Prophet includes built-in holidays for many countries.',
      options: [
        'Built-in country holidays',
        'Custom holiday definitions',
        'Holiday windows (before/after effects)',
        'Holiday prior scales'
      ],
      tips: [
        'Include holidays relevant to your domain',
        'Consider regional vs national holidays',
        'Account for holiday effects on surrounding days'
      ],
      privacyNote: 'Holiday configurations are temporary and not associated with personal information.'
    },
    uncertainty: {
      title: 'Uncertainty Intervals',
      content: 'Confidence intervals show forecast uncertainty. Wider intervals indicate higher uncertainty.',
      settings: [
        'Interval width (80%, 95%, etc.)',
        'MCMC sampling for better uncertainty',
        'Uncertainty in trend and seasonality'
      ],
      interpretation: [
        'Wider intervals = more uncertainty',
        'Historical fit quality affects future uncertainty',
        'MCMC provides more accurate intervals'
      ],
      privacyNote: 'Uncertainty calculations are performed in memory during forecast generation.'
    }
  },

  // Forecasting Help
  [HELP_CATEGORIES.FORECASTING]: {
    forecast_horizon: {
      title: 'Forecast Horizon',
      content: 'How far into the future to predict. Longer horizons generally have higher uncertainty.',
      guidelines: [
        'Daily data: 30-365 days typical',
        'Weekly data: 4-52 weeks typical',
        'Monthly data: 3-24 months typical',
        'Consider business planning needs'
      ],
      tips: [
        'Start with shorter horizons for validation',
        'Uncertainty increases with horizon length',
        'Consider seasonal cycles in horizon choice'
      ],
      privacyNote: 'Forecast horizons are part of temporary model configuration.'
    },
    cross_validation: {
      title: 'Cross-Validation',
      content: 'Validate model performance using historical data. This helps assess forecast accuracy and reliability.',
      process: [
        'Split historical data into train/test periods',
        'Generate forecasts for test periods',
        'Calculate performance metrics',
        'Assess model reliability'
      ],
      metrics: [
        'MAE: Mean Absolute Error',
        'RMSE: Root Mean Square Error',
        'MAPE: Mean Absolute Percentage Error',
        'Coverage: Confidence interval accuracy'
      ],
      privacyNote: 'Cross-validation is performed on session data and results are not stored permanently.'
    },
    model_comparison: {
      title: 'Model Comparison',
      content: 'Compare different model configurations to find the best approach for your data.',
      strategies: [
        'Try different growth modes',
        'Adjust seasonality settings',
        'Test various holiday configurations',
        'Compare uncertainty intervals'
      ],
      evaluation: [
        'Cross-validation performance',
        'Visual inspection of fits',
        'Business logic validation',
        'Forecast reasonableness'
      ],
      privacyNote: 'Model comparisons exist only during your session and are automatically cleared.'
    }
  },

  // Results Help
  [HELP_CATEGORIES.RESULTS]: {
    forecast_interpretation: {
      title: 'Interpreting Forecasts',
      content: 'Understand what your forecast results mean and how to use them for decision-making.',
      components: {
        yhat: 'Point forecast (most likely value)',
        yhat_lower: 'Lower confidence bound',
        yhat_upper: 'Upper confidence bound',
        trend: 'Overall trend component',
        seasonal: 'Seasonal patterns'
      },
      tips: [
        'Focus on trends and patterns, not exact values',
        'Consider confidence intervals for risk assessment',
        'Validate forecasts against business knowledge',
        'Update models with new data regularly'
      ],
      privacyNote: 'Forecast results are generated in memory and can be downloaded for your records.'
    },
    component_analysis: {
      title: 'Component Decomposition',
      content: 'Prophet breaks down forecasts into trend, seasonal, and holiday components for better understanding.',
      components: [
        'Trend: Long-term direction',
        'Yearly: Annual seasonal patterns',
        'Weekly: Day-of-week patterns',
        'Holidays: Holiday effects',
        'Regressors: External variable effects'
      ],
      insights: [
        'Identify dominant patterns in your data',
        'Understand seasonal vs trend contributions',
        'Validate component reasonableness',
        'Use components for business insights'
      ],
      privacyNote: 'Component analysis is performed on your session data only.'
    },
    export_options: {
      title: 'Exporting Results',
      content: 'Download your forecasts and analysis for use in other tools or for record-keeping.',
      formats: [
        'CSV: Forecast data and components',
        'JSON: Complete model configuration',
        'PNG/SVG: Charts and visualizations',
        'PDF: Comprehensive reports'
      ],
      tips: [
        'Include metadata for reproducibility',
        'Save model configurations for future use',
        'Export charts for presentations',
        'Keep records of model performance'
      ],
      privacyNote: 'All exports are generated client-side. No data is stored on our servers after download.'
    }
  },

  // Privacy Help
  [HELP_CATEGORIES.PRIVACY]: {
    data_processing: {
      title: 'How Your Data is Processed',
      content: 'Your data is processed entirely in memory and never stored permanently on our servers.',
      process: [
        'Upload: Files processed in volatile memory',
        'Analysis: Temporary session-based storage',
        'Forecasting: In-memory model training',
        'Results: Generated and immediately available for download',
        'Cleanup: Automatic data removal when session ends'
      ],
      guarantees: [
        'No permanent data storage',
        'No data sharing with third parties',
        'Automatic session cleanup',
        'Client-side preference storage only'
      ],
      privacyNote: 'This privacy-first approach ensures your sensitive data never leaves your control.'
    },
    session_management: {
      title: 'Session Privacy',
      content: 'Sessions are temporary workspaces that automatically clean up your data for privacy protection.',
      features: [
        'Automatic expiration (2 hours maximum)',
        'Manual data clearing options',
        'No cross-session data sharing',
        'Secure memory cleanup'
      ],
      tips: [
        'Download results before sessions expire',
        'Use manual cleanup for immediate data removal',
        'Sessions reset automatically for privacy',
        'No login required - anonymous processing'
      ],
      privacyNote: 'Session management prioritizes your privacy over convenience.'
    },
    browser_storage: {
      title: 'Browser Storage',
      content: 'Only user preferences and settings are stored in your browser for convenience.',
      stored_data: [
        'Interface preferences (theme, layout)',
        'Model configuration templates',
        'Recently used settings',
        'Help system preferences'
      ],
      not_stored: [
        'Uploaded data files',
        'Forecast results',
        'Personal information',
        'Usage analytics'
      ],
      privacyNote: 'You can clear browser storage anytime to remove all preferences.'
    }
  },

  // Troubleshooting Help
  [HELP_CATEGORIES.TROUBLESHOOTING]: {
    common_errors: {
      title: 'Common Issues and Solutions',
      content: 'Solutions to frequently encountered problems with privacy-focused guidance.',
      issues: {
        upload_failed: {
          problem: 'File upload fails',
          solutions: [
            'Check file format (CSV required)',
            'Verify file size (max 10MB)',
            'Ensure stable internet connection',
            'Try a different browser'
          ],
          privacy: 'Failed uploads are not stored and do not compromise privacy.'
        },
        forecast_error: {
          problem: 'Forecast generation fails',
          solutions: [
            'Check data quality (missing values, outliers)',
            'Verify date column format',
            'Reduce forecast horizon',
            'Simplify model configuration'
          ],
          privacy: 'Failed forecasts do not leave any data traces on our servers.'
        },
        performance_slow: {
          problem: 'Slow performance',
          solutions: [
            'Use smaller datasets',
            'Reduce MCMC samples',
            'Simplify seasonality settings',
            'Clear browser cache'
          ],
          privacy: 'Performance optimization maintains the same privacy protections.'
        }
      }
    },
    browser_compatibility: {
      title: 'Browser Compatibility',
      content: 'Ensure optimal performance and privacy across different browsers.',
      recommendations: [
        'Use modern browsers (Chrome, Firefox, Safari, Edge)',
        'Enable JavaScript for full functionality',
        'Allow cookies for preference storage',
        'Ensure sufficient memory for large datasets'
      ],
      privacy_features: [
        'Works in private/incognito mode',
        'No tracking or analytics',
        'Local processing when possible',
        'Secure HTTPS connections only'
      ],
      privacyNote: 'All browsers provide the same privacy protections with our system.'
    }
  }
}

/**
 * Contextual Help Service
 */
class ContextualHelpService {
  constructor() {
    this.currentContext = ref(null)
    this.isVisible = ref(false)
    this.preferences = reactive({
      showTooltips: true,
      autoShow: true,
      detailLevel: 'medium', // basic, medium, detailed
      privacyReminders: true
    })
    
    this.loadPreferences()
  }

  /**
   * Get help content for a specific topic
   */
  getHelp(category, topic) {
    return helpContent[category]?.[topic] || null
  }

  /**
   * Get all help for a category
   */
  getCategoryHelp(category) {
    return helpContent[category] || {}
  }

  /**
   * Search help content
   */
  searchHelp(query) {
    const results = []
    const searchTerm = query.toLowerCase()

    Object.entries(helpContent).forEach(([category, topics]) => {
      Object.entries(topics).forEach(([topicKey, topic]) => {
        const searchableText = `${topic.title} ${topic.content}`.toLowerCase()
        
        if (searchableText.includes(searchTerm)) {
          results.push({
            category,
            topicKey,
            topic,
            relevance: this.calculateRelevance(searchableText, searchTerm)
          })
        }
      })
    })

    return results.sort((a, b) => b.relevance - a.relevance)
  }

  /**
   * Show contextual help for current context
   */
  showContextualHelp(context) {
    this.currentContext.value = context
    this.isVisible.value = true
  }

  /**
   * Hide help
   */
  hideHelp() {
    this.isVisible.value = false
  }

  /**
   * Toggle help visibility
   */
  toggleHelp() {
    this.isVisible.value = !this.isVisible.value
  }

  /**
   * Get help suggestions based on current context
   */
  getContextualSuggestions(context) {
    const suggestions = []

    // Add relevant help topics based on context
    if (context.component === 'FileUpload') {
      suggestions.push(
        this.getHelp(HELP_CATEGORIES.DATA_UPLOAD, 'file_format'),
        this.getHelp(HELP_CATEGORIES.DATA_UPLOAD, 'file_size')
      )
    }

    if (context.component === 'ProphetConfig') {
      suggestions.push(
        this.getHelp(HELP_CATEGORIES.PROPHET_CONFIG, 'growth_modes'),
        this.getHelp(HELP_CATEGORIES.PROPHET_CONFIG, 'seasonality')
      )
    }

    if (context.hasErrors) {
      suggestions.push(
        this.getHelp(HELP_CATEGORIES.TROUBLESHOOTING, 'common_errors')
      )
    }

    return suggestions.filter(Boolean)
  }

  /**
   * Update preferences
   */
  updatePreferences(newPreferences) {
    Object.assign(this.preferences, newPreferences)
    this.savePreferences()
  }

  /**
   * Load preferences from browser storage
   */
  loadPreferences() {
    try {
      const stored = localStorage.getItem('prophet-help-preferences')
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.assign(this.preferences, parsed)
      }
    } catch (error) {
      console.warn('Failed to load help preferences:', error)
    }
  }

  /**
   * Save preferences to browser storage
   */
  savePreferences() {
    try {
      localStorage.setItem('prophet-help-preferences', JSON.stringify(this.preferences))
    } catch (error) {
      console.warn('Failed to save help preferences:', error)
    }
  }

  /**
   * Calculate search relevance score
   */
  calculateRelevance(text, searchTerm) {
    const titleMatch = text.includes(searchTerm) ? 10 : 0
    const wordMatches = searchTerm.split(' ').reduce((score, word) => {
      return score + (text.includes(word) ? 1 : 0)
    }, 0)
    
    return titleMatch + wordMatches
  }

  /**
   * Get business-friendly explanations for forecast components
   */
  getBusinessExplanation(component, value, context = {}) {
    const explanations = {
      trend: {
        positive: 'Your data shows an upward trend, indicating growth over time.',
        negative: 'Your data shows a downward trend, indicating decline over time.',
        flat: 'Your data shows a stable trend with little long-term change.'
      },
      yearly: {
        high: 'Strong yearly seasonal patterns detected (e.g., holiday effects, annual cycles).',
        medium: 'Moderate yearly seasonal patterns present.',
        low: 'Minimal yearly seasonal effects in your data.'
      },
      weekly: {
        high: 'Strong day-of-week patterns detected (e.g., weekday vs weekend differences).',
        medium: 'Moderate weekly patterns present.',
        low: 'Minimal weekly seasonal effects in your data.'
      },
      uncertainty: {
        high: 'High uncertainty indicates less predictable data. Consider more historical data or model adjustments.',
        medium: 'Moderate uncertainty is normal for most forecasts.',
        low: 'Low uncertainty indicates highly predictable patterns in your data.'
      }
    }

    const componentExplanations = explanations[component]
    if (!componentExplanations) return 'Component analysis available in detailed view.'

    // Determine value category
    let category = 'medium'
    if (Math.abs(value) > 0.7) category = 'high'
    else if (Math.abs(value) < 0.3) category = 'low'
    
    // For trend, determine direction
    if (component === 'trend') {
      if (value > 0.1) category = 'positive'
      else if (value < -0.1) category = 'negative'
      else category = 'flat'
    }

    return componentExplanations[category] || componentExplanations.medium
  }
}

// Create singleton instance
export const contextualHelpService = new ContextualHelpService()

/**
 * Vue composable for contextual help
 */
export function useContextualHelp() {
  return {
    // State
    currentContext: computed(() => contextualHelpService.currentContext.value),
    isVisible: computed(() => contextualHelpService.isVisible.value),
    preferences: computed(() => contextualHelpService.preferences),

    // Methods
    getHelp: contextualHelpService.getHelp.bind(contextualHelpService),
    getCategoryHelp: contextualHelpService.getCategoryHelp.bind(contextualHelpService),
    searchHelp: contextualHelpService.searchHelp.bind(contextualHelpService),
    showContextualHelp: contextualHelpService.showContextualHelp.bind(contextualHelpService),
    hideHelp: contextualHelpService.hideHelp.bind(contextualHelpService),
    toggleHelp: contextualHelpService.toggleHelp.bind(contextualHelpService),
    getContextualSuggestions: contextualHelpService.getContextualSuggestions.bind(contextualHelpService),
    updatePreferences: contextualHelpService.updatePreferences.bind(contextualHelpService),
    getBusinessExplanation: contextualHelpService.getBusinessExplanation.bind(contextualHelpService)
  }
}

export default contextualHelpService