/**
 * New order is discovered twice by design: the pusher `order-created` event
 * (fast) and the HTTP list diff (safety net when the event is missed).
 * Both routes go through here so an order is voiced exactly once — whichever
 * source sees it first wins, the other stays silent.
 *
 * Keyed by order id as string: pusher sends numbers, the API list may send
 * either, and a type mismatch used to slip past the old dedupe.
 */

/** Ids kept in memory; a TV runs for weeks, so the set must not grow forever. */
const DEFAULT_LIMIT = 500

/**
 * @param {object} options
 * @param {() => void} [options.onNewOrder] play sound / notify
 * @param {number} [options.limit] how many recent ids to remember
 */
export function createNewOrderAnnouncer({ onNewOrder, limit = DEFAULT_LIMIT } = {}) {
  /** @type {Set<string>} insertion-ordered — oldest ids are evicted first */
  const announced = new Set()
  const max = Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : DEFAULT_LIMIT

  /** @param {string} key */
  function remember(key) {
    announced.add(key)
    if (announced.size <= max) return
    for (const old of announced) {
      announced.delete(old)
      if (announced.size <= max) break
    }
  }

  return {
    /**
     * Voice a batch of order ids. One call → at most one sound, even for
     * several fresh orders (the queue would otherwise stack ru+ykt per order).
     * @param {Array<number|string|null|undefined>|number|string|null|undefined} ids
     * @returns {boolean} true when the sound was triggered
     */
    announce(ids) {
      const list = Array.isArray(ids) ? ids : [ids]
      /** @type {string[]} */
      const fresh = []

      for (const id of list) {
        if (id == null || id === '') continue
        const key = String(id)
        if (announced.has(key) || fresh.includes(key)) continue
        fresh.push(key)
      }

      if (fresh.length === 0) return false

      for (const key of fresh) remember(key)
      onNewOrder?.()
      return true
    },

    /**
     * @param {number|string|null|undefined} id
     * @returns {boolean}
     */
    has(id) {
      return id == null ? false : announced.has(String(id))
    },

    /** @returns {number} */
    size() {
      return announced.size
    },
  }
}
