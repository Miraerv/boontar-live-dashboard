import { onMounted, onUnmounted, ref } from 'vue'
import {
  initNotifySound,
  isNotifySoundEnabled,
  onNotifySoundChange,
  playNewOrderSound,
} from '../utils/notifySound'

/** Same mental model as seller dash: red until first click, then green. */
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
  }
}
