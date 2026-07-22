import { createApp } from 'vue'

import './styles/tokens.css'
import { applyTvPresentation } from './utils/tvScale'
import App from './App.vue'

// Viewport compensation (half-width HD TVs) + root rem scale before mount
applyTvPresentation()

createApp(App).mount('#app')
