import { onMounted, onUnmounted, ref } from 'vue'

/** Shared clock so many cards share one interval. */
const now = ref(Date.now())
let subscribers = 0
/** @type {ReturnType<typeof setInterval>|null} */
let timer = null

/**
 * Reactive "now" that ticks on an interval (default 30s).
 * @param {number} [intervalMs]
 */
export function useNow(intervalMs = 30_000) {
  onMounted(() => {
    subscribers += 1
    if (!timer) {
      now.value = Date.now()
      timer = setInterval(() => {
        now.value = Date.now()
      }, intervalMs)
    }
  })

  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0 && timer) {
      clearInterval(timer)
      timer = null
      subscribers = 0
    }
  })

  return now
}
