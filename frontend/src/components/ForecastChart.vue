<template>
  <div class="forecast-chart-container">
    <div class="chart-header d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Forecast Results</h5>
      <div class="chart-controls">
        <div class="btn-group" role="group">
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="resetZoom"
            :disabled="!chartInstance"
            title="Reset zoom"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleTooltips"
            :disabled="!chartInstance"
            :title="showTooltips ? 'Hide tooltips' : 'Show tooltips'"
          >
            <i class="bi bi-info-circle"></i>
          </button>
        </div>
        <div class="btn-group ms-2" role="group">
          <button 
            type="button" 
            class="btn btn-outline-primary btn-sm dropdown-toggle"
            data-bs-toggle="dropdown"
            :disabled="!chartInstance"
            title="Export chart"
          >
            <i class="bi bi-download"></i> Export
          </button>
          <ul class="dropdown-menu">
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportChart('png')">
                <i class="bi bi-file-earmark-image"></i> PNG Image
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportChart('svg')">
                <i class="bi bi-file-earmark-code"></i> SVG Vector
              </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportData('csv')">
                <i class="bi bi-file-earmark-spreadsheet"></i> CSV Data
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportData('json')">
                <i class="bi bi-file-earmark-text"></i> JSON Data
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="chart-wrapper" :class="{ 'loading': isLoading }">
      <div v-if="isLoading" class="chart-loading">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading chart...</span>
        </div>
        <p class="mt-2 text-muted">Rendering forecast chart...</p>
      </div>
      
      <div v-else-if="error" class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i>
        {{ error }}
      </div>
      
      <div v-else-if="!hasData" class="chart-placeholder">
        <div class="text-center py-5">
          <i class="bi bi-graph-up display-1 text-muted"></i>
          <h6 class="mt-3 text-muted">No forecast data available</h6>
          <p class="text-muted">Generate a forecast to view the interactive chart</p>
        </div>
      </div>
      
      <canvas 
        v-else
        ref="chartCanvas"
        :width="chartWidth"
        :height="chartHeight"
        class="forecast-chart"
      ></canvas>
    </div>

    <div v-if="hasData && !isLoading" class="chart-info mt-3">
      <div class="row">
        <div class="col-md-6">
          <small class="text-muted">
            <i class="bi bi-info-circle"></i>
            Use mouse wheel to zoom, drag to pan, double-click to reset
          </small>
        </div>
        <div class="col-md-6 text-end">
          <small class="text-muted">
            Data points: {{ dataPointCount }} | 
            Forecast horizon: {{ forecastHorizon }} periods
          </small>
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
  name: 'ForecastChart',
  props: {
    forecastData: {
      type: Object,
      default: null
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 400
    },
    responsive: {
      type: Boolean,
      default: true
    }
  },
  emits: ['chart-ready', 'chart-error', 'data-exported'],
  setup(props, { emit }) {
    const chartCanvas = ref(null)
    const chartInstance = ref(null)
    const isLoading = ref(false)
    const error = ref(null)
    const showTooltips = ref(true)

    // Computed properties
    const hasData = computed(() => {
      return props.forecastData && 
             props.forecastData.forecast && 
             props.forecastData.forecast.length > 0
    })

    const chartWidth = computed(() => props.responsive ? undefined : props.width)
    const chartHeight = computed(() => props.responsive ? undefined : props.height)

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

    // Chart configuration
    const getChartConfig = () => {
      if (!hasData.value) return null

      const data = prepareChartData()
      
      return {
        type: 'line',
        data,
        options: {
          responsive: props.responsive,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            title: {
              display: true,
              text: 'Time Series Forecast',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: showTooltips.value,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: 'white',
              bodyColor: 'white',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
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
                  enabled: true,
                  speed: 0.1
                },
                pinch: {
                  enabled: true
                },
                mode: 'x',
                onZoomComplete: () => {
                  // Optional: emit zoom event
                }
              },
              pan: {
                enabled: true,
                mode: 'x',
                onPanComplete: () => {
                  // Optional: emit pan event
                }
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
                display: true,
                text: 'Date'
              },
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Value'
              },
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          elements: {
            point: {
              radius: 2,
              hoverRadius: 6
            },
            line: {
              borderWidth: 2,
              tension: 0.1
            }
          }
        }
      }
    }

    // Prepare chart data from forecast results
    const prepareChartData = () => {
      if (!hasData.value) return null

      const { forecast, historical = [] } = props.forecastData
      
      // Separate historical and forecast data
      const historicalData = historical.map(point => ({
        x: new Date(point.ds || point.date),
        y: point.y || point.value
      }))

      const forecastData = forecast.map(point => ({
        x: new Date(point.ds || point.date),
        y: point.yhat || point.forecast
      }))

      // Confidence intervals
      const upperBound = forecast.map(point => ({
        x: new Date(point.ds || point.date),
        y: point.yhat_upper || point.forecast_upper
      }))

      const lowerBound = forecast.map(point => ({
        x: new Date(point.ds || point.date),
        y: point.yhat_lower || point.forecast_lower
      }))

      return {
        datasets: [
          {
            label: 'Historical Data',
            data: historicalData,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: 'rgb(54, 162, 235)',
            fill: false,
            tension: 0.1
          },
          {
            label: 'Forecast',
            data: forecastData,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: 'rgb(255, 99, 132)',
            borderDash: [5, 5],
            fill: false,
            tension: 0.1
          },
          {
            label: 'Confidence Interval',
            data: upperBound,
            borderColor: 'rgba(255, 99, 132, 0.3)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.1
          },
          {
            label: 'Lower Bound',
            data: lowerBound,
            borderColor: 'rgba(255, 99, 132, 0.3)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
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

        const config = getChartConfig()
        if (!config) return

        chartInstance.value = new ChartJS(chartCanvas.value, config)
        
        emit('chart-ready', chartInstance.value)
      } catch (err) {
        error.value = `Failed to create chart: ${err.message}`
        emit('chart-error', err)
        console.error('Chart creation error:', err)
      } finally {
        isLoading.value = false
      }
    }

    // Chart control methods
    const resetZoom = () => {
      if (chartInstance.value) {
        chartInstance.value.resetZoom()
      }
    }

    const toggleTooltips = () => {
      showTooltips.value = !showTooltips.value
      if (chartInstance.value) {
        chartInstance.value.options.plugins.tooltip.enabled = showTooltips.value
        chartInstance.value.update()
      }
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
          // For SVG, we need to convert canvas to SVG
          // This is a simplified approach - in production, consider using a library
          const canvas = chartInstance.value.canvas
          const svgData = canvasToSVG(canvas)
          const blob = new Blob([svgData], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)
          downloadFile(url, `${filename}.svg`)
          URL.revokeObjectURL(url)
        }

        emit('data-exported', { format, filename })
      } catch (err) {
        error.value = `Failed to export chart: ${err.message}`
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

        emit('data-exported', { format, filename })
      } catch (err) {
        error.value = `Failed to export data: ${err.message}`
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
      // Simplified SVG conversion - in production, use a proper library
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
      
      // Add historical data
      historical.forEach(point => {
        csv += [
          point.ds || point.date,
          'historical',
          point.y || point.value,
          '',
          ''
        ].join(',') + '\n'
      })
      
      // Add forecast data
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

    watch(showTooltips, () => {
      if (chartInstance.value) {
        chartInstance.value.options.plugins.tooltip.enabled = showTooltips.value
        chartInstance.value.update()
      }
    })

    // Lifecycle
    onMounted(() => {
      if (hasData.value) {
        createChart()
      }
    })

    onUnmounted(() => {
      if (chartInstance.value) {
        chartInstance.value.destroy()
        chartInstance.value = null
      }
    })

    return {
      chartCanvas,
      chartInstance,
      isLoading,
      error,
      showTooltips,
      hasData,
      chartWidth,
      chartHeight,
      dataPointCount,
      forecastHorizon,
      resetZoom,
      toggleTooltips,
      exportChart,
      exportData
    }
  }
}
</script>

<style scoped>
.forecast-chart-container {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-wrapper {
  position: relative;
  min-height: 400px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.chart-wrapper.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.chart-loading {
  text-align: center;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.forecast-chart {
  border-radius: 4px;
}

.chart-controls .btn {
  border-radius: 4px;
}

.chart-info {
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .forecast-chart-container {
    padding: 1rem;
  }
  
  .chart-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .chart-controls {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  
  .chart-info .row {
    text-align: center;
  }
  
  .chart-info .col-md-6:last-child {
    text-align: center !important;
    margin-top: 0.5rem;
  }
}
</style>