const BUSINESS_TZ = 'Asia/Yakutsk'

/**
 * Parse API datetime.
 *
 * Dashboard backend uses app timezone UTC and serializes with
 * Carbon::toDateTimeString() → "YYYY-MM-DD HH:mm:ss" (no offset).
 * Browsers treat that as *local* time, so in Yakutsk age is +9h wrong.
 * Naked timestamps from this API are always UTC.
 *
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseApiDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const raw = String(value).trim()
  if (!raw) return null

  // Already has explicit zone: Z or ±HH:MM / ±HHMM
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  // "2026-07-16 08:21:00" / "2026-07-16T08:21:00" / with fraction → UTC
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(`${normalized}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Whether created_at falls on the current business calendar day (Yakutsk).
 * @param {string|number|Date|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isOrderFromToday(iso, nowMs = Date.now()) {
  const created = parseApiDate(iso)
  if (!created) return false

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return fmt.format(created) === fmt.format(new Date(nowMs))
}

/**
 * Relative age for ops dashboards: "12 мин", "1 ч 5 мин", "2 д 3 ч".
 * @param {string|number|Date|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {string|null}
 */
export function formatOrderAge(iso, nowMs = Date.now()) {
  const created = parseApiDate(iso)
  if (!created) return null

  const minutes = Math.max(0, Math.floor((nowMs - created.getTime()) / 60_000))

  if (minutes < 60) {
    return `${minutes} мин`
  }

  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60

  if (hours < 24) {
    return remMin > 0 ? `${hours} ч ${remMin} мин` : `${hours} ч`
  }

  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days} д ${remHours} ч` : `${days} д`
}

/**
 * Clock time in business TZ (Yakutsk), e.g. "14:32".
 * @param {string|number|Date|null|undefined} iso
 * @returns {string|null}
 */
export function formatClockTime(iso) {
  const d = parseApiDate(iso)
  if (!d) return null

  return d.toLocaleTimeString('ru-RU', {
    timeZone: BUSINESS_TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Age severity for visual urgency.
 * @param {string|number|Date|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {'ok'|'warn'|'critical'|null}
 */
export function orderAgeLevel(iso, nowMs = Date.now()) {
  const created = parseApiDate(iso)
  if (!created) return null

  const minutes = Math.max(0, Math.floor((nowMs - created.getTime()) / 60_000))
  if (minutes >= 45) return 'critical'
  if (minutes >= 20) return 'warn'
  return 'ok'
}
