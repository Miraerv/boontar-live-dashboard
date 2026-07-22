/**
 * Dashboard sounds — same model as seller realtime-dash-simplified:
 * sound is off until the first user gesture (browser autoplay unlock).
 *
 * TV / kiosk: PIN login click unlocks; also listen for touch/pointer/key.
 * If play() fails later (idle policy), re-bind unlock.
 *
 * New order: new-order.mp3 then new-order-ykt.mp3 (attention → local voice).
 */

const NEW_ORDER_SOUND_URL = '/sounds/new-order.mp3'
const NEW_ORDER_YKT_SOUND_URL = '/sounds/new-order-ykt.mp3'

/** @type {HTMLAudioElement | null} */
let unlockAudio = null
let enabled = false
/** @type {Set<() => void>} */
const listeners = new Set()
let gestureBound = false

/** @type {Map<string, HTMLAudioElement>} */
const clipCache = new Map()

/** Serialize playback so clips do not overlap (new-order chain, packed chimes). */
/** @type {Promise<void>} */
let playQueue = Promise.resolve()

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
  getClip(NEW_ORDER_SOUND_URL)
  getClip(NEW_ORDER_YKT_SOUND_URL)
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

function markDisabledAndRebind() {
  enabled = false
  emit()
  bindGesture()
}

/**
 * Play one clip and wait until it ends (or fails).
 * @param {string} url
 * @returns {Promise<void>}
 */
function playClipToEnd(url) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !enabled || !url) {
      resolve()
      return
    }

    const el = getClip(url) ?? new Audio(url)
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      el.removeEventListener('ended', finish)
      el.removeEventListener('error', finish)
      resolve()
    }

    el.addEventListener('ended', finish)
    el.addEventListener('error', finish)

    try {
      el.muted = false
      el.currentTime = 0
      const p = el.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          markDisabledAndRebind()
          finish()
        })
      }
    } catch {
      markDisabledAndRebind()
      finish()
    }
  })
}

/**
 * Enqueue clips to play sequentially (no overlap).
 * @param {string[]} urls
 */
function enqueueSounds(urls) {
  if (typeof window === 'undefined' || !enabled || !urls.length) return

  playQueue = playQueue
    .then(async () => {
      for (const url of urls) {
        if (!enabled) break
        await playClipToEnd(url)
      }
    })
    .catch(() => {
      // keep queue alive after unexpected errors
    })
}

/**
 * Play a single clip by public URL (queued; no-op until first user gesture).
 * @param {string | null | undefined} url
 */
export function playNotifySound(url) {
  if (!url) return
  enqueueSounds([url])
}

/**
 * New order: universal alert first, then Yakut voice.
 * Order matters — short beep grabs attention, ykt is the spoken cue.
 */
export function playNewOrderSound() {
  enqueueSounds([NEW_ORDER_SOUND_URL, NEW_ORDER_YKT_SOUND_URL])
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
