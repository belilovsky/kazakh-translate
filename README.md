# Қазтілші — AI-переводчик на казахский язык

> **Қазтілші** (каз. «казахский переводчик») — высококачественный сервис машинного перевода с русского и английского на казахский язык. Использует ансамбль из **8 активных AI-движков** с лингвистическим критиком, MQM-самооценкой и SSE-стримингом для максимального качества перевода.

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
- [Лингвистическая база знаний](#лингвистическая-база-знаний)
- [Интерфейс (UI)](#интерфейс-ui)
- [API](#api)
- [Стек технологий](#стек-технологий)
- [Переменные окружения](#переменные-окружения)
- [Локальная разработка](#локальная-разработка)
- [Деплой с Docker](#деплой-с-docker)
- [Деплой на VPS с Nginx](#деплой-на-vps-с-nginx)
- [Админ-панель](#админ-панель)
- [Структура проекта](#структура-проекта)
- [SEO и OpenGraph](#seo-и-opengraph)
- [Лицензия](#лицензия)

---

## Особенности

- **8 активных движков перевода** — GPT-4o, Claude Sonnet 4, Gemini 2.5 Flash, DeepSeek V3, Grok, Qwen 72B (HuggingFace/Tilmash), Perplexity Sonar, Yandex Translate
- **Smart Ensemble с критиком** — Gemini 2.5 Flash анализирует все варианты и пишет рецензию; GPT-4o синтезирует финальный перевод с учётом критики
- **MQM Self-evaluation** — GPT-4o оценивает перевод по стандарту Multidimensional Quality Metrics (4 категории: Accuracy, Fluency, Terminology, Style; 3 уровня: critical/major/minor); итеративно улучшает при score < 8
- **13 разделов грамматических правил** казахского языка внедрены в каждый AI-промпт: агглютинативная морфология, сингармонизм, SOV-порядок слов, антикальки и т.д.
- **SSE-стриминг** — конвейер перевода транслируется в реальном времени через Server-Sent Events с heartbeat каждые 10 секунд
- **Премиальный UI** (translate-v2) — вдохновлён DeepL/Google Translate/Papago: pill-селекторы языка, стеклянные карточки, shimmer-загрузка, warm gold palette
- **PipelineViz** — 3-этапная визуализация конвейера с бейджами правил на каждом этапе
- **TTS Player** — синтез речи с голосом kk-KZ (play/pause/stop/speed/progress)
- **Голосовой ввод** через Web Speech API
- **Система оценок** — пользователь может оценить перевод по шкале 1–5
- **История переводов** — хранится в локальной SQLite-базе данных
- **Автоматическое самотестирование** — 10 бенчмарк-случаев каждые 6 часов в production
- **Админ-панель** — дашборд, управление переводами, мониторинг движков, лаборатория сравнения, selftest
- **PWA** — Progressive Web App, работает как нативное приложение
- **Docker-ready** — многоэтапная сборка, готовая к production-деплою

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         Клиент (Browser)                        │
│  React 18 + Vite + Tailwind CSS + shadcn/ui                     │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ translate-v2  │  │  history.tsx │  │  admin/* (5 страниц)  │  │
│  │ (новый UI)    │  │              │  │                       │  │
│  └───────┬───────┘  └──────────────┘  └───────────────────────┘  │
└──────────┼──────────────────────────────────────────────────────┘
           │ SSE / REST API
┌──────────▼──────────────────────────────────────────────────────┐
│                   Nginx (SSL Termination)                        │
│  Let's Encrypt TLS, reverse proxy → :5000                       │
└──────────┬──────────────────────────────────────────────────────┘
           │ proxy_pass http://localhost:5000
┌──────────▼──────────────────────────────────────────────────────┐
│              Express.js Backend (Node.js 20)                    │
│                                                                  │
│  POST /api/translate/stream  (SSE streaming)                     │
│  POST /api/translate         (REST)                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              translateWithAll()  — конвейер                │  │
│  │                                                            │  │
│  │  Фаза 1: Параллельный запрос ко всем движкам              │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │  │
│  │  │GPT-4o  │ │Claude  │ │Gemini  │ │DeepSeek│             │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘             │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │  │
│  │  │  Grok  │ │Qwen 72B│ │Perplxty│ │Yandex  │             │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘             │  │
│  │                         │                                  │  │
│  │  Фаза 2: Critic         ▼                                  │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │  getCritique() — Gemini 2.5 Flash (10 check points,  │ │  │
│  │  │  timeout 18s, non-blocking)                           │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │                         │                                  │  │
│  │  Фаза 2: Ensemble       ▼                                  │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │  postEditTranslation() — GPT-4o синтезирует с учётом │ │  │
│  │  │  вариантов + рецензии критика                         │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │                         │                                  │  │
│  │  Фаза 3: MQM Self-eval  ▼                                  │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │  selfEvaluateAndImprove() — GPT-4o, MQM стандарт,   │ │  │
│  │  │  4 категории, улучшение при score < 8 (до 2 итерац.) │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  GET  /api/translations    GET  /api/engines                     │
│  POST /api/translations/:id/rate                                 │
│  GET  /api/admin/*  (stats, translations, engine-stats, ...)    │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│              SQLite (better-sqlite3 + Drizzle ORM)              │
│  Таблица translations: исходный текст, переводы, оценки         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Конвейер перевода

Каждый запрос на перевод проходит три фазы. При использовании SSE-эндпоинта (`POST /api/translate/stream`) клиент получает события в реальном времени на каждом этапе.

### Фаза 1 — Параллельный перевод всеми движками

Все настроенные движки запускаются **одновременно** через `Promise.allSettled()`. Каждый движок:
- Получает исходный текст и языковую пару
- Использует 13 разделов правил казахской грамматики (`KAZAKH_GRAMMAR_RULES`) в системном промпте
- Получает 5 few-shot примеров для нужного направления (`KAZAKH_FEWSHOT_RU` или `KAZAKH_FEWSHOT_EN`)
- Возвращает результат с `confidence`, `latencyMs` и, при сбое, `error`

Движки, для которых не настроен API-ключ, **автоматически пропускаются** при запуске сервера.

### Фаза 2 — Critic + Ensemble

**Критик (Gemini 2.5 Flash)** запускается параллельно и анализирует все успешные варианты по 10 контрольным точкам: сингармонизм, кальки, SOV, падежи, 3SG POSS, числительные, конвербы, «который»→причастие, отрицание, выбор лучшего варианта. Таймаут: 18 секунд. Критик non-blocking — если не ответил, Ensemble работает без рецензии.

**Ensemble (GPT-4o)** получает все варианты + рецензию критика и синтезирует финальный перевод. Confidence: 0.98. Таймаут: 25 секунд.

### Фаза 3 — MQM Self-evaluation

GPT-4o (`selfEvaluateAndImprove`) оценивает финальный перевод по стандарту **Multidimensional Quality Metrics**:

**4 категории ошибок:**
- `accuracy` — addition, omission, mistranslation, untranslated
- `fluency` — grammar, vowel_harmony, word_order, morphology
- `terminology` — wrong_term, calque
- `style` — register, unnatural

**3 уровня ауырлости:**
- `critical` — штраф 25 (значительное искажение смысла)
- `major` — штраф 5 (заметная ошибка, чтение затруднено)
- `minor` — штраф 1 (незначительный недостаток)

**Формула:** `MQM Score = max(0, 10 − Σ(штрафы) / кол-во_предложений)`

Если score < 8 — GPT-4o предлагает улучшенный текст и оценивает повторно (до 2 итераций). Финальный score отображается в UI. Сбой самооценки записывается как score = −1 (не маскируется как 5).

---

## Движки перевода

### Активные движки (8)

| # | Движок | Модель / API | Confidence | Ключ |
|---|--------|-------------|------------|------|
| 1 | **GPT-4o** | OpenAI GPT-4o | 0.95 | `OPENAI_API_KEY` |
| 2 | **Claude Sonnet 4** | Anthropic Claude Sonnet 4 | 0.93 | `CLAUDE_API_KEY` |
| 3 | **Gemini 2.5 Flash** | Google Gemini 2.5 Flash | 0.90 | `GEMINI_API_KEY` |
| 4 | **DeepSeek V3** | DeepSeek V3 | 0.87 | `DEEPSEEK_API_KEY` |
| 5 | **Grok** | xAI Grok | 0.85 | `GROK_API_KEY` |
| 6 | **Qwen 72B (Tilmash)** | HuggingFace / Qwen 72B | 0.88 | `HUGGINGFACE_API_KEY` |
| 7 | **Perplexity Sonar** | Perplexity Sonar | 0.83 | `PERPLEXITY_API_KEY` |
| 8 | **Yandex Translate** | Yandex Cloud v2 | 0.82 | `YANDEX_API_KEY` |

**Ensemble AI** (confidence: 0.98) — не самостоятельный движок, а GPT-4o постредактор с Gemini-критиком. Доступен автоматически при наличии 2+ настроенных движков.

**Порядок приоритета** при выборе лучшего перевода:
`ensemble → openai → claude → gemini → deepseek → grok → tilmash → mistral → perplexity → deepl → yandex`

### Неактивные движки

| Движок | Статус | Причина |
|--------|--------|---------|
| **Mistral Small** | ⚠️ 401 Unauthorized | Требуется обновление API-ключа |
| **DeepL** | ❌ Удалён | DeepL не поддерживает казахский язык (KK) |

### Особенности движков

**Qwen 72B (Tilmash)** — системный промпт написан **на казахском языке** (`getSystemPromptKazakh()`), что значительно повышает качество ответов.

**Perplexity** — получает полный («detailed») вариант грамматических правил (наравне с GPT-4o, Claude и Gemini).

**Все AI-движки** получают:
- Полный текст `KAZAKH_GRAMMAR_RULES` (13 разделов)
- 5 few-shot примеров для соответствующего направления перевода

---

## Лингвистическая база знаний

### kazakh-rules.ts — 13 разделов грамматики

Файл `server/engines/kazakh-rules.ts` инжектируется в системный промпт **каждого движка**:

| § | Раздел | Содержание |
|---|--------|-----------|
| 1 | Agglutinative morphology | Цепочки суффиксов, падежные окончания |
| 2 | Vowel harmony | Жуан/жіңішке дауыстылар, правила гармонии |
| 3 | Consonant assimilation | Оглушение/озвончение суффиксов |
| 4 | SOV word order | Глагол всегда в конце, порядок модификаторов |
| 5 | Anti-calque | Запрет калек с рус./англ., список замен |
| 6 | Kazakh constructions | Отрицание, вопрос, косвенная речь, бытие |
| 7 | Register/style | Сіз/Сен, академический vs разговорный |
| 8 | 3SG POSS+case | Специальные формы: баласын/баласына/баласында |
| 9 | Numeral+singular | Числительное + зат есім в единственном числе |
| 10 | Negation order | Основа + залоговый + NEG + время + личное |
| 11 | Converb patterns | когда→-ғанда, если→-са, чтобы→үшін и т.д. |
| 12 | Participle constructions | «который»→-ған/-атын/-ар + зат есім |
| 13 | Top-5 MT errors | Самые частые ошибки машинного перевода |

+ 5 few-shot примеров для RU→KK и 5 для EN→KK.

### Gemini Critic — 10 контрольных точек

1. Сингармонизм (жуан/жіңішке)
2. Кальки с рус./англ.
3. SOV порядок слов
4. Падежные/тәуелдік жалғаулары
5. Выбор лучшего варианта и обоснование
6. 3SG POSS + специальные падежные формы
7. Числительное + единственное число
8. Конвербы для подчинённых предложений
9. «Который» → причастная конструкция
10. Порядок отрицания

### MQM Self-eval — 9 критериев

4 категории MQM + 5 морфологических проверок (3SG POSS, числительные, конвербы, «который», порядок отрицания).

### Лингвистическое исследование

`docs/kazakh-linguistics-research.md` — 1708 строк исчерпывающего справочника. Ключевые темы:
- Диалекты: северо-восточный (стандарт), южный, западный
- История языка: смены письменности (арабская → латиница → кириллица → новая латиница 2031)
- Академические ресурсы: KazParC (371K предложений), Termincom.kz (383K терминов), Apertium-kaz, KazRoBERTa
- MT-специфика: агглютинация (25–34% ошибок), сингармонизм и исключения, конвербы, SOV-перестройка

---

## Интерфейс (UI)

### Маршруты

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/#/` | `translate-v2.tsx` | **Новый** премиальный переводчик (главная) |
| `/#/v1` | `translate.tsx` | Старый интерфейс (сохранён) |
| `/#/history` | `history.tsx` | История переводов |
| `/#/admin` | `AdminDashboard` | Обзор / дашборд |
| `/#/admin/translations` | `AdminTranslations` | Управление переводами |
| `/#/admin/engines` | `AdminEngines` | Мониторинг движков |
| `/#/admin/lab` | `AdminLab` | Лаборатория сравнения |
| `/#/admin/settings` | `AdminSettings` | Настройки |

### Новый UI (translate-v2.tsx)

- **Pill-селекторы** языка (вдохновлено DeepL/Papago)
- **22px** шрифт результата перевода
- **Glass cards** — glassmorphism карточки
- **Shimmer loading** — skeleton-анимация во время перевода
- **MQM display** — отображение MQM-метрик с цветовой индикацией ошибок
- **PipelineViz** — 3-этапная диагностика конвейера с бейджами правил
- **TTS Player** — голос kk-KZ, play/pause/stop, speed, progress bar

### Дизайн-система

- **Шрифты:** Plus Jakarta Sans (display), Inter (body), JetBrains Mono (code)
- **Палитра:** warm gold `#c89b37`, glassmorphism, noise texture, gradient backgrounds
- **Тёмная тема** с тёплыми коричневыми тонами

---

## API

Базовый URL: `https://kmt.qdev.run` (production) или `http://localhost:5000` (локально).

Подробная документация с примерами: [`docs/API.md`](docs/API.md)

### Публичные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/translate/stream` | **Стриминг** — SSE-конвейер в реальном времени |
| `POST` | `/api/translate` | Синхронный перевод (REST) |
| `GET` | `/api/translations` | История переводов (`?limit=20`) |
| `POST` | `/api/translations/:id/rate` | Оценка перевода (1–5) |
| `GET` | `/api/engines` | Статус движков (health check) |

### Admin API

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/admin/stats` | Общая статистика |
| `GET` | `/api/admin/translations` | Пагинированный список с поиском |
| `DELETE` | `/api/admin/translations/:id` | Удаление перевода |
| `GET` | `/api/admin/translations/export` | Экспорт в CSV |
| `GET` | `/api/admin/engine-stats` | Статистика по движкам |
| `GET` | `/api/admin/settings` | Конфигурация приложения |
| `GET` | `/api/admin/selftest` | Последний прогон self-test |
| `GET` | `/api/admin/selftest/history` | История self-test прогонов |
| `POST` | `/api/admin/selftest/run` | Запустить тест вручную |
| `GET` | `/api/admin/selftest/cases` | Список тест-кейсов |

---

## Стек технологий

| Слой | Технология | Версия |
|------|-----------|--------|
| **Runtime** | Node.js | 20 LTS |
| **Backend** | Express.js | 5 |
| **ORM** | Drizzle ORM | latest |
| **База данных** | SQLite (better-sqlite3) | — |
| **Frontend** | React | 18 |
| **Бандлер** | Vite | 7 |
| **Язык** | TypeScript | 5.6 |
| **UI-компоненты** | shadcn/ui + Radix UI | — |
| **Стили** | Tailwind CSS | 3 |
| **Анимации** | Framer Motion | 11 |
| **Роутинг** | Wouter (hash-based) | 3 |
| **HTTP-клиент** | TanStack Query | 5 |
| **Графики** | Recharts | 2 |
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

| Переменная | Движок | Статус | Как получить |
|-----------|--------|--------|--------------|
| `OPENAI_API_KEY` | GPT-4o + Ensemble + Self-eval | **Рекомендуется** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `CLAUDE_API_KEY` | Claude Sonnet 4 | Нет | [console.anthropic.com](https://console.anthropic.com/) |
| `GEMINI_API_KEY` | Gemini 2.5 Flash + Critic | Нет | [aistudio.google.com](https://aistudio.google.com/) |
| `DEEPSEEK_API_KEY` | DeepSeek V3 | Нет | [platform.deepseek.com](https://platform.deepseek.com/) |
| `GROK_API_KEY` | Grok | Нет | [console.x.ai](https://console.x.ai/) |
| `HUGGINGFACE_API_KEY` | Qwen 72B (Tilmash) | Нет | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `MISTRAL_API_KEY` | Mistral Small | ⚠️ 401 | [console.mistral.ai](https://console.mistral.ai/) |
| `PERPLEXITY_API_KEY` | Perplexity Sonar | Нет | [docs.perplexity.ai](https://docs.perplexity.ai/) |
| `YANDEX_API_KEY` | Yandex Translate v2 | Нет | [cloud.yandex.ru/docs/translate](https://cloud.yandex.ru/docs/translate/) |

> **Важно:** `OPENAI_API_KEY` рекомендуется в первую очередь — он используется для перевода GPT-4o, Ensemble постредактора и MQM самооценки. Без него все три функции недоступны.
>
> `GEMINI_API_KEY` нужен для Smart Critic. Без него Ensemble работает без предварительной рецензии.

### Серверные переменные

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `PORT` | `5000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | Режим работы (`production` для деплоя) |
| `DB_PATH` | `./data.db` | Путь к файлу SQLite |

---

## Локальная разработка

### Требования

- Node.js 20+
- npm 9+
- Минимум один API-ключ

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

### Production-сборка

```bash
npm run build
npm start
```

---

## Деплой с Docker

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

### Команды управления

```bash
# Просмотр логов
docker compose logs -f

# Обновление до новой версии
git pull && docker compose up -d --build

# Резервная копия базы данных
docker compose exec kaztilshi cp /app/data/kaztilshi.db /tmp/backup.db
docker cp kaztilshi-app:/tmp/backup.db ./backup.db
```

Dockerfile использует **многоэтапную сборку**. База данных SQLite хранится в именованном volume `kaztilshi-data`.

---

## Деплой на VPS с Nginx

### Автоматический деплой

```bash
# На VPS (Ubuntu 20.04+)
curl -fsSL https://raw.githubusercontent.com/belilovsky/kazakh-translate/main/deploy.sh | bash
```

### Конфигурация Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name kmt.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/kmt.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kmt.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;

        # SSE streaming support
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
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
| **Настройки** | Параметры самооценки, приоритет движков, selftest-результаты |

---

## Структура проекта

```
kazakh-translate/
│
├── client/                          # React-приложение (Vite)
│   ├── index.html                   # HTML-шаблон с OpenGraph и SEO-мета
│   ├── public/
│   │   ├── favicon.png              # Иконка (шаңырақ)
│   │   ├── manifest.json            # PWA-манифест
│   │   ├── robots.txt               # Директивы для поисковых ботов
│   │   └── sitemap.xml              # XML-карта сайта
│   └── src/
│       ├── main.tsx                 # Точка входа React
│       ├── App.tsx                  # Роутинг (Wouter hash-based)
│       ├── pages/
│       │   ├── translate-v2.tsx     # Новый премиальный UI (главная, /#/)
│       │   ├── translate.tsx        # Старый UI (/#/v1)
│       │   ├── history.tsx          # История переводов (/#/history)
│       │   ├── not-found.tsx        # Страница 404
│       │   └── admin/
│       │       ├── Dashboard.tsx    # /#/admin
│       │       ├── Translations.tsx # /#/admin/translations
│       │       ├── Engines.tsx      # /#/admin/engines
│       │       ├── Lab.tsx          # /#/admin/lab
│       │       └── Settings.tsx     # /#/admin/settings
│       ├── components/
│       │   ├── theme-provider.tsx   # Провайдер тёмной/светлой темы
│       │   └── ui/                  # shadcn/ui компоненты
│       └── lib/
│           ├── queryClient.ts       # TanStack Query
│           └── utils.ts             # Утилиты
│
├── server/                          # Express-бэкенд
│   ├── index.ts                     # Точка входа сервера
│   ├── routes.ts                    # API-маршруты (SSE + REST + Admin)
│   ├── storage.ts                   # DatabaseStorage (Drizzle + SQLite)
│   ├── selftest.ts                  # Selftest: 10 кейсов, каждые 6ч
│   └── engines/
│       ├── types.ts                 # TranslationEngine, TranslationResult
│       ├── kazakh-rules.ts          # 13 разделов грамматики + few-shot
│       ├── index.ts                 # translateWithAll(), ProgressCallback
│       ├── postprocess.ts           # Critic (Gemini) + Ensemble (GPT-4o)
│       ├── self-eval.ts             # MQM самооценка (GPT-4o)
│       ├── openai.ts                # GPT-4o
│       ├── claude.ts                # Claude Sonnet 4
│       ├── gemini.ts                # Gemini 2.5 Flash
│       ├── deepseek.ts              # DeepSeek V3
│       ├── grok.ts                  # Grok
│       ├── tilmash.ts               # Qwen 72B (HuggingFace)
│       ├── mistral.ts               # Mistral Small (⚠️ 401)
│       ├── perplexity.ts            # Perplexity Sonar
│       ├── deepl.ts                 # DeepL (❌ удалён из allEngines)
│       └── yandex.ts                # Yandex Translate v2
│
├── shared/
│   └── schema.ts                    # Drizzle-схема БД
│
├── docs/
│   ├── API.md                       # Подробная API-документация
│   ├── ARCHITECTURE.md              # Архитектура проекта
│   ├── KNOWN-ISSUES.md              # Известные проблемы
│   └── kazakh-linguistics-research.md  # Лингвистическая база (1708 строк)
│
├── Dockerfile                       # Многоэтапная Docker-сборка
├── docker-compose.yml               # Docker Compose для production
├── nginx.conf                       # Шаблон конфига Nginx с SSL
├── deploy.sh                        # Скрипт автодеплоя
├── drizzle.config.ts                # Конфигурация Drizzle Kit
├── vite.config.ts                   # Конфигурация Vite
├── tailwind.config.ts               # Конфигурация Tailwind CSS
├── .env.example                     # Шаблон переменных окружения
├── README.md                        # Документация (этот файл)
└── CHANGELOG.md                     # История изменений
```

---

## SEO и OpenGraph

- **`<title>`** и `<meta name="description">` на казахском языке
- **Open Graph** (`og:title`, `og:description`, `og:image`, `og:locale`) для превью в соцсетях
- **Twitter Card** (`summary_large_image`) с OG-изображением 1200×630px
- **JSON-LD** структурированные данные (`WebApplication`) для Google
- **Canonical URL** → `https://kmt.qdev.run/`
- **`robots.txt`** и **`sitemap.xml`** для поисковых систем
- **PWA manifest** с иконками и цветом темы `#c89b37` (золотой)

---

## Лицензия

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

```
MIT License — Copyright (c) 2026 Қазтілші
```
