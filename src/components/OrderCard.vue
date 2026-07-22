<script setup>
import { computed } from 'vue'
import {
  CircleCheck,
  Ban,
  Snowflake,
  CircleX,
  MapPin,
  Package,
  PackageOpen,
  Clock,
} from '@lucide/vue'
import { useNow } from '../composables/useNow'
import { formatMoney } from '../utils/format'
import { formatClockTime, formatOrderAge, orderAgeLevel } from '../utils/time'

// prettier-ignore
const props = defineProps({
  order:       { type: Object, required: true },
  accentColor: { type: String, default:  '#ccc' },
})

const now = useNow()

const collected = computed(() => {
  const { itemPacked, itemCount } = props.order
  if (itemCount > 0 && itemPacked === itemCount) {
    return { icon: CircleCheck, cls: 'badge--collected-done' }
  }
  if (itemPacked > 0) {
    return { icon: PackageOpen, cls: 'badge--collected-progress' }
  }
  return { icon: Package, cls: 'badge--collected-empty' }
})

const ageLabel = computed(() => formatOrderAge(props.order.createdAt, now.value))
const clockLabel = computed(() => formatClockTime(props.order.createdAt))
const ageLevel = computed(() => orderAgeLevel(props.order.createdAt, now.value))
const priceLabel = computed(() => formatMoney(props.order.total))
</script>

<template>
  <article class="card" :style="{ borderTopColor: accentColor }">
    <header class="card__header">
      <div class="card__identity">
        <span class="card__id">{{ order.id }}</span>
        <span
          v-if="ageLabel"
          class="card__age"
          :class="ageLevel ? `card__age--${ageLevel}` : null"
          :title="clockLabel ? `Создан в ${clockLabel}` : undefined"
        >
          <Clock :size="12" stroke-width="2.4" />
          {{ ageLabel }}
          <span v-if="clockLabel" class="card__clock">· {{ clockLabel }}</span>
        </span>
      </div>
      <span class="card__price">{{ priceLabel }}&nbsp;₽</span>
    </header>

    <div v-if="order.itemCancelled > 0" class="badge badge--alert badge--cancelled">
      <CircleX :size="13" stroke-width="2.4" />
      {{ order.itemCancelled }} отменено
    </div>

    <div class="card__badges">
      <span class="badge badge--status" :class="order.paid ? 'badge--paid' : 'badge--unpaid'">
        <component :is="order.paid ? CircleCheck : Ban" :size="13" stroke-width="2.4" />
        {{ order.paid ? 'Оплачен' : 'Не оплачен' }}
      </span>
      <!-- type badge only for frozen/chilled (like RealTimeDashSimplified) -->
      <span v-if="order.freez" class="badge badge--meta badge--freez">
        <Snowflake :size="13" stroke-width="2.4" />
        {{ order.category || 'Мороженое' }}
      </span>
      <span v-else-if="order.category" class="badge badge--meta badge--category">
        {{ order.category }}
      </span>
    </div>

    <div class="address-box">
      <div class="address-box__label">
        <MapPin :size="12" stroke-width="2.4" />
        Адрес доставки
      </div>
      <div class="address-box__value">
        {{ order.address?.text || 'Адрес не указан' }}
        <span v-if="order.address?.distanceKm != null" class="address-box__distance">
          · {{ order.address.distanceKm }}&nbsp;км
        </span>
      </div>
    </div>

    <footer class="card__footer">
      <span class="badge badge--collected" :class="collected.cls">
        <component :is="collected.icon" :size="13" stroke-width="2.4" />
        {{ order.itemPacked }}/{{ order.itemCount }} собрано
      </span>
      <span v-if="order.itemFreez > 0" class="badge badge--meta badge--freez">
        <Snowflake :size="13" stroke-width="2.4" />
        {{ order.itemFreez }}
      </span>
    </footer>
  </article>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-top: 3px solid #ccc;
  border-radius: var(--radius-md);
  padding: 10px 11px 9px;
  box-shadow: var(--shadow-card);
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
  border-color: #c5c8d2;
  border-color: color-mix(in srgb, var(--border) 60%, var(--text-muted));
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.card__identity {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.card__id {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1.15;
}

.card__price {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.card__age {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.card__age--ok {
  color: var(--text-muted);
}

.card__age--warn {
  color: var(--amber);
}

.card__age--critical {
  color: var(--red);
}

.card__clock {
  font-weight: 500;
  color: var(--text-muted);
  opacity: 0.9;
}

.card__age--warn .card__clock,
.card__age--critical .card__clock {
  color: inherit;
  opacity: 0.75;
}

.card__badges {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  line-height: 1.25;
}

/* Primary status: payment */
.badge--status {
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 10px;
  padding: 4px 7px;
}

.badge--paid {
  background: var(--green-bg);
  color: var(--green);
}

.badge--unpaid {
  background: var(--red-bg);
  color: var(--red);
}

/* Alerts */
.badge--alert {
  font-weight: 700;
  margin-bottom: 8px;
  width: fit-content;
}

.badge--cancelled {
  background: var(--red-bg);
  color: var(--red);
}

/* Secondary meta badges */
.badge--meta {
  font-weight: 600;
  color: var(--text-secondary);
  background: #eef0f4;
}

.badge--freez {
  background: var(--blue-bg);
  color: var(--blue);
}

.badge--category {
  background: #eef0f4;
  color: var(--text-secondary);
}

/* Collected — footer emphasis */
.badge--collected {
  font-weight: 700;
}

.badge--collected-done {
  background: var(--green-bg);
  color: var(--green);
}

.badge--collected-progress {
  background: var(--amber-bg);
  color: var(--amber);
}

.badge--collected-empty {
  background: #eef0f4;
  color: var(--text-secondary);
}

.address-box {
  border: 1px solid var(--border-soft);
  background: #f4f5f8;
  background: color-mix(in srgb, var(--bg-page) 55%, #fff);
  border-radius: var(--radius-sm);
  padding: 7px 9px;
  margin-bottom: 8px;
}

.address-box__label {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 1px;
}

.address-box__value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.address-box__distance {
  font-weight: 500;
  color: var(--text-muted);
}

.card__footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
