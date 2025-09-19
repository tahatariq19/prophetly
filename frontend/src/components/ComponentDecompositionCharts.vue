<template>
  <div class="component-decomposition-container">
    <div class="decomposition-header d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Forecast Components</h5>
      <div class="decomposition-controls">
        <div class="btn-group" role="group">
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleComponent('trend')"
            :class="{ active: visibleComponents.trend }"
            title="Toggle trend component"
          >
            <i class="bi bi-graph-up"></i> Trend
          </button>
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleComponent('seasonal')"
            :class="{ active: visibleComponents.seasonal }"
            title="Toggle seasonal component"
          >
            <i class="bi bi-arrow-repeat"></i> Seasonal
          </button>
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleComponent('holidays')"
            :class="{ active: visibleComponents.holidays }"
            v-if="hasHolidays"
            title="Toggle holiday effects"
          >
            <i class="bi bi-calendar-event"></i> Holidays
          </button>
        </div>
        <div class="btn-group ms-2" role="group">
          <button 
            type="button" 
            class="btn btn-outline-primary btn-sm dropdown-toggle"
            data-bs-toggle="dropdown"
            :disabled="!hasComponents"
            title="Export components"
          >
            <i class="bi bi-download"></i> Export
          </button>
          <ul class="dropdown-menu">
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportAllCharts('png')">
                <i class="bi bi-file-earmark-image"></i> All Charts (PNG)
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportAllCharts('svg')">
                <i class="bi bi-file-earmark-code"></i> All Charts (SVG)
              </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportComponentData('csv')">
                <i class="bi bi-file-earmark-spreadsheet"></i> Component Data (CSV)
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportComponentData('json')">
                <i class="bi bi-file-earmark-text"></i> Component Data (JSON)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="decomposition-loading text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading components...</span>
      </div>
      <p class="mt-2 text-muted">Analyzing forecast components...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle"></i>
      {{ error }}
    </div>

    <div v-else-if="!hasComponents" class="decomposition-placeholder">
      <div class="text-center py-5">
        <i class="bi bi-pie-chart display-1 text-muted"></i>
        <h6 class="mt-3 text-muted">No component data available</h6>
        <p class="text-muted">Generate a forecast with component analysis to view decomposition charts</p>
      </div>
    </div>

    <div v-else class="decomposition-charts">
      <!-- Trend Component Chart -->
      <div 
        v-if="visibleComponents.trend && trendData" 
        class="component-chart-wrapper mb-4"
        ref="trendChartWrapper"
      >
        <div class="component-chart-header d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0">
            <i class="bi bi-graph-up text-primary"></i>
            Trend Component
          </h6>
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="exportSingleChart('trend', 'png')"
            title="Export trend chart"
          >
            <i class="bi bi-download"></i>
          </button>
        </div>
        <canvas 
          ref="trendCanvas"
          class="component-chart"
          :width="chartWidth"
          :height="componentChartHeight"
        ></canvas>
        <small class="text-muted d-block mt-2">
          Shows the underlying long-term direction of the time series
        </small>
      </div>

      <!-- Seasonal Component Chart -->
      <div 
        v-if="visibleComponents.seasonal && seasonalData" 
        class="component-chart-wrapper mb-4"
        ref="seasonalChartWrapper"
      >
        <div class="component-chart-header d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0">
            <i class="bi bi-arrow-repeat text-success"></i>
            Seasonal Component
          </h6>
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="exportSingleChart('seasonal', 'png')"
            title="Export seasonal chart"
          >
            <i class="bi bi-download"></i>
          </button>
        </div>
        <canvas 
          ref="seasonalCanvas"
          class="component-chart"
          :width="chartWidth"
          :height="componentChartHeight"
        ></canvas>
        <small class="text-muted d-block mt-2">
          Shows repeating patterns (daily, weekly, yearly seasonality)
        </small>
      </div>

      <!-- Holiday Effects Chart -->
      <div 
        v-if="visibleComponents.holidays && holidayData && hasHolidays" 
        class="component-chart-wrapper mb-4"
        ref="holidayChartWrapper"
      >
        <div class="component-chart-header d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0">
            <i class="bi bi-calendar-event text-warning"></i>
            Holiday Effects
          </h6>
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="exportSingleChart('holidays', 'png')"
            title="Export holiday chart"
          >
            <i class="bi bi-download"></i>
          </button>
        </div>
        <canvas 
          ref="holidayCanvas"
          class="component-chart"
          :width="chartWidth"
          :height="componentChartHeight"
        ></canvas>
        <small class="text-muted d-block mt-2">
          Shows the impact of holidays and special events on the forecast
        </small>
      </div>

      <!-- Component Summary -->
      <div class="component-summary mt-4">
        <div class="row">
          <div class="col-md-4" v-if="trendData">
            <div class="summary-card">
              <h6 class="text-primary">Trend</h6>
              <p class="mb-1">
                <strong>Direction:</strong> 
                <span :class="trendDirection.class">{{ trendDirection.text }}</span>
              </p>
              <p class="mb-0">
                <strong>Change:</strong> {{ trendChange }}
              </p>
            </div>
          </div>
          <div class="col-md-4" v-if="seasonalData">
            <div class="summary-card">
              <h6 class="text-success">Seasonality</h6>
              <p class="mb-1">
                <strong>Strength:</strong> {{ seasonalStrength }}
              </p>
              <p class="mb-0">
                <strong>Peak Period:</strong> {{ seasonalPeak }}
              </p>
            </div>
          </div>
          <div class="col-md-4" v-if="hasHolidays">
            <div class="summary-card">
              <h6 class="text-warning">Holidays</h6>
              <p class="mb-1">
                <strong>Impact:</strong> {{ holidayImpact }}
              </p>
              <p class="mb-0">
                <strong>Events:</strong> {{ holidayCount }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile-specific info -->
    <div class="mobile-info d-md-none mt-3" v-if="hasComponents">
      <small class="text-muted">
        <i class="bi bi-info-circle"></i>
        Tap component buttons above to show/hide charts. Pinch to zoom on charts.
      </small>
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

export default {
  name: 'ComponentDecompositionCharts',
  props: {
    componentData: {
      type: Object,
      default: null
    },
    responsive: {
      type: Boolean,
      default: true
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 250
    }
  },
  emits: ['charts-ready', 'chart-error', 'data-exported'],
  setup(props, { emit }) {
    const trendCanvas = ref(null)
    const seasonalCanvas = ref(null)
    const holidayCanvas = ref(null)
    const trendChart = ref(null)
    const seasonalChart = ref(null)
    const holidayChart = ref(null)
    const isLoading = ref(false)
    const error = ref(null)

    // Component visibility state
    const visibleComponents = ref({
      trend: true,
      seasonal: true,
      holidays: true
    })

    // Computed properties
    const hasComponents = computed(() => {
      return props.componentData && 
             (props.componentData.trend || 
              props.componentData.seasonal || 
              props.componentData.holidays)
    })

    const trendData = computed(() => props.componentData?.trend)
    const seasonalData = computed(() => props.componentData?.seasonal)
    const holidayData = computed(() => props.componentData?.holidays)
    const hasHolidays = computed(() => holidayData.value && holidayData.value.length > 0)

    const chartWidth = computed(() => props.responsive ? undefined : props.width)
    const componentChartHeight = computed(() => props.responsive ? undefined : props.height)

    // Component analysis
    const trendDirection = computed(() => {
      if (!trendData.value || trendData.value.length < 2) {
        return { text: 'Unknown', class: 'text-muted' }
      }
      
      const firstValue = trendData.value[0].value || trendData.value[0].y
      const lastValue = trendData.value[trendData.value.length - 1].value || trendData.value[trendData.value.length - 1].y
      
      if (lastValue > firstValue * 1.05) {
        return { text: 'Increasing', class: 'text-success' }
      } else if (lastValue < firstValue * 0.95) {
        return { text: 'Decreasing', class: 'text-danger' }
      } else {
        return { text: 'Stable', class: 'text-info' }
      }
    })

    const trendChange = computed(() => {
      if (!trendData.value || trendData.value.length < 2) return 'N/A'
      
      const firstValue = trendData.value[0].value || trendData.value[0].y
      const lastValue = trendData.value[trendData.value.length - 1].value || trendData.value[trendData.value.length - 1].y
      const change = ((lastValue - firstValue) / firstValue * 100).toFixed(1)
      
      return `${change > 0 ? '+' : ''}${change}%`
    })

    const seasonalStrength = computed(() => {
      if (!seasonalData.value) return 'N/A'
      
      const values = seasonalData.value.map(d => Math.abs(d.value || d.y))
      const maxValue = Math.max(...values)
      
      if (maxValue > 10) return 'Strong'
      if (maxValue > 5) return 'Moderate'
      if (maxValue > 1) return 'Weak'
      return 'Minimal'
    })

    const seasonalPeak = computed(() => {
      if (!seasonalData.value) return 'N/A'
      
      // This is a simplified implementation
      // In a real scenario, you'd analyze the seasonal patterns more thoroughly
      return 'Varies by pattern'
    })

    const holidayImpact = computed(() => {
      if (!holidayData.value) return 'N/A'
      
      const values = holidayData.value.map(d => Math.abs(d.value || d.y))
      const avgImpact = values.reduce((a, b) => a + b, 0) / values.length
      
      if (avgImpact > 5) return 'High'
      if (avgImpact > 2) return 'Moderate'
      return 'Low'
    })

    const holidayCount = computed(() => {
      if (!holidayData.value) return 0
      return holidayData.value.filter(d => Math.abs(d.value || d.y) > 0.1).length
    })

    // Chart creation methods
    const createTrendChart = async () => {
      if (!trendCanvas.value || !trendData.value) return

      const data = {
        datasets: [{
          label: 'Trend',
          data: trendData.value.map(point => ({
            x: new Date(point.ds || point.date),
            y: point.trend || point.value || point.y
          })),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      }

      const config = {
        type: 'line',
        data,
        options: getChartOptions('Trend Component')
      }

      if (trendChart.value) {
        trendChart.value.destroy()
      }

      trendChart.value = new ChartJS(trendCanvas.value, config)
    }

    const createSeasonalChart = async () => {
      if (!seasonalCanvas.value || !seasonalData.value) return

      const data = {
        datasets: [{
          label: 'Seasonal',
          data: seasonalData.value.map(point => ({
            x: new Date(point.ds || point.date),
            y: point.seasonal || point.value || point.y
          })),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          fill: true,
          tension: 0.4
        }]
      }

      const config = {
        type: 'line',
        data,
        options: getChartOptions('Seasonal Component')
      }

      if (seasonalChart.value) {
        seasonalChart.value.destroy()
      }

      seasonalChart.value = new ChartJS(seasonalCanvas.value, config)
    }

    const createHolidayChart = async () => {
      if (!holidayCanvas.value || !holidayData.value) return

      const data = {
        datasets: [{
          label: 'Holiday Effects',
          data: holidayData.value.map(point => ({
            x: new Date(point.ds || point.date),
            y: point.holidays || point.value || point.y
          })),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: (context) => {
            // Highlight significant holiday effects
            const value = Math.abs(context.parsed.y)
            return value > 1 ? 4 : 2
          }
        }]
      }

      const config = {
        type: 'line',
        data,
        options: getChartOptions('Holiday Effects')
      }

      if (holidayChart.value) {
        holidayChart.value.destroy()
      }

      holidayChart.value = new ChartJS(holidayCanvas.value, config)
    }

    const getChartOptions = (title) => ({
      responsive: props.responsive,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x)
              return date.toLocaleDateString()
            },
            label: (context) => {
              const value = context.parsed.y
              return `${title}: ${value.toFixed(3)}`
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
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y: {
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      elements: {
        point: {
          radius: 2,
          hoverRadius: 4
        },
        line: {
          borderWidth: 2
        }
      }
    })

    // Control methods
    const toggleComponent = (component) => {
      visibleComponents.value[component] = !visibleComponents.value[component]
      
      // Recreate charts after visibility change
      nextTick(() => {
        createCharts()
      })
    }

    const createCharts = async () => {
      try {
        isLoading.value = true
        error.value = null

        if (visibleComponents.value.trend && trendData.value) {
          await createTrendChart()
        }
        
        if (visibleComponents.value.seasonal && seasonalData.value) {
          await createSeasonalChart()
        }
        
        if (visibleComponents.value.holidays && holidayData.value) {
          await createHolidayChart()
        }

        emit('charts-ready', {
          trend: trendChart.value,
          seasonal: seasonalChart.value,
          holiday: holidayChart.value
        })
      } catch (err) {
        error.value = `Failed to create component charts: ${err.message}`
        emit('chart-error', err)
        console.error('Component chart creation error:', err)
      } finally {
        isLoading.value = false
      }
    }

    // Export methods
    const exportSingleChart = (component, format) => {
      let chart
      let filename = `forecast_${component}_${new Date().toISOString().split('T')[0]}`

      switch (component) {
        case 'trend':
          chart = trendChart.value
          break
        case 'seasonal':
          chart = seasonalChart.value
          break
        case 'holidays':
          chart = holidayChart.value
          break
        default:
          return
      }

      if (!chart) return

      try {
        if (format === 'png') {
          const dataUrl = chart.toBase64Image('image/png', 1.0)
          downloadFile(dataUrl, `${filename}.png`)
        } else if (format === 'svg') {
          const canvas = chart.canvas
          const svgData = canvasToSVG(canvas)
          const blob = new Blob([svgData], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)
          downloadFile(url, `${filename}.svg`)
          URL.revokeObjectURL(url)
        }

        emit('data-exported', { format, component, filename })
      } catch (err) {
        error.value = `Failed to export ${component} chart: ${err.message}`
        console.error('Chart export error:', err)
      }
    }

    const exportAllCharts = (format) => {
      const activeCharts = []
      
      if (visibleComponents.value.trend && trendChart.value) {
        exportSingleChart('trend', format)
        activeCharts.push('trend')
      }
      
      if (visibleComponents.value.seasonal && seasonalChart.value) {
        exportSingleChart('seasonal', format)
        activeCharts.push('seasonal')
      }
      
      if (visibleComponents.value.holidays && holidayChart.value) {
        exportSingleChart('holidays', format)
        activeCharts.push('holidays')
      }

      emit('data-exported', { 
        format, 
        type: 'all-components', 
        components: activeCharts,
        filename: `forecast_components_${new Date().toISOString().split('T')[0]}`
      })
    }

    const exportComponentData = (format) => {
      if (!hasComponents.value) return

      try {
        const filename = `forecast_components_${new Date().toISOString().split('T')[0]}`
        let content, mimeType

        if (format === 'csv') {
          content = convertComponentsToCSV()
          mimeType = 'text/csv'
        } else if (format === 'json') {
          content = JSON.stringify(props.componentData, null, 2)
          mimeType = 'application/json'
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        downloadFile(url, `${filename}.${format}`)
        URL.revokeObjectURL(url)

        emit('data-exported', { format, type: 'component-data', filename })
      } catch (err) {
        error.value = `Failed to export component data: ${err.message}`
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

    const convertComponentsToCSV = () => {
      const headers = ['date', 'trend', 'seasonal', 'holidays']
      let csv = headers.join(',') + '\n'

      // Assuming all components have the same date range
      const dates = trendData.value?.map(d => d.ds || d.date) || 
                   seasonalData.value?.map(d => d.ds || d.date) || 
                   holidayData.value?.map(d => d.ds || d.date) || []

      dates.forEach((date, index) => {
        const trend = trendData.value?.[index]?.trend || trendData.value?.[index]?.value || ''
        const seasonal = seasonalData.value?.[index]?.seasonal || seasonalData.value?.[index]?.value || ''
        const holidays = holidayData.value?.[index]?.holidays || holidayData.value?.[index]?.value || ''
        
        csv += [date, trend, seasonal, holidays].join(',') + '\n'
      })

      return csv
    }

    // Watchers
    watch(() => props.componentData, () => {
      if (hasComponents.value) {
        createCharts()
      }
    }, { deep: true })

    // Lifecycle
    onMounted(() => {
      if (hasComponents.value) {
        createCharts()
      }
    })

    onUnmounted(() => {
      if (trendChart.value) trendChart.value.destroy()
      if (seasonalChart.value) seasonalChart.value.destroy()
      if (holidayChart.value) holidayChart.value.destroy()
    })

    return {
      trendCanvas,
      seasonalCanvas,
      holidayCanvas,
      isLoading,
      error,
      visibleComponents,
      hasComponents,
      trendData,
      seasonalData,
      holidayData,
      hasHolidays,
      chartWidth,
      componentChartHeight,
      trendDirection,
      trendChange,
      seasonalStrength,
      seasonalPeak,
      holidayImpact,
      holidayCount,
      toggleComponent,
      exportSingleChart,
      exportAllCharts,
      exportComponentData
    }
  }
}
</script>

<style scoped>
.component-decomposition-container {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.component-chart-wrapper {
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  padding: 1rem;
}

.component-chart {
  border-radius: 4px;
}

.decomposition-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.decomposition-loading {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.summary-card {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 1rem;
  border-left: 4px solid #dee2e6;
}

.summary-card h6 {
  margin-bottom: 0.5rem;
}

.summary-card p {
  font-size: 0.875rem;
}

.decomposition-controls .btn.active {
  background-color: #0d6efd;
  color: white;
  border-color: #0d6efd;
}

.component-chart-header h6 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .component-decomposition-container {
    padding: 1rem;
  }
  
  .decomposition-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .decomposition-controls {
    width: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .component-chart-wrapper {
    padding: 0.75rem;
  }
  
  .component-chart-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .summary-card {
    margin-bottom: 1rem;
  }
}

@media (max-width: 576px) {
  .decomposition-controls .btn-group {
    flex-direction: column;
    width: 100%;
  }
  
  .decomposition-controls .btn {
    border-radius: 4px !important;
    margin-bottom: 0.25rem;
  }
}
</style>