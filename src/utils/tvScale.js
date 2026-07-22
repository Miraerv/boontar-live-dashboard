/**
 * TV / large-screen root scale.
 *
 * Layout is in CSS px relative to a design width (1920). Physical panel PPI
 * is NOT used — browsers already map CSS px via devicePixelRatio.
 *
 * We set `html { font-size }` so rem-based type and spacing scale together
 * when the CSS viewport is narrower/wider than the design width, with clamps
 * so a weird TV WebView cannot blow the UI up or crush it.
 */

/** Logical design width in CSS px (Full HD board). */
export const DESIGN_WIDTH = 1920

/** Root font-size at design width — 1rem = this many CSS px. */
export const ROOT_AT_DESIGN_PX = 13

/** Hard floor / ceiling for root (keeps density readable on odd viewports). */
export const ROOT_MIN_PX = 11
export const ROOT_MAX_PX = 15

/**
 * @param {number} viewportWidth CSS viewport width (e.g. window.innerWidth)
 * @returns {number} root font-size in CSS px
 */
export function computeRootFontPx(viewportWidth) {
  const w = Number(viewportWidth)
  if (!Number.isFinite(w) || w <= 0) return ROOT_AT_DESIGN_PX
  const raw = (w / DESIGN_WIDTH) * ROOT_AT_DESIGN_PX
  return Math.min(ROOT_MAX_PX, Math.max(ROOT_MIN_PX, raw))
}

/**
 * Snapshot for debug HUD / logging.
 * @param {{ innerWidth?: number, innerHeight?: number, devicePixelRatio?: number, screenWidth?: number, screenHeight?: number }} [env]
 */
export function readViewportMetrics(env = {}) {
  const innerWidth =
    env.innerWidth ?? (typeof window !== 'undefined' ? window.innerWidth : DESIGN_WIDTH)
  const innerHeight =
    env.innerHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 1080)
  const devicePixelRatio =
    env.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1)
  const screenWidth =
    env.screenWidth ?? (typeof screen !== 'undefined' ? screen.width : innerWidth)
  const screenHeight =
    env.screenHeight ?? (typeof screen !== 'undefined' ? screen.height : innerHeight)

  const rootPx = computeRootFontPx(innerWidth)
  return {
    innerWidth,
    innerHeight,
    devicePixelRatio,
    screenWidth,
    screenHeight,
    rootPx,
    designWidth: DESIGN_WIDTH,
    scale: rootPx / ROOT_AT_DESIGN_PX,
  }
}

/**
 * Apply root font-size on <html>.
 * @param {number} [viewportWidth]
 * @returns {number} applied px
 */
export function applyTvScale(viewportWidth) {
  if (typeof document === 'undefined') return ROOT_AT_DESIGN_PX
  const width =
    viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : DESIGN_WIDTH)
  const px = computeRootFontPx(width)
  document.documentElement.style.fontSize = `${px}px`
  document.documentElement.dataset.tvRootPx = String(px)
  return px
}

/**
 * Bind resize/orientation and apply immediately.
 * @returns {() => void} dispose
 */
export function initTvScale() {
  if (typeof window === 'undefined') return () => {}

  const apply = () => {
    applyTvScale(window.innerWidth)
  }

  apply()
  window.addEventListener('resize', apply, { passive: true })
  window.addEventListener('orientationchange', apply, { passive: true })

  return () => {
    window.removeEventListener('resize', apply)
    window.removeEventListener('orientationchange', apply)
  }
}

/** @returns {boolean} */
export function isViewportDebugEnabled() {
  if (typeof window === 'undefined') return false
  try {
    if (window.localStorage?.getItem('dashDebug') === '1') return true
  } catch {
    // private mode
  }
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1'
  } catch {
    return false
  }
}
