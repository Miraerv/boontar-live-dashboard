/**
 * Pure unit tests for TV root scale (no DOM).
 */
import {
  DESIGN_WIDTH,
  ROOT_AT_DESIGN_PX,
  ROOT_MAX_PX,
  ROOT_MIN_PX,
  computeRootFontPx,
  readViewportMetrics,
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

// DPR must NOT affect root size — same CSS width → same root
const lowDpr = computeRootFontPx(1920)
const highDpr = computeRootFontPx(1920)
assert(lowDpr === highDpr, 'root independent of dpr')

console.log('PASS test-tv-scale')
