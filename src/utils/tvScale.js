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
 * Fix path:
 * 1. Detect half-width HD (inner≈960 @ dpr=2 → physical ~1920)
 * 2. Prefer meta viewport width=1920 (+ initial-scale)
 * 3. If innerWidth stays compressed: lay out on #tv-stage at DESIGN_WIDTH and
 *    fit it with Chromium `zoom` (layout-affecting) or transform fallback
 * 4. Set html font-size from *layout* width so rem tracks design density
 *
 * Transform-on-<html> is intentionally avoided — it left flex/overflow children
 * at ~960 CSS px while root rem jumped to 13px (worse overflow on warehouse TVs).
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
 * Visual scale to fit design layout into compressed CSS viewport (e.g. 960/1920 = 0.5).
 * @param {number} cssWidth
 * @param {number} [layoutWidth=DESIGN_WIDTH]
 */
export function computeVisualScale(cssWidth, layoutWidth = DESIGN_WIDTH) {
  const w = Number(cssWidth)
  const layout = Number(layoutWidth) || DESIGN_WIDTH
  if (!Number.isFinite(w) || w <= 0 || layout <= 0) return 1
  return w / layout
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
 * Whether this runtime likely supports CSS zoom (Chromium / Android WebView).
 * Pure helper for tests — pass a mock element style bag when needed.
 * @param {{ zoom?: unknown } | CSSStyleDeclaration | null | undefined} [style]
 */
export function supportsCssZoom(style) {
  if (style && Object.prototype.hasOwnProperty.call(style, 'zoom')) return true
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    try {
      if (CSS.supports('zoom', '0.5')) return true
    } catch {
      // ignore
    }
  }
  if (typeof document !== 'undefined') {
    return 'zoom' in document.documentElement.style
  }
  return false
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

  /** @type {string} */
  let mode = 'native'
  /** @type {number|null} */
  let visualScale = null
  if (typeof document !== 'undefined') {
    const ds = document.documentElement.dataset
    if (ds.tvMode) mode = ds.tvMode
    if (ds.tvVisualScale) {
      const vs = Number(ds.tvVisualScale)
      if (Number.isFinite(vs)) visualScale = vs
    }
  }
  if (visualScale == null && halfWidthHd) {
    visualScale = computeVisualScale(innerWidth, DESIGN_WIDTH)
  }

  return {
    innerWidth,
    innerHeight,
    devicePixelRatio,
    screenWidth,
    screenHeight,
    layoutWidth,
    halfWidthHd,
    mode,
    visualScale,
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

  const cssW = window.innerWidth
  const cssH = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  const half = isHalfWidthHdPanel({
    innerWidth: cssW,
    innerHeight: cssH,
    devicePixelRatio: dpr,
  })

  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return false

  if (!half) {
    const def = 'width=device-width, initial-scale=1.0'
    if (meta.getAttribute('content') !== def && document.documentElement.dataset.tvViewport === 'design') {
      meta.setAttribute('content', def)
      delete document.documentElement.dataset.tvViewport
    }
    return false
  }

  const initial = computeVisualScale(cssW, DESIGN_WIDTH)
  // Explicit initial-scale helps WebViews that ignore width= alone
  const desired = `width=${DESIGN_WIDTH}, initial-scale=${initial.toFixed(4)}`
  if (meta.getAttribute('content') !== desired) {
    meta.setAttribute('content', desired)
  }
  document.documentElement.dataset.tvViewport = 'design'
  return true
}

/**
 * Clear legacy html-level transform/zoom from earlier deploys.
 */
function clearHtmlCompensation() {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.style.width = ''
  html.style.minHeight = ''
  html.style.height = ''
  html.style.transform = ''
  html.style.transformOrigin = ''
  html.style.zoom = ''
  html.style.overflow = ''
}

/**
 * Reset #tv-frame / #tv-stage to a transparent full-size shell (native desktop/phone).
 */
function resetStageShell() {
  if (typeof document === 'undefined') return
  const frame = document.getElementById('tv-frame')
  const stage = document.getElementById('tv-stage')
  if (frame) {
    frame.removeAttribute('style')
    frame.classList.remove('tv-frame--active')
  }
  if (stage) {
    stage.removeAttribute('style')
    stage.classList.remove('tv-stage--active')
  }
  if (typeof document !== 'undefined') {
    document.body?.classList.remove('tv-halfhd')
  }
  clearHtmlCompensation()
  delete document.documentElement.dataset.tvLayout
  delete document.documentElement.dataset.tvVisualScale
}

/**
 * Fit design-width stage into compressed visual viewport.
 * Prefer CSS zoom (Chromium) — it affects layout. Transform is fallback only.
 *
 * @param {{ innerWidth: number, innerHeight: number, active: boolean }} opts
 * @returns {{ mode: 'native' | 'design-zoom' | 'design-scale', visualScale: number, layoutWidth: number }}
 */
export function applyDesignStage(opts) {
  if (typeof document === 'undefined') {
    return { mode: 'native', visualScale: 1, layoutWidth: DESIGN_WIDTH }
  }

  if (!opts.active) {
    resetStageShell()
    document.documentElement.dataset.tvMode = 'native'
    return { mode: 'native', visualScale: 1, layoutWidth: DESIGN_WIDTH }
  }

  const frame = document.getElementById('tv-frame')
  const stage = document.getElementById('tv-stage')
  // No shell in DOM (tests / odd mount) — avoid broken html transform; densify root only
  if (!frame || !stage) {
    clearHtmlCompensation()
    document.documentElement.dataset.tvMode = 'no-stage'
    delete document.documentElement.dataset.tvLayout
    return { mode: 'no-stage', visualScale: 1, layoutWidth: DESIGN_WIDTH }
  }

  const visualScale = computeVisualScale(opts.innerWidth, DESIGN_WIDTH)
  if (!(visualScale > 0 && visualScale < 1)) {
    resetStageShell()
    document.documentElement.dataset.tvMode = 'native'
    return { mode: 'native', visualScale: 1, layoutWidth: DESIGN_WIDTH }
  }

  const layoutH = opts.innerHeight / visualScale

  // Always clear legacy html hacks
  clearHtmlCompensation()

  document.body.classList.add('tv-halfhd')
  frame.classList.add('tv-frame--active')
  stage.classList.add('tv-stage--active')

  // Frame clips to the visual CSS viewport
  frame.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100%',
    'height:100%',
    'margin:0',
    'padding:0',
    'overflow:hidden',
    'z-index:0',
  ].join(';')

  stage.style.width = `${DESIGN_WIDTH}px`
  stage.style.height = `${layoutH}px`
  stage.style.position = 'absolute'
  stage.style.top = '0'
  stage.style.left = '0'
  stage.style.margin = '0'
  stage.style.padding = '0'
  stage.style.transformOrigin = 'top left'
  stage.style.boxSizing = 'border-box'

  /** @type {'design-zoom' | 'design-scale'} */
  let mode
  if (supportsCssZoom(stage.style)) {
    // zoom changes used layout size in Chromium — board flex/grid see 1920px
    stage.style.zoom = String(visualScale)
    stage.style.transform = 'none'
    mode = 'design-zoom'
  } else {
    stage.style.zoom = ''
    stage.style.transform = `scale(${visualScale})`
    mode = 'design-scale'
  }

  document.documentElement.dataset.tvMode = mode
  document.documentElement.dataset.tvLayout = mode
  document.documentElement.dataset.tvVisualScale = String(visualScale)
  document.documentElement.dataset.tvLayoutWidth = String(DESIGN_WIDTH)

  return { mode, visualScale, layoutWidth: DESIGN_WIDTH }
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
 * Full apply: viewport meta → stage zoom/scale if still compressed → root rem.
 * @returns {{ layoutWidth: number, rootPx: number, halfWidthHd: boolean, mode: string, visualScale: number }}
 */
export function applyTvPresentation() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      layoutWidth: DESIGN_WIDTH,
      rootPx: ROOT_AT_DESIGN_PX,
      halfWidthHd: false,
      mode: 'ssr',
      visualScale: 1,
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

/** @type {{ mode: string, visualScale: number, rootBase: number }} */
  let result
  if (stillHalf) {
    // Meta alone did not expand CSS layout — stage at design width + zoom/scale
    const stage = applyDesignStage({
      innerWidth: w2,
      innerHeight: h2,
      active: true,
    })
    result = {
      mode: stage.mode,
      visualScale: stage.visualScale,
      rootBase: DESIGN_WIDTH,
    }
  } else if (half) {
    // Meta expanded layout (or will after paint) — no stage scale needed
    applyDesignStage({ innerWidth: w2, innerHeight: h2, active: false })
    result = {
      mode: 'viewport-meta',
      visualScale: 1,
      rootBase: resolveLayoutWidth({
        innerWidth: w2,
        innerHeight: h2,
        devicePixelRatio: dpr,
      }),
    }
    document.documentElement.dataset.tvMode = result.mode
  } else {
    applyDesignStage({ innerWidth: w2, innerHeight: h2, active: false })
    result = {
      mode: 'native',
      visualScale: 1,
      rootBase: resolveLayoutWidth({
        innerWidth: w2,
        innerHeight: h2,
        devicePixelRatio: dpr,
      }),
    }
    document.documentElement.dataset.tvMode = result.mode
  }

  const rootPx = applyTvScale(result.rootBase)

  return {
    layoutWidth: result.rootBase,
    rootPx,
    halfWidthHd: half || stillHalf,
    mode: result.mode,
    visualScale: result.visualScale,
  }
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
  // Meta viewport + zoom often settle on the next frame
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
