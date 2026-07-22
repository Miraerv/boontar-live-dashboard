import { useDashboardAuth } from '../composables/useDashboardAuth'

/**
 * As in RealTimeDashSimplified: storage / «Мороженое» is not product category.
 * Show a type badge only for frozen (and optionally chilled).
 */
function mapTypeBadge(raw) {
  if (raw.freez || raw.storage_type === 'frozen') {
    return 'Мороженое'
  }
  if (raw.storage_type === 'chilled') {
    return 'Холодные'
  }
  return null
}

/**
 * Map backend dashboard order → OrderCard shape.
 * @param {Record<string, unknown>} raw
 */
export function mapOrder(raw) {
  const address = raw.address ?? {}
  const layerRaw = raw.layer
  const layer =
    layerRaw != null && layerRaw !== '' && Number.isFinite(Number(layerRaw))
      ? Math.trunc(Number(layerRaw))
      : null

  return {
    id: raw.order_number ?? String(raw.id),
    orderId: raw.id,
    storeId: raw.store_id != null ? Number(raw.store_id) : null,
    storeName: raw.store_name ? String(raw.store_name) : null,
    total: raw.total ?? 0,
    status: raw.status_ui ?? raw.status,
    // only frozen/chilled — not dominant product category
    category: mapTypeBadge(raw),
    storageType: raw.storage_type ?? 'ambient',
    paid: Boolean(raw.paid),
    freez: Boolean(raw.freez),
    /** Delivery zone layer (0–3+); drives packed chime */
    layer,
    address: {
      text: address.text || 'Адрес не указан',
      distanceKm: address.distance_km ?? null,
    },
    itemCount: raw.item_count ?? 0,
    itemFreez: raw.item_freez ?? 0,
    itemCancelled: raw.item_cancelled ?? 0,
    itemPacked: raw.item_packed ?? 0,
    createdAt: raw.created_at ?? null,
    expiringTime: raw.expiring_time ?? null,
  }
}

/**
 * @param {string} path
 * @returns {Promise<ReturnType<typeof mapOrder>[]>}
 */
async function fetchOrdersPath(path) {
  const { getToken } = useDashboardAuth()
  const token = getToken()

  /** @type {HeadersInit} */
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(path, { headers })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Сессия истекла или нет доступа. Войди заново.')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Orders request failed (${response.status}): ${body || response.statusText}`)
  }

  const json = await response.json()
  const list = json?.data?.orders ?? []

  return list.map(mapOrder)
}

/**
 * @param {number|string} storeId
 * @returns {Promise<ReturnType<typeof mapOrder>[]>}
 */
export async function fetchStoreOrders(storeId) {
  return fetchOrdersPath(`/api/dashboard/stores/${storeId}/orders`)
}

/**
 * All accessible stores (master → every warehouse).
 * @returns {Promise<ReturnType<typeof mapOrder>[]>}
 */
export async function fetchAllOrders() {
  return fetchOrdersPath('/api/dashboard/orders')
}
