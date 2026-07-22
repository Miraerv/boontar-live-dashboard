<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import LoginGate from './components/LoginGate.vue'
import DashboardToolbar from './components/DashboardToolbar.vue'
import OrdersBoard from './components/OrdersBoard.vue'
import ViewportDebug from './components/ViewportDebug.vue'
import { ALL_STORES_ID, loadStoredStoreId, saveStoredStoreId } from './constants/stores'
import { useDashboardAuth } from './composables/useDashboardAuth'
import { useNotifySound } from './composables/useNotifySound'
import { useOrdersBoard } from './composables/useOrdersBoard'
import { useTvScale } from './composables/useTvScale'

const auth = useDashboardAuth()
/** @type {import('vue').Ref<{ id: number, name: string }[]>} */
const availableStores = ref(auth.getStores())
const isMaster = ref(auth.getIsMaster())
const unlocked = ref(auth.isUnlocked())
const authReady = ref(false)

const unlockedStoreIds = computed(() => availableStores.value.map((s) => s.id))
const storeId = ref(
  loadStoredStoreId(unlockedStoreIds.value, { allowAll: isMaster.value }),
)

const { enabled: soundEnabled, playNewOrderSound } = useNotifySound()
const { debugEnabled, metrics: viewportMetrics } = useTvScale()

const {
  loading,
  error,
  syncing,
  pusherOnline,
  started,
  ordersByStatus,
  loadOrders,
  start: startOrdersBoard,
  reconnect,
  stop: stopOrdersBoard,
  clearOrders,
} = useOrdersBoard({
  storeId,
  storeIds: unlockedStoreIds,
  onSessionDead: onLogout,
  onNewOrder: playNewOrderSound,
})

const currentStoreName = computed(() => {
  if (storeId.value === ALL_STORES_ID) return 'Все склады'
  return availableStores.value.find((s) => s.id === storeId.value)?.name ?? 'Склад'
})

function isValidSelection(id) {
  if (id === ALL_STORES_ID) return isMaster.value
  return unlockedStoreIds.value.includes(id)
}

function onStoreChange(event) {
  const nextId = Number(event.target.value)
  if (!Number.isFinite(nextId) || nextId === storeId.value) return
  if (!isValidSelection(nextId)) return

  storeId.value = nextId
  saveStoredStoreId(nextId)
  reconnect()
}

/**
 * @param {{ id: number, name: string }[]} stores
 * @param {boolean} [master]
 */
function applyUnlockedStores(stores, master = false) {
  availableStores.value = stores
  isMaster.value = Boolean(master)
  const ids = stores.map((s) => s.id)
  storeId.value = loadStoredStoreId(ids, { allowAll: isMaster.value })
  saveStoredStoreId(storeId.value)
}

function startBoard() {
  if (started.value) return
  if (!unlocked.value || unlockedStoreIds.value.length === 0) return
  // Ensure selected store is still allowed after re-login
  if (!isValidSelection(storeId.value)) {
    storeId.value = loadStoredStoreId(unlockedStoreIds.value, { allowAll: isMaster.value })
  }
  startOrdersBoard()
}

/**
 * @param {{ stores: { id: number, name: string }[], isMaster: boolean }} payload
 */
function onUnlocked({ stores, isMaster: master }) {
  applyUnlockedStores(stores, master)
  unlocked.value = true
  stopOrdersBoard()
  startBoard()
}

async function onLogout() {
  stopOrdersBoard()
  clearOrders()
  await auth.lock()
  availableStores.value = []
  isMaster.value = false
  unlocked.value = false
}

watch(
  unlocked,
  (ok) => {
    if (ok) startBoard()
  },
  { immediate: true },
)

onMounted(async () => {
  const result = await auth.restore()
  if (result.ok) {
    applyUnlockedStores(result.stores, result.isMaster)
    unlocked.value = true
  } else {
    availableStores.value = []
    isMaster.value = false
    unlocked.value = false
  }
  authReady.value = true
})
</script>

<template>
  <div v-if="!authReady" class="state state--loading">Проверка сессии…</div>
  <LoginGate v-else-if="!unlocked" @unlocked="onUnlocked" />
  <!--
    TV kiosk: board first (eye-level), chrome at bottom.
    Orders are what pickers watch; status/actions stay reachable but out of the way.
  -->
  <div v-else class="page">
    <OrdersBoard
      class="page__board"
      :orders-by-status="ordersByStatus"
      :loading="loading"
      :error="error"
      @retry="loadOrders()"
    />

    <DashboardToolbar
      class="page__toolbar"
      :available-stores="availableStores"
      :store-id="storeId"
      :current-store-name="currentStoreName"
      :is-master="isMaster"
      :loading="loading"
      :syncing="syncing"
      :sound-enabled="soundEnabled"
      :pusher-online="pusherOnline"
      @store-change="onStoreChange"
      @refresh="loadOrders()"
      @logout="onLogout"
    />
  </div>

  <ViewportDebug v-if="debugEnabled" :metrics="viewportMetrics" />
</template>

<style scoped>
.page {
  min-height: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page__board {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.page__toolbar {
  flex: 0 0 auto;
}

.state {
  margin: 3.5rem auto;
  max-width: 36rem;
  padding: 2rem 1.75rem;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  box-shadow: var(--shadow-card);
}
</style>
