import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Import Bootstrap CSS and Icons
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/main.css'

const app = createApp(App)

// Create Pinia store instance
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')