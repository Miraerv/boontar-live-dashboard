import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import vueDevTools from 'vite-plugin-vue-devtools'

// Dual modern (ESM) + legacy (SystemJS) chunks so old phones don't blank-screen.
// Targets come from package.json "browserslist" (iOS ≥ 13, Android ≥ 8, Chrome ≥ 80…).
// Vue 3 floor is roughly Safari 13.1 / Chrome 80 — below that is out of scope.
// https://github.com/vitejs/vite/tree/main/packages/plugin-legacy
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    mode === 'development' && vueDevTools(),
    legacy({
      // package.json browserslist is loaded when targets is omitted; keep explicit
      // so Docker/CI builds stay stable regardless of cwd resolution quirks.
      targets: [
        'defaults',
        'iOS >= 13',
        'Android >= 8',
        'Chrome >= 80',
        'Safari >= 13',
        'Samsung >= 12',
        'not dead',
        'not IE 11',
      ],
      // modernPolyfills left off: browsers that fail the modern feature check
      // (import.meta.resolve etc.) already load the legacy polyfill chunk instead.
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // OXC minify re-emits ?. / ?? into legacy chunks after Babel; terser keeps them downleveled
    minify: 'terser',
    cssTarget: 'chrome80',
  },
  server: {
    proxy: {
      // Hono BFF → Laravel admin-products (see boontar-live-dashboard-backend)
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
}))
