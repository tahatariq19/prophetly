<template>
  <div class="dashboard">
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body text-center">
            <h1 class="card-title">Prophet Web Interface</h1>
            <p class="card-text">Privacy-first time series forecasting</p>
            
            <!-- Privacy Notice -->
            <div class="alert alert-info">
              <strong>🔒 Privacy Notice:</strong> All data processing happens in memory only. 
              No data is stored on our servers.
            </div>
            
            <!-- API Status -->
            <div class="row mt-4">
              <div class="col-md-6 offset-md-3">
                <div class="card bg-light">
                  <div class="card-body">
                    <h5 class="card-title">System Status</h5>
                    <div v-if="apiStatus.loading" class="text-muted">
                      Checking API status...
                    </div>
                    <div v-else-if="apiStatus.healthy" class="text-success">
                      ✅ API is healthy and ready for privacy-first processing
                    </div>
                    <div v-else class="text-danger">
                      ❌ API is not responding
                    </div>
                    <small class="text-muted d-block mt-2">
                      Environment: {{ apiStatus.environment || 'Unknown' }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Getting Started -->
            <div class="row mt-4">
              <div class="col-12">
                <h3>Getting Started</h3>
                <p class="text-muted">
                  Upload your time series data and generate forecasts with Facebook Prophet
                </p>
                <button class="btn btn-primary btn-lg" disabled>
                  Upload Data (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { checkHealth } from '../services/api.js'

export default {
  name: 'Dashboard',
  data() {
    return {
      apiStatus: {
        loading: true,
        healthy: false,
        environment: null
      }
    }
  },
  async mounted() {
    await this.checkApiHealth()
  },
  methods: {
    async checkApiHealth() {
      try {
        const health = await checkHealth()
        this.apiStatus = {
          loading: false,
          healthy: health.status === 'healthy',
          environment: health.environment
        }
      } catch (error) {
        this.apiStatus = {
          loading: false,
          healthy: false,
          environment: null
        }
      }
    }
  }
}
</script>