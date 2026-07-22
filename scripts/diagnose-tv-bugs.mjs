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
  /onConnectionChange[\s\S]{0,400}loadOrders|wasOffline|prevOnline|reconnected/.test(board)

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

// --- Bug 2: fonts ---
const idSize = Number((card.match(/\.card__id\s*\{[^}]*font-size:\s*([\d.]+)px/) || [])[1] || 0)
const priceSize = Number((card.match(/\.card__price\s*\{[^}]*font-size:\s*([\d.]+)px/) || [])[1] || 0)
const addrSize = Number(
  (card.match(/\.address-box__value\s*\{[^}]*font-size:\s*([\d.]+)px/) || [])[1] || 0,
)
const bodySize = Number((tokens.match(/body\s*\{[^}]*font-size:\s*([\d.]+)px/) || [])[1] || 0)
const fontsOk = idSize > 0 && idSize <= 15 && priceSize > 0 && priceSize <= 14 && addrSize > 0 && addrSize <= 12
check(
  'font-density',
  fontsOk,
  `id=${idSize} price=${priceSize} address=${addrSize} body=${bodySize} (need id≤15 price≤14 address≤12)`,
)

// --- Bug 3: sound on newly appeared orders (poll/diff), not only Pusher ---
// Require an explicit previous-id Set/Map used to detect additions after loadOrders
const hasPrevOrderIds =
  /(?:prevOrderIds|knownOrderIds|seenOrderIds|lastOrderIds)\b/.test(board) ||
  /new Set\([\s\S]{0,80}orderId/.test(board)
const playsOnDiff =
  hasPrevOrderIds &&
  /onNewOrder\??\.\(\)/.test(board) &&
  /loadOrders/.test(board)

// order-created alone is not enough for TV when events drop
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

// Explicit TV unlock: login / toolbar click should be enough (pointerdown covers it),
// but play() after long idle often fails — need retry/re-unlock on failure (already partial)
const hasPlayRetry = /catch[\s\S]{0,200}bindGesture|enabled\s*=\s*false/.test(sound)
check(
  'sound-play-retry',
  hasPlayRetry,
  hasPlayRetry ? 're-binds unlock if play fails' : 'no play() failure recovery',
)

const appWiresSound = /onNewOrder:\s*playNewOrderSound/.test(app)
check('sound-wired', appWiresSound, appWiresSound ? 'wired' : 'not wired')

let failed = 0
for (const c of checks) {
  const mark = c.ok ? 'GREEN' : 'RED'
  if (!c.ok) failed++
  console.log(`[${mark}] ${c.id}: ${c.detail}`)
}
console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} RED`} (${checks.length} checks)`)
process.exit(failed === 0 ? 0 : 1)
