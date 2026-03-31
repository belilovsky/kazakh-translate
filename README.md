# Қазтілші — AI-переводчик на казахский язык

> **Қазтілші** (каз. «казахский переводчик») — высококачественный сервис машинного перевода с русского и английского на казахский язык. Использует ансамбль из 10 AI-движков с постобработкой и самооценкой для максимального качества перевода.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-kmt.qdev.run-gold)](https://kmt.qdev.run)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](Dockerfile)

**Демо:** https://kmt.qdev.run  
**GitHub:** https://github.com/belilovsky/kazakh-translate

---

## Оглавление

- [Особенности](#особенности)
- [Архитектура](#архитектура)
- [Конвейер перевода](#конвейер-перевода)
- [Движки перевода](#движки-перевода)
- [API](#api)
- [Стек технологий](#стек-технологий)
- [Переменные окружения](#переменные-окружения)
- [Локальная разработка](#локальная-разработка)
- [Деплой с Docker](#деплой-с-docker)
- [Деплой на VPS с Nginx](#деплой-на-vps-с-nginx)
- [Админ-панель](#админ-панель)
- [Лингвистическая база](#лингвистическая-база)
- [Структура проекта](#структура-проекта)
- [SEO и OpenGraph](#seo-и-opengraph)
- [Лицензия](#лицензия)

---

## Особенности

- **10 движков перевода** — GPT-4o, Claude Sonnet, Gemini 2.5 Flash, DeepSeek, Grok 3 Mini, Qwen 72B, Mistral Small, Perplexity Sonar, DeepL, Yandex Translate
- **Ensemble AI** — GPT-4o синтезирует лучший вариант из всех результатов (постредактирование)
- **Цикл самооценки** — GPT-4o оценивает перевод по шкале 1–10 и итеративно улучшает, пока оценка ниже 8
- **Правила казахского языка** — детализированные лингвистические инструкции встроены во все AI-промпты: агглютинативная морфология, сингармонизм, SOV-порядок слов, антикальки
- **Few-shot примеры** для направлений RU→KK и EN→KK
- **Голосовой ввод** через Web Speech API
- **TTS** — озвучивание переводов
- **История переводов** — хранится в локальной SQLite-базе данных
- **Система оценок** — пользователь может оценить перевод по шкале 1–5
- **Клавиатурное сокращение** Ctrl+Enter для запуска перевода
- **Значок качества** — отображает оценку самооценки перевода прямо в интерфейсе
- **Smart Ensemble с критиком** — Gemini анализирует все варианты и пишет рецензию, GPT-4o синтезирует с учётом критики
- **Админ-панель** — дашборд, управление переводами, мониторинг движков, лаборатория сравнения
- **Тёмная тема** — тёплые коричневые тона, вдохновлённые казахской палитрой
- **PWA** — Progressive Web App, работает как нативное приложение
- **Docker-ready** — многоэтапная сборка, готовая к production-деплою
- **Автоматический деплой** — скрипт `deploy.sh` для быстрого запуска на VPS

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         Клиент (Browser)                        │
│  React 18 + Vite + Tailwind CSS + shadcn/ui                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ translate.tsx│  │  history.tsx │  │   theme-provider.tsx   │  │
│  └──────┬──────┘  └──────────────┘  └────────────────────────┘  │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTP / REST API
┌─────────▼───────────────────────────────────────────────────────┐
│                   Nginx (SSL Termination)                        │
│  Let's Encrypt TLS, reverse proxy → :5000                       │
└─────────┬───────────────────────────────────────────────────────┘
          │ proxy_pass http://localhost:5000
┌─────────▼───────────────────────────────────────────────────────┐
│              Express.js Backend (Node.js 20)                    │
│                                                                  │
│  POST /api/translate                                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              translateWithAll()                            │  │
│  │                                                            │  │
│  │  Фаза 1: Параллельный запрос ко всем движкам              │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │
│  │  │GPT-4o  │ │Claude  │ │Gemini  │ │DeepSeek│ │  Grok  │  │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │
│  │  │Qwen 72B│ │Mistral │ │Perplxty│ │ DeepL  │ │Yandex  │  │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │
│  │                         │                                  │  │
│  │  Фаза 2: Ensemble       ▼                                  │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │  postEditTranslation() — GPT-4o синтезирует лучший   │ │  │
│  │  │  вариант, исправляет кальки и грамматику              │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │                         │                                  │  │
│  │  Фаза 3: Самооценка     ▼                                  │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │  selfEvaluateAndImprove() — GPT-4o оценивает 1-10,   │ │  │
│  │  │  итеративно улучшает, если оценка < 8                │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  GET  /api/translations    GET  /api/engines                     │
│  POST /api/translations/:id/rate                                 │
└─────────┬───────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│              SQLite (better-sqlite3 + Drizzle ORM)              │
│  Таблица translations: исходный текст, переводы, оценки         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Конвейер перевода

Каждый запрос на перевод проходит три фазы:

### Фаза 1 — Параллельный перевод всеми движками

Все настроенные движки запускаются **одновременно** через `Promise.allSettled()`. Каждый движок:
- Получает исходный текст и языковую пару
- Использует детализированные правила казахской грамматики в системном промпте
- Возвращает результат с полем `confidence` (уверенность) и `latencyMs` (задержка)

Движки, для которых не настроен API-ключ, **автоматически пропускаются** при запуске сервера.

### Фаза 2 — Ensemble постредактирование

Если успешно ответили 2+ движка, GPT-4o (`postEditTranslation`) анализирует все варианты и синтезирует наилучший перевод. Промпт содержит:
- Детализированные правила казахского языка (`KAZAKH_GRAMMAR_RULES`)
- Few-shot примеры коррекции калек и грамматических ошибок
- Чеклист анти-паттернов (SVO→SOV, кальки, сингармонизм и т.д.)

Ensemble-результат возвращается с `confidence: 0.98`.

### Фаза 3 — Цикл самооценки

GPT-4o (`selfEvaluateAndImprove`) оценивает финальный перевод по 5 критериям (каждый 0–2 балла):
1. **Точность смысла** — полнота передачи содержания
2. **Грамматика** — правильность падежных окончаний и аффиксов
3. **Сингармонизм** — гармония гласных звуков
4. **Естественность** — отсутствие калек, звучит ли текст по-казахски
5. **Порядок слов** — соблюдение SOV

Если суммарная оценка ниже **8/10**, GPT-4o предлагает улучшенный вариант и оценивает его снова (до 2 итераций). Финальная оценка отображается в интерфейсе в виде значка качества.

---

## Движки перевода

| # | Движок | Модель / API | Уверенность | Ключ |
|---|--------|-------------|-------------|------|
| 1 | **GPT-4o** | OpenAI GPT-4o | 0.95 | `OPENAI_API_KEY` |
| 2 | **Claude Sonnet** | Anthropic Claude 3.5 Sonnet | 0.93 | `CLAUDE_API_KEY` |
| 3 | **Gemini 2.5 Flash** | Google Gemini 2.5 Flash | 0.90 | `GEMINI_API_KEY` |
| 4 | **DeepSeek Chat** | DeepSeek V3 | 0.87 | `DEEPSEEK_API_KEY` |
| 5 | **Grok 3 Mini** | xAI Grok 3 Mini | 0.85 | `GROK_API_KEY` |
| 6 | **Qwen 72B** | HuggingFace / Tilmash | 0.88 | `HUGGINGFACE_API_KEY` |
| 7 | **Mistral Small** | Mistral AI | 0.84 | `MISTRAL_API_KEY` |
| 8 | **Perplexity Sonar** | Perplexity Sonar | 0.83 | `PERPLEXITY_API_KEY` |
| 9 | **DeepL** | DeepL API (бета для KK) | 0.88 | `DEEPL_API_KEY` |
| 10 | **Yandex Translate** | Yandex Cloud v2 | 0.82 | `YANDEX_API_KEY` |

**Ensemble AI** (confidence: 0.98) — не самостоятельный движок, а GPT-4o постредактор, синтезирующий лучший результат из всех вариантов. Доступен автоматически при наличии 2+ настроенных движков.

**Порядок приоритета** при выборе лучшего перевода: `ensemble → openai → claude → gemini → deepseek → grok → tilmash → mistral → perplexity → deepl → yandex`

### Особенности отдельных движков

**Qwen 72B (Tilmash)** — системный промпт написан **на казахском языке**, что значительно повышает качество ответов этой модели для KK-направления.

**DeepL и Yandex** — API-движки без AI-промптинга. DeepL поддерживает казахский в бета-версии; Yandex традиционно силён в паре RU→KK.

**Все AI-движки** получают:
- Полный текст правил казахской грамматики (`KAZAKH_GRAMMAR_RULES`)
- Few-shot примеры для нужного направления перевода (`KAZAKH_FEWSHOT_RU` или `KAZAKH_FEWSHOT_EN`)

---

## API

Базовый URL: `https://kmt.qdev.run` (production) или `http://localhost:5000` (локально).

### `POST /api/translate`

Запуск перевода текста.

**Тело запроса:**

```json
{
  "text": "Привет, мир!",
  "sourceLang": "ru",
  "targetLang": "kk"
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `text` | string | Да | Текст для перевода (максимум 5000 символов) |
| `sourceLang` | `"ru"` \| `"en"` | Да | Язык исходного текста |
| `targetLang` | `"kk"` | Да | Язык перевода (только `"kk"`) |

**Ответ:**

```json
{
  "id": 42,
  "bestTranslation": {
    "engine": "ensemble",
    "text": "Сәлем, әлем!"
  },
  "allResults": [
    {
      "engine": "ensemble",
      "text": "Сәлем, әлем!",
      "confidence": 0.98,
      "latencyMs": 2341
    },
    {
      "engine": "openai",
      "text": "Сәлем, дүние!",
      "confidence": 0.95,
      "latencyMs": 1102
    }
  ],
  "sourceLang": "ru",
  "targetLang": "kk",
  "meta": {
    "evalScore": 9,
    "evalIterations": 1,
    "evalIssues": []
  }
}
```

**Коды ответов:**

| Код | Описание |
|-----|----------|
| `200` | Успешно |
| `400` | Ошибка валидации (текст пустой, превышен лимит, неверный язык) |
| `500` | Внутренняя ошибка сервера |

---

### `GET /api/translations`

Получение истории переводов.

**Query-параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `limit` | number | `20` | Количество записей (максимум 100) |

**Пример:** `GET /api/translations?limit=5`

**Ответ:**

```json
[
  {
    "id": 42,
    "sourceText": "Привет, мир!",
    "translatedText": "Сәлем, әлем!",
    "sourceLang": "ru",
    "targetLang": "kk",
    "engine": "ensemble",
    "allResults": "[{...}]",
    "rating": 5,
    "createdAt": "2026-03-31T05:00:00.000Z"
  }
]
```

---

### `POST /api/translations/:id/rate`

Оценка перевода пользователем.

**Параметры пути:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | number | ID перевода из истории |

**Тело запроса:**

```json
{ "rating": 5 }
```

| Поле | Тип | Описание |
|------|-----|----------|
| `rating` | integer | Оценка от 1 до 5 |

**Ответ:** обновлённая запись перевода (тот же формат, что в `GET /api/translations`).

**Коды ответов:**

| Код | Описание |
|-----|----------|
| `200` | Успешно |
| `400` | Неверный ID или оценка вне диапазона 1–5 |
| `404` | Перевод не найден |

---

### `GET /api/engines`

Статус всех зарегистрированных движков.

**Ответ:**

```json
{
  "engines": [
    {
      "name": "ensemble",
      "status": "available",
      "keyEnvVar": "(auto)",
      "hasApiKey": true
    },
    {
      "name": "openai",
      "status": "available",
      "keyEnvVar": "OPENAI_API_KEY",
      "hasApiKey": true
    },
    {
      "name": "claude",
      "status": "no_api_key",
      "keyEnvVar": "CLAUDE_API_KEY",
      "hasApiKey": false
    }
  ]
}
```

Ensemble отображается как `"available"`, если настроены 2 и более движков. Также используется как health check endpoint (Docker HEALTHCHECK).

---

## Стек технологий

| Слой | Технология | Версия |
|------|-----------|--------|
| **Runtime** | Node.js | 20 LTS |
| **Backend** | Express.js | 5 |
| **ORM** | Drizzle ORM | latest |
| **База данных** | SQLite (better-sqlite3) | — |
| **Frontend** | React | 18 |
| **Бандлер** | Vite | 5 |
| **Язык** | TypeScript | 5 |
| **UI-компоненты** | shadcn/ui + Radix UI | — |
| **Стили** | Tailwind CSS | 3 |
| **Роутинг** | Wouter | — |
| **HTTP-клиент** | TanStack Query | 5 |
| **Валидация** | Zod | 3 |
| **Контейнеризация** | Docker + Docker Compose | — |
| **Reverse proxy** | Nginx | — |
| **SSL** | Let's Encrypt (Certbot) | — |

---

## Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
nano .env
```

### API-ключи движков

| Переменная | Движок | Обязательно | Как получить |
|-----------|--------|-------------|--------------|
| `OPENAI_API_KEY` | GPT-4o + Ensemble + Self-eval | **Рекомендуется** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `CLAUDE_API_KEY` | Claude Sonnet | Нет | [console.anthropic.com](https://console.anthropic.com/) |
| `GEMINI_API_KEY` | Gemini 2.5 Flash | Нет | [aistudio.google.com](https://aistudio.google.com/) |
| `DEEPSEEK_API_KEY` | DeepSeek Chat | Нет | [platform.deepseek.com](https://platform.deepseek.com/) |
| `GROK_API_KEY` | Grok 3 Mini | Нет | [console.x.ai](https://console.x.ai/) |
| `HUGGINGFACE_API_KEY` | Qwen 72B (Tilmash) | Нет | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `MISTRAL_API_KEY` | Mistral Small | Нет | [console.mistral.ai](https://console.mistral.ai/) |
| `PERPLEXITY_API_KEY` | Perplexity Sonar | Нет | [docs.perplexity.ai](https://docs.perplexity.ai/) |
| `DEEPL_API_KEY` | DeepL | Нет | [deepl.com/pro-api](https://www.deepl.com/pro-api) |
| `YANDEX_API_KEY` | Yandex Translate v2 | Нет | [cloud.yandex.ru/docs/translate](https://cloud.yandex.ru/docs/translate/) |

> **Важно:** Минимум один ключ обязателен. `OPENAI_API_KEY` рекомендуется — он используется не только для перевода GPT-4o, но и для Ensemble постредактирования и цикла самооценки. Без него обе функции недоступны.

### Серверные переменные

| Переменная | Обязательно | По умолчанию | Описание |
|-----------|-------------|--------------|----------|
| `PORT` | Нет | `5000` | Порт HTTP-сервера |
| `NODE_ENV` | Нет | `development` | Режим работы (`production` для деплоя) |
| `DB_PATH` | Нет | `./data.db` | Путь к файлу SQLite |

---

## Локальная разработка

### Требования

- Node.js 20+
- npm 9+
- Минимум один API-ключ (см. выше)

### Запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/belilovsky/kazakh-translate.git
cd kazakh-translate

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env
# Отредактируйте .env — добавьте хотя бы один API-ключ

# 4. Запустить в режиме разработки (с hot-reload)
npm run dev
```

Приложение будет доступно по адресу: **http://localhost:5000**

Backend и frontend запускаются одним процессом: Express отдаёт статику через Vite dev-сервер в режиме разработки и напрямую из `dist/public/` в production.

### Production-сборка

```bash
# Сборка frontend и backend
npm run build

# Запуск production-сервера
npm start
```

---

## Деплой с Docker

### Быстрый старт

```bash
# 1. Клонировать и настроить
git clone https://github.com/belilovsky/kazakh-translate.git
cd kazakh-translate
cp .env.example .env
nano .env  # добавьте API-ключи

# 2. Запустить
docker compose up -d --build

# 3. Проверить
curl http://localhost:5000/api/engines
```

Приложение будет доступно на порту **5000**.

### Команды управления

```bash
# Просмотр логов
docker compose logs -f

# Перезапуск
docker compose restart

# Обновление до новой версии
git pull
docker compose up -d --build

# Резервная копия базы данных
docker compose exec kaztilshi cp /app/data/kaztilshi.db /tmp/backup.db
docker cp kaztilshi-app:/tmp/backup.db ./backup.db
```

### Docker-архитектура

Dockerfile использует **многоэтапную сборку**:
1. **Stage `builder`** — полный Node.js образ, устанавливает все зависимости и собирает проект (`npm run build`)
2. **Stage `production`** — облегчённый образ с только production-зависимостями и скомпилированными файлами из `dist/`

База данных SQLite хранится в **именованном volume** `kaztilshi-data` (`/app/data/`), что обеспечивает персистентность при пересборке контейнера.

---

## Деплой на VPS с Nginx

### Автоматический деплой

Используйте готовый скрипт для Ubuntu/Debian:

```bash
# На VPS (Ubuntu 20.04+)
curl -fsSL https://raw.githubusercontent.com/belilovsky/kazakh-translate/main/deploy.sh | bash
```

Скрипт автоматически:
1. Устанавливает Docker и Docker Compose
2. Клонирует репозиторий в `/opt/kaztilshi`
3. Предлагает настроить `.env`
4. Собирает образ и запускает контейнер
5. Проверяет работоспособность через `GET /api/engines`

### Ручная настройка Nginx + SSL

**Шаг 1.** Получите SSL-сертификат через Certbot:

```bash
sudo apt update && sudo apt install -y certbot
sudo certbot certonly --standalone -d kmt.yourdomain.com
```

**Шаг 2.** Установите Nginx:

```bash
sudo apt install -y nginx
```

**Шаг 3.** Скопируйте и настройте конфиг:

```bash
sudo cp /opt/kaztilshi/nginx.conf /etc/nginx/sites-available/kaztilshi
# Замените kaztilshi.example.com на ваш домен
sudo sed -i 's/kaztilshi.example.com/kmt.yourdomain.com/g' \
    /etc/nginx/sites-available/kaztilshi
sudo ln -s /etc/nginx/sites-available/kaztilshi \
    /etc/nginx/sites-enabled/kaztilshi
sudo nginx -t && sudo systemctl reload nginx
```

**Шаг 4.** Настройте автообновление сертификата:

```bash
sudo crontab -e
# Добавьте строку:
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

### Конфигурация Nginx

```nginx
server {
    listen 80;
    server_name kmt.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kmt.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/kmt.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kmt.yourdomain.com/privkey.pem;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    client_max_body_size 2m;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;  # AI-движки могут отвечать медленно
    }
}
```

> **Текущее production-окружение:** Ubuntu VPS (62.72.32.112), домен `kmt.qdev.run`, Docker + Nginx + Let's Encrypt SSL.

---

## Админ-панель

Доступна по адресу `https://kmt.qdev.run/#/admin`

| Страница | Описание |
|---|---|
| **Обзор** | Статистика переводов, графики рейтинга движков и латентности, последние переводы |
| **Переводы** | Полная таблица с поиском, фильтрами, пагинацией, удалением, экспортом CSV |
| **Движки** | Карточки со статусом, вызовами, латентностью, успешностью, ошибками |
| **Лаборатория** | Тестовый перевод с отображением всех движков бок о бок с оценками |
| **Настройки** | Параметры самооценки, приоритет движков, версия, аптайм |

### Admin API

| Эндпоинт | Описание |
|---|---|
| `GET /api/admin/stats` | Общая статистика: всего переводов, сегодня, средний балл, рейтинг движков |
| `GET /api/admin/translations` | Пагинированный список с поиском и фильтрами |
| `DELETE /api/admin/translations/:id` | Удаление перевода |
| `GET /api/admin/translations/export` | Экспорт в CSV |
| `GET /api/admin/engine-stats` | Статистика по каждому движку |
| `GET /api/admin/settings` | Конфигурация приложения |

---

## Лингвистическая база

Подробное исследование казахской лингвистики сохранено в [`docs/kazakh-linguistics-research.md`](docs/kazakh-linguistics-research.md). Ключевые темы:

- **Диалекты**: северо-восточный (стандарт), южный (влияние кыргызского), западный (открытые гласные)
- **История языка**: смены письменности (арабская → латиница → кириллица → новая латиница 2031), советское влияние, code-switching
- **Ресурсы**: KazParC (371K предложений), Termincom.kz (383K терминов), Apertium-kaz, KazRoBERTa, Qazcorpora.kz
- **MT-специфика**: агглютинация (25-34% ошибок), сингармонизм и исключения, конвербы, SOV-перестройка

---

## Структура проекта

```
kazakh-translate/
│
├── client/                          # React-приложение (Vite)
│   ├── index.html                   # HTML-шаблон с OpenGraph и SEO-мета
│   ├── public/
│   │   ├── favicon.png              # Иконка (шаңырақ)
│   │   ├── apple-touch-icon.png     # Иконка для iOS
│   │   ├── og-image.png             # OG-изображение для светлой темы
│   │   ├── og-image-dark.png        # OG-изображение для тёмной темы
│   │   ├── manifest.json            # PWA-манифест
│   │   ├── robots.txt               # Директивы для поисковых ботов
│   │   └── sitemap.xml              # XML-карта сайта
│   └── src/
│       ├── main.tsx                 # Точка входа React
│       ├── App.tsx                  # Корневой компонент с роутингом
│       ├── index.css                # Глобальные стили + CSS-переменные темы
│       ├── pages/
│       │   ├── translate.tsx        # Главная страница переводчика
│       │   ├── history.tsx          # Страница истории переводов
│       │   └── not-found.tsx        # Страница 404
│       ├── components/
│       │   ├── theme-provider.tsx   # Провайдер тёмной/светлой темы
│       │   └── ui/                  # shadcn/ui компоненты (button, badge, ...)
│       ├── hooks/
│       │   ├── use-toast.ts         # Хук уведомлений
│       │   └── use-mobile.tsx       # Хук определения мобильного устройства
│       └── lib/
│           ├── queryClient.ts       # TanStack Query + apiRequest()
│           └── utils.ts             # Утилиты (cn и др.)
│
├── server/                          # Express-бэкенд
│   ├── index.ts                     # Точка входа сервера, middleware
│   ├── routes.ts                    # API-маршруты (4 эндпоинта)
│   ├── storage.ts                   # DatabaseStorage (Drizzle + SQLite)
│   ├── static.ts                    # Отдача статики в production
│   ├── vite.ts                      # Vite dev-сервер в development
│   └── engines/
│       ├── types.ts                 # Интерфейсы TranslationEngine, TranslationResult
│       ├── kazakh-rules.ts          # Правила казахского языка + few-shot примеры
│       ├── index.ts                 # translateWithAll(), selectBest(), приоритеты
│       ├── postprocess.ts           # Ensemble: GPT-4o постредактирование
│       ├── self-eval.ts             # Цикл самооценки (GPT-4o, 1-10, до 2 итераций)
│       ├── openai.ts                # Движок GPT-4o
│       ├── claude.ts                # Движок Claude Sonnet
│       ├── gemini.ts                # Движок Gemini 2.5 Flash
│       ├── deepseek.ts              # Движок DeepSeek Chat
│       ├── grok.ts                  # Движок Grok 3 Mini
│       ├── tilmash.ts               # Движок Qwen 72B (HuggingFace)
│       ├── mistral.ts               # Движок Mistral Small
│       ├── perplexity.ts            # Движок Perplexity Sonar
│       ├── deepl.ts                 # Движок DeepL API
│       └── yandex.ts                # Движок Yandex Translate v2
│
├── shared/
│   └── schema.ts                    # Drizzle-схема БД (translations, users)
│
├── script/
│   └── build.ts                     # Скрипт сборки (esbuild)
│
├── Dockerfile                       # Многоэтапная Docker-сборка
├── docker-compose.yml               # Docker Compose для production
├── nginx.conf                       # Шаблон конфига Nginx с SSL
├── deploy.sh                        # Скрипт автодеплоя на VPS (Ubuntu/Debian)
├── drizzle.config.ts                # Конфигурация Drizzle Kit
├── vite.config.ts                   # Конфигурация Vite
├── tailwind.config.ts               # Конфигурация Tailwind CSS
├── components.json                  # Конфигурация shadcn/ui
├── .env.example                     # Шаблон переменных окружения
├── data.db                          # SQLite-база данных (создаётся автоматически)
├── README.md                        # Документация (этот файл)
├── CHANGELOG.md                     # История изменений
└── docs/
    └── API.md                       # Подробная API-документация с curl-примерами
```

---

## SEO и OpenGraph

Приложение имеет полную SEO-разметку в `client/index.html`:

- **`<title>`** и `<meta name="description">` на казахском языке
- **Open Graph** (`og:title`, `og:description`, `og:image`, `og:locale`) для красивых превью в мессенджерах и соцсетях
- **Twitter Card** (`twitter:card: summary_large_image`) с OG-изображением 1200×630px
- **JSON-LD** структурированные данные (`WebApplication` schema) для Google
- **Canonical URL** → `https://kmt.qdev.run/`
- **`robots.txt`** разрешает индексацию всем ботам
- **`sitemap.xml`** для поисковых систем
- **PWA manifest** (`manifest.json`) с иконками и цветом темы `#c89b37` (золотой)
- **`theme-color`** мета-тег для мобильных браузеров

**Дизайн-палитра:** вдохновлена казахской степной тематикой — золотистый (`#c89b37`), тёплые бежевые и коричневые тона. Логотип — стилизованный шаңырақ (навершие юрты).

---

## Лицензия

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

```
MIT License

Copyright (c) 2026 Қазтілші

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```
