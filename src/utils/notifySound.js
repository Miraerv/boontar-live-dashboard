/**
 * Dashboard sounds — same model as seller realtime-dash-simplified:
 * sound is off until the first user gesture (browser autoplay unlock).
 *
 * TV / kiosk: PIN login click unlocks; also listen for touch/pointer/key.
 * If play() fails later (idle policy), re-bind unlock.
 */

const NEW_ORDER_SOUND_URL = '/sounds/new-order.mp3'

/** @type {HTMLAudioElement | null} */
let unlockAudio = null
let enabled = false
/** @type {Set<() => void>} */
const listeners = new Set()
let gestureBound = false

/** @type {Map<string, HTMLAudioElement>} */
const clipCache = new Map()

function emit() {
  for (const fn of listeners) fn()
}

function ensureUnlockAudio() {
  if (!unlockAudio) {
    unlockAudio = new Audio(NEW_ORDER_SOUND_URL)
    unlockAudio.preload = 'auto'
    unlockAudio.volume = 1
  }
  return unlockAudio
}

/**
 * @param {string} url
 * @returns {HTMLAudioElement | null}
 */
function getClip(url) {
  if (typeof window === 'undefined' || !url) return null
  let el = clipCache.get(url)
  if (!el) {
    el = new Audio(url)
    el.preload = 'auto'
    el.volume = 1
    clipCache.set(url, el)
  }
  return el
}

/**
 * Unlock via the actual user gesture (Safari needs play() in the gesture stack).
 * Muted play is enough to open the autoplay gate without a loud beep on every click.
 */
async function unlockFromGesture() {
  if (enabled) return
  const el = ensureUnlockAudio()
  try {
    el.muted = true
    await el.play()
    el.pause()
    el.currentTime = 0
    el.muted = false
  } catch {
    // Still mark enabled after a real gesture — Chrome often allows later play() anyway
    el.muted = false
  }
  enabled = true
  unbindGesture()
  emit()
}

function onGesture() {
  void unlockFromGesture()
}

function bindGesture() {
  if (gestureBound || typeof window === 'undefined') return
  gestureBound = true
  // pointerdown covers mouse + most TV remotes; touchstart for older WebViews; keydown for keyboards
  window.addEventListener('pointerdown', onGesture, { capture: true, passive: true })
  window.addEventListener('touchstart', onGesture, { capture: true, passive: true })
  window.addEventListener('keydown', onGesture, { capture: true, passive: true })
  window.addEventListener('click', onGesture, { capture: true, passive: true })
}

function unbindGesture() {
  if (!gestureBound || typeof window === 'undefined') return
  gestureBound = false
  window.removeEventListener('pointerdown', onGesture, true)
  window.removeEventListener('touchstart', onGesture, true)
  window.removeEventListener('keydown', onGesture, true)
  window.removeEventListener('click', onGesture, true)
}

/** @param {() => void} fn */
export function onNotifySoundChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function isNotifySoundEnabled() {
  return enabled
}

/** Call on mount: preload + wait for first page interaction (like old dash). */
export function initNotifySound() {
  if (typeof window === 'undefined') return
  ensureUnlockAudio()
  // Warm layer clips so packed chimes start faster on TV
  for (let i = 0; i <= 3; i++) {
    getClip(`/sounds/layer-${i}.mp3`)
  }
  if (!enabled) bindGesture()
}

/**
 * Force re-check unlock (e.g. after login button). Safe if already enabled.
 */
export function tryUnlockNotifySound() {
  void unlockFromGesture()
}

/**
 * Play a clip by public URL (no-op until first user gesture).
 * @param {string | null | undefined} url
 */
export function playNotifySound(url) {
  if (typeof window === 'undefined' || !enabled || !url) return

  const el = getClip(url) ?? new Audio(url)
  try {
    el.muted = false
    el.currentTime = 0
    const p = el.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        enabled = false
        emit()
        bindGesture()
      })
    }
  } catch {
    enabled = false
    emit()
    bindGesture()
  }
}

/** Play when a new order arrives. */
export function playNewOrderSound() {
  playNotifySound(NEW_ORDER_SOUND_URL)
}

/**
 * Play when an order becomes packed — clip depends on delivery layer (0–3).
 * @param {number | null | undefined} layer
 */
export function playPackedLayerSound(layer) {
  if (layer == null || !Number.isFinite(Number(layer))) return
  const n = Math.trunc(Number(layer))
  if (n < 0 || n > 3) return
  playNotifySound(`/sounds/layer-${n}.mp3`)
}
