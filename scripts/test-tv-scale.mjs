/**
 * Pure unit tests for TV root scale + half-width HD detection (no DOM).
 */
import {
  DESIGN_WIDTH,
  ROOT_AT_DESIGN_PX,
  ROOT_MAX_PX,
  ROOT_MIN_PX,
  computeRootFontPx,
  isHalfWidthHdPanel,
  readViewportMetrics,
  resolveLayoutWidth,
} from '../src/utils/tvScale.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(computeRootFontPx(DESIGN_WIDTH) === ROOT_AT_DESIGN_PX, 'design width → base root')
assert(computeRootFontPx(DESIGN_WIDTH / 2) === ROOT_MIN_PX, 'half width clamps to min')
assert(computeRootFontPx(DESIGN_WIDTH * 2) === ROOT_MAX_PX, 'double width clamps to max')
assert(computeRootFontPx(0) === ROOT_AT_DESIGN_PX, 'invalid 0 → base')
assert(computeRootFontPx(NaN) === ROOT_AT_DESIGN_PX, 'invalid NaN → base')

// Mild narrower viewport still scales before floor
const at1600 = computeRootFontPx(1600)
assert(at1600 < ROOT_AT_DESIGN_PX && at1600 >= ROOT_MIN_PX, '1600 slightly denser')

const m = readViewportMetrics({
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 2,
  screenWidth: 3840,
  screenHeight: 2160,
})
assert(m.rootPx === ROOT_AT_DESIGN_PX, 'metrics root at 1920')
assert(m.scale === 1, 'scale 1 at design')
assert(m.devicePixelRatio === 2, 'dpr passed through (does not change root)')
assert(m.halfWidthHd === false, '1920 CSS is not half-width HD')
assert(m.layoutWidth === 1920, 'layout width stays 1920')

// DPR must NOT affect root size when CSS width is already design — same CSS width → same root
const lowDpr = computeRootFontPx(1920)
const highDpr = computeRootFontPx(1920)
assert(lowDpr === highDpr, 'root independent of dpr at full CSS width')

// --- Warehouse TV repro (photo debug HUD) ---
// inner 960×518, screen 960×540, dpr 2.00, root was stuck at 11px
const tvEnv = {
  innerWidth: 960,
  innerHeight: 518,
  devicePixelRatio: 2,
  screenWidth: 960,
  screenHeight: 540,
}
assert(isHalfWidthHdPanel(tvEnv) === true, 'TV 960@2x is half-width HD')
assert(resolveLayoutWidth(tvEnv) === 1920, 'TV layout resolves to 1920')
const tvMetrics = readViewportMetrics(tvEnv)
assert(tvMetrics.layoutWidth === 1920, 'metrics layoutWidth 1920 on TV')
assert(tvMetrics.rootPx === ROOT_AT_DESIGN_PX, 'TV root at design (13), not floor 11')
assert(tvMetrics.halfWidthHd === true, 'metrics flags halfWidthHd')

// Phones must not be treated as half-width HD warehouse TVs
assert(
  isHalfWidthHdPanel({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 }) === false,
  'phone portrait not half-width HD',
)
assert(
  isHalfWidthHdPanel({ innerWidth: 844, innerHeight: 390, devicePixelRatio: 3 }) === false,
  'phone landscape (physical ~2.5k) not near-Full-HD band',
)
assert(
  resolveLayoutWidth({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 }) === 390,
  'phone keeps CSS width',
)

// True 1080p dpr=1 — already correct CSS width
assert(
  isHalfWidthHdPanel({ innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 }) === false,
  'native 1080p not half-width',
)

console.log('PASS test-tv-scale')
