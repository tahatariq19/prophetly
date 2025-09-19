<template>
  <div class="results-page">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1>Forecast Results</h1>
          <p class="text-muted">Generate and view your forecasting results</p>
          
          <!-- Session Result Manager -->
          <SessionResultManager 
            @session-cleared="onSessionCleared"
            @session-restored="onSessionRestored"
            @session-extended="onSessionExtended"
            class="mb-4"
          />
          
          <!-- Forecast Execution Component -->
          <ForecastExecution 
            @forecast-completed="onForecastCompleted"
            @forecast-error="onForecastError"
            @forecast-cancelled="onForecastCancelled"
          />
          
          <!-- Forecast Chart Visualization -->
          <div v-if="sessionStore.hasResults" class="mt-4">
            <ForecastChart 
              :forecast-data="sessionStore.forecastResults"
              @chart-ready="onChartReady"
              @chart-error="onChartError"
              @data-exported="onDataExported"
            />
          </div>

          <!-- Component Decomposition Charts -->
          <div v-if="sessionStore.hasResults && hasComponentData" class="mt-4">
            <ComponentDecompositionCharts 
              :component-data="componentData"
              @charts-ready="onComponentChartsReady"
              @chart-error="onChartError"
              @data-exported="onDataExported"
            />
          </div>

          <!-- Forecast Comparison -->
          <div v-if="hasMultipleForecasts" class="mt-4">
            <ForecastComparison 
              :forecasts="forecastHistory"
              @comparison-ready="onComparisonReady"
              @comparison-error="onChartError"
              @data-exported="onDataExported"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useSessionStore } from '../stores/session'
import ForecastExecution from '../components/ForecastExecution.vue'
import SessionResultManager from '../components/SessionResultManager.vue'
import ForecastChart from '../components/ForecastChart.vue'
import ComponentDecompositionCharts from '../components/ComponentDecompositionCharts.vue'
import ForecastComparison from '../components/ForecastComparison.vue'

export default {
  name: 'Results',
  components: {
    ForecastExecution,
    SessionResultManager,
    ForecastChart,
    ComponentDecompositionCharts,
    ForecastComparison
  },
  setup() {
    const sessionStore = useSessionStore()
    
    // Computed properties for component data
    const hasComponentData = computed(() => {
      return sessionStore.forecastResults && 
             sessionStore.forecastResults.components &&
             (sessionStore.forecastResults.components.trend ||
              sessionStore.forecastResults.components.seasonal ||
              sessionStore.forecastResults.components.holidays)
    })
    
    const componentData = computed(() => {
      return sessionStore.forecastResults?.components || null
    })
    
    // Computed properties for forecast comparison
    const forecastHistory = computed(() => {
      // In a real implementation, this would come from a forecast history store
      // For now, we'll simulate multiple forecasts
      const results = sessionStore.forecastResults
      if (!results) return []
      
      return [
        {
          name: 'Current Forecast',
          timestamp: new Date().toLocaleString(),
          ...results,
          metrics: {
            rmse: 5.2,
            mae: 3.8,
            mape: 12.5
          }
        }
        // Additional forecasts would be added here from session history
      ]
    })
    
    const hasMultipleForecasts = computed(() => {
      return forecastHistory.value.length >= 2
    })
    
    const onForecastCompleted = (results) => {
      console.log('Forecast completed:', results)
      // Additional handling can be added here
    }
    
    const onForecastError = (error) => {
      console.error('Forecast error:', error)
      // Additional error handling can be added here
    }
    
    const onForecastCancelled = () => {
      console.log('Forecast cancelled')
      // Additional handling can be added here
    }
    
    const onSessionCleared = () => {
      console.log('Session cleared')
      // Additional handling can be added here
    }
    
    const onSessionRestored = (sessionData) => {
      console.log('Session restored:', sessionData)
      // Additional handling can be added here
    }
    
    const onSessionExtended = () => {
      console.log('Session extended')
      // Additional handling can be added here
    }
    
    const onChartReady = (chartInstance) => {
      console.log('Chart ready:', chartInstance)
      // Additional handling can be added here
    }
    
    const onChartError = (error) => {
      console.error('Chart error:', error)
      // Additional error handling can be added here
    }
    
    const onDataExported = (exportInfo) => {
      console.log('Data exported:', exportInfo)
      // Additional handling can be added here
    }
    
    const onComponentChartsReady = (charts) => {
      console.log('Component charts ready:', charts)
      // Additional handling can be added here
    }
    
    const onComparisonReady = (comparison) => {
      console.log('Comparison ready:', comparison)
      // Additional handling can be added here
    }
    
    return {
      sessionStore,
      onForecastCompleted,
      onForecastError,
      onForecastCancelled,
      onSessionCleared,
      onSessionRestored,
      onSessionExtended,
      onChartReady,
      onChartError,
      onDataExported,
      onComponentChartsReady,
      onComparisonReady,
      hasComponentData,
      componentData,
      hasMultipleForecasts,
      forecastHistory
    }
  }
}
</script>