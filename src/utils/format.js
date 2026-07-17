/**
 * Format money for RU dashboard cards.
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatMoney(value) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'

  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}
