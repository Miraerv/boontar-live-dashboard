/**
 * Pure tests: overlapping order loads must not resurrect an older list.
 * Models the real board flow — poll / scheduleReload / store switch answering
 * out of order — on top of the latest-only gate.
 */
import { createLatestOnlyGate } from '../src/utils/latestOnly.js'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    failed++
    return
  }
  console.log('ok  ', msg)
}

/** Board stand-in: a load applies its list only while it is the newest one. */
function makeBoard() {
  const gate = createLatestOnlyGate()
  const state = { list: [], applies: 0 }

  return {
    gate,
    state,
    /**
     * @param {Promise<string[]>} response
     */
    async load(response) {
      const stale = gate.begin()
      const list = await response
      if (stale()) return false
      state.list = list
      state.applies++
      return true
    },
  }
}

/** @param {number} ms @param {any} value */
const after = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))

// --- the reported flow: slow poll started before the order, fast reload after ---
{
  const board = makeBoard()
  const slowPoll = board.load(after(40, ['old-1'])) // sent before the new order
  const fastReload = board.load(after(5, ['old-1', 'new-2'])) // scheduleReload(200)

  const [pollApplied, reloadApplied] = await Promise.all([slowPoll, fastReload])
  assert(reloadApplied === true, 'newest reload applies its list')
  assert(pollApplied === false, 'poll response that overtook it is dropped')
  assert(
    board.state.list.join() === 'old-1,new-2',
    'new order card stays on the board (no revert to pre-order list)',
  )
  assert(board.state.applies === 1, 'stale response never touches board state')
}

// --- sequential loads are untouched by the gate ---
{
  const board = makeBoard()
  assert((await board.load(after(1, ['a']))) === true, 'first sequential load applies')
  assert((await board.load(after(1, ['a', 'b']))) === true, 'second sequential load applies')
  assert(board.state.list.join() === 'a,b', 'board holds the latest list')
}

// --- three in flight: only the newest wins, whoever answers first ---
{
  const board = makeBoard()
  const results = await Promise.all([
    board.load(after(30, ['first'])),
    board.load(after(2, ['second'])),
    board.load(after(15, ['third'])),
  ])
  assert(results.join() === 'false,false,true', 'only the last started load applies')
  assert(board.state.list.join() === 'third', 'board holds the newest store request')
}

// --- store switch / logout: pending response of the old store is discarded ---
{
  const board = makeBoard()
  const pending = board.load(after(20, ['store-54-order']))
  board.gate.invalidate() // reconnect() / clearOrders() / stop()
  assert((await pending) === false, 'invalidate drops the in-flight load')
  assert(board.state.applies === 0, 'other store orders never reach the board')

  const fresh = await board.load(after(1, ['store-56-order']))
  assert(fresh === true, 'load started after invalidate still applies')
  assert(board.state.list.join() === 'store-56-order', 'board shows the new store')
}

console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} RED`}`)
process.exit(failed === 0 ? 0 : 1)
