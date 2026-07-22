import { createApp } from 'vue'

import './styles/tokens.css'
import { applyTvScale } from './utils/tvScale'
import App from './App.vue'

// Apply root rem scale before first paint when possible (CSS clamp already in tokens)
applyTvScale()

createApp(App).mount('#app')
