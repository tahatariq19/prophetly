<template>
  <div class="privacy-page">
    <div class="container">
      <div class="row">
        <div class="col-lg-8 offset-lg-2">
          <h1>Privacy Policy</h1>
          <p class="lead">Learn about our privacy-first approach to time series forecasting</p>
          
          <div class="card">
            <div class="card-body">
              <h3>🔒 Privacy-First Design</h3>
              <p>
                The Prophet Web Interface is designed with privacy as the core principle. 
                We guarantee that your data is never stored on our servers.
              </p>
              
              <h4>How We Protect Your Data</h4>
              <ul>
                <li><strong>Memory-Only Processing:</strong> All data processing happens in server memory and is immediately discarded</li>
                <li><strong>No Persistent Storage:</strong> We never write your data to disk, databases, or any storage system</li>
                <li><strong>Session-Based:</strong> Data exists only during your active session and is automatically cleared</li>
                <li><strong>No Logging:</strong> Your data is never logged or cached on our servers</li>
                <li><strong>Browser Storage Only:</strong> Preferences are stored only in your browser cookies and local storage</li>
              </ul>
              
              <h4>What We Store</h4>
              <p>We only store non-sensitive preferences in your browser:</p>
              <ul>
                <li>Interface theme preferences</li>
                <li>Default forecasting parameters</li>
                <li>Chart display preferences</li>
                <li>Notification settings</li>
              </ul>
              
              <h4>Data Continuity</h4>
              <p>
                Since we don't store your data, you can download your datasets and configurations 
                to continue work later. This gives you complete control over your data.
              </p>
              
              <div class="alert alert-success mt-4">
                <h5>✅ Privacy Guarantee</h5>
                <p class="mb-0">
                  Your uploaded data is processed entirely in memory and automatically 
                  discarded when your session ends. We have no ability to access or 
                  store your data permanently.
                </p>
              </div>
              
              <div class="mt-4" v-if="!privacySettings.acceptedPrivacyNotice">
                <h4>Accept Privacy Policy</h4>
                <p>
                  By accepting this privacy policy, you acknowledge that you understand 
                  our privacy-first approach and agree to use the service.
                </p>
                <button 
                  class="btn btn-primary btn-lg"
                  @click="acceptPrivacy"
                >
                  Accept Privacy Policy
                </button>
              </div>
              
              <div class="mt-4" v-else>
                <div class="alert alert-info">
                  <strong>✅ Privacy Policy Accepted</strong><br>
                  You have accepted our privacy policy. You can continue using the service.
                </div>
                <router-link 
                  :to="returnPath" 
                  class="btn btn-primary"
                >
                  Continue to {{ returnPath === '/' ? 'Dashboard' : 'Upload' }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useUserPreferencesStore } from '../stores/userPreferences'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

export default {
  name: 'Privacy',
  setup() {
    const preferencesStore = useUserPreferencesStore()
    const router = useRouter()
    const route = useRoute()
    
    const privacySettings = computed(() => preferencesStore.privacySettings)
    const returnPath = computed(() => route.query.returnTo || '/')
    
    const acceptPrivacy = () => {
      preferencesStore.acceptPrivacyNotice()
      
      // Redirect to return path or dashboard
      router.push(returnPath.value)
    }
    
    return {
      privacySettings,
      returnPath,
      acceptPrivacy
    }
  }
}
</script>