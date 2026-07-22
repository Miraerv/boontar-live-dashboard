import { onMounted, onUnmounted, ref } from 'vue'
import {
  applyTvPresentation,
  initTvScale,
  isViewportDebugEnabled,
  readViewportMetrics,
} from '../utils/tvScale'

/**
 * Root rem scale for TV/large CSS viewports + optional debug metrics.
 */
export function useTvScale() {
  const debugEnabled = ref(false)
  /** @type {import('vue').Ref<ReturnType<typeof readViewportMetrics>|null>} */
  const metrics = ref(null)

  /** @type {(() => void)|null} */
  let disposeScale = null
  /** @type {ReturnType<typeof setInterval>|null} */
  let metricsTimer = null

  function refreshMetrics() {
    metrics.value = readViewportMetrics()
  }

  onMounted(() => {
    // initTvScale already applies; re-apply in case SSR/order matters
    disposeScale = initTvScale()
    applyTvPresentation()

    debugEnabled.value = isViewportDebugEnabled()
    if (debugEnabled.value) {
      refreshMetrics()
      metricsTimer = setInterval(refreshMetrics, 1000)
      window.addEventListener('resize', refreshMetrics, { passive: true })
    }
  })

  onUnmounted(() => {
    disposeScale?.()
    disposeScale = null
    if (metricsTimer) {
      clearInterval(metricsTimer)
      metricsTimer = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', refreshMetrics)
    }
  })

  return {
    debugEnabled,
    metrics,
    refreshMetrics,
  }
}
