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
    :style="{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(225px, 1fr))` }"
  >
    <div v-for="column in STATUSES" :key="column.key" class="column">
      <div class="column__header" :style="{ '--accent': column.color }">
        <span class="column__title">
          <component
            :is="column.icon"
            class="column__icon"
            :size="20"
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
  gap: 12px;
  padding: 14px 16px 16px;
  overflow-x: auto;
  align-items: start;
}

.column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-column);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: var(--radius-lg);
  padding-bottom: 10px;
  box-shadow: var(--shadow-sm);
}

.column__header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 52px;
  padding: 0 14px;
  border-radius: calc(var(--radius-lg) - 1px) calc(var(--radius-lg) - 1px) 0 0;
  background: color-mix(in srgb, var(--accent) 14%, #fff);
  border-bottom: 2px solid var(--accent);
}

.column__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  white-space: nowrap;
}

.column__count {
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  min-width: 26px;
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
  gap: 8px;
  padding: 10px 8px 0;
}

.column__empty {
  padding: 22px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}

.state {
  margin: 48px auto;
  max-width: 480px;
  padding: 28px 24px;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  box-shadow: var(--shadow-card);
}

.state--error {
  background: var(--red-bg);
  border-color: color-mix(in srgb, var(--red) 25%, transparent);
  color: #8a2a1f;
}

.state__hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.state__retry {
  margin-top: 14px;
  padding: 9px 16px;
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
