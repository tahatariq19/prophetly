import { createRouter, createWebHistory } from 'vue-router'
import { useUserPreferencesStore } from '../stores/userPreferences'

// Lazy-loaded components for better performance
const Dashboard = () => import('../pages/Dashboard.vue')
const Upload = () => import('../pages/Upload.vue')
const DataManagement = () => import('../pages/DataManagement.vue')
const Configure = () => import('../pages/Configure.vue')
const Results = () => import('../pages/Results.vue')
const Privacy = () => import('../pages/Privacy.vue')

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard - Prophet Web Interface',
      description: 'Privacy-first time series forecasting dashboard'
    }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: Upload,
    meta: {
      title: 'Upload Data - Prophet Web Interface',
      description: 'Upload your time series data for forecasting',
      requiresPrivacyAcceptance: true
    }
  },
  {
    path: '/data',
    name: 'DataManagement',
    component: DataManagement,
    meta: {
      title: 'Data Management - Prophet Web Interface',
      description: 'Manage your session data with privacy-first controls',
      requiresPrivacyAcceptance: true
    }
  },
  {
    path: '/configure',
    name: 'Configure',
    component: Configure,
    meta: {
      title: 'Configure Model - Prophet Web Interface',
      description: 'Configure Prophet forecasting parameters',
      requiresData: true
    }
  },
  {
    path: '/results',
    name: 'Results',
    component: Results,
    meta: {
      title: 'Forecast Results - Prophet Web Interface',
      description: 'View and export your forecasting results',
      requiresResults: true
    }
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: Privacy,
    meta: {
      title: 'Privacy Policy - Prophet Web Interface',
      description: 'Learn about our privacy-first approach'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards for privacy and data requirements
router.beforeEach((to, from, next) => {
  // Update document title
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // Update meta description
  if (to.meta.description) {
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', to.meta.description)
    }
  }

  // Check privacy acceptance requirement
  if (to.meta.requiresPrivacyAcceptance) {
    const preferencesStore = useUserPreferencesStore()
    if (!preferencesStore.privacySettings.acceptedPrivacyNotice) {
      // Redirect to privacy page with return path
      next({
        name: 'Privacy',
        query: { returnTo: to.fullPath }
      })
      return
    }
  }

  // Check data requirement (will be implemented when session store is available)
  if (to.meta.requiresData) {
    // This will be enhanced when we have session data checking
    // For now, just proceed
  }

  // Check results requirement
  if (to.meta.requiresResults) {
    // This will be enhanced when we have results checking
    // For now, just proceed
  }

  next()
})

export default router