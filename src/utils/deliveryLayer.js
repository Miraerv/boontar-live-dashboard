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

/**
 * Visual chip for Order Card address-box (logistics). Hidden when layer unknown.
 * Tone 0–3 map to layer palette; any other finite int → fallback.
 *
 * @param {unknown} layer
 * @returns {{ label: string, tone: '0' | '1' | '2' | '3' | 'fallback' } | null}
 */
export function layerChip(layer) {
  if (layer == null || layer === '') return null
  if (typeof layer === 'object') return null
  const raw = String(layer).trim()
  if (raw === '' || !/^-?\d+(\.\d+)?$/.test(raw)) return null
  const n = Math.trunc(Number(raw))
  if (!Number.isFinite(n)) return null

  const label = `Слой ${n}`
  if (n >= LAYER_SOUND_MIN && n <= LAYER_SOUND_MAX) {
    return { label, tone: /** @type {'0'|'1'|'2'|'3'} */ (String(n)) }
  }
  return { label, tone: 'fallback' }
}
