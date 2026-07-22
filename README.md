# boontar-live-dashboard

Live-доска заказов склада (Boontar Market). Одностраничное Vue 3 SPA: PIN-вход, kanban по статусам, realtime через Pusher.

```
SPA  ──/api/*──►  Hono BFF (boontar-live-dashboard-backend :3000)
                      │
                      └──►  Laravel admin-products (live-dashboard API)
SPA  ──ws──────►  Pusher  channel orders-{storeId}
```

## Возможности

- Вход по PIN → Bearer-токен (сессия в `localStorage`)
- Список складов из ответа auth, переключение склада
- Master (`is_master`): режим **Все склады** — заказы по всем складам + имя склада на карточке
- Колонки: Создан → Сборка → Упакован → Взят → Доставляется → Почти прибыл
- Обновления по Pusher + quiet-reload при пропущенных событиях
- HTTP-poll каждые 15с + reload при visibility/reconnect (для TV/kiosk, если Pusher молчит)
- Звук нового заказа: по `order-created` и когда poll/reload видит новый id (нужен жест: PIN/клик — autoplay policy)
- Только заказы «сегодня» (календарный день Якутска) — как на backend
- TV scale: `html` root font-size от layout-ширины (design 1920 → 13px, clamp 11–15); UI в `rem`
- Half-width HD TV (часто `inner≈960 @ dpr=2` на Full HD): viewport/`design-scale` → layout 1920, чтобы 6 колонок влезали
- Chrome (toolbar) снизу; debug HUD: `?debug=1` или `localStorage.dashDebug=1`

## Стек

| | |
|---|---|
| Vue 3 + Vite | UI |
| `@vitejs/plugin-legacy` | dual modern/legacy chunks + core-js (старые телефоны) |
| composables + local `ref` | state (без Pinia / vue-router) |
| `pusher-js` | realtime |
| `@lucide/vue` | иконки |

### Браузеры

Prod-сборка целится в `browserslist` (iOS ≥ 13, Android ≥ 8, Chrome ≥ 80, Safari ≥ 13).
Старые движки получают SystemJS legacy-чанк и polyfills; ещё более древние WebView
(до Vue 3 floor) по-прежнему не поддерживаются.

## Структура

```
src/
  api/           # orders, pusher
  components/    # LoginGate, OrderCard
  composables/   # auth, sound, now
  constants/     # склады (fallback / localStorage id)
  utils/         # format, time, notifySound, tvScale
  styles/        # design tokens + rem scale
  App.vue        # board + оркестрация
```

### TV / large screens

Вёрстка **не** читает PPI панели как «плотность». Браузер работает в CSS-px;
`devicePixelRatio` связывает CSS-px с физическими пикселями. Плотность UI:

1. CSS fallback: `html { font-size: clamp(11px, 100vw/1920*13px, 15px) }`
2. JS `applyTvPresentation()` / `initTvScale()` на resize
3. Компоненты в `rem` / CSS-переменных `--text-*`, `--space-*`

**Half-width HD (частый баг складских TV):** WebView отдаёт `inner≈960×540`, `dpr=2`
на панели 1920×1080. При `width=device-width` доска получает только 960 CSS-px,
колонки не влезают. Детект `isHalfWidthHdPanel` →:

1. `meta viewport width=1920, initial-scale=…` (inline + runtime)
2. Если `innerWidth` остаётся ~960 — оболочка `#tv-frame` / `#tv-stage`:
   layout **1920** + Chromium **`zoom`** (`mode=design-zoom`), иначе
   `transform: scale` на stage (`mode=design-scale`).  
   **Не** `transform` на `<html>` — на TV WebView это оставляло grid в 960px
   при `root=13` и усугубляло overflow.

На складе: `https://dash…/?debug=1` → `inner / dpr / layout / mode / visual / root`.  
Ожидание на проблемном TV: `layout 1920`, `mode design-zoom|design-scale`,
`visual 0.5×`, `root ~13px`, все 6 колонок без горизонтального скролла.

## Setup

Нужны **два** backend-сервиса рядом с SPA:

1. Laravel `admin-products` — `php artisan serve --host=127.0.0.1 --port=8000`
2. Hono BFF — см. `../boontar-live-dashboard-backend`

```sh
pnpm install
pnpm dev
```

Vite проксирует `/api` → `http://127.0.0.1:3000` (переопределить: `VITE_API_PROXY`).

Открыть dev-сервер Vite (обычно `http://localhost:5173`).

### Env (опционально)

| var | default | meaning |
|-----|---------|---------|
| `VITE_API_PROXY` | `http://127.0.0.1:3000` | target proxy для `/api` |
| `VITE_PUSHER_APP_KEY` | fallback в коде | public key Pusher |
| `VITE_PUSHER_APP_CLUSTER` | `ap3` | cluster |

PIN-доступы и склады настраиваются в seller: **Доступы Market Dashboard** (`/dashboard-access`).

## Scripts

```sh
pnpm dev      # dev server + HMR
pnpm build    # production bundle → dist/
pnpm preview  # preview dist
pnpm lint     # oxlint + eslint
pnpm format   # prettier src/
```

## Docker (prod)

Отдельный compose + общая сеть `boontar-live-dashboard` с BFF-репозиторием
[`boontar-live-dashboard-backend`](../boontar-live-dashboard-backend).

```
browser  →  SPA nginx :8080
                /api  →  backend:3000 (Hono, shared network)
                              →  Laravel (whitelist IP хоста Hono)
         ──ws──►  Pusher
```

### 0. Один раз на сервере — сеть

```sh
docker network create boontar-live-dashboard
```

Повторный create безопасен не будет — если сеть уже есть, шаг пропускай:
`docker network ls | grep boontar-live-dashboard`.

### 1. Сначала backend (Hono)

```sh
cd /path/to/boontar-live-dashboard-backend
cp .env.example .env
# в .env: LARAVEL_API_URL=https://seller.example.com
docker compose up -d --build
curl -sS http://127.0.0.1:3000/health   # {"ok":true}
```

Подробнее — README backend. Laravel whitelist: IP **этого** сервера (Hono → Laravel).

### 2. Потом SPA (этот репозиторий)

```sh
cd /path/to/boontar-live-dashboard
cp .env.example .env
```

Пример `.env` на проде:

```env
DASHBOARD_PORT=8080
BACKEND_HOST=backend:3000
VITE_PUSHER_APP_KEY=your_public_key
VITE_PUSHER_APP_CLUSTER=ap3
```

| var | default | meaning |
|-----|---------|---------|
| `DASHBOARD_PORT` | `8080` | порт на хосте → nginx |
| `BACKEND_HOST` | `backend:3000` | Hono на shared network (alias) |
| `VITE_PUSHER_APP_KEY` | — | public key Pusher (**bake at build**) |
| `VITE_PUSHER_APP_CLUSTER` | `ap3` | cluster Pusher (**bake at build**) |

`VITE_*` попадают в JS **только при сборке образа**. Сменил ключ → `docker compose up -d --build` снова.

```sh
docker compose up -d --build
```

### 3. Проверка

```sh
docker compose ps
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/          # 200
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/api/dashboard/auth/me
# 401 без токена — значит proxy до Hono жив
```

Открыть в браузере: `http://<server>:8080` → PIN → заказы → realtime.

Перед балансировщиком/TLS (Caddy, nginx, Cloudflare) можно проксировать на `127.0.0.1:8080`.

### Полезные команды

```sh
docker compose logs -f --tail=100
docker compose restart
docker compose up -d --build    # после смены VITE_* или кода
docker compose down             # остановить SPA (сеть boontar-live-dashboard не удалится)
```

### Замечания

- Backend должен быть **уже up** на сети, иначе nginx не резолвит `backend`.
- Браузер **не** ходит в Laravel — только nginx → Hono → Laravel.
- Не коммить `.env` (есть в `.gitignore`).

## Auth & API (через BFF)

| Method | Path | |
|--------|------|--|
| `POST` | `/api/dashboard/auth/login` | `{ password }` → token + stores |
| `GET`  | `/api/dashboard/auth/me` | restore session |
| `POST` | `/api/dashboard/auth/logout` | |
| `GET`  | `/api/dashboard/orders` | Bearer, активные заказы дня по всем доступным складам |
| `GET`  | `/api/dashboard/stores/:id/orders` | Bearer, активные заказы дня |

Подробнее о маппинге на Laravel — в README backend.
