import { computed, onUnmounted, ref } from 'vue'
import { fetchStoreOrders } from '../api/orders'
import { ACTIVE_STATUSES, STATUS_UI_MAP, subscribeStoreOrders } from '../api/pusher'
import { STATUSES } from '../constants/statuses'
import { isOrderFromToday } from '../utils/time'

/**
 * Live orders board: HTTP load + Pusher patches for a single store.
 *
 * @param {object} options
 * @param {import('vue').Ref<number>} options.storeId
 * @param {() => void | Promise<void>} [options.onSessionDead] called on 401/403-style errors
 * @param {() => void} [options.onNewOrder] play sound / notify on order-created
 */
export function useOrdersBoard({ storeId, onSessionDead, onNewOrder }) {
  const orders = ref([])
  const loading = ref(true)
  const error = ref(null)
  const pusherOnline = ref(false)
  const syncing = ref(false)
  const started = ref(false)

  let pusherSub = null
  let reloadTimer = null

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
      orders.value = await fetchStoreOrders(storeId.value)
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
   * @param {string} eventName
   * @param {any} data
   */
  function onPusherEvent(eventName, data) {
    const order = data?.order
    if (!order?.id) {
      scheduleReload()
      return
    }

    // Ignore events for other stores if payload carries store_id
    if (order.store_id != null && String(order.store_id) !== String(storeId.value)) {
      return
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
        onNewOrder?.()
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
    pusherOnline.value = false
    pusherSub = subscribeStoreOrders({
      storeId: storeId.value,
      onEvent: onPusherEvent,
      onConnectionChange: (online) => {
        pusherOnline.value = online
      },
    })
  }

  function disconnectPusher() {
    pusherSub?.disconnect()
    pusherSub = null
    pusherOnline.value = false
  }

  /** First start after unlock (no-op if already running). */
  function start() {
    if (started.value) return
    started.value = true
    connectPusher()
    loadOrders()
  }

  /** Rebind to current storeId (store switch while board is active). */
  function reconnect() {
    clearReloadTimer()
    orders.value = []
    connectPusher()
    loadOrders()
  }

  /** Tear down realtime + timers; keep started=false so start() can run again. */
  function stop() {
    clearReloadTimer()
    disconnectPusher()
    started.value = false
  }

  function clearOrders() {
    orders.value = []
    error.value = null
  }

  onUnmounted(() => {
    clearReloadTimer()
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
