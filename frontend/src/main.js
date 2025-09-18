import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/main.css'

const app = createApp(App)

// Create Pinia store instance
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')