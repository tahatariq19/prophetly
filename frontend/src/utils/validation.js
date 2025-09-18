// Client-side validation utilities for privacy-compliant data handling

/**
 * File validation utilities
 */
export const fileValidation = {
  /**
   * Validate file type for CSV uploads
   */
  isValidCSV(file) {
    const validTypes = ['text/csv', 'application/csv', 'text/plain']
    const validExtensions = ['.csv', '.txt']
    
    const hasValidType = validTypes.includes(file.type)
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    return hasValidType || hasValidExtension
  },

  /**
   * Validate file size (max 10MB for privacy compliance)
   */
  isValidSize(file, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
  },

  /**
   * Get file size in human readable format
   */
  getFileSize(file) {
    const bytes = file.size
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Comprehensive file validation
   */
  validateFile(file) {
    const errors = []
    
    if (!file) {
      errors.push('No file selected')
      return { isValid: false, errors }
    }
    
    if (!this.isValidCSV(file)) {
      errors.push('Invalid file type. Please upload a CSV file.')
    }
    
    if (!this.isValidSize(file)) {
      errors.push(`File too large. Maximum size is 10MB. Your file is ${this.getFileSize(file)}.`)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        name: file.name,
        size: this.getFileSize(file),
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      }
    }
  }
}

/**
 * Prophet configuration validation
 */
export const prophetValidation = {
  /**
   * Validate forecast horizon
   */
  validateHorizon(horizon) {
    const errors = []
    
    if (!horizon || isNaN(horizon)) {
      errors.push('Horizon must be a number')
    } else if (horizon < 1) {
      errors.push('Horizon must be at least 1')
    } else if (horizon > 365) {
      errors.push('Horizon cannot exceed 365 days')
    }
    
    return { isValid: errors.length === 0, errors }
  },

  /**
   * Validate confidence interval
   */
  validateInterval(interval) {
    const errors = []
    
    if (!interval || isNaN(interval)) {
      errors.push('Interval width must be a number')
    } else if (interval <= 0 || interval >= 1) {
      errors.push('Interval width must be between 0 and 1')
    }
    
    return { isValid: errors.length === 0, errors }
  },

  /**
   * Validate changepoint prior scale
   */
  validateChangepointPriorScale(scale) {
    const errors = []
    
    if (!scale || isNaN(scale)) {
      errors.push('Changepoint prior scale must be a number')
    } else if (scale <= 0) {
      errors.push('Changepoint prior scale must be positive')
    } else if (scale > 0.5) {
      errors.push('Changepoint prior scale should not exceed 0.5')
    }
    
    return { isValid: errors.length === 0, errors }
  },

  /**
   * Validate seasonality prior scale
   */
  validateSeasonalityPriorScale(scale) {
    const errors = []
    
    if (!scale || isNaN(scale)) {
      errors.push('Seasonality prior scale must be a number')
    } else if (scale <= 0) {
      errors.push('Seasonality prior scale must be positive')
    }
    
    return { isValid: errors.length === 0, errors }
  },

  /**
   * Validate growth mode and capacity
   */
  validateGrowth(growth, cap = null, floor = null) {
    const errors = []
    const validGrowthModes = ['linear', 'logistic', 'flat']
    
    if (!validGrowthModes.includes(growth)) {
      errors.push('Growth mode must be linear, logistic, or flat')
    }
    
    if (growth === 'logistic') {
      if (!cap || isNaN(cap)) {
        errors.push('Logistic growth requires a carrying capacity (cap)')
      }
      
      if (floor !== null && floor !== undefined) {
        if (isNaN(floor)) {
          errors.push('Floor must be a number')
        } else if (cap && floor >= cap) {
          errors.push('Floor must be less than carrying capacity')
        }
      }
    }
    
    return { isValid: errors.length === 0, errors }
  },

  /**
   * Validate complete Prophet configuration
   */
  validateConfig(config) {
    const errors = []
    
    // Validate required fields
    const horizonValidation = this.validateHorizon(config.horizon)
    if (!horizonValidation.isValid) {
      errors.push(...horizonValidation.errors)
    }
    
    // Validate optional fields if present
    if (config.interval_width !== undefined) {
      const intervalValidation = this.validateInterval(config.interval_width)
      if (!intervalValidation.isValid) {
        errors.push(...intervalValidation.errors)
      }
    }
    
    if (config.changepoint_prior_scale !== undefined) {
      const changepointValidation = this.validateChangepointPriorScale(config.changepoint_prior_scale)
      if (!changepointValidation.isValid) {
        errors.push(...changepointValidation.errors)
      }
    }
    
    if (config.seasonality_prior_scale !== undefined) {
      const seasonalityValidation = this.validateSeasonalityPriorScale(config.seasonality_prior_scale)
      if (!seasonalityValidation.isValid) {
        errors.push(...seasonalityValidation.errors)
      }
    }
    
    if (config.growth !== undefined) {
      const growthValidation = this.validateGrowth(config.growth, config.cap, config.floor)
      if (!growthValidation.isValid) {
        errors.push(...growthValidation.errors)
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }
}

/**
 * Data validation utilities
 */
export const dataValidation = {
  /**
   * Validate CSV data structure for time series
   */
  validateTimeSeriesData(data) {
    const errors = []
    
    if (!Array.isArray(data) || data.length === 0) {
      errors.push('Data must be a non-empty array')
      return { isValid: false, errors }
    }
    
    // Check for required columns (ds and y)
    const firstRow = data[0]
    const columns = Object.keys(firstRow)
    
    const hasDateColumn = columns.some(col => 
      ['ds', 'date', 'timestamp', 'time'].includes(col.toLowerCase())
    )
    
    const hasValueColumn = columns.some(col => 
      ['y', 'value', 'target', 'sales', 'count'].includes(col.toLowerCase())
    )
    
    if (!hasDateColumn) {
      errors.push('Data must contain a date column (ds, date, timestamp, or time)')
    }
    
    if (!hasValueColumn) {
      errors.push('Data must contain a value column (y, value, target, sales, or count)')
    }
    
    // Check minimum data points
    if (data.length < 10) {
      errors.push('Time series must have at least 10 data points for forecasting')
    }
    
    // Check for missing values in key columns
    let missingDates = 0
    let missingValues = 0
    
    data.forEach((row) => {
      const dateValue = Object.values(row).find(val => 
        val && (typeof val === 'string' || val instanceof Date) && 
        !isNaN(Date.parse(val))
      )
      
      const numericValue = Object.values(row).find(val => 
        val !== null && val !== undefined && !isNaN(parseFloat(val))
      )
      
      if (!dateValue) missingDates++
      if (!numericValue) missingValues++
    })
    
    if (missingDates > data.length * 0.1) {
      errors.push(`Too many missing dates: ${missingDates} out of ${data.length} rows`)
    }
    
    if (missingValues > data.length * 0.1) {
      errors.push(`Too many missing values: ${missingValues} out of ${data.length} rows`)
    }
    
    return { 
      isValid: errors.length === 0, 
      errors,
      stats: {
        totalRows: data.length,
        columns: columns.length,
        missingDates,
        missingValues,
        completeness: ((data.length - Math.max(missingDates, missingValues)) / data.length * 100).toFixed(1)
      }
    }
  },

  /**
   * Detect column types automatically
   */
  detectColumnTypes(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { dateColumn: null, valueColumn: null, additionalColumns: [] }
    }
    
    const firstRow = data[0]
    const columns = Object.keys(firstRow)
    
    let dateColumn = null
    let valueColumn = null
    const additionalColumns = []
    
    // Detect date column
    for (const col of columns) {
      const colLower = col.toLowerCase()
      if (['ds', 'date', 'timestamp', 'time'].includes(colLower)) {
        dateColumn = col
        break
      }
    }
    
    // If no obvious date column, find first column with date-like values
    if (!dateColumn) {
      for (const col of columns) {
        const sampleValues = data.slice(0, 5).map(row => row[col])
        const dateValues = sampleValues.filter(val => 
          val && !isNaN(Date.parse(val))
        )
        
        if (dateValues.length >= 3) {
          dateColumn = col
          break
        }
      }
    }
    
    // Detect value column
    for (const col of columns) {
      const colLower = col.toLowerCase()
      if (['y', 'value', 'target', 'sales', 'count'].includes(colLower)) {
        valueColumn = col
        break
      }
    }
    
    // If no obvious value column, find first numeric column
    if (!valueColumn) {
      for (const col of columns) {
        if (col === dateColumn) continue
        
        const sampleValues = data.slice(0, 5).map(row => row[col])
        const numericValues = sampleValues.filter(val => 
          val !== null && val !== undefined && !isNaN(parseFloat(val))
        )
        
        if (numericValues.length >= 3) {
          valueColumn = col
          break
        }
      }
    }
    
    // Identify additional columns
    columns.forEach(col => {
      if (col !== dateColumn && col !== valueColumn) {
        additionalColumns.push(col)
      }
    })
    
    return {
      dateColumn,
      valueColumn,
      additionalColumns,
      confidence: {
        date: dateColumn ? 0.9 : 0.1,
        value: valueColumn ? 0.9 : 0.1
      }
    }
  }
}

/**
 * Form validation utilities
 */
export const formValidation = {
  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Validate required field
   */
  isRequired(value) {
    return value !== null && value !== undefined && value !== ''
  },

  /**
   * Validate numeric range
   */
  isInRange(value, min, max) {
    const num = parseFloat(value)
    return !isNaN(num) && num >= min && num <= max
  },

  /**
   * Validate string length
   */
  isValidLength(value, minLength = 0, maxLength = Infinity) {
    const str = String(value)
    return str.length >= minLength && str.length <= maxLength
  }
}