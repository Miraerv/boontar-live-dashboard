<script setup>
import { ref } from 'vue'
import { useDashboardAuth } from '../composables/useDashboardAuth'
import { tryUnlockNotifySound } from '../utils/notifySound'

const emit = defineEmits(['unlocked'])

const { unlock } = useDashboardAuth()
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  // PIN submit is a user gesture — unlock autoplay for TV kiosk sound
  tryUnlockNotifySound()
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
  padding: 1.75rem 1.2rem;
}

.gate__card {
  width: 100%;
  max-width: 29rem;
  padding: 2rem 1.75rem 1.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.gate__logo {
  display: block;
  width: 12.9rem;
  height: auto;
  margin-bottom: 1.2rem;
}

.gate__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
}

.gate__hint {
  margin: 0.45rem 0 1.35rem;
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.gate__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.gate__label {
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.gate__input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.85rem 0.9rem;
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
  margin: 0.75rem 0 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--red);
}

.gate__submit {
  margin-top: 1.2rem;
  width: 100%;
  padding: 0.85rem 1.05rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  font-size: var(--text-lg);
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
