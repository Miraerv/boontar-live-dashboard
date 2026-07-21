<script setup>
import { ref } from 'vue'
import { useDashboardAuth } from '../composables/useDashboardAuth'

const emit = defineEmits(['unlocked'])

const { unlock } = useDashboardAuth()
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const result = await unlock(password.value)
    if (result.ok) {
      emit('unlocked', result.stores)
      return
    }
    error.value = result.error || 'Неверный пароль'
    password.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="gate">
    <form class="gate__card" @submit.prevent="onSubmit">
      <img
        class="gate__logo"
        src="/logotype-boon-dash.svg"
        width="200"
        height="50"
        alt="BOON DASH"
      />
      <h1 class="gate__title">Доска заказов</h1>
      <p class="gate__hint">Введи пароль склада, чтобы открыть доску заказов</p>

      <label class="gate__field">
        <span class="gate__label">Пароль</span>
        <input
          v-model="password"
          class="gate__input"
          type="password"
          name="password"
          autocomplete="current-password"
          autofocus
          required
          :disabled="submitting"
          placeholder="••••••••"
        />
      </label>

      <p v-if="error" class="gate__error" role="alert">{{ error }}</p>

      <button class="gate__submit" type="submit" :disabled="submitting || !password">
        {{ submitting ? 'Вход…' : 'Войти' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.gate {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px 16px;
}

.gate__card {
  width: 100%;
  max-width: 380px;
  padding: 28px 24px 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.gate__logo {
  display: block;
  width: 168px;
  height: auto;
  margin-bottom: 16px;
}

.gate__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
}

.gate__hint {
  margin: 6px 0 18px;
  font-size: 13px;
  color: var(--text-secondary);
}

.gate__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gate__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.gate__input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--text);
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.gate__input:focus {
  /* solid fallbacks: color-mix unsupported on Safari < 16.2 / old Android WebView */
  border-color: #8eb0f5;
  border-color: color-mix(in srgb, var(--blue) 55%, var(--border));
  box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.18);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 18%, transparent);
}

.gate__input:disabled {
  opacity: 0.6;
}

.gate__error {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--red);
}

.gate__submit {
  margin-top: 16px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: background 0.15s ease;
}

.gate__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.gate__submit:not(:disabled):hover {
  background: var(--blue-hover);
}

.gate__submit:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}
</style>
