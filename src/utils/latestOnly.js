/**
 * Guard for overlapping async loads where only the freshest answer may be used.
 *
 * The board pulls orders from four places at once — the 15s poll, the
 * `visibilitychange` reload, the pusher reconnect sync and `scheduleReload`.
 * They answer out of order, so a request sent before a new order existed can
 * land after one that already saw it and put the pre-order list back on the TV.
 */

export function createLatestOnlyGate() {
  let seq = 0

  return {
    /**
     * Open a run. Call before awaiting; use the returned check after each await.
     * @returns {() => boolean} true once a newer run (or invalidate) took over
     */
    begin() {
      const mine = ++seq
      return () => mine !== seq
    },

    /**
     * Discard every run in flight — the context they loaded for is gone
     * (store switch, logout, teardown).
     */
    invalidate() {
      seq += 1
    },
  }
}
