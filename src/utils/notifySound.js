/**
 * New-order sound — same model as seller realtime-dash-simplified:
 * sound is off until the first click anywhere on the page (browser autoplay unlock).
 */

const SOUND_URL = '/sounds/calypso.mp3'

/** @type {HTMLAudioElement | null} */
let audio = null
let enabled = false
/** @type {Set<() => void>} */
const listeners = new Set()
let gestureBound = false

function emit() {
  for (const fn of listeners) fn()
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio(SOUND_URL)
    audio.preload = 'auto'
    audio.volume = 1
  }
  return audio
}

/**
 * Unlock via the actual user gesture (Safari needs play() in the gesture stack).
 * Muted play is enough to open the autoplay gate without a loud beep on every click.
 */
async function unlockFromGesture() {
  if (enabled) return
  const el = ensureAudio()
  try {
    el.muted = true
    await el.play()
    el.pause()
    el.currentTime = 0
    el.muted = false
  } catch {
    // Still mark enabled after a real click — Chrome often allows later play() anyway
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
  window.addEventListener('pointerdown', onGesture, { capture: true, passive: true })
  window.addEventListener('keydown', onGesture, { capture: true, passive: true })
}

function unbindGesture() {
  if (!gestureBound || typeof window === 'undefined') return
  gestureBound = false
  window.removeEventListener('pointerdown', onGesture, true)
  window.removeEventListener('keydown', onGesture, true)
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
  ensureAudio()
  if (!enabled) bindGesture()
}

/** Play Calypso when a new order arrives (no-op until first user click). */
export function playNewOrderSound() {
  if (typeof window === 'undefined' || !enabled) return

  const el = ensureAudio()
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
