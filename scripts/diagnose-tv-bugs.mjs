/**
 * Red-capable feedback loop for TV dashboard bugs.
 * Exit 0 = green, exit 1 = red.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const board = read('src/composables/useOrdersBoard.js')
const sound = read('src/utils/notifySound.js')
const card = read('src/components/OrderCard.vue')
const app = read('src/App.vue')
const tokens = read('src/styles/tokens.css')
const tvScale = read('src/utils/tvScale.js')
const main = read('src/main.js')

/** @type {{ id: string, ok: boolean, detail: string }[]} */
const checks = []
function check(id, ok, detail) {
  checks.push({ id, ok, detail })
}

// --- Bug 1: auto refresh ---
const hasPoll =
  /(?:POLL|pollInterval|startPolling|SYNC_MS|pollMs)/.test(board) ||
  (/setInterval\s*\(/.test(board) && /loadOrders\s*\(\s*\{\s*quiet:\s*true/.test(board))
const hasVisibility =
  /visibilitychange/.test(board) || /document\.visibilityState/.test(board)
const hasReconnectReload =
  /onConnectionChange[\s\S]{0,400}loadOrders|wasOffline|prevOnline|reconnected|skipNextOnlineSync/.test(
    board,
  )

check('auto-refresh-poll', hasPoll, hasPoll ? 'periodic poll present' : 'missing periodic quiet poll')
check(
  'auto-refresh-visibility',
  hasVisibility,
  hasVisibility ? 'visibility reload present' : 'missing visibilitychange reload',
)
check(
  'auto-refresh-reconnect',
  hasReconnectReload,
  hasReconnectReload ? 'reload on pusher reconnect' : 'missing reload when realtime comes back',
)

// --- Bug 2: rem + root scale (not raw large px) ---
const idRem = /font-size:\s*var\(--text-lg\)/.test(card) || /\.card__id[\s\S]*?font-size:\s*[\d.]+rem/.test(card)
const priceRem =
  /font-size:\s*var\(--text-base\)/.test(card) || /\.card__price[\s\S]*?font-size:\s*[\d.]+rem/.test(card)
const addrRem =
  /font-size:\s*var\(--text-md\)/.test(card) ||
  /\.address-box__value[\s\S]*?font-size:\s*(var\(--text-md\)|[\d.]+rem)/.test(card)
const bodyRem = /font-size:\s*var\(--text-base\)/.test(tokens)
const hasClampRoot = /clamp\(\s*11px[\s\S]*1920[\s\S]*15px\s*\)/.test(tokens)
const hasTvScaleUtil = /computeRootFontPx/.test(tvScale) && /applyTvScale/.test(main)
const fontsOk = idRem && priceRem && addrRem && bodyRem && hasClampRoot && hasTvScaleUtil
check(
  'font-density-rem-scale',
  fontsOk,
  fontsOk
    ? 'rem type scale + html root clamp + tvScale apply'
    : `idRem=${idRem} priceRem=${priceRem} addrRem=${addrRem} bodyRem=${bodyRem} clamp=${hasClampRoot} tvScale=${hasTvScaleUtil}`,
)

// --- Bug 3: sound on newly appeared orders ---
const hasPrevOrderIds =
  /(?:prevOrderIds|knownOrderIds|seenOrderIds|lastOrderIds)\b/.test(board) ||
  /new Set\([\s\S]{0,80}orderId/.test(board)
const playsOnDiff =
  hasPrevOrderIds && /onNewOrder\??\.\(\)/.test(board) && /loadOrders/.test(board)

const onlyCreatedSound =
  (board.match(/onNewOrder\??\.\(\)/g) || []).length === 1 &&
  /case 'order-created'[\s\S]{0,120}onNewOrder/.test(board)

check(
  'sound-on-list-diff',
  playsOnDiff,
  playsOnDiff
    ? 'plays sound when loadOrders discovers new order ids'
    : onlyCreatedSound
      ? 'sound only on order-created event — silent when event missed / only poll sees order'
      : 'no reliable new-order sound path',
)

const hasPlayRetry = /catch[\s\S]{0,200}bindGesture|enabled\s*=\s*false/.test(sound)
check(
  'sound-play-retry',
  hasPlayRetry,
  hasPlayRetry ? 're-binds unlock if play fails' : 'no play() failure recovery',
)

const appWiresSound = /onNewOrder:\s*playNewOrderSound/.test(app)
check('sound-wired', appWiresSound, appWiresSound ? 'wired' : 'not wired')

// Toolbar bottom for TV
const bare = app.replace(/<!--[\s\S]*?-->/g, '')
const toolbarAfterBoard =
  bare.indexOf('<DashboardToolbar') > bare.indexOf('<OrdersBoard') && bare.includes('<OrdersBoard')
check(
  'toolbar-bottom',
  toolbarAfterBoard,
  toolbarAfterBoard ? 'toolbar after board' : 'toolbar still above board',
)

let failed = 0
for (const c of checks) {
  const mark = c.ok ? 'GREEN' : 'RED'
  if (!c.ok) failed++
  console.log(`[${mark}] ${c.id}: ${c.detail}`)
}
console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} RED`} (${checks.length} checks)`)
process.exit(failed === 0 ? 0 : 1)
