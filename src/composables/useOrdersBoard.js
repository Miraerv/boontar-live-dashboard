import { computed, onUnmounted, ref } from 'vue'
import { fetchAllOrders, fetchStoreOrders } from '../api/orders'
import { ACTIVE_STATUSES, STATUS_UI_MAP, subscribeStoreOrders } from '../api/pusher'
import { ALL_STORES_ID } from '../constants/stores'
import { STATUSES } from '../constants/statuses'
import { isOrderFromToday } from '../utils/time'

/** Quiet HTTP poll — TV kiosk safety net when Pusher drops or filters events. */
const POLL_MS = 15_000

/**
 * Live orders board: HTTP load + Pusher patches for a single store or all stores.
 *
 * @param {object} options
 * @param {import('vue').Ref<number>} options.storeId selected store or ALL_STORES_ID
 * @param {import('vue').Ref<number[]>} [options.storeIds] warehouses for multi-channel subscribe
 * @param {() => void | Promise<void>} [options.onSessionDead] called on 401/403-style errors
 * @param {() => void} [options.onNewOrder] play sound / notify when a new order id appears
 */
export function useOrdersBoard({ storeId, storeIds, onSessionDead, onNewOrder }) {
  const orders = ref([])
  const loading = ref(true)
  const error = ref(null)
  const pusherOnline = ref(false)
  const syncing = ref(false)
  const started = ref(false)

  let pusherSub = null
  let reloadTimer = null
  /** @type {ReturnType<typeof setInterval>|null} */
  let pollInterval = null
  /** @type {Set<number|string>|null} null until first successful load (no sound on seed) */
  let knownOrderIds = null
  let wasPusherOnline = false
  /** Skip one online→sync right after connectPusher (start/reconnect already load). */
  let skipNextOnlineSync = false
  /** @type {((this: Document, ev: Event) => void)|null} */
  let onVisibility = null

  const isAllStores = () => storeId.value === ALL_STORES_ID

  const ordersByStatus = computed(() => {
    const groups = {}
    for (const column of STATUSES) {
      groups[column.key] = orders.value.filter((o) => o.status === column.key)
    }
    return groups
  })

  function clearReloadTimer() {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
      reloadTimer = null
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function startPolling() {
    stopPolling()
    pollInterval = setInterval(() => {
      if (!started.value) return
      loadOrders({ quiet: true })
    }, POLL_MS)
  }

  function unbindVisibility() {
    if (!onVisibility || typeof document === 'undefined') return
    document.removeEventListener('visibilitychange', onVisibility)
    onVisibility = null
  }

  function bindVisibility() {
    if (typeof document === 'undefined' || onVisibility) return
    onVisibility = () => {
      if (document.visibilityState === 'visible' && started.value) {
        loadOrders({ quiet: true })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
  }

  /**
   * After a successful fetch: seed or detect new order ids and notify once.
   * @param {Array<{ orderId?: number|string }>} list
   */
  function applyOrderList(list) {
    const nextIds = new Set(list.map((o) => o.orderId).filter((id) => id != null))

    if (knownOrderIds === null) {
      knownOrderIds = nextIds
    } else {
      let hasNew = false
      for (const id of nextIds) {
        if (!knownOrderIds.has(id)) {
          hasNew = true
          break
        }
      }
      if (hasNew) {
        onNewOrder?.()
      }
      knownOrderIds = nextIds
    }

    orders.value = list
  }

  /**
   * Mark id as already notified so a following quiet reload does not double-beep.
   * No-op before first successful load (so we never seed with a partial id set).
   * @param {number|string} orderId
   */
  function markOrderNotified(orderId) {
    if (knownOrderIds == null) return
    knownOrderIds.add(orderId)
  }

  /**
   * @param {{ quiet?: boolean }} [opts]
   */
  async function loadOrders(opts = {}) {
    const quiet = Boolean(opts.quiet)
    if (!quiet) {
      loading.value = true
      error.value = null
    } else {
      syncing.value = true
    }

    try {
      let list = isAllStores()
        ? await fetchAllOrders()
        : await fetchStoreOrders(storeId.value)
      // Store badge only useful when many warehouses share one board
      if (!isAllStores()) {
        list = list.map((o) => (o.storeName ? { ...o, storeName: null } : o))
      }
      applyOrderList(list)
      error.value = null
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const sessionDead = /сессия|нет доступа|401|403/i.test(message)
      if (sessionDead) {
        await onSessionDead?.()
        return
      }
      if (!quiet) {
        error.value = message
        orders.value = []
      } else {
        console.warn('[orders] quiet reload failed', e)
      }
    } finally {
      loading.value = false
      syncing.value = false
    }
  }

  function scheduleReload(delayMs = 350) {
    clearReloadTimer()
    reloadTimer = setTimeout(() => {
      reloadTimer = null
      loadOrders({ quiet: true })
    }, delayMs)
  }

  function patchPaid(orderId, paid) {
    const idx = orders.value.findIndex((o) => o.orderId === orderId)
    if (idx === -1) return
    const next = [...orders.value]
    next[idx] = { ...next[idx], paid: Boolean(paid) }
    orders.value = next
  }

  function moveOrRemoveByStatus(orderId, dbStatus) {
    const idx = orders.value.findIndex((o) => o.orderId === orderId)

    if (!ACTIVE_STATUSES.has(dbStatus)) {
      if (idx !== -1) {
        orders.value = orders.value.filter((o) => o.orderId !== orderId)
      }
      return
    }

    const statusUi = STATUS_UI_MAP[dbStatus] ?? dbStatus
    if (idx === -1) {
      scheduleReload()
      return
    }

    const next = [...orders.value]
    next[idx] = { ...next[idx], status: statusUi }
    orders.value = next
  }

  /**
   * Store ids currently in scope (single or all).
   * @returns {number[]}
   */
  function activeStoreIds() {
    if (isAllStores()) {
      return Array.isArray(storeIds?.value) ? storeIds.value : []
    }
    return [storeId.value]
  }

  /**
   * @param {string} eventName
   * @param {any} data
   */
  function onPusherEvent(eventName, data) {
    const order = data?.order
    if (!order?.id) {
      scheduleReload()
      return
    }

    // Ignore events for stores outside current selection
    if (order.store_id != null) {
      const allowed = new Set(activeStoreIds().map(String))
      if (allowed.size > 0 && !allowed.has(String(order.store_id))) {
        return
      }
    }

    // Non-customer events are noise for this board (backend list is customer-only)
    if (order.type != null && order.type !== 'customer') {
      return
    }

    // Same day only (Yakutsk calendar day), mirrors backend list filter
    if (order.created_at && !isOrderFromToday(order.created_at)) {
      return
    }

    const orderId = order.id

    switch (eventName) {
      case 'order-payed':
        patchPaid(orderId, order.paid)
        break
      case 'order-created':
        // Immediate beep for pickers; mark id so quiet reload does not double-play
        onNewOrder?.()
        markOrderNotified(orderId)
        scheduleReload(200)
        break
      case 'order-assembly':
        moveOrRemoveByStatus(orderId, 'assembly')
        break
      case 'order-packed':
        moveOrRemoveByStatus(orderId, 'packed')
        break
      case 'order-taken':
        moveOrRemoveByStatus(orderId, 'taken')
        break
      case 'order-delivering':
        moveOrRemoveByStatus(orderId, 'delivering')
        break
      case 'order-arrived':
        moveOrRemoveByStatus(orderId, 'arrived')
        break
      case 'order-completed':
      case 'order-cancelled':
        moveOrRemoveByStatus(orderId, eventName === 'order-completed' ? 'completed' : 'cancelled')
        break
      case 'order-status-changed':
        moveOrRemoveByStatus(orderId, order.status)
        break
      default:
        scheduleReload()
    }
  }

  function connectPusher() {
    pusherSub?.disconnect()
    wasPusherOnline = false
    pusherOnline.value = false
    skipNextOnlineSync = true
    pusherSub = subscribeStoreOrders({
      storeId: activeStoreIds(),
      onEvent: onPusherEvent,
      onConnectionChange: (online) => {
        const becameOnline = online && !wasPusherOnline
        wasPusherOnline = online
        pusherOnline.value = online
        if (!becameOnline || !started.value) return
        // First connected after connectPusher: start/reconnect already call loadOrders
        if (skipNextOnlineSync) {
          skipNextOnlineSync = false
          return
        }
        // True reconnect after an outage — catch up via HTTP
        loadOrders({ quiet: true })
      },
    })
  }

  function disconnectPusher() {
    pusherSub?.disconnect()
    pusherSub = null
    pusherOnline.value = false
    wasPusherOnline = false
  }

  /** First start after unlock (no-op if already running). */
  function start() {
    if (started.value) return
    started.value = true
    knownOrderIds = null
    connectPusher()
    bindVisibility()
    startPolling()
    loadOrders()
  }

  /** Rebind to current storeId (store switch while board is active). */
  function reconnect() {
    clearReloadTimer()
    knownOrderIds = null
    orders.value = []
    connectPusher()
    startPolling()
    loadOrders()
  }

  /** Tear down realtime + timers; keep started=false so start() can run again. */
  function stop() {
    clearReloadTimer()
    stopPolling()
    unbindVisibility()
    disconnectPusher()
    knownOrderIds = null
    started.value = false
  }

  function clearOrders() {
    orders.value = []
    error.value = null
    knownOrderIds = null
  }

  onUnmounted(() => {
    clearReloadTimer()
    stopPolling()
    unbindVisibility()
    disconnectPusher()
  })

  return {
    orders,
    loading,
    error,
    syncing,
    pusherOnline,
    started,
    ordersByStatus,
    loadOrders,
    start,
    reconnect,
    stop,
    clearOrders,
  }
}
