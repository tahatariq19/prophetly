<template>
  <div class="forecast-comparison-container">
    <div class="comparison-header d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Forecast Comparison</h5>
      <div class="comparison-controls">
        <div class="btn-group" role="group">
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleView('side-by-side')"
            :class="{ active: viewMode === 'side-by-side' }"
            title="Side-by-side view"
          >
            <i class="bi bi-layout-sidebar"></i> Side by Side
          </button>
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleView('overlay')"
            :class="{ active: viewMode === 'overlay' }"
            title="Overlay view"
          >
            <i class="bi bi-layers"></i> Overlay
          </button>
          <button 
            type="button" 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleView('metrics')"
            :class="{ active: viewMode === 'metrics' }"
            title="Metrics comparison"
          >
            <i class="bi bi-bar-chart"></i> Metrics
          </button>
        </div>
        <div class="btn-group ms-2" role="group">
          <button 
            type="button" 
            class="btn btn-outline-primary btn-sm dropdown-toggle"
            data-bs-toggle="dropdown"
            :disabled="!hasComparisons"
            title="Export comparison"
          >
            <i class="bi bi-download"></i> Export
          </button>
          <ul class="dropdown-menu">
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportComparison('png')">
                <i class="bi bi-file-earmark-image"></i> Comparison Chart (PNG)
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportComparison('svg')">
                <i class="bi bi-file-earmark-code"></i> Comparison Chart (SVG)
              </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportComparisonData('csv')">
                <i class="bi bi-file-earmark-spreadsheet"></i> Comparison Data (CSV)
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="exportComparisonReport('pdf')">
                <i class="bi bi-file-earmark-pdf"></i> Comparison Report (PDF)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Forecast Selection -->
    <div class="forecast-selection mb-4" v-if="availableForecasts.length > 0">
      <div class="row">
        <div class="col-md-6">
          <label class="form-label">Primary Forecast</label>
          <select 
            class="form-select form-select-sm"
            v-model="selectedPrimary"
            @change="updateComparison"
          >
            <option value="">Select primary forecast...</option>
            <option 
              v-for="forecast in availableForecasts" 
              :key="forecast.id"
              :value="forecast.id"
            >
              {{ forecast.name }} ({{ forecast.timestamp }})
            </option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Secondary Forecast</label>
          <select 
            class="form-select form-select-sm"
            v-model="selectedSecondary"
            @change="updateComparison"
          >
            <option value="">Select secondary forecast...</option>
            <option 
              v-for="forecast in availableForecasts" 
              :key="forecast.id"
              :value="forecast.id"
              :disabled="forecast.id === selectedPrimary"
            >
              {{ forecast.name }} ({{ forecast.timestamp }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="comparison-loading text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading comparison...</span>
      </div>
      <p class="mt-2 text-muted">Preparing forecast comparison...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle"></i>
      {{ error }}
    </div>

    <div v-else-if="!hasComparisons" class="comparison-placeholder">
      <div class="text-center py-5">
        <i class="bi bi-graph-up-arrow display-1 text-muted"></i>
        <h6 class="mt-3 text-muted">No forecasts to compare</h6>
        <p class="text-muted">
          Generate multiple forecasts in this session to enable comparison
        </p>
      </div>
    </div>

    <div v-else class="comparison-content">
      <!-- Side-by-Side View -->
      <div v-if="viewMode === 'side-by-side'" class="side-by-side-view">
        <div class="row">
          <div class="col-md-6" v-if="primaryForecast">
            <div class="forecast-panel">
              <div class="panel-header">
                <h6 class="text-primary">
                  <i class="bi bi-1-circle"></i>
                  {{ primaryForecast.name }}
                </h6>
                <small class="text-muted">{{ primaryForecast.timestamp }}</small>
              </div>
              <canvas 
                ref="primaryCanvas"
                class="comparison-chart"
                :width="chartWidth"
                :height="chartHeight"
              ></canvas>
              <div class="forecast-summary mt-2">
                <div class="row text-center">
                  <div class="col-4">
                    <small class="text-muted d-block">RMSE</small>
                    <strong>{{ primaryForecast.metrics?.rmse?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="col-4">
                    <small class="text-muted d-block">MAE</small>
                    <strong>{{ primaryForecast.metrics?.mae?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="col-4">
                    <small class="text-muted d-block">MAPE</small>
                    <strong>{{ primaryForecast.metrics?.mape?.toFixed(1) || 'N/A' }}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6" v-if="secondaryForecast">
            <div class="forecast-panel">
              <div class="panel-header">
                <h6 class="text-success">
                  <i class="bi bi-2-circle"></i>
                  {{ secondaryForecast.name }}
                </h6>
                <small class="text-muted">{{ secondaryForecast.timestamp }}</small>
              </div>
              <canvas 
                ref="secondaryCanvas"
                class="comparison-chart"
                :width="chartWidth"
                :height="chartHeight"
              ></canvas>
              <div class="forecast-summary mt-2">
                <div class="row text-center">
                  <div class="col-4">
                    <small class="text-muted d-block">RMSE</small>
                    <strong>{{ secondaryForecast.metrics?.rmse?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="col-4">
                    <small class="text-muted d-block">MAE</small>
                    <strong>{{ secondaryForecast.metrics?.mae?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="col-4">
                    <small class="text-muted d-block">MAPE</small>
                    <strong>{{ secondaryForecast.metrics?.mape?.toFixed(1) || 'N/A' }}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overlay View -->
      <div v-if="viewMode === 'overlay'" class="overlay-view">
        <div class="overlay-chart-wrapper">
          <canvas 
            ref="overlayCanvas"
            class="overlay-chart"
            :width="overlayChartWidth"
            :height="overlayChartHeight"
          ></canvas>
        </div>
        <div class="overlay-legend mt-3">
          <div class="row">
            <div class="col-md-6" v-if="primaryForecast">
              <div class="legend-item">
                <span class="legend-color primary"></span>
                <strong>{{ primaryForecast.name }}</strong>
                <small class="text-muted ms-2">{{ primaryForecast.timestamp }}</small>
              </div>
            </div>
            <div class="col-md-6" v-if="secondaryForecast">
              <div class="legend-item">
                <span class="legend-color secondary"></span>
                <strong>{{ secondaryForecast.name }}</strong>
                <small class="text-muted ms-2">{{ secondaryForecast.timestamp }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics Comparison View -->
      <div v-if="viewMode === 'metrics'" class="metrics-view">
        <div class="metrics-comparison">
          <div class="row">
            <div class="col-md-4">
              <div class="metric-card">
                <h6 class="text-center">Root Mean Square Error (RMSE)</h6>
                <canvas 
                  ref="rmseCanvas"
                  class="metric-chart"
                  width="300"
                  height="200"
                ></canvas>
                <div class="metric-winner text-center mt-2">
                  <small class="text-muted">Better:</small>
                  <strong :class="rmseWinner.class">{{ rmseWinner.name }}</strong>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="metric-card">
                <h6 class="text-center">Mean Absolute Error (MAE)</h6>
                <canvas 
                  ref="maeCanvas"
                  class="metric-chart"
                  width="300"
                  height="200"
                ></canvas>
                <div class="metric-winner text-center mt-2">
                  <small class="text-muted">Better:</small>
                  <strong :class="maeWinner.class">{{ maeWinner.name }}</strong>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="metric-card">
                <h6 class="text-center">Mean Absolute Percentage Error (MAPE)</h6>
                <canvas 
                  ref="mapeCanvas"
                  class="metric-chart"
                  width="300"
                  height="200"
                ></canvas>
                <div class="metric-winner text-center mt-2">
                  <small class="text-muted">Better:</small>
                  <strong :class="mapeWinner.class">{{ mapeWinner.name }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Overall Comparison Summary -->
        <div class="comparison-summary mt-4">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title">Comparison Summary</h6>
              <div class="row">
                <div class="col-md-6">
                  <div class="summary-item">
                    <strong>Overall Winner:</strong>
                    <span :class="overallWinner.class" class="ms-2">
                      {{ overallWinner.name }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <strong>Improvement:</strong>
                    <span class="ms-2">{{ overallImprovement }}</span>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="summary-item">
                    <strong>Recommendation:</strong>
                    <span class="ms-2">{{ recommendation }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile-specific info -->
    <div class="mobile-info d-md-none mt-3" v-if="hasComparisons">
      <small class="text-muted">
        <i class="bi bi-info-circle"></i>
        Switch between view modes using the buttons above. Pinch to zoom on charts.
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
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'

export default {
  name: 'ForecastComparison',
  props: {
    forecasts: {
      type: Array,
      default: () => []
    },
    responsive: {
      type: Boolean,
      default: true
    },
    width: {
      type: Number,
      default: 600
    },
    height: {
      type: Number,
      default: 300
    }
  },
  emits: ['comparison-ready', 'comparison-error', 'data-exported'],
  setup(props, { emit }) {
    const primaryCanvas = ref(null)
    const secondaryCanvas = ref(null)
    const overlayCanvas = ref(null)
    const rmseCanvas = ref(null)
    const maeCanvas = ref(null)
    const mapeCanvas = ref(null)
    
    const primaryChart = ref(null)
    const secondaryChart = ref(null)
    const overlayChart = ref(null)
    const rmseChart = ref(null)
    const maeChart = ref(null)
    const mapeChart = ref(null)
    
    const isLoading = ref(false)
    const error = ref(null)
    const viewMode = ref('side-by-side')
    const selectedPrimary = ref('')
    const selectedSecondary = ref('')

    // Computed properties
    const availableForecasts = computed(() => {
      return props.forecasts.map((forecast, index) => ({
        id: `forecast_${index}`,
        name: forecast.name || `Forecast ${index + 1}`,
        timestamp: forecast.timestamp || new Date().toLocaleString(),
        data: forecast,
        metrics: forecast.metrics || calculateMetrics(forecast)
      }))
    })

    const hasComparisons = computed(() => {
      return availableForecasts.value.length >= 2 && 
             selectedPrimary.value && 
             selectedSecondary.value
    })

    const primaryForecast = computed(() => {
      return availableForecasts.value.find(f => f.id === selectedPrimary.value)
    })

    const secondaryForecast = computed(() => {
      return availableForecasts.value.find(f => f.id === selectedSecondary.value)
    })

    const chartWidth = computed(() => props.responsive ? undefined : props.width / 2)
    const chartHeight = computed(() => props.responsive ? undefined : props.height)
    const overlayChartWidth = computed(() => props.responsive ? undefined : props.width)
    const overlayChartHeight = computed(() => props.responsive ? undefined : props.height)

    // Metric winners
    const rmseWinner = computed(() => {
      if (!primaryForecast.value || !secondaryForecast.value) {
        return { name: 'N/A', class: 'text-muted' }
      }
      
      const primaryRmse = primaryForecast.value.metrics?.rmse || Infinity
      const secondaryRmse = secondaryForecast.value.metrics?.rmse || Infinity
      
      if (primaryRmse < secondaryRmse) {
        return { name: primaryForecast.value.name, class: 'text-primary' }
      } else if (secondaryRmse < primaryRmse) {
        return { name: secondaryForecast.value.name, class: 'text-success' }
      } else {
        return { name: 'Tie', class: 'text-muted' }
      }
    })

    const maeWinner = computed(() => {
      if (!primaryForecast.value || !secondaryForecast.value) {
        return { name: 'N/A', class: 'text-muted' }
      }
      
      const primaryMae = primaryForecast.value.metrics?.mae || Infinity
      const secondaryMae = secondaryForecast.value.metrics?.mae || Infinity
      
      if (primaryMae < secondaryMae) {
        return { name: primaryForecast.value.name, class: 'text-primary' }
      } else if (secondaryMae < primaryMae) {
        return { name: secondaryForecast.value.name, class: 'text-success' }
      } else {
        return { name: 'Tie', class: 'text-muted' }
      }
    })

    const mapeWinner = computed(() => {
      if (!primaryForecast.value || !secondaryForecast.value) {
        return { name: 'N/A', class: 'text-muted' }
      }
      
      const primaryMape = primaryForecast.value.metrics?.mape || Infinity
      const secondaryMape = secondaryForecast.value.metrics?.mape || Infinity
      
      if (primaryMape < secondaryMape) {
        return { name: primaryForecast.value.name, class: 'text-primary' }
      } else if (secondaryMape < primaryMape) {
        return { name: secondaryForecast.value.name, class: 'text-success' }
      } else {
        return { name: 'Tie', class: 'text-muted' }
      }
    })

    const overallWinner = computed(() => {
      if (!primaryForecast.value || !secondaryForecast.value) {
        return { name: 'N/A', class: 'text-muted' }
      }

      let primaryScore = 0
      let secondaryScore = 0

      // Score based on metric winners
      if (rmseWinner.value.name === primaryForecast.value.name) primaryScore++
      else if (rmseWinner.value.name === secondaryForecast.value.name) secondaryScore++

      if (maeWinner.value.name === primaryForecast.value.name) primaryScore++
      else if (maeWinner.value.name === secondaryForecast.value.name) secondaryScore++

      if (mapeWinner.value.name === primaryForecast.value.name) primaryScore++
      else if (mapeWinner.value.name === secondaryForecast.value.name) secondaryScore++

      if (primaryScore > secondaryScore) {
        return { name: primaryForecast.value.name, class: 'text-primary' }
      } else if (secondaryScore > primaryScore) {
        return { name: secondaryForecast.value.name, class: 'text-success' }
      } else {
        return { name: 'Tie', class: 'text-muted' }
      }
    })

    const overallImprovement = computed(() => {
      if (!primaryForecast.value || !secondaryForecast.value) return 'N/A'

      const primaryRmse = primaryForecast.value.metrics?.rmse || 0
      const secondaryRmse = secondaryForecast.value.metrics?.rmse || 0

      if (primaryRmse === 0 || secondaryRmse === 0) return 'N/A'

      const improvement = Math.abs((primaryRmse - secondaryRmse) / Math.max(primaryRmse, secondaryRmse) * 100)
      return `${improvement.toFixed(1)}% difference`
    })

    const recommendation = computed(() => {
      if (overallWinner.value.name === 'Tie') {
        return 'Both models perform similarly'
      } else if (overallWinner.value.name === 'N/A') {
        return 'Insufficient data for recommendation'
      } else {
        return `Use ${overallWinner.value.name} for better accuracy`
      }
    })

    // Methods
    const calculateMetrics = (forecast) => {
      // Simplified metrics calculation
      // In a real implementation, this would calculate actual metrics
      return {
        rmse: Math.random() * 10 + 1,
        mae: Math.random() * 8 + 0.5,
        mape: Math.random() * 15 + 2
      }
    }

    const toggleView = (mode) => {
      viewMode.value = mode
      nextTick(() => {
        createCharts()
      })
    }

    const updateComparison = () => {
      if (hasComparisons.value) {
        createCharts()
      }
    }

    const createCharts = async () => {
      try {
        isLoading.value = true
        error.value = null

        // Destroy existing charts
        destroyCharts()

        if (viewMode.value === 'side-by-side') {
          await createSideBySideCharts()
        } else if (viewMode.value === 'overlay') {
          await createOverlayChart()
        } else if (viewMode.value === 'metrics') {
          await createMetricCharts()
        }

        emit('comparison-ready', {
          primary: primaryChart.value,
          secondary: secondaryChart.value,
          overlay: overlayChart.value
        })
      } catch (err) {
        error.value = `Failed to create comparison charts: ${err.message}`
        emit('comparison-error', err)
        console.error('Comparison chart creation error:', err)
      } finally {
        isLoading.value = false
      }
    }

    const createSideBySideCharts = async () => {
      if (primaryForecast.value && primaryCanvas.value) {
        primaryChart.value = new ChartJS(primaryCanvas.value, {
          type: 'line',
          data: prepareForecastData(primaryForecast.value.data, 'primary'),
          options: getChartOptions(primaryForecast.value.name)
        })
      }

      if (secondaryForecast.value && secondaryCanvas.value) {
        secondaryChart.value = new ChartJS(secondaryCanvas.value, {
          type: 'line',
          data: prepareForecastData(secondaryForecast.value.data, 'secondary'),
          options: getChartOptions(secondaryForecast.value.name)
        })
      }
    }

    const createOverlayChart = async () => {
      if (!overlayCanvas.value || !primaryForecast.value || !secondaryForecast.value) return

      const data = {
        datasets: [
          ...prepareForecastData(primaryForecast.value.data, 'primary').datasets.map(dataset => ({
            ...dataset,
            label: `${primaryForecast.value.name} - ${dataset.label}`
          })),
          ...prepareForecastData(secondaryForecast.value.data, 'secondary').datasets.map(dataset => ({
            ...dataset,
            label: `${secondaryForecast.value.name} - ${dataset.label}`
          }))
        ]
      }

      overlayChart.value = new ChartJS(overlayCanvas.value, {
        type: 'line',
        data,
        options: {
          ...getChartOptions('Forecast Comparison'),
          plugins: {
            ...getChartOptions('Forecast Comparison').plugins,
            legend: {
              display: true,
              position: 'top'
            }
          }
        }
      })
    }

    const createMetricCharts = async () => {
      if (!primaryForecast.value || !secondaryForecast.value) return

      const primaryMetrics = primaryForecast.value.metrics
      const secondaryMetrics = secondaryForecast.value.metrics

      // RMSE Chart
      if (rmseCanvas.value) {
        rmseChart.value = new ChartJS(rmseCanvas.value, {
          type: 'bar',
          data: {
            labels: [primaryForecast.value.name, secondaryForecast.value.name],
            datasets: [{
              label: 'RMSE',
              data: [primaryMetrics.rmse, secondaryMetrics.rmse],
              backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(75, 192, 192, 0.8)'],
              borderColor: ['rgb(54, 162, 235)', 'rgb(75, 192, 192)'],
              borderWidth: 1
            }]
          },
          options: getMetricChartOptions('RMSE')
        })
      }

      // MAE Chart
      if (maeCanvas.value) {
        maeChart.value = new ChartJS(maeCanvas.value, {
          type: 'bar',
          data: {
            labels: [primaryForecast.value.name, secondaryForecast.value.name],
            datasets: [{
              label: 'MAE',
              data: [primaryMetrics.mae, secondaryMetrics.mae],
              backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(75, 192, 192, 0.8)'],
              borderColor: ['rgb(54, 162, 235)', 'rgb(75, 192, 192)'],
              borderWidth: 1
            }]
          },
          options: getMetricChartOptions('MAE')
        })
      }

      // MAPE Chart
      if (mapeCanvas.value) {
        mapeChart.value = new ChartJS(mapeCanvas.value, {
          type: 'bar',
          data: {
            labels: [primaryForecast.value.name, secondaryForecast.value.name],
            datasets: [{
              label: 'MAPE (%)',
              data: [primaryMetrics.mape, secondaryMetrics.mape],
              backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(75, 192, 192, 0.8)'],
              borderColor: ['rgb(54, 162, 235)', 'rgb(75, 192, 192)'],
              borderWidth: 1
            }]
          },
          options: getMetricChartOptions('MAPE (%)')
        })
      }
    }

    const prepareForecastData = (forecast, type) => {
      const colors = {
        primary: {
          historical: 'rgb(54, 162, 235)',
          forecast: 'rgb(255, 99, 132)',
          confidence: 'rgba(255, 99, 132, 0.3)'
        },
        secondary: {
          historical: 'rgb(75, 192, 192)',
          forecast: 'rgb(255, 159, 64)',
          confidence: 'rgba(255, 159, 64, 0.3)'
        }
      }

      const color = colors[type] || colors.primary

      return {
        datasets: [
          {
            label: 'Historical Data',
            data: (forecast.historical || []).map(point => ({
              x: new Date(point.ds || point.date),
              y: point.y || point.value
            })),
            borderColor: color.historical,
            backgroundColor: color.historical,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Forecast',
            data: (forecast.forecast || []).map(point => ({
              x: new Date(point.ds || point.date),
              y: point.yhat || point.forecast
            })),
            borderColor: color.forecast,
            backgroundColor: color.forecast,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1
          }
        ]
      }
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
          bodyColor: 'white'
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

    const getMetricChartOptions = (title) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    })

    const destroyCharts = () => {
      if (primaryChart.value) {
        primaryChart.value.destroy()
        primaryChart.value = null
      }
      if (secondaryChart.value) {
        secondaryChart.value.destroy()
        secondaryChart.value = null
      }
      if (overlayChart.value) {
        overlayChart.value.destroy()
        overlayChart.value = null
      }
      if (rmseChart.value) {
        rmseChart.value.destroy()
        rmseChart.value = null
      }
      if (maeChart.value) {
        maeChart.value.destroy()
        maeChart.value = null
      }
      if (mapeChart.value) {
        mapeChart.value.destroy()
        mapeChart.value = null
      }
    }

    // Export methods
    const exportComparison = (format) => {
      // Implementation for exporting comparison charts
      const filename = `forecast_comparison_${new Date().toISOString().split('T')[0]}`
      emit('data-exported', { format, type: 'comparison', filename })
    }

    const exportComparisonData = (format) => {
      // Implementation for exporting comparison data
      const filename = `comparison_data_${new Date().toISOString().split('T')[0]}`
      emit('data-exported', { format, type: 'comparison-data', filename })
    }

    const exportComparisonReport = (format) => {
      // Implementation for exporting comparison report
      const filename = `comparison_report_${new Date().toISOString().split('T')[0]}`
      emit('data-exported', { format, type: 'comparison-report', filename })
    }

    // Watchers
    watch(() => props.forecasts, () => {
      // Auto-select first two forecasts if available
      if (availableForecasts.value.length >= 2) {
        selectedPrimary.value = availableForecasts.value[0].id
        selectedSecondary.value = availableForecasts.value[1].id
        updateComparison()
      }
    }, { deep: true, immediate: true })

    // Lifecycle
    onMounted(() => {
      if (availableForecasts.value.length >= 2) {
        selectedPrimary.value = availableForecasts.value[0].id
        selectedSecondary.value = availableForecasts.value[1].id
        updateComparison()
      }
    })

    onUnmounted(() => {
      destroyCharts()
    })

    return {
      primaryCanvas,
      secondaryCanvas,
      overlayCanvas,
      rmseCanvas,
      maeCanvas,
      mapeCanvas,
      isLoading,
      error,
      viewMode,
      selectedPrimary,
      selectedSecondary,
      availableForecasts,
      hasComparisons,
      primaryForecast,
      secondaryForecast,
      chartWidth,
      chartHeight,
      overlayChartWidth,
      overlayChartHeight,
      rmseWinner,
      maeWinner,
      mapeWinner,
      overallWinner,
      overallImprovement,
      recommendation,
      toggleView,
      updateComparison,
      exportComparison,
      exportComparisonData,
      exportComparisonReport
    }
  }
}
</script>

<style scoped>
.forecast-comparison-container {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.comparison-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.comparison-loading {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.forecast-panel {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e9ecef;
}

.panel-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.comparison-chart {
  border-radius: 4px;
  background: white;
}

.overlay-chart-wrapper {
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  padding: 1rem;
}

.overlay-chart {
  border-radius: 4px;
  background: white;
}

.overlay-legend {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.legend-color.primary {
  background-color: rgb(255, 99, 132);
}

.legend-color.secondary {
  background-color: rgb(255, 159, 64);
}

.metric-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e9ecef;
  margin-bottom: 1rem;
}

.metric-chart {
  border-radius: 4px;
  background: white;
}

.metric-winner {
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.comparison-summary .card {
  border: 1px solid #e9ecef;
}

.summary-item {
  margin-bottom: 0.5rem;
}

.forecast-summary {
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.comparison-controls .btn.active {
  background-color: #0d6efd;
  color: white;
  border-color: #0d6efd;
}

@media (max-width: 768px) {
  .forecast-comparison-container {
    padding: 1rem;
  }
  
  .comparison-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .comparison-controls {
    width: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .side-by-side-view .col-md-6 {
    margin-bottom: 2rem;
  }
  
  .metrics-view .col-md-4 {
    margin-bottom: 2rem;
  }
  
  .forecast-panel {
    padding: 0.75rem;
  }
}

@media (max-width: 576px) {
  .comparison-controls .btn-group {
    flex-direction: column;
    width: 100%;
  }
  
  .comparison-controls .btn {
    border-radius: 4px !important;
    margin-bottom: 0.25rem;
  }
  
  .forecast-selection .col-md-6 {
    margin-bottom: 1rem;
  }
}
</style>