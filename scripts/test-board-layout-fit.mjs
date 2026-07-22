/**
 * Red-capable feedback loop: TV board column fit + half-width HD compensation.
 *
 * Warehouse TV repro (debug HUD photo):
 *   inner 960×518, dpr 2 → physical Full HD but only 960 CSS px
 *   → min board ~1020px > 960 → columns do not fit without stage/zoom.
 *
 * Exit 0 = green, exit 1 = red.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DESIGN_WIDTH,
  ROOT_AT_DESIGN_PX,
  computeRootFontPx,
  computeVisualScale,
  isHalfWidthHdPanel,
  resolveLayoutWidth,
} from '../src/utils/tvScale.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const boardSrc = fs.readFileSync(path.join(rootDir, 'src/components/OrdersBoard.vue'), 'utf8')
const statusesSrc = fs.readFileSync(path.join(rootDir, 'src/constants/statuses.js'), 'utf8')
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8')
const tokensCss = fs.readFileSync(path.join(rootDir, 'src/styles/tokens.css'), 'utf8')
const tvScaleSrc = fs.readFileSync(path.join(rootDir, 'src/utils/tvScale.js'), 'utf8')
const mainSrc = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8')
const debugSrc = fs.readFileSync(path.join(rootDir, 'src/components/ViewportDebug.vue'), 'utf8')

const minmaxMatch = boardSrc.match(/minmax\(\s*([\d.]+)(rem|px)\s*,\s*([^)]+)\)/)
const colCount = (statusesSrc.match(/\{\s*key:/g) || []).length

/** Tokens: --space-3 gap, --space-4 horizontal padding on board */
const GAP_REM = 0.75
const PAD_X_REM = 2

/** @type {{ id: string, ok: boolean, detail: string }[]} */
const checks = []
function check(id, ok, detail) {
  checks.push({ id, ok, detail })
  console.log(`[${ok ? 'GREEN' : 'RED'}] ${id}: ${detail}`)
}

if (!minmaxMatch || colCount < 4) {
  console.error('FAIL: could not parse board grid / statuses')
  process.exit(1)
}

const minTrack = Number(minmaxMatch[1])
const minUnit = minmaxMatch[2]
const maxTrackExpr = minmaxMatch[3].trim()

function colMinPx(rootPx) {
  return minUnit === 'rem' ? minTrack * rootPx : minTrack
}

function boardMinPx(rootPx) {
  const colMin = colMinPx(rootPx)
  const gaps = (colCount - 1) * (GAP_REM * rootPx)
  const pad = PAD_X_REM * rootPx
  return colCount * colMin + gaps + pad
}

function colWidthWhenFit(viewport, rootPx) {
  const gaps = (colCount - 1) * (GAP_REM * rootPx)
  const pad = PAD_X_REM * rootPx
  return (viewport - gaps - pad) / colCount
}

function visibleCols(vw, rootPx) {
  const colMin = colMinPx(rootPx)
  const gap = GAP_REM * rootPx
  let n = 0
  let used = PAD_X_REM * rootPx
  while (n < colCount) {
    const need = (n === 0 ? 0 : gap) + colMin
    if (used + need > vw) break
    used += need
    n++
  }
  return n
}

check(
  'parse-grid',
  true,
  `minmax(${minTrack}${minUnit}, ${maxTrackExpr}) × ${colCount} cols`,
)

// --- Primary repro: warehouse TV 960@dpr2 ---
const tvCssW = 960
const tvDpr = 2
const tvEnv = { innerWidth: tvCssW, innerHeight: 518, devicePixelRatio: tvDpr }
const tvDetected = isHalfWidthHdPanel(tvEnv)
const tvLayoutW = resolveLayoutWidth(tvEnv)
const tvRoot = computeRootFontPx(tvLayoutW)
const tvMinBoard = boardMinPx(tvRoot)
const tvFitsOnLayout = tvMinBoard <= tvLayoutW
const tvFitsOnRawCss = boardMinPx(computeRootFontPx(tvCssW)) <= tvCssW
const tvVisibleOnLayout = visibleCols(tvLayoutW, tvRoot)
const tvVisual = computeVisualScale(tvCssW, DESIGN_WIDTH)

check('tv-repro-detected', tvDetected, `isHalfWidthHdPanel(960@2)=${tvDetected}`)
check(
  'tv-repro-layout-width',
  tvLayoutW === DESIGN_WIDTH,
  `resolveLayoutWidth → ${tvLayoutW} (want ${DESIGN_WIDTH})`,
)
check(
  'tv-repro-root-design',
  tvRoot === ROOT_AT_DESIGN_PX,
  `root=${tvRoot} (want ${ROOT_AT_DESIGN_PX}, was 11 before fix)`,
)
check(
  'tv-repro-visual-scale',
  tvVisual === 0.5,
  `visual scale 960/1920 = ${tvVisual}`,
)
check(
  'tv-repro-raw-css-overflows',
  !tvFitsOnRawCss,
  `without stage minBoard@960=${boardMinPx(computeRootFontPx(tvCssW)).toFixed(0)} > 960 (documents the bug)`,
)
check(
  'tv-repro-columns-fit-on-layout',
  tvFitsOnLayout && tvVisibleOnLayout === colCount,
  `layout ${tvLayoutW}: minBoard=${tvMinBoard.toFixed(0)} visible ${tvVisibleOnLayout}/${colCount}`,
)

// Must NOT use transform-on-html (failed on warehouse TV); stage + zoom instead
const usesHtmlTransform =
  /html\.style\.transform\s*=/.test(tvScaleSrc) && !/applyDesignStage/.test(tvScaleSrc)
const hasStageApi =
  /export function applyDesignStage/.test(tvScaleSrc) &&
  /supportsCssZoom/.test(tvScaleSrc) &&
  /design-zoom/.test(tvScaleSrc)
const hasStageDom =
  /id="tv-frame"/.test(indexHtml) &&
  /id="tv-stage"/.test(indexHtml) &&
  /id="app"/.test(indexHtml)
const hasStageCss = /#tv-frame/.test(tokensCss) && /#tv-stage/.test(tokensCss)
const hasModeInDebug = /metrics\.mode/.test(debugSrc) && /visualScale|visual/.test(debugSrc)

check(
  'tv-no-html-transform-hack',
  !usesHtmlTransform && hasStageApi,
  hasStageApi ? 'applyDesignStage + design-zoom path present' : 'missing stage/zoom API',
)
check(
  'tv-stage-dom',
  hasStageDom && hasStageCss,
  hasStageDom && hasStageCss
    ? 'tv-frame/tv-stage in index.html + tokens.css'
    : `dom=${hasStageDom} css=${hasStageCss}`,
)
check(
  'tv-debug-mode-field',
  hasModeInDebug,
  hasModeInDebug ? 'ViewportDebug shows mode (+ visual)' : 'debug HUD missing mode',
)

// Bootstrap must wire compensation
const hasInlineBootstrap =
  /devicePixelRatio/.test(indexHtml) && /initial-scale/.test(indexHtml) && /1920/.test(indexHtml)
const hasPresentation =
  /applyTvPresentation/.test(mainSrc) && /isHalfWidthHdPanel/.test(tvScaleSrc)
check(
  'tv-bootstrap-wired',
  hasInlineBootstrap && hasPresentation,
  hasInlineBootstrap && hasPresentation
    ? 'index.html inline viewport + applyTvPresentation'
    : `inline=${hasInlineBootstrap} presentation=${hasPresentation}`,
)

// Design viewport: all columns must fit
const rootDesign = computeRootFontPx(DESIGN_WIDTH)
const minAtDesign = boardMinPx(rootDesign)
check(
  'fit-design-1920',
  minAtDesign <= DESIGN_WIDTH,
  `minBoard=${minAtDesign.toFixed(0)}px vs ${DESIGN_WIDTH} (root ${rootDesign})`,
)

const tvViewports = [1100, 1280, 1366, 1600, 1920]
for (const vw of tvViewports) {
  const root = computeRootFontPx(vw)
  const minB = boardMinPx(root)
  const fits = minB <= vw
  const colW = fits ? colWidthWhenFit(vw, root) : colMinPx(root)
  const vis = visibleCols(vw, root)
  check(
    `fit-vw-${vw}`,
    fits && vis === colCount,
    `root=${root} minBoard=${minB.toFixed(0)} col≈${colW.toFixed(0)}px visible ${vis}/${colCount}`,
  )
}

check(
  'not-using-old-225px-min',
  !(minUnit === 'px' && minTrack >= 220),
  `current min track ${minTrack}${minUnit}`,
)

const failed = checks.filter((c) => !c.ok).length
console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} RED`} (${checks.length} checks)`)
process.exit(failed === 0 ? 0 : 1)
