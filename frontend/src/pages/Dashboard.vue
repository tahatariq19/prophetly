<template>
  <div class="dashboard">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-body text-center">
              <h1 class="card-title">Prophet Web Interface</h1>
              <p class="card-text">Privacy-first time series forecasting</p>
              
              <!-- Privacy Notice -->
              <div class="alert alert-info" v-if="!privacySettings.acceptedPrivacyNotice">
                <strong>🔒 Privacy Notice:</strong> All data processing happens in memory only. 
                No data is stored on our servers.
                <router-link to="/privacy" class="btn btn-sm btn-outline-primary ms-2">
                  Learn More
                </router-link>
              </div>
              
              <!-- Session Status -->
              <div class="row mt-4">
                <div class="col-md-8 offset-md-2">
                  <div class="row">
                    <!-- API Status -->
                    <div class="col-md-6">
                      <div class="card bg-light">
                        <div class="card-body">
                          <h5 class="card-title">API Status</h5>
                          <div v-if="!isApiHealthy" class="text-danger">
                            ❌ API not responding
                          </div>
                          <div v-else class="text-success">
                            ✅ Ready for processing
                          </div>
                          <small class="text-muted d-block mt-2">
                            Privacy Mode: {{ apiStatus.privacy || 'Stateless' }}
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Session Status -->
                    <div class="col-md-6">
                      <div class="card bg-light">
                        <div class="card-body">
                          <h5 class="card-title">Session Status</h5>
                          <div v-if="sessionSummary.hasData" class="text-success">
                            ✅ Data loaded ({{ sessionSummary.dataRows }} rows)
                          </div>
                          <div v-else class="text-muted">
                            📊 No data uploaded
                          </div>
                          <small class="text-muted d-block mt-2">
                            Session: {{ sessionSummary.sessionId ? 'Active' : 'None' }}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Quick Actions -->
              <div class="row mt-4">
                <div class="col-12">
                  <h3>Quick Actions</h3>
                  <div class="row mt-3">
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                      <div class="card h-100">
                        <div class="card-body text-center">
                          <h6>📊 Upload Data</h6>
                          <p class="text-muted small">
                            Upload your CSV time series data
                          </p>
                          <router-link 
                            to="/upload" 
                            class="btn btn-primary btn-sm"
                            :class="{ disabled: !privacySettings.acceptedPrivacyNotice }"
                          >
                            Upload
                          </router-link>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                      <div class="card h-100">
                        <div class="card-body text-center">
                          <h6>📋 Manage Data</h6>
                          <p class="text-muted small">
                            View data quality and column mapping
                          </p>
                          <router-link 
                            to="/data" 
                            class="btn btn-outline-primary btn-sm"
                            :class="{ disabled: !sessionSummary.hasData }"
                          >
                            Manage
                          </router-link>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                      <div class="card h-100">
                        <div class="card-body text-center">
                          <h6>⚙️ Configure</h6>
                          <p class="text-muted small">
                            Set up Prophet parameters
                          </p>
                          <router-link 
                            to="/configure" 
                            class="btn btn-outline-primary btn-sm"
                            :class="{ disabled: !sessionSummary.hasData }"
                          >
                            Configure
                          </router-link>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                      <div class="card h-100">
                        <div class="card-body text-center">
                          <h6>📈 Results</h6>
                          <p class="text-muted small">
                            View forecast results
                          </p>
                          <router-link 
                            to="/results" 
                            class="btn btn-outline-primary btn-sm"
                            :class="{ disabled: !sessionSummary.hasResults }"
                          >
                            Results
                          </router-link>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                      <div class="card h-100">
                        <div class="card-body text-center">
                          <h6>🔒 Privacy</h6>
                          <p class="text-muted small">
                            Learn about data protection
                          </p>
                          <router-link to="/privacy" class="btn btn-outline-info btn-sm">
                            Privacy
                          </router-link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- User Preferences -->
              <div class="row mt-4" v-if="privacySettings.acceptedPrivacyNotice">
                <div class="col-md-6 offset-md-3">
                  <div class="card">
                    <div class="card-body">
                      <h5 class="card-title">Preferences</h5>
                      <div class="row">
                        <div class="col-6">
                          <label class="form-label">Default Horizon</label>
                          <input 
                            type="number" 
                            class="form-control"
                            v-model.number="defaultHorizon"
                            min="1" 
                            max="365"
                            @change="updateDefaultHorizon"
                          >
                        </div>
                        <div class="col-6">
                          <label class="form-label">Preferred Mode</label>
                          <select 
                            class="form-select"
                            v-model="preferredMode"
                            @change="updatePreferredMode"
                          >
                            <option value="simple">Simple</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                      </div>
                      <small class="text-muted">
                        Preferences are stored in your browser cookies only
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import { useUserPreferencesStore } from '../stores/userPreferences'
import { useSessionStore } from '../stores/session'

export default {
  name: 'Dashboard',
  setup() {
    const appStore = useAppStore()
    const preferencesStore = useUserPreferencesStore()
    const sessionStore = useSessionStore()
    
    // Computed properties
    const isApiHealthy = computed(() => appStore.isApiHealthy)
    const apiStatus = computed(() => appStore.apiStatus)
    const privacySettings = computed(() => preferencesStore.privacySettings)
    const sessionSummary = computed(() => sessionStore.getSessionSummary())
    
    // Reactive preferences for form binding
    const defaultHorizon = ref(preferencesStore.defaultHorizon)
    const preferredMode = ref(preferencesStore.preferredMode)
    
    // Methods
    const updateDefaultHorizon = () => {
      preferencesStore.updateDefaultHorizon(defaultHorizon.value)
    }
    
    const updatePreferredMode = () => {
      preferencesStore.updatePreferredMode(preferredMode.value)
    }
    
    return {
      isApiHealthy,
      apiStatus,
      privacySettings,
      sessionSummary,
      defaultHorizon,
      preferredMode,
      updateDefaultHorizon,
      updatePreferredMode
    }
  }
}
</script>

<style scoped>
.dashboard .card {
  margin-bottom: 1rem;
}

.dashboard .card h5 {
  margin-bottom: 0.5rem;
}

.dashboard .btn.disabled {
  pointer-events: none;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .dashboard .col-md-3 {
    margin-bottom: 1rem;
  }
}
</style>