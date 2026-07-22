import { onMounted, onUnmounted, ref } from 'vue'
import {
  initNotifySound,
  isNotifySoundEnabled,
  onNotifySoundChange,
  playNewOrderSound,
  tryUnlockNotifySound,
} from '../utils/notifySound'

/** Same mental model as seller dash: red until first gesture, then green. */
export function useNotifySound() {
  const enabled = ref(isNotifySoundEnabled())

  let off = () => {}

  onMounted(() => {
    initNotifySound()
    enabled.value = isNotifySoundEnabled()
    off = onNotifySoundChange(() => {
      enabled.value = isNotifySoundEnabled()
    })
  })

  onUnmounted(() => {
    off()
  })

  return {
    enabled,
    playNewOrderSound,
    tryUnlockNotifySound,
  }
}
