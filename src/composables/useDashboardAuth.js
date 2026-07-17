const TOKEN_KEY = 'boontar.dashboard.token'
const STORES_KEY = 'boontar.dashboard.stores'

/**
 * @typedef {{ id: number, name: string }} DashboardStore
 */

/**
 * @returns {string|null}
 */
function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * @param {string|null} token
 */
function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/**
 * @returns {DashboardStore[]}
 */
function loadStores() {
  try {
    const raw = localStorage.getItem(STORES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((s) => ({
        id: Number(s?.id),
        name: String(s?.name ?? `Склад #${s?.id}`),
      }))
      .filter((s) => Number.isFinite(s.id) && s.id > 0)
  } catch {
    return []
  }
}

/**
 * @param {DashboardStore[]} stores
 */
function saveStores(stores) {
  try {
    localStorage.setItem(STORES_KEY, JSON.stringify(stores))
  } catch {
    // ignore
  }
}

function clearSession() {
  saveToken(null)
  try {
    localStorage.removeItem(STORES_KEY)
  } catch {
    // ignore
  }
}

/**
 * Server-side PIN auth for warehouse board.
 * Token is issued by POST /api/dashboard/auth/login and required for orders API.
 */
export function useDashboardAuth() {
  /**
   * @returns {string|null}
   */
  function getToken() {
    return loadToken()
  }

  /**
   * @returns {DashboardStore[]}
   */
  function getStores() {
    return loadStores()
  }

  /**
   * @returns {number[]}
   */
  function getUnlockedStoreIds() {
    return getStores().map((s) => s.id)
  }

  /**
   * @returns {boolean}
   */
  function isUnlocked() {
    return Boolean(getToken()) && getUnlockedStoreIds().length > 0
  }

  /**
   * Restore session from token (call on app boot).
   * @returns {Promise<{ ok: true, stores: DashboardStore[] } | { ok: false }>}
   */
  async function restore() {
    const token = loadToken()
    if (!token) {
      clearSession()
      return { ok: false }
    }

    try {
      const response = await fetch('/api/dashboard/auth/me', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        clearSession()
        return { ok: false }
      }

      const json = await response.json()
      const stores = Array.isArray(json?.data?.stores) ? json.data.stores : []
      const normalized = stores
        .map((s) => ({
          id: Number(s.id),
          name: String(s.name ?? `Склад #${s.id}`),
        }))
        .filter((s) => Number.isFinite(s.id) && s.id > 0)

      if (normalized.length === 0) {
        clearSession()
        return { ok: false }
      }

      saveStores(normalized)
      return { ok: true, stores: normalized }
    } catch {
      // Network blip — keep local session, board can retry API calls.
      const cached = loadStores()
      if (cached.length > 0) return { ok: true, stores: cached }
      return { ok: false }
    }
  }

  /**
   * @param {string} password
   * @returns {Promise<{ ok: true, stores: DashboardStore[] } | { ok: false, error: string }>}
   */
  async function unlock(password) {
    const input = String(password ?? '').trim()
    if (!input) return { ok: false, error: 'Введи пароль' }

    try {
      const response = await fetch('/api/dashboard/auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: input }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          json?.message ||
          (response.status === 401 ? 'Неверный пароль' : `Ошибка входа (${response.status})`)
        return { ok: false, error: message }
      }

      const token = json?.data?.access_token
      const storesRaw = json?.data?.stores
      if (!token || !Array.isArray(storesRaw) || storesRaw.length === 0) {
        return { ok: false, error: 'Сервер вернул пустой ответ' }
      }

      const stores = storesRaw
        .map((s) => ({
          id: Number(s.id),
          name: String(s.name ?? `Склад #${s.id}`),
        }))
        .filter((s) => Number.isFinite(s.id) && s.id > 0)

      if (stores.length === 0) {
        return { ok: false, error: 'Нет доступных складов' }
      }

      saveToken(token)
      saveStores(stores)
      return { ok: true, stores }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Сеть недоступна',
      }
    }
  }

  async function lock() {
    const token = loadToken()
    if (token) {
      try {
        await fetch('/api/dashboard/auth/logout', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      } catch {
        // ignore
      }
    }
    clearSession()
  }

  return {
    getToken,
    getStores,
    getUnlockedStoreIds,
    isUnlocked,
    restore,
    unlock,
    lock,
  }
}
