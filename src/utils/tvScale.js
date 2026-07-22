/**
 * TV / large-screen root scale + half-width HD compensation.
 *
 * Layout is in CSS px relative to a design width (1920). Physical panel PPI
 * is NOT used for density by itself — browsers map CSS px via devicePixelRatio.
 *
 * Warehouse TVs (Android WebView / Smart TV) often report a *phone-like*
 * CSS viewport of ~960×540 with dpr=2 on a Full HD panel. With
 * `width=device-width` the board then gets only 960 CSS px, while the kanban
 * needs ~1200+ at design density → horizontal scroll and "huge" cards.
 *
 * We:
 * 1. Detect that half-width HD case
 * 2. Force the layout viewport to DESIGN_WIDTH (meta viewport and/or transform)
 * 3. Set `html { font-size }` so rem type/spacing track the *layout* width
 */

/** Logical design width in CSS px (Full HD board). */
export const DESIGN_WIDTH = 1920

/** Root font-size at design width — 1rem = this many CSS px. */
export const ROOT_AT_DESIGN_PX = 13

/** Hard floor / ceiling for root (keeps density readable on odd viewports). */
export const ROOT_MIN_PX = 11
export const ROOT_MAX_PX = 15

/**
 * Full HD (or similar) panel compressed into ~half CSS width via dpr.
 * Repro from warehouse TV: inner 960×518, screen 960×540, dpr 2 → physical 1920.
 *
 * @param {{ innerWidth?: number, innerHeight?: number, devicePixelRatio?: number }} env
 */
export function isHalfWidthHdPanel(env = {}) {
  const cssW = Number(env.innerWidth)
  const cssH = Number(env.innerHeight)
  const dpr = Number(env.devicePixelRatio) || 1
  if (!Number.isFinite(cssW) || cssW <= 0) return false
  if (!Number.isFinite(dpr) || dpr < 1.5) return false

  const physicalW = cssW * dpr
  // CSS width well below design; physical width near Full HD (not phone, not 4K native)
  const compressed = cssW < DESIGN_WIDTH * 0.7
  const nearFullHd = physicalW >= DESIGN_WIDTH * 0.9 && physicalW <= DESIGN_WIDTH * 1.15
  // Prefer landscape warehouse TVs; allow missing height in pure unit tests
  const landscape = !Number.isFinite(cssH) || cssH <= 0 || cssW >= cssH * 0.85

  return compressed && nearFullHd && landscape
}

/**
 * Width used for rem root scale and for “does the board fit?” reasoning.
 * On half-width HD panels this is the physical CSS-equivalent (e.g. 1920).
 *
 * @param {{ innerWidth?: number, innerHeight?: number, devicePixelRatio?: number }} [env]
 */
export function resolveLayoutWidth(env = {}) {
  const cssW =
    env.innerWidth ?? (typeof window !== 'undefined' ? window.innerWidth : DESIGN_WIDTH)
  const cssH =
    env.innerHeight ?? (typeof window !== 'undefined' ? window.innerHeight : undefined)
  const dpr =
    env.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1)

  if (isHalfWidthHdPanel({ innerWidth: cssW, innerHeight: cssH, devicePixelRatio: dpr })) {
    return Math.round(cssW * dpr)
  }
  const w = Number(cssW)
  if (!Number.isFinite(w) || w <= 0) return DESIGN_WIDTH
  return w
}

/**
 * @param {number} viewportWidth CSS layout width (e.g. resolved layout width)
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

  const halfWidthHd = isHalfWidthHdPanel({
    innerWidth,
    innerHeight,
    devicePixelRatio,
  })
  const layoutWidth = resolveLayoutWidth({
    innerWidth,
    innerHeight,
    devicePixelRatio,
  })
  const rootPx = computeRootFontPx(layoutWidth)

  return {
    innerWidth,
    innerHeight,
    devicePixelRatio,
    screenWidth,
    screenHeight,
    layoutWidth,
    halfWidthHd,
    rootPx,
    designWidth: DESIGN_WIDTH,
    scale: rootPx / ROOT_AT_DESIGN_PX,
  }
}

/**
 * Force layout viewport to design width on half-width HD WebViews.
 * @returns {boolean} true if meta was set/updated for compensation
 */
export function applyTvViewportMeta() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false

  const half = isHalfWidthHdPanel({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  })

  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return false

  if (!half) {
    // Restore mobile-friendly default when not on compressed HD TV
    const def = 'width=device-width, initial-scale=1.0'
    if (meta.getAttribute('content') !== def && document.documentElement.dataset.tvViewport === 'design') {
      meta.setAttribute('content', def)
      delete document.documentElement.dataset.tvViewport
    }
    return false
  }

  const desired = `width=${DESIGN_WIDTH}`
  if (meta.getAttribute('content') !== desired) {
    meta.setAttribute('content', desired)
  }
  document.documentElement.dataset.tvViewport = 'design'
  return true
}

/**
 * Transform fallback when viewport meta does not expand innerWidth.
 * Lays out at DESIGN_WIDTH and scales down to the visual CSS width.
 *
 * @param {{ innerWidth: number, innerHeight: number, active: boolean }} opts
 */
function applyDesignTransform(opts) {
  if (typeof document === 'undefined') return
  const html = document.documentElement

  if (!opts.active) {
    if (html.dataset.tvLayout === 'design-scale') {
      html.style.width = ''
      html.style.minHeight = ''
      html.style.transform = ''
      html.style.transformOrigin = ''
      delete html.dataset.tvLayout
    }
    return
  }

  const scale = opts.innerWidth / DESIGN_WIDTH
  if (!(scale > 0 && scale < 1)) return

  const layoutH = opts.innerHeight / scale
  html.style.width = `${DESIGN_WIDTH}px`
  html.style.minHeight = `${layoutH}px`
  html.style.transformOrigin = 'top left'
  html.style.transform = `scale(${scale})`
  html.dataset.tvLayout = 'design-scale'
}

/**
 * Apply root font-size on <html> from resolved layout width.
 * @param {number} [viewportWidth] override (resolved layout width)
 * @returns {number} applied px
 */
export function applyTvScale(viewportWidth) {
  if (typeof document === 'undefined') return ROOT_AT_DESIGN_PX

  const width =
    viewportWidth ??
    resolveLayoutWidth({
      innerWidth: typeof window !== 'undefined' ? window.innerWidth : DESIGN_WIDTH,
      innerHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    })

  const px = computeRootFontPx(width)
  document.documentElement.style.fontSize = `${px}px`
  document.documentElement.dataset.tvRootPx = String(px)
  document.documentElement.dataset.tvLayoutWidth = String(Math.round(width))
  return px
}

/**
 * Full apply: viewport meta → transform fallback if still compressed → root rem.
 * @returns {{ layoutWidth: number, rootPx: number, halfWidthHd: boolean, mode: string }}
 */
export function applyTvPresentation() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      layoutWidth: DESIGN_WIDTH,
      rootPx: ROOT_AT_DESIGN_PX,
      halfWidthHd: false,
      mode: 'ssr',
    }
  }

  const cssW = window.innerWidth
  const cssH = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  const half = isHalfWidthHdPanel({
    innerWidth: cssW,
    innerHeight: cssH,
    devicePixelRatio: dpr,
  })

  applyTvViewportMeta()

  // After meta, some WebViews update innerWidth; re-read.
  const w2 = window.innerWidth
  const h2 = window.innerHeight
  const stillHalf = isHalfWidthHdPanel({
    innerWidth: w2,
    innerHeight: h2,
    devicePixelRatio: dpr,
  })

  /** @type {'native' | 'viewport-meta' | 'design-scale'} */
  let mode
  if (stillHalf) {
    // Meta alone did not expand CSS layout — scale design surface into visual viewport
    applyDesignTransform({ innerWidth: w2, innerHeight: h2, active: true })
    mode = 'design-scale'
  } else {
    applyDesignTransform({ innerWidth: w2, innerHeight: h2, active: false })
    mode = half ? 'viewport-meta' : 'native'
  }

  const layoutWidth = resolveLayoutWidth({
    innerWidth: stillHalf ? cssW : w2,
    innerHeight: stillHalf ? cssH : h2,
    devicePixelRatio: dpr,
  })
  // When transform is active, always scale rem to DESIGN_WIDTH
  const rootBase = mode === 'design-scale' ? DESIGN_WIDTH : layoutWidth
  const rootPx = applyTvScale(rootBase)

  document.documentElement.dataset.tvMode = mode

  return { layoutWidth: rootBase, rootPx, halfWidthHd: half || stillHalf, mode }
}

/**
 * Bind resize/orientation and apply immediately.
 * @returns {() => void} dispose
 */
export function initTvScale() {
  if (typeof window === 'undefined') return () => {}

  const apply = () => {
    applyTvPresentation()
  }

  apply()
  // Meta viewport changes often settle on the next frame
  requestAnimationFrame(apply)
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
