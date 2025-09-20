/**
 * Export Service - Privacy-focused results export system
 * Handles CSV/JSON data export, chart export, and comprehensive reports
 */

// Dynamic imports for optional dependencies
let jsPDF = null
let html2canvas = null

// Try to import dependencies, fallback gracefully if not available
try {
  const jsPDFModule = await import('jspdf')
  jsPDF = jsPDFModule.jsPDF
} catch (error) {
  console.warn('jsPDF not available - PDF export will be disabled')
}

try {
  const html2canvasModule = await import('html2canvas')
  html2canvas = html2canvasModule.default
} catch (error) {
  console.warn('html2canvas not available - chart export will be limited')
}

export class ExportService {
  constructor() {
    this.supportedFormats = {
      data: ['csv', 'json', 'xlsx'],
      charts: ['png', 'svg', 'pdf'],
      reports: ['pdf', 'html', 'json']
    }
  }

  /**
   * Export forecast data with metadata
   * Requirements: 5.1, 5.2
   */
  async exportForecastData(forecastResults, format = 'csv', options = {}) {
    if (!forecastResults || !forecastResults.forecast_data) {
      throw new Error('No forecast data available for export')
    }

    const metadata = this._generateMetadata(forecastResults, options)
    
    switch (format.toLowerCase()) {
      case 'csv':
        return this._exportToCsv(forecastResults, metadata, options)
      case 'json':
        return this._exportToJson(forecastResults, metadata, options)
      case 'xlsx':
        return this._exportToExcel(forecastResults, metadata, options)
      default:
        throw new Error(`Unsupported data format: ${format}`)
    }
  }

  /**
   * Export charts with annotations
   * Requirements: 5.3
   */
  async exportChart(chartElement, format = 'png', options = {}) {
    if (!chartElement) {
      throw new Error('Chart element not found')
    }

    const defaultOptions = {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff',
      scale: 2,
      annotations: [],
      title: 'Prophet Forecast Chart',
      ...options
    }

    switch (format.toLowerCase()) {
      case 'png':
        if (!html2canvas) {
          throw new Error('PNG export requires html2canvas library. Please install it: npm install html2canvas')
        }
        return this._exportChartToPng(chartElement, defaultOptions)
      case 'svg':
        return this._exportChartToSvg(chartElement, defaultOptions)
      case 'pdf':
        if (!jsPDF || !html2canvas) {
          throw new Error('PDF export requires jspdf and html2canvas libraries. Please install them: npm install jspdf html2canvas')
        }
        return this._exportChartToPdf(chartElement, defaultOptions)
      default:
        throw new Error(`Unsupported chart format: ${format}`)
    }
  }

  /**
   * Create comprehensive forecast report
   * Requirements: 5.4
   */
  async generateForecastReport(sessionData, format = 'pdf', options = {}) {
    const reportData = this._prepareReportData(sessionData, options)
    
    switch (format.toLowerCase()) {
      case 'pdf':
        return this._generatePdfReport(reportData, options)
      case 'html':
        return this._generateHtmlReport(reportData, options)
      case 'json':
        return this._generateJsonReport(reportData, options)
      default:
        throw new Error(`Unsupported report format: ${format}`)
    }
  }

  /**
   * Export configuration for reproducibility
   * Requirements: 8.7
   */
  exportConfiguration(config, includeMetadata = true) {
    const exportData = {
      configuration: config,
      export_info: {
        exported_at: new Date().toISOString(),
        version: '1.0.0',
        application: 'Prophet Web Interface',
        privacy_notice: 'This configuration contains no user data - safe to share'
      }
    }

    if (includeMetadata) {
      exportData.metadata = {
        parameters_count: Object.keys(config).length,
        has_custom_seasonalities: config.custom_seasonalities?.length > 0,
        has_holidays: !!config.holidays,
        has_regressors: config.regressors?.length > 0,
        growth_mode: config.growth,
        seasonality_mode: config.seasonality_mode
      }
    }

    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `prophet_config_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    }
  }

  // Private methods for data export

  _generateMetadata(forecastResults, options) {
    return {
      export_info: {
        exported_at: new Date().toISOString(),
        application: 'Prophet Web Interface',
        version: '1.0.0',
        privacy_notice: 'Data processed in memory only - no server storage'
      },
      forecast_metadata: {
        model_summary: forecastResults.model_summary || {},
        performance_metrics: forecastResults.performance_metrics || {},
        data_points: forecastResults.forecast_data?.length || 0,
        forecast_horizon: forecastResults.model_summary?.horizon || 0,
        confidence_interval: forecastResults.model_summary?.interval_width || 0.8
      },
      configuration: options.configuration || {},
      user_annotations: options.annotations || []
    }
  }

  _exportToCsv(forecastResults, metadata, options) {
    const { forecast_data, components } = forecastResults
    
    // Main forecast data
    const headers = ['date', 'actual', 'forecast', 'lower_bound', 'upper_bound']
    const rows = forecast_data.map(point => [
      point.ds,
      point.y || '',
      point.yhat,
      point.yhat_lower,
      point.yhat_upper
    ])

    let csvContent = ''
    
    // Add metadata as comments
    if (options.includeMetadata !== false) {
      csvContent += `# Prophet Forecast Export\n`
      csvContent += `# Exported: ${metadata.export_info.exported_at}\n`
      csvContent += `# Data Points: ${metadata.forecast_metadata.data_points}\n`
      csvContent += `# Forecast Horizon: ${metadata.forecast_metadata.forecast_horizon}\n`
      csvContent += `# Confidence Interval: ${metadata.forecast_metadata.confidence_interval}\n`
      csvContent += `#\n`
    }

    // Main data
    csvContent += headers.join(',') + '\n'
    csvContent += rows.map(row => row.join(',')).join('\n')

    // Add components if available
    if (components && options.includeComponents !== false) {
      csvContent += '\n\n# Component Decomposition\n'
      const componentHeaders = ['date', 'trend', 'seasonal', 'holidays', 'residual']
      csvContent += componentHeaders.join(',') + '\n'
      
      if (components.trend && components.trend.length > 0) {
        components.trend.forEach((point, index) => {
          const seasonal = components.seasonal?.[index]?.value || ''
          const holidays = components.holidays?.[index]?.value || ''
          const residual = components.residual?.[index]?.value || ''
          
          csvContent += [
            point.ds,
            point.value,
            seasonal,
            holidays,
            residual
          ].join(',') + '\n'
        })
      }
    }

    return {
      data: csvContent,
      filename: `forecast_data_${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    }
  }

  _exportToJson(forecastResults, metadata, options) {
    const exportData = {
      ...metadata,
      forecast_data: forecastResults.forecast_data,
      components: options.includeComponents !== false ? forecastResults.components : undefined,
      cross_validation: options.includeCrossValidation ? forecastResults.cross_validation : undefined
    }

    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `forecast_results_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    }
  }

  async _exportToExcel(forecastResults, metadata, options) {
    // Note: This would require a library like xlsx or exceljs
    // For now, we'll export as CSV with Excel-compatible format
    const csvExport = this._exportToCsv(forecastResults, metadata, options)
    return {
      ...csvExport,
      filename: csvExport.filename.replace('.csv', '.xlsx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }

  // Private methods for chart export

  async _exportChartToPng(chartElement, options) {
    try {
      const canvas = await html2canvas(chartElement, {
        width: options.width,
        height: options.height,
        backgroundColor: options.backgroundColor,
        scale: options.scale,
        useCORS: true,
        allowTaint: true
      })

      // Add annotations if provided
      if (options.annotations && options.annotations.length > 0) {
        this._addAnnotationsToCanvas(canvas, options.annotations)
      }

      return {
        data: canvas.toDataURL('image/png'),
        filename: `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`,
        mimeType: 'image/png'
      }
    } catch (error) {
      throw new Error(`Failed to export chart as PNG: ${error.message}`)
    }
  }

  async _exportChartToSvg(chartElement, options) {
    try {
      // For SVG export, we need to serialize the SVG elements
      const svgElements = chartElement.querySelectorAll('svg')
      if (svgElements.length === 0) {
        throw new Error('No SVG elements found in chart')
      }

      const svgElement = svgElements[0]
      const serializer = new XMLSerializer()
      let svgString = serializer.serializeToString(svgElement)

      // Add title and annotations
      if (options.title) {
        svgString = svgString.replace('<svg', `<svg><title>${options.title}</title>`)
      }

      return {
        data: svgString,
        filename: `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.svg`,
        mimeType: 'image/svg+xml'
      }
    } catch (error) {
      throw new Error(`Failed to export chart as SVG: ${error.message}`)
    }
  }

  async _exportChartToPdf(chartElement, options) {
    try {
      const canvas = await html2canvas(chartElement, {
        width: options.width,
        height: options.height,
        backgroundColor: options.backgroundColor,
        scale: options.scale
      })

      const pdf = new jsPDF({
        orientation: options.width > options.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [options.width, options.height + 100] // Extra space for title
      })

      // Add title
      if (options.title) {
        pdf.setFontSize(16)
        pdf.text(options.title, 20, 30)
      }

      // Add chart
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 10, 50, options.width - 20, options.height - 20)

      // Add annotations
      if (options.annotations && options.annotations.length > 0) {
        pdf.setFontSize(10)
        let yPos = options.height + 70
        options.annotations.forEach(annotation => {
          pdf.text(annotation, 20, yPos)
          yPos += 15
        })
      }

      return {
        data: pdf.output('datauristring'),
        filename: `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        mimeType: 'application/pdf'
      }
    } catch (error) {
      throw new Error(`Failed to export chart as PDF: ${error.message}`)
    }
  }

  _addAnnotationsToCanvas(canvas, annotations) {
    const ctx = canvas.getContext('2d')
    ctx.font = '12px Arial'
    ctx.fillStyle = '#333333'
    
    annotations.forEach((annotation, index) => {
      const y = canvas.height - 20 - (index * 15)
      ctx.fillText(annotation, 10, y)
    })
  }

  // Private methods for report generation

  _prepareReportData(sessionData, options) {
    return {
      title: options.title || 'Prophet Forecast Report',
      generated_at: new Date().toISOString(),
      session_summary: {
        session_id: sessionData.sessionId,
        data_points: sessionData.uploadedData?.length || 0,
        forecast_horizon: sessionData.forecastConfig?.horizon || 0,
        model_type: sessionData.forecastConfig?.growth || 'linear'
      },
      configuration: sessionData.forecastConfig || {},
      results: sessionData.forecastResults || {},
      performance_metrics: sessionData.forecastResults?.performance_metrics || {},
      user_comments: options.comments || [],
      privacy_notice: 'This report contains no personally identifiable information. All data was processed in memory only.',
      ...options.additionalData
    }
  }

  async _generatePdfReport(reportData, options) {
    if (!jsPDF) {
      throw new Error('PDF generation requires jspdf library. Please install it: npm install jspdf')
    }
    
    const pdf = new jsPDF()
    let yPos = 20

    // Title
    pdf.setFontSize(20)
    pdf.text(reportData.title, 20, yPos)
    yPos += 30

    // Summary
    pdf.setFontSize(14)
    pdf.text('Forecast Summary', 20, yPos)
    yPos += 20

    pdf.setFontSize(10)
    const summaryLines = [
      `Generated: ${new Date(reportData.generated_at).toLocaleString()}`,
      `Data Points: ${reportData.session_summary.data_points}`,
      `Forecast Horizon: ${reportData.session_summary.forecast_horizon} periods`,
      `Model Type: ${reportData.session_summary.model_type}`,
      `Session ID: ${reportData.session_summary.session_id?.slice(-8) || 'N/A'}`
    ]

    summaryLines.forEach(line => {
      pdf.text(line, 20, yPos)
      yPos += 15
    })

    // Configuration
    yPos += 20
    pdf.setFontSize(14)
    pdf.text('Model Configuration', 20, yPos)
    yPos += 20

    pdf.setFontSize(10)
    const configLines = [
      `Growth Mode: ${reportData.configuration.growth || 'linear'}`,
      `Seasonality Mode: ${reportData.configuration.seasonality_mode || 'additive'}`,
      `Yearly Seasonality: ${reportData.configuration.yearly_seasonality || 'auto'}`,
      `Weekly Seasonality: ${reportData.configuration.weekly_seasonality || 'auto'}`,
      `Daily Seasonality: ${reportData.configuration.daily_seasonality || 'auto'}`,
      `Confidence Interval: ${(reportData.configuration.interval_width || 0.8) * 100}%`
    ]

    configLines.forEach(line => {
      pdf.text(line, 20, yPos)
      yPos += 15
    })

    // Performance Metrics
    if (reportData.performance_metrics && Object.keys(reportData.performance_metrics).length > 0) {
      yPos += 20
      pdf.setFontSize(14)
      pdf.text('Performance Metrics', 20, yPos)
      yPos += 20

      pdf.setFontSize(10)
      Object.entries(reportData.performance_metrics).forEach(([metric, value]) => {
        pdf.text(`${metric.toUpperCase()}: ${typeof value === 'number' ? value.toFixed(4) : value}`, 20, yPos)
        yPos += 15
      })
    }

    // User Comments
    if (reportData.user_comments && reportData.user_comments.length > 0) {
      yPos += 20
      pdf.setFontSize(14)
      pdf.text('Comments & Annotations', 20, yPos)
      yPos += 20

      pdf.setFontSize(10)
      reportData.user_comments.forEach(comment => {
        const lines = pdf.splitTextToSize(comment, 170)
        lines.forEach(line => {
          pdf.text(line, 20, yPos)
          yPos += 15
        })
        yPos += 5
      })
    }

    // Privacy Notice
    yPos += 20
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    const privacyLines = pdf.splitTextToSize(reportData.privacy_notice, 170)
    privacyLines.forEach(line => {
      pdf.text(line, 20, yPos)
      yPos += 10
    })

    return {
      data: pdf.output('datauristring'),
      filename: `forecast_report_${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf'
    }
  }

  _generateHtmlReport(reportData, options) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .privacy-notice { font-size: 0.8em; color: #666; margin-top: 40px; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${reportData.title}</h1>
        <p>Generated: ${new Date(reportData.generated_at).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Forecast Summary</h2>
        <div class="metric">Data Points: <strong>${reportData.session_summary.data_points}</strong></div>
        <div class="metric">Forecast Horizon: <strong>${reportData.session_summary.forecast_horizon} periods</strong></div>
        <div class="metric">Model Type: <strong>${reportData.session_summary.model_type}</strong></div>
        <div class="metric">Session ID: <strong>${reportData.session_summary.session_id?.slice(-8) || 'N/A'}</strong></div>
    </div>

    <div class="section">
        <h2>Model Configuration</h2>
        <table>
            <tr><th>Parameter</th><th>Value</th></tr>
            <tr><td>Growth Mode</td><td>${reportData.configuration.growth || 'linear'}</td></tr>
            <tr><td>Seasonality Mode</td><td>${reportData.configuration.seasonality_mode || 'additive'}</td></tr>
            <tr><td>Yearly Seasonality</td><td>${reportData.configuration.yearly_seasonality || 'auto'}</td></tr>
            <tr><td>Weekly Seasonality</td><td>${reportData.configuration.weekly_seasonality || 'auto'}</td></tr>
            <tr><td>Daily Seasonality</td><td>${reportData.configuration.daily_seasonality || 'auto'}</td></tr>
            <tr><td>Confidence Interval</td><td>${(reportData.configuration.interval_width || 0.8) * 100}%</td></tr>
        </table>
    </div>

    ${Object.keys(reportData.performance_metrics).length > 0 ? `
    <div class="section">
        <h2>Performance Metrics</h2>
        ${Object.entries(reportData.performance_metrics).map(([metric, value]) => 
          `<div class="metric">${metric.toUpperCase()}: <strong>${typeof value === 'number' ? value.toFixed(4) : value}</strong></div>`
        ).join('')}
    </div>
    ` : ''}

    ${reportData.user_comments && reportData.user_comments.length > 0 ? `
    <div class="section">
        <h2>Comments & Annotations</h2>
        <ul>
            ${reportData.user_comments.map(comment => `<li>${comment}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="privacy-notice">
        <strong>Privacy Notice:</strong> ${reportData.privacy_notice}
    </div>
</body>
</html>`

    return {
      data: html,
      filename: `forecast_report_${new Date().toISOString().split('T')[0]}.html`,
      mimeType: 'text/html'
    }
  }

  _generateJsonReport(reportData, options) {
    return {
      data: JSON.stringify(reportData, null, 2),
      filename: `forecast_report_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    }
  }

  /**
   * Utility method to trigger file download
   */
  downloadFile(exportResult) {
    const { data, filename, mimeType } = exportResult
    
    let blob
    if (data.startsWith('data:')) {
      // Handle data URLs (from canvas/PDF)
      const byteCharacters = atob(data.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      blob = new Blob([byteArray], { type: mimeType })
    } else {
      // Handle text data
      blob = new Blob([data], { type: mimeType })
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Export singleton instance
export const exportService = new ExportService()