<template>
  <div class="mobile-forecast-chart">
    <!-- Mobile Chart Header -->
    <div class="mobile-chart-header">
      <h5 class="chart-title">
        <i class="bi bi-graph-up me-2"></i>
        Forecast Results
      </h5>
      <div class="privacy-indicator">
        <i class="bi bi-shield-check text-success"></i>
        <small>Session Only</small>
      </div>
    </div>

    <!-- Mobile Chart Controls -->
    <div class="mobile-chart-controls">
      <div class="control-row">
        <div class="control-group">
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="resetZoom"
            :disabled="!chartInstance"
            title="Reset zoom"
          >
            <i class="bi bi-arrow-clockwise"></i>
            <span class="d-none d-sm-inline ms-1">Reset</span>
          </button>
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleTooltips"
            :disabled="!chartInstance"
            :title="showTooltips ? 'Hide tooltips' : 'Show tooltips'"
          >
            <i class="bi bi-info-circle"></i>
            <span class="d-none d-sm-inline ms-1">Info</span>
          </button>
        </div>
        
        <div class="control-group">
          <div class="dropdown">
            <button 
              class="btn btn-primary btn-sm dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              :disabled="!chartInstance"
              title="Export options"
            >
              <i class="bi bi-download"></i>
              <span class="d-none d-sm-inline ms-1">Export</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <h6 class="dropdown-header">
                  <i class="bi bi-image me-1"></i>
                  Chart Images
                </h6>
              </li>
              <li>
                <a class="dropdown-item" href="#" @click.prevent="exportChart('png')">
                  <i class="bi bi-file-earmark-image me-2"></i>
                  PNG Image
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="#" @click.prevent="exportChart('svg')">
                  <i class="bi bi-file-earmark-code me-2"></i>
                  SVG Vector
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <h6 class="dropdown-header">
                  <i class="bi bi-table me-1"></i>
                  Data Files
                </h6>
              </li>
              <li>
                <a class="dropdown-item" href="#" @click.prevent="exportData('csv')">
                  <i class="bi bi-file-earmark-spreadsheet me-2"></i>
                  CSV Data
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="#" @click.prevent="exportData('json')">
                  <i class="bi bi-file-earmark-text me-2"></i>
                  JSON Data
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Chart Container -->
    <div class="mobile-chart-container" :class="{ 'loading': isLoading }">
      <!-- Loading State -->
      <div v-if="isLoading" class="chart-loading">
        <div class="loading-spinner">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading chart...</span>
          </div>
        </div>
        <h6 class="loading-title">Rendering Chart</h6>
        <p class="loading-message">Preparing your forecast visualization...</p>
        <div class="privacy-note">
          <i class="bi bi-shield-lock text-success"></i>
          <small>Processing in secure memory only</small>
        </div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="chart-error">
        <div class="error-icon">
          <i class="bi bi-exclamation-triangle text-danger"></i>
        </div>
        <h6 class="error-title">Chart Error</h6>
        <p class="error-message">{{ error }}</p>
        <button class="btn btn-outline-primary btn-sm" @click="retryChart">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Retry
        </button>
      </div>
      
      <!-- No Data State -->
      <div v-else-if="!hasData" class="chart-placeholder">
        <div class="placeholder-icon">
          <i class="bi bi-graph-up"></i>
        </div>
        <h6 class="placeholder-title">No Forecast Data</h6>
        <p class="placeholder-message">Generate a forecast to view the interactive chart</p>
        <button class="btn btn-primary btn-sm" @click="$emit('generate-forecast')">
          <i class="bi bi-play-fill me-1"></i>
          Generate Forecast
        </button>
      </div>
      
      <!-- Chart Canvas -->
      <div v-else class="chart-wrapper" ref="chartWrapper">
        <canvas 
          ref="chartCanvas"
          class="mobile-chart-canvas"
          :style="{ 
            width: '100%', 
            height: chartHeight + 'px',
            touchAction: 'pan-x pan-y'
          }"
        ></canvas>
        
        <!-- Mobile Chart Overlay Controls -->
        <div class="chart-overlay-controls" v-if="chartInstance">
          <button 
            class="overlay-btn"
            @click="toggleFullscreen"
            :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          >
            <i :class="isFullscreen ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Chart Info -->
    <div v-if="hasData && !isLoading" class="mobile-chart-info">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Data Points</div>
          <div class="info-value">{{ dataPointCount }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Forecast Horizon</div>
          <div class="info-value">{{ forecastHorizon }} periods</div>
        </div>
        <div class="info-item">
          <div class="info-label">Confidence</div>
          <div class="info-value">{{ confidenceLevel }}%</div>
        </div>
        <div class="info-item">
          <div class="info-label">Model Type</div>
          <div class="info-value">Prophet</div>
        </div>
      </div>
      
      <!-- Mobile Interaction Help -->
      <div class="interaction-help">
        <div class="help-item">
          <i class="bi bi-hand-index"></i>
          <span>Tap and drag to pan</span>
        </div>
        <div class="help-item">
          <i class="bi bi-zoom-in"></i>
          <span>Pinch to zoom</span>
        </div>
        <div class="help-item">
          <i class="bi bi-arrow-clockwise"></i>
          <span>Double tap to reset</span>
        </div>
      </div>
    </div>

    <!-- Mobile Legend -->
    <div v-if="hasData && !isLoading" class="mobile-legend">
      <div class="legend-title">Chart Legend</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color historical"></div>
          <span>Historical Data</span>
        </div>
        <div class="legend-item">
          <div class="legend-color forecast"></div>
          <span>Forecast</span>
        </div>
        <div class="legend-item">
          <div class="legend-color confidence"></div>
          <span>Confidence Interval</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import zoomPlugin from 'chartjs-plugin-zoom'
import { deviceDetection, touchUtils, mobileUI } from '@/utils/mobile'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  zoomPlugin
)

export default {
  name: 'MobileForecastChart',
  props: {
    forecastData: {
      type: Object,
      default: null
    },
    height: {
      type: Number,
      default: 300
    }
  },
  emits: ['chart-ready', 'chart-error', 'data-exported', 'generate-forecast'],
  setup(props, { emit }) {
    const chartCanvas = ref(null)
    const chartWrapper = ref(null)
    const chartInstance = ref(null)
    const isLoading = ref(false)
    const error = ref(null)
    const showTooltips = ref(true)
    const isFullscreen = ref(false)

    // Touch event cleanup
    let touchCleanup = null
    let resizeObserver = null

    // Computed properties
    const hasData = computed(() => {
      return props.forecastData && 
             props.forecastData.forecast && 
             props.forecastData.forecast.length > 0
    })

    const chartHeight = computed(() => {
      if (isFullscreen.value) {
        return window.innerHeight - 200 // Account for controls and info
      }
      return deviceDetection.isMobile() ? 250 : props.height
    })

    const dataPointCount = computed(() => {
      if (!hasData.value) return 0
      return props.forecastData.forecast.length
    })

    const forecastHorizon = computed(() => {
      if (!hasData.value) return 0
      const forecast = props.forecastData.forecast
      const historical = props.forecastData.historical || []
      return forecast.length - historical.length
    })

    const confidenceLevel = computed(() => {
      if (!hasData.value) return 95
      return props.forecastData.confidence_level || 95
    })

    // Chart configuration optimized for mobile
    const getMobileChartConfig = () => {
      if (!hasData.value) return null

      const data = prepareChartData()
      
      return {
        type: 'line',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: window.devicePixelRatio || 1,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            title: {
              display: false // Hide title on mobile to save space
            },
            legend: {
              display: false // Use custom mobile legend
            },
            tooltip: {
              enabled: showTooltips.value,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              titleColor: 'white',
              bodyColor: 'white',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                title: (context) => {
                  const date = new Date(context[0].parsed.x)
                  return date.toLocaleDateString()
                },
                label: (context) => {
                  const value = context.parsed.y
                  const label = context.dataset.label
                  return `${label}: ${value.toFixed(2)}`
                }
              }
            },
            zoom: {
              zoom: {
                wheel: {
                  enabled: !deviceDetection.isTouchDevice(),
                  speed: 0.1
                },
                pinch: {
                  enabled: deviceDetection.isTouchDevice()
                },
                mode: 'x'
              },
              pan: {
                enabled: true,
                mode: 'x',
                threshold: 10
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                displayFormats: {
                  day: 'MMM dd',
                  week: 'MMM dd',
                  month: 'MMM yyyy'
                }
              },
              title: {
                display: false // Hide axis titles on mobile
              },
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)',
                lineWidth: 1
              },
              ticks: {
                maxTicksLimit: deviceDetection.isMobile() ? 4 : 8,
                font: {
                  size: deviceDetection.isMobile() ? 10 : 12
                }
              }
            },
            y: {
              title: {
                display: false
              },
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)',
                lineWidth: 1
              },
              ticks: {
                maxTicksLimit: deviceDetection.isMobile() ? 5 : 8,
                font: {
                  size: deviceDetection.isMobile() ? 10 : 12
                }
              }
            }
          },
          elements: {
            point: {
              radius: deviceDetection.isMobile() ? 1 : 2,
              hoverRadius: deviceDetection.isMobile() ? 4 : 6
            },
            line: {
              borderWidth: deviceDetection.isMobile() ? 1.5 : 2,
              tension: 0.1
            }
          }
        }
      }
    }

    // Prepare chart data optimized for mobile viewing
    const prepareChartData = () => {
      if (!hasData.value) return null

      const { forecast, historical = [] } = props.forecastData
      
      // Reduce data points on mobile for better performance
      const shouldReduceData = deviceDetection.isMobile() && forecast.length > 100
      const step = shouldReduceData ? Math.ceil(forecast.length / 100) : 1
      
      const historicalData = historical
        .filter((_, index) => index % step === 0)
        .map(point => ({
          x: new Date(point.ds || point.date),
          y: point.y || point.value
        }))

      const forecastData = forecast
        .filter((_, index) => index % step === 0)
        .map(point => ({
          x: new Date(point.ds || point.date),
          y: point.yhat || point.forecast
        }))

      const upperBound = forecast
        .filter((_, index) => index % step === 0)
        .map(point => ({
          x: new Date(point.ds || point.date),
          y: point.yhat_upper || point.forecast_upper
        }))

      const lowerBound = forecast
        .filter((_, index) => index % step === 0)
        .map(point => ({
          x: new Date(point.ds || point.date),
          y: point.yhat_lower || point.forecast_lower
        }))

      return {
        datasets: [
          {
            label: 'Historical',
            data: historicalData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#3b82f6',
            fill: false,
            tension: 0.1
          },
          {
            label: 'Forecast',
            data: forecastData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ef4444',
            borderDash: [5, 5],
            fill: false,
            tension: 0.1
          },
          {
            label: 'Upper Bound',
            data: upperBound,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.1
          },
          {
            label: 'Lower Bound',
            data: lowerBound,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            pointRadius: 0,
            fill: false,
            tension: 0.1
          }
        ]
      }
    }

    // Create or update chart
    const createChart = async () => {
      if (!chartCanvas.value || !hasData.value) return

      try {
        isLoading.value = true
        error.value = null

        // Destroy existing chart
        if (chartInstance.value) {
          chartInstance.value.destroy()
          chartInstance.value = null
        }

        await nextTick()

        const config = getMobileChartConfig()
        if (!config) return

        chartInstance.value = new ChartJS(chartCanvas.value, config)
        
        // Add mobile-specific touch interactions
        if (deviceDetection.isTouchDevice()) {
          addMobileTouchInteractions()
        }
        
        emit('chart-ready', chartInstance.value)
      } catch (err) {
        error.value = `Failed to create chart: ${err.message}`
        emit('chart-error', err)
        console.error('Chart creation error:', err)
      } finally {
        isLoading.value = false
      }
    }

    // Add mobile touch interactions
    const addMobileTouchInteractions = () => {
      if (!chartCanvas.value || !chartInstance.value) return

      touchCleanup = touchUtils.addTouchListeners(chartCanvas.value, {
        onTap: (e) => {
          // Handle tap interactions
          const points = chartInstance.value.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true)
          if (points.length > 0) {
            // Show data point details
            const point = points[0]
            const datasetIndex = point.datasetIndex
            const index = point.index
            const dataset = chartInstance.value.data.datasets[datasetIndex]
            const value = dataset.data[index]
            
            mobileUI.showMobileToast(
              `${dataset.label}: ${value.y.toFixed(2)} on ${new Date(value.x).toLocaleDateString()}`,
              { type: 'info', duration: 2000 }
            )
          }
        },
        onLongPress: (e) => {
          // Show context menu on long press
          showMobileContextMenu(e)
        }
      })

      // Prevent double-tap zoom
      touchUtils.preventDoubleTabZoom(chartCanvas.value)
    }

    // Show mobile context menu
    const showMobileContextMenu = (e) => {
      const actions = `
        <button class="btn btn-outline-primary w-100 mb-2" onclick="this.closest('.mobile-modal').dispatchEvent(new CustomEvent('action', {detail: 'reset'}))">
          <i class="bi bi-arrow-clockwise me-2"></i>Reset Zoom
        </button>
        <button class="btn btn-outline-secondary w-100 mb-2" onclick="this.closest('.mobile-modal').dispatchEvent(new CustomEvent('action', {detail: 'export'}))">
          <i class="bi bi-download me-2"></i>Export Chart
        </button>
        <button class="btn btn-outline-info w-100" onclick="this.closest('.mobile-modal').dispatchEvent(new CustomEvent('action', {detail: 'fullscreen'}))">
          <i class="bi bi-arrows-fullscreen me-2"></i>Fullscreen
        </button>
      `

      const modal = mobileUI.createMobileModal('', {
        title: 'Chart Options',
        actions,
        dismissible: true
      })

      modal.element.addEventListener('action', (e) => {
        const action = e.detail
        switch (action) {
          case 'reset':
            resetZoom()
            break
          case 'export':
            exportChart('png')
            break
          case 'fullscreen':
            toggleFullscreen()
            break
        }
        modal.close()
      })
    }

    // Chart control methods
    const resetZoom = () => {
      if (chartInstance.value) {
        chartInstance.value.resetZoom()
        mobileUI.showMobileToast('Chart zoom reset', { type: 'success' })
      }
    }

    const toggleTooltips = () => {
      showTooltips.value = !showTooltips.value
      if (chartInstance.value) {
        chartInstance.value.options.plugins.tooltip.enabled = showTooltips.value
        chartInstance.value.update()
      }
    }

    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value
      
      if (isFullscreen.value) {
        chartWrapper.value?.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
      
      // Resize chart after fullscreen change
      setTimeout(() => {
        if (chartInstance.value) {
          chartInstance.value.resize()
        }
      }, 100)
    }

    const retryChart = () => {
      createChart()
    }

    // Export functionality
    const exportChart = (format) => {
      if (!chartInstance.value) return

      try {
        let dataUrl
        const filename = `forecast_chart_${new Date().toISOString().split('T')[0]}`

        if (format === 'png') {
          dataUrl = chartInstance.value.toBase64Image('image/png', 1.0)
          downloadFile(dataUrl, `${filename}.png`)
        } else if (format === 'svg') {
          const canvas = chartInstance.value.canvas
          const svgData = canvasToSVG(canvas)
          const blob = new Blob([svgData], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)
          downloadFile(url, `${filename}.svg`)
          URL.revokeObjectURL(url)
        }

        mobileUI.showMobileToast('Chart exported successfully', { type: 'success' })
        emit('data-exported', { format, filename })
      } catch (err) {
        error.value = `Failed to export chart: ${err.message}`
        mobileUI.showMobileToast('Export failed', { type: 'error' })
        console.error('Chart export error:', err)
      }
    }

    const exportData = (format) => {
      if (!hasData.value) return

      try {
        const filename = `forecast_data_${new Date().toISOString().split('T')[0]}`
        let content, mimeType

        if (format === 'csv') {
          content = convertToCSV(props.forecastData)
          mimeType = 'text/csv'
        } else if (format === 'json') {
          content = JSON.stringify(props.forecastData, null, 2)
          mimeType = 'application/json'
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        downloadFile(url, `${filename}.${format}`)
        URL.revokeObjectURL(url)

        mobileUI.showMobileToast('Data exported successfully', { type: 'success' })
        emit('data-exported', { format, filename })
      } catch (err) {
        error.value = `Failed to export data: ${err.message}`
        mobileUI.showMobileToast('Export failed', { type: 'error' })
        console.error('Data export error:', err)
      }
    }

    // Utility functions
    const downloadFile = (url, filename) => {
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    const canvasToSVG = (canvas) => {
      const { width, height } = canvas
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <img src="${canvas.toDataURL()}" width="${width}" height="${height}"/>
            </div>
          </foreignObject>
        </svg>
      `
    }

    const convertToCSV = (data) => {
      const { forecast, historical = [] } = data
      const headers = ['date', 'type', 'value', 'lower_bound', 'upper_bound']
      
      let csv = headers.join(',') + '\n'
      
      historical.forEach(point => {
        csv += [
          point.ds || point.date,
          'historical',
          point.y || point.value,
          '',
          ''
        ].join(',') + '\n'
      })
      
      forecast.forEach(point => {
        csv += [
          point.ds || point.date,
          'forecast',
          point.yhat || point.forecast,
          point.yhat_lower || point.forecast_lower || '',
          point.yhat_upper || point.forecast_upper || ''
        ].join(',') + '\n'
      })
      
      return csv
    }

    // Watchers
    watch(() => props.forecastData, () => {
      createChart()
    }, { deep: true })

    watch(chartHeight, () => {
      if (chartInstance.value) {
        chartInstance.value.resize()
      }
    })

    // Lifecycle
    onMounted(() => {
      if (hasData.value) {
        createChart()
      }

      // Set up resize observer for responsive behavior
      if (window.ResizeObserver && chartWrapper.value) {
        resizeObserver = new ResizeObserver(() => {
          if (chartInstance.value) {
            chartInstance.value.resize()
          }
        })
        resizeObserver.observe(chartWrapper.value)
      }

      // Handle fullscreen changes
      document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement
      })
    })

    onUnmounted(() => {
      if (chartInstance.value) {
        chartInstance.value.destroy()
        chartInstance.value = null
      }
      
      if (touchCleanup) {
        touchCleanup()
      }
      
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    })

    return {
      chartCanvas,
      chartWrapper,
      chartInstance,
      isLoading,
      error,
      showTooltips,
      isFullscreen,
      hasData,
      chartHeight,
      dataPointCount,
      forecastHorizon,
      confidenceLevel,
      resetZoom,
      toggleTooltips,
      toggleFullscreen,
      retryChart,
      exportChart,
      exportData
    }
  }
}
</script>

<style scoped>
.mobile-forecast-chart {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1rem;
}

/* Mobile Chart Header */
.mobile-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.chart-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #212529;
}

.privacy-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(25, 135, 84, 0.1);
  color: #198754;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Mobile Chart Controls */
.mobile-chart-controls {
  padding: 0.75rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid #dee2e6;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.control-group {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 6px;
}

/* Mobile Chart Container */
.mobile-chart-container {
  position: relative;
  background: #fafafa;
  min-height: 250px;
}

.mobile-chart-container.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading State */
.chart-loading {
  text-align: center;
  padding: 2rem 1rem;
}

.loading-spinner {
  margin-bottom: 1rem;
}

.loading-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #212529;
}

.loading-message {
  color: #6c757d;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.privacy-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(25, 135, 84, 0.1);
  border-radius: 6px;
  padding: 0.5rem;
  color: #198754;
}

/* Error State */
.chart-error {
  text-align: center;
  padding: 2rem 1rem;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #dc3545;
}

.error-message {
  color: #6c757d;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

/* No Data State */
.chart-placeholder {
  text-align: center;
  padding: 2rem 1rem;
}

.placeholder-icon {
  font-size: 3rem;
  color: #6c757d;
  margin-bottom: 1rem;
}

.placeholder-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #495057;
}

.placeholder-message {
  color: #6c757d;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

/* Chart Wrapper */
.chart-wrapper {
  position: relative;
  padding: 1rem;
}

.mobile-chart-canvas {
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Chart Overlay Controls */
.chart-overlay-controls {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;
}

.overlay-btn {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);
}

.overlay-btn:hover {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Mobile Chart Info */
.mobile-chart-info {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-item {
  text-align: center;
}

.info-label {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
}

/* Interaction Help */
.interaction-help {
  display: flex;
  justify-content: space-around;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.help-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.help-item i {
  font-size: 1rem;
  color: #0d6efd;
}

/* Mobile Legend */
.mobile-legend {
  padding: 1rem;
  background: white;
  border-top: 1px solid #dee2e6;
}

.legend-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #495057;
}

.legend-items {
  display: flex;
  justify-content: space-around;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #495057;
}

.legend-color {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.legend-color.historical {
  background: #3b82f6;
}

.legend-color.forecast {
  background: #ef4444;
}

.legend-color.confidence {
  background: rgba(239, 68, 68, 0.3);
}

/* Dropdown Enhancements */
.dropdown-menu {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0;
}

.dropdown-header {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  padding: 0.5rem 1rem 0.25rem;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  transition: background-color 0.15s ease;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

/* Responsive Adjustments */
@media (max-width: 576px) {
  .mobile-chart-header {
    padding: 0.75rem;
  }

  .chart-title {
    font-size: 1rem;
  }

  .mobile-chart-controls {
    padding: 0.5rem 0.75rem;
  }

  .control-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .control-group {
    width: 100%;
    justify-content: center;
  }

  .info-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .info-value {
    font-size: 0.9rem;
  }

  .interaction-help {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .help-item {
    flex-direction: row;
    gap: 0.5rem;
  }

  .legend-items {
    flex-direction: column;
    gap: 0.75rem;
  }

  .chart-loading,
  .chart-error,
  .chart-placeholder {
    padding: 1.5rem 1rem;
  }
}

/* Fullscreen Mode */
:fullscreen .mobile-chart-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

:fullscreen .chart-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dark Theme Support */
@media (prefers-color-scheme: dark) {
  .mobile-forecast-chart {
    background: #2d2d2d;
    color: #ffffff;
  }

  .mobile-chart-header,
  .mobile-chart-info,
  .mobile-legend {
    background: #3d3d3d;
    border-color: #495057;
  }

  .chart-title,
  .info-value {
    color: #ffffff;
  }

  .mobile-chart-canvas {
    background: #2d2d2d;
  }

  .overlay-btn {
    background: rgba(45, 45, 45, 0.9);
    border-color: #495057;
    color: #ffffff;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .mobile-forecast-chart {
    border: 2px solid #000;
  }

  .btn {
    border-width: 2px;
  }

  .legend-color {
    height: 4px;
    border: 1px solid #000;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .btn,
  .overlay-btn {
    transition: none;
  }
}
</style>