import PusherImport from 'pusher-js'

// pusher-js ESM/CJS interop (Vite / Node differ)
const Pusher =
  typeof PusherImport === 'function'
    ? PusherImport
    : PusherImport?.Pusher || PusherImport?.default?.Pusher || PusherImport?.default

/** Same app as seller RealTimeDashSimplified (public key only) */
const FALLBACK_KEY = '60fb1a4335adfc9e5b50'
const FALLBACK_CLUSTER = 'ap3'

/**
 * Events used by seller RealTimeDashSimplified on channel `orders-{storeId}`.
 */
export const ORDER_EVENTS = [
  'order-payed',
  'order-created',
  'order-assembly',
  'order-packed',
  'order-taken',
  'order-delivering',
  'order-arrived',
  'order-completed',
  'order-cancelled',
  'order-status-changed',
]

/**
 * @param {object} options
 * @param {number|string} options.storeId
 * @param {(event: string, data: unknown) => void} options.onEvent
 * @param {(online: boolean) => void} [options.onConnectionChange]
 * @returns {{ disconnect: () => void }}
 */
export function subscribeStoreOrders({ storeId, onEvent, onConnectionChange }) {
  if (typeof Pusher !== 'function') {
    console.error('[pusher] Pusher constructor not found', PusherImport)
    onConnectionChange?.(false)
    return { disconnect: () => {} }
  }

  const key = import.meta.env.VITE_PUSHER_APP_KEY || FALLBACK_KEY
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || FALLBACK_CLUSTER

  const pusher = new Pusher(key, {
    cluster,
    // seller uses encrypted: true — both forceTLS/encrypted work on modern pusher-js
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  })

  const channelName = `orders-${storeId}`
  const channel = pusher.subscribe(channelName)

  const setOnline = (online) => {
    onConnectionChange?.(online)
  }

  // Sync current state immediately (may already be connecting/connected)
  setOnline(pusher.connection.state === 'connected')

  pusher.connection.bind('state_change', ({ current }) => {
    // connected = online; connecting/unavailable/failed/disconnected = offline badge
    setOnline(current === 'connected')
    console.info('[pusher] state →', current)
  })

  pusher.connection.bind('connected', () => {
    console.info('[pusher] connected', pusher.connection.socket_id)
    setOnline(true)
  })

  pusher.connection.bind('disconnected', () => {
    console.warn('[pusher] disconnected')
    setOnline(false)
  })

  pusher.connection.bind('unavailable', () => {
    console.warn('[pusher] unavailable')
    setOnline(false)
  })

  pusher.connection.bind('failed', () => {
    console.error('[pusher] failed')
    setOnline(false)
  })

  // Non-fatal errors must NOT flip the pill to Offline
  pusher.connection.bind('error', (err) => {
    console.error('[pusher] connection error', err)
  })

  channel.bind('pusher:subscription_succeeded', () => {
    console.info(`[pusher] subscribed to ${channelName}`)
    setOnline(true)
  })

  channel.bind('pusher:subscription_error', (err) => {
    console.error(`[pusher] subscription error on ${channelName}`, err)
  })

  for (const eventName of ORDER_EVENTS) {
    channel.bind(eventName, (data) => onEvent(eventName, data))
  }

  return {
    disconnect() {
      try {
        channel.unbind_all()
        pusher.unsubscribe(channelName)
        pusher.disconnect()
      } catch (e) {
        console.warn('[pusher] disconnect error', e)
      }
    },
  }
}

/** DB status → UI column key (same as dashboard API status_ui) */
export const STATUS_UI_MAP = {
  accepted: 'created',
  assembly: 'assembly',
  packed: 'packed',
  taken: 'taken',
  delivering: 'delivering',
  arrived: 'almost',
}

export const ACTIVE_STATUSES = new Set(Object.keys(STATUS_UI_MAP))
