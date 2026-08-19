/**
 * Pure tests: new order is voiced once, no matter which source saw it first
 * (pusher `order-created` or the HTTP list diff).
 */
import { createNewOrderAnnouncer } from '../src/utils/newOrderAnnouncer.js'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    failed++
    return
  }
  console.log('ok  ', msg)
}

function make(limit) {
  let plays = 0
  const announcer = createNewOrderAnnouncer({ onNewOrder: () => plays++, limit })
  return { announcer, plays: () => plays }
}

// --- pusher first, then the quiet reload sees the same order ---
{
  const { announcer, plays } = make()
  announcer.announce([1234])
  announcer.announce(['1234']) // HTTP list — same id as string
  assert(plays() === 1, 'pusher then HTTP diff → one sound (string/number id)')
}

// --- HTTP diff first (event missed), then a late pusher event ---
{
  const { announcer, plays } = make()
  announcer.announce(['1234'])
  announcer.announce([1234])
  assert(plays() === 1, 'HTTP diff then late pusher event → one sound')
}

// --- backend broadcasting order-created twice ---
{
  const { announcer, plays } = make()
  announcer.announce([777])
  announcer.announce([777])
  assert(plays() === 1, 'duplicate order-created broadcast → one sound')
}

// --- a genuinely different order still sounds ---
{
  const { announcer, plays } = make()
  announcer.announce([1])
  announcer.announce([2])
  assert(plays() === 2, 'two different orders → two sounds')
}

// --- one reload bringing several new orders → one sound, not a stacked queue ---
{
  const { announcer, plays } = make()
  const voiced = announcer.announce([10, 11, 12])
  assert(plays() === 1 && voiced === true, 'batch of new ids → single sound')
  assert(announcer.announce([10, 11, 12]) === false, 'same batch again → silent')
  assert(plays() === 1, 'repeated batch adds no sound')
}

// --- nothing to say ---
{
  const { announcer, plays } = make()
  assert(announcer.announce([]) === false, 'empty batch → false')
  assert(announcer.announce([null, undefined, '']) === false, 'blank ids ignored')
  assert(plays() === 0, 'no sound for empty/blank input')
}

// --- memory stays bounded on a long-running TV ---
{
  const { announcer } = make(3)
  announcer.announce([1, 2, 3, 4, 5])
  assert(announcer.size() === 3, 'set capped at limit')
  assert(announcer.has(5) && announcer.has(4), 'newest ids kept')
  assert(!announcer.has(1), 'oldest id evicted')
}

console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} RED`}`)
process.exit(failed === 0 ? 0 : 1)
