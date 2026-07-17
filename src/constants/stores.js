/**
 * Express warehouses — same list as seller service-conditions
 * (`shared/consts/stores.ts` → STORES / STORES_EXTENDED).
 */
export const STORES = [
  { id: 18, name: '203 мкр.' },
  { id: 54, name: 'Дзержинского' },
  { id: 55, name: 'Пояркова' },
  { id: 56, name: 'Залог' },
  { id: 57, name: 'Прометей' },
  { id: 59, name: 'Рыдзинского' },
  { id: 60, name: 'Ростелеком' },
  { id: 61, name: 'Пл Дружбы' },
  { id: 62, name: 'Авиапорт' },
  { id: 105, name: 'Чиряева' },
  { id: 106, name: 'Авиагруппа(Б.Чижика)' },
  { id: 107, name: 'Сайсары' },
]

export const DEFAULT_STORE_ID = 18

export const STORE_NAMES = Object.fromEntries(STORES.map((s) => [String(s.id), s.name]))

const STORAGE_KEY = 'dashboard.selectedStoreId'

/**
 * @param {number[]} [allowedIds] if provided, only these stores are considered valid
 * @returns {number}
 */
export function loadStoredStoreId(allowedIds) {
  const allowed =
    Array.isArray(allowedIds) && allowedIds.length > 0
      ? allowedIds
      : STORES.map((s) => s.id)
  const fallback = allowed.includes(DEFAULT_STORE_ID) ? DEFAULT_STORE_ID : allowed[0]

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const id = raw != null ? Number(raw) : fallback
    if (allowed.includes(id)) return id
  } catch {
    /* ignore */
  }
  return fallback
}

export function saveStoredStoreId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    /* ignore */
  }
}

/**
 * @param {number[]} allowedIds
 * @returns {{ id: number, name: string }[]}
 */
export function storesForIds(allowedIds) {
  const set = new Set(allowedIds)
  return STORES.filter((s) => set.has(s.id))
}
