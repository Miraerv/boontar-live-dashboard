<script setup>
import OrderCard from './OrderCard.vue'
import { STATUSES } from '../constants/statuses'

defineProps({
  ordersByStatus: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <div v-if="loading" class="state state--loading">Загрузка заказов…</div>
  <div v-else-if="error" class="state state--error">
    <p>{{ error }}</p>
    <p class="state__hint">
      Убедись, что backend запущен: <code>php artisan serve --port=8000</code>
    </p>
    <button type="button" class="state__retry" @click="emit('retry')">Повторить</button>
  </div>
  <div
    v-else
    class="board"
    :style="{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(14.5rem, 1fr))` }"
  >
    <div v-for="column in STATUSES" :key="column.key" class="column">
      <div class="column__header" :style="{ '--accent': column.color }">
        <span class="column__title">
          <component
            :is="column.icon"
            class="column__icon"
            :size="16"
            :stroke-width="2.2"
            :color="column.color"
          />
          {{ column.label }}
        </span>
        <span class="column__count" :style="{ background: column.color }">
          {{ ordersByStatus[column.key].length }}
        </span>
      </div>

      <div class="column__body">
        <OrderCard
          v-for="order in ordersByStatus[column.key]"
          :key="order.orderId ?? order.id"
          :order="order"
          :accent-color="column.color"
        />
        <div v-if="ordersByStatus[column.key].length === 0" class="column__empty">Нет заказов</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  gap: var(--space-3);
  /* Top padding only — bottom chrome owns the lower edge */
  padding: var(--space-3) var(--space-4) var(--space-2);
  overflow-x: auto;
  align-items: start;
  height: 100%;
  box-sizing: border-box;
}

.column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-column);
  border: 1px solid rgba(226, 229, 236, 0.8);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: var(--radius-md);
  padding-bottom: var(--space-2);
  box-shadow: var(--shadow-sm);
}

.column__header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 3.2rem;
  padding: 0 var(--space-3);
  border-radius: calc(var(--radius-md) - 1px) calc(var(--radius-md) - 1px) 0 0;
  /* accent is set per-column; soft white tint as fallback when color-mix missing */
  background: #fff;
  background: color-mix(in srgb, var(--accent) 14%, #fff);
  border-bottom: 2px solid var(--accent);
}

.column__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--text);
  white-space: nowrap;
}

.column__count {
  color: #fff;
  font-weight: 800;
  font-size: var(--text-sm);
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-pill);
  min-width: 1.7rem;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
  font-variant-numeric: tabular-nums;
}

.column__icon {
  display: inline-flex;
  flex-shrink: 0;
}

.column__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) 0.45rem 0;
}

.column__empty {
  padding: 1.2rem 0.45rem;
  text-align: center;
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-muted);
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

.state--error {
  background: var(--red-bg);
  border-color: rgba(224, 80, 60, 0.25);
  border-color: color-mix(in srgb, var(--red) 25%, transparent);
  color: #8a2a1f;
}

.state__hint {
  margin-top: var(--space-2);
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.state__retry {
  margin-top: 1.05rem;
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.state__retry:hover {
  background: var(--blue-hover);
}
</style>
