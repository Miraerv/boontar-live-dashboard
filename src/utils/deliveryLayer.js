/**
 * Delivery zone layer from delivery_detail (same rules as seller OrderFormatter::resolveLayer).
 *
 * - raw layer is int (or numeric string)
 * - layer === 1 && subzone_code === 1 → 0
 * - layer === 1 && subzone_code === 2 → 1
 * - otherwise → raw layer
 *
 * @param {{ layer?: unknown, subzone_code?: unknown } | null | undefined} delivery
 * @returns {number | null}
 */
export function resolveLayerFromDelivery(delivery) {
  if (!delivery || delivery.layer == null || delivery.layer === '') return null
  const layer = Number(delivery.layer)
  if (!Number.isFinite(layer)) return null

  const subRaw = delivery.subzone_code
  const subzone =
    subRaw == null || subRaw === '' ? null : Number(subRaw)

  if (layer === 1) {
    if (subzone === 1) return 0
    if (subzone === 2) return 1
  }

  return layer
}

/**
 * Resolve layer from a live-dashboard order, Pusher order payload, or nested delivery.
 * Prefer explicit numeric `layer` when already resolved by the API.
 *
 * @param {Record<string, unknown> | null | undefined} order
 * @returns {number | null}
 */
export function resolveOrderLayer(order) {
  if (!order) return null

  // API already returns resolved int
  if (order.layer != null && order.layer !== '' && typeof order.layer !== 'object') {
    // Avoid treating "Слой 1" style strings without digits-only as valid
    const n = Number(order.layer)
    if (Number.isFinite(n) && String(order.layer).trim() !== '' && !Number.isNaN(n)) {
      // reject non-numeric labels like "Слой 1"
      if (/^-?\d+(\.\d+)?$/.test(String(order.layer).trim())) {
        return Math.trunc(n)
      }
    }
  }

  const delivery =
    order.delivery_detail ??
    order.delivery_details ??
    order.deliveryDetail ??
    null

  if (Array.isArray(delivery)) {
    return resolveLayerFromDelivery(delivery[0])
  }

  return resolveLayerFromDelivery(delivery)
}

/** Sound files present in public/sounds */
export const LAYER_SOUND_MIN = 0
export const LAYER_SOUND_MAX = 3

/**
 * @param {number | null | undefined} layer
 * @returns {string | null} public URL or null if no clip
 */
export function layerSoundUrl(layer) {
  if (layer == null || !Number.isFinite(Number(layer))) return null
  const n = Math.trunc(Number(layer))
  if (n < LAYER_SOUND_MIN || n > LAYER_SOUND_MAX) return null
  return `/sounds/layer-${n}.mp3`
}
