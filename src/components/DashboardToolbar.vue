<script setup>
import { LogOut, RefreshCw } from '@lucide/vue'

defineProps({
  availableStores: {
    type: Array,
    required: true,
  },
  storeId: {
    type: Number,
    required: true,
  },
  currentStoreName: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  syncing: {
    type: Boolean,
    default: false,
  },
  soundEnabled: {
    type: Boolean,
    default: false,
  },
  pusherOnline: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['store-change', 'refresh', 'logout'])

/**
 * @param {Event} event
 */
function onStoreChange(event) {
  emit('store-change', event)
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar__meta">
      <label v-if="availableStores.length > 1" class="store-select">
        <span class="store-select__label">Склад</span>
        <select
          class="store-select__control"
          :value="storeId"
          :disabled="loading"
          @change="onStoreChange"
        >
          <option v-for="s in availableStores" :key="s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select>
      </label>
      <span v-else class="store-select store-select--static">
        <span class="store-select__label">Склад</span>
        <span class="store-select__name">{{ currentStoreName }}</span>
      </span>

      <!--
        Как в realtime-dash-simplified: красный пока не было клика по странице,
        после любого клика — зелёный (браузерный autoplay unlock).
      -->
      <span
        class="pill"
        :class="soundEnabled ? 'pill--online' : 'pill--offline'"
        :title="
          soundEnabled ? 'Звук включён' : 'Кликни в любом месте страницы, чтобы включить звук'
        "
      >
        <span class="pill__dot" />
        Звук {{ soundEnabled ? '🔊' : '🔇' }}
      </span>

      <span class="pill" :class="pusherOnline ? 'pill--online' : 'pill--offline'">
        <span class="pill__dot" />
        {{ pusherOnline ? 'Realtime' : 'Offline' }}
      </span>
      <span v-if="syncing" class="pill pill--sync">Синхронизация…</span>
    </div>
    <div class="toolbar__actions">
      <button
        type="button"
        class="toolbar__refresh"
        :disabled="loading || syncing"
        @click="emit('refresh')"
      >
        <RefreshCw :size="15" stroke-width="2.4" :class="{ 'is-spinning': syncing }" />
        Обновить
      </button>
      <button type="button" class="toolbar__logout" @click="emit('logout')">
        <LogOut :size="15" stroke-width="2.4" />
        Выйти
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  /* Bottom chrome for TV: separator above, padding against screen edge */
  padding: 8px 12px 10px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: 0 -1px 0 rgba(16, 24, 40, 0.03);
}

.toolbar__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.store-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.store-select__label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.store-select__control {
  appearance: none;
  border: none;
  background: transparent
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235b5f6d' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
    no-repeat right 8px center;
  padding: 8px 28px 8px 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  min-width: 200px;
  cursor: pointer;
  outline: none;
}

.store-select__control:disabled {
  opacity: 0.55;
  cursor: wait;
}

.store-select--static {
  padding-right: 12px;
}

.store-select__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  padding: 8px 4px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
}

.pill__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  /* neutral fallback: currentColor mix needs color-mix (Safari 16.2+) */
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.12);
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 22%, transparent);
}

.pill--online {
  background: var(--green-bg);
  color: var(--green);
}

.pill--offline {
  background: var(--red-bg);
  color: var(--red);
}

.pill--sync {
  background: #eef0f4;
  color: var(--text-secondary);
}

.toolbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar__refresh {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: background 0.15s ease;
}

.toolbar__refresh:disabled {
  opacity: 0.55;
  cursor: wait;
}

.toolbar__refresh:not(:disabled):hover {
  background: var(--blue-hover);
}

.toolbar__refresh:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

.toolbar__logout {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.toolbar__logout:hover {
  background: #fff;
  color: var(--text);
}

.toolbar__logout:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

.is-spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
