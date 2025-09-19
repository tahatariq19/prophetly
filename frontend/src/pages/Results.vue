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
          
          <!-- Results visualization will be implemented in task 10 -->
          <div class="card mt-4" v-if="sessionStore.hasResults">
            <div class="card-body text-center">
              <h5>Results Visualization Component</h5>
              <p class="text-muted">Interactive charts will be implemented in task 10</p>
              <button class="btn btn-outline-primary" disabled>
                View Charts (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useSessionStore } from '../stores/session'
import ForecastExecution from '../components/ForecastExecution.vue'
import SessionResultManager from '../components/SessionResultManager.vue'

export default {
  name: 'Results',
  components: {
    ForecastExecution,
    SessionResultManager
  },
  setup() {
    const sessionStore = useSessionStore()
    
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
    
    return {
      sessionStore,
      onForecastCompleted,
      onForecastError,
      onForecastCancelled,
      onSessionCleared,
      onSessionRestored,
      onSessionExtended
    }
  }
}
</script>