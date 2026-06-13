# Nha Trang Map

Next.js-приложение с пользовательскими метками, отзывами, жалобами и админкой для модерации. Проект подготовлен под стек `VPS + Docker + Postgres`.

## Стек

- `Next.js 16`
- `Postgres` вместо SQLite
- `Cloudflare Turnstile` для публичных форм
- `Vitest` для unit/integration
- `Playwright` для smoke e2e
- `Docker + compose` для production/VPS

## Что важно знать

- Runtime-инициализации схемы БД больше нет: сначала нужно прогнать миграции.
- Справочники категорий и тегов загружаются через `npm run db:seed`.
- Demo-места и demo-отзывы загружаются только через `npm run db:seed:demo` или `SEED_DEMO_DATA=true`.
- Для локальной разработки без Turnstile можно использовать `TURNSTILE_BYPASS=true` или просто не задавать Turnstile keys вне production.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` для локальной разработки или в `.env` для Docker/VPS:

```bash
cp .env.example .env.local
```

Обязательные переменные:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Для production anti-bot:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Для загрузки фото статей в объектное хранилище (S3-совместимое: Timeweb Cloud Storage, Cloudflare R2, Backblaze B2, Yandex Object Storage и т.п.):

- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL` — базовый публичный URL объектов
- `S3_FORCE_PATH_STYLE=true` для Timeweb/Selectel/Yandex, `false` для AWS S3

Если S3 не настроен, новые фото в админке загрузить нельзя, но существующие base64-фото и обычные http(s)-URL продолжают отдаваться как раньше.

Хеш админского пароля можно сгенерировать так:

```bash
node -e "const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync('your-password', salt, 64).toString('hex'); console.log(salt + ':' + hash)"
```

## Локальный запуск

### 1. Поднять Postgres

Проще всего через Docker:

```bash
docker compose up -d db
```

### 2. Установить зависимости

```bash
npm ci
```

### 3. Применить миграции и загрузить справочники

```bash
npm run db:migrate
npm run db:seed
```

Если нужен demo-набор для разработки:

```bash
npm run db:seed:demo
```

### 4. Запустить приложение

```bash
npm run dev
```

Локально `npm run dev` специально запускает webpack-режим с ограничением памяти для более стабильной работы на Windows. Если нужен более быстрый, но потенциально более тяжёлый dev-режим, можно использовать `npm run dev:turbo`.

## Скрипты

- `npm run db:migrate` — применить SQL-миграции Postgres
- `npm run db:seed` — загрузить справочники категорий и тегов
- `npm run db:seed:demo` — загрузить справочники и demo-данные
- `npm run articles:migrate-photos -- --dry-run` — посчитать, что переедет из base64 в S3
- `npm run articles:migrate-photos` — реальная миграция фото статей в S3 (делает бэкап в `data/`)
- `npm run dev` — локальный dev через webpack в более щадящем режиме
- `npm run dev:turbo` — dev через Turbopack
- `npm run lint` — ESLint
- `npm run test` — Vitest + coverage
- `npm run test:e2e` — Playwright smoke

## Тесты

Unit/integration:

```bash
npm run test
```

Smoke e2e:

```bash
npm run test:e2e
```

По умолчанию e2e использует:

- локальный Postgres по `postgresql://postgres:postgres@127.0.0.1:5432/nhatrang_map_test`
- anti-bot bypass
- отдельный dev server на `http://127.0.0.1:3100`

## Docker production

Собрать и поднять весь стек:

```bash
docker compose up -d --build
```

Что делает контейнер приложения на старте:

1. применяет миграции;
2. загружает справочники;
3. запускает `next start`.

Если вы не хотите каждый раз запускать seed на старте, можно позже вынести его в отдельную операционную команду, но сейчас он идемпотентный и безопасен.

## Deploy на VPS

Базовый flow:

1. Установить Docker и Docker Compose plugin на VPS.
2. Склонировать репозиторий на сервер.
3. Создать `.env` на основе `.env.example`.
4. Заполнить production-значения для `DATABASE_URL`, `ADMIN_*`, Turnstile keys.
5. Выполнить:

```bash
docker compose up -d --build
```

Рекомендуемая схема reverse proxy:

- `Nginx` или `Caddy` на VPS
- проксирование `80/443 -> 127.0.0.1:3000`
- TLS через Let's Encrypt

## GitHub Actions

Файл `.github/workflows/ci.yml` запускает:

1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. `npm run test:e2e` с Postgres service

## Публикация в GitHub

Целевой репозиторий: [Eugenestan/map](https://github.com/Eugenestan/map)

Локально после проверки можно выполнить стандартный flow:

```bash
git remote add origin https://github.com/Eugenestan/map.git
git add .
git commit -m "Prepare Postgres, anti-bot, tests, and deploy setup"
git push -u origin HEAD
```

## Резервные копии

Для Postgres на VPS базовый backup можно делать так:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Восстановление:

```bash
cat backup.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```
