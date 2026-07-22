/**
 * Pure logic test: first load seeds without notify; later load with new id notifies once.
 * Mirrors applyOrderList in useOrdersBoard.
 */
function applyOrderList(list, knownOrderIds, onNewOrder) {
  const nextIds = new Set(list.map((o) => o.orderId).filter((id) => id != null))
  let notified = false
  let nextKnown = knownOrderIds

  if (nextKnown === null) {
    nextKnown = nextIds
  } else {
    let hasNew = false
    for (const id of nextIds) {
      if (!nextKnown.has(id)) {
        hasNew = true
        break
      }
    }
    if (hasNew) {
      onNewOrder()
      notified = true
    }
    nextKnown = nextIds
  }
  return { knownOrderIds: nextKnown, notified }
}

let sounds = 0
const onNew = () => {
  sounds++
}

let known = null
let r = applyOrderList([{ orderId: 1 }, { orderId: 2 }], known, onNew)
known = r.knownOrderIds
console.assert(sounds === 0, 'seed must not sound')
console.assert(r.notified === false)

r = applyOrderList([{ orderId: 1 }, { orderId: 2 }, { orderId: 3 }], known, onNew)
known = r.knownOrderIds
console.assert(sounds === 1, 'new id must sound once')
console.assert(r.notified === true)

r = applyOrderList([{ orderId: 1 }, { orderId: 2 }, { orderId: 3 }], known, onNew)
known = r.knownOrderIds
console.assert(sounds === 1, 'same set must not sound again')

r = applyOrderList([{ orderId: 2 }, { orderId: 3 }], known, onNew)
known = r.knownOrderIds
console.assert(sounds === 1, 'removal must not sound')

r = applyOrderList([{ orderId: 2 }, { orderId: 3 }, { orderId: 9 }], known, onNew)
known = r.knownOrderIds
console.assert(sounds === 2, 'another new id must sound')
console.assert(known.has(9), 'new id retained')

console.log('PASS test-order-id-diff')
