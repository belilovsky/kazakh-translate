# Тілмаш — Казахский переводчик

Сервис машинного перевода на казахский язык (қазақша) с русского и английского. Использует ансамбль из 4 движков перевода для максимального качества.

## Движки перевода

| Движок | Модель/API | Описание |
|--------|-----------|----------|
| **OpenAI** | GPT-4o | Лучшее качество, промпт с инструкциями для казахского языка |
| **Tilmash** | issai/tilmash (HuggingFace) | Казахская open-source модель от ISSAI (Назарбаев Университет) |
| **DeepL** | DeepL API Free | Казахский в бета-версии |
| **Yandex** | Yandex Translate v2 | Хорошая поддержка казахского и русского |

Все 4 движка запускаются параллельно. Система автоматически выбирает лучший результат по приоритету: OpenAI → Tilmash → DeepL → Yandex. Пользователь видит все варианты и может оценить перевод.

## Быстрый старт

### Требования

- Node.js 20+
- npm 9+
- Минимум один API-ключ (см. ниже)

### Локальная разработка

```bash
# Клонировать репозиторий
git clone https://github.com/<your-username>/kazakh-translate.git
cd kazakh-translate

# Установить зависимости
npm install

# Скопировать и настроить переменные окружения
cp .env.example .env
# Отредактируйте .env — добавьте ваши API-ключи

# Запустить dev-сервер
npm run dev
```

Откройте http://localhost:5000

### Production-сборка

```bash
npm run build
npm start
```

## Деплой на VPS (Docker)

### 1. Подготовить сервер

```bash
# Установить Docker и Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Настроить

```bash
# Скопировать .env.example → .env
cp .env.example .env

# Добавить API-ключи
nano .env
```

### 3. Запустить

```bash
docker compose up -d --build
```

Приложение будет доступно на порту 5000.

### 4. HTTPS с Nginx (опционально)

1. Установите certbot и получите SSL-сертификат:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d tilmash.example.com
```

2. Раскомментируйте секцию `nginx` в `docker-compose.yml`

3. Отредактируйте `nginx.conf` — замените `tilmash.example.com` на ваш домен

4. Перезапустите:
```bash
docker compose up -d --build
```

## API-ключи

| Переменная | Сервис | Как получить |
|-----------|--------|-------------|
| `OPENAI_API_KEY` | OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| `HUGGINGFACE_API_KEY` | HuggingFace (Tilmash) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `DEEPL_API_KEY` | DeepL | [deepl.com/pro-api](https://www.deepl.com/pro-api) |
| `YANDEX_API_KEY` | Yandex Cloud | [cloud.yandex.ru/docs/translate](https://cloud.yandex.ru/docs/translate/) |

Минимум один ключ обязателен. Чем больше ключей — тем больше вариантов перевода, тем лучше качество.

## API

### POST /api/translate

Перевести текст.

```json
{
  "text": "Привет, мир!",
  "sourceLang": "ru",
  "targetLang": "kk"
}
```

Ответ:
```json
{
  "id": 1,
  "bestTranslation": { "engine": "openai", "text": "Сәлем, әлем!" },
  "allResults": [...],
  "sourceLang": "ru",
  "targetLang": "kk"
}
```

### GET /api/engines

Статус движков (какие API-ключи настроены).

### GET /api/translations?limit=20

Последние переводы.

### POST /api/translations/:id/rate

Оценить перевод (1–5).

```json
{ "rating": 4 }
```

## Структура проекта

```
kazakh-translate/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── translate.tsx   # Главная — переводчик
│   │   │   └── history.tsx     # История переводов
│   │   ├── components/
│   │   │   └── theme-provider.tsx
│   │   ├── App.tsx
│   │   └── index.css           # Sky-blue палитра
│   └── index.html
├── server/
│   ├── engines/
│   │   ├── types.ts            # Интерфейсы TranslationEngine, TranslationResult
│   │   ├── openai.ts           # GPT-4o engine
│   │   ├── tilmash.ts          # HuggingFace Tilmash
│   │   ├── deepl.ts            # DeepL API
│   │   ├── yandex.ts           # Yandex Translate
│   │   └── index.ts            # translateWithAll() + selectBest()
│   ├── routes.ts               # Express API routes
│   ├── storage.ts              # SQLite + Drizzle ORM
│   └── index.ts                # Express server entry
├── shared/
│   └── schema.ts               # Drizzle schema (translations table)
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Production deployment
├── nginx.conf                  # Nginx reverse proxy с SSL
├── .env.example                # Шаблон переменных окружения
└── README.md
```

## Технологии

- **Backend**: Express 5, Drizzle ORM, SQLite (better-sqlite3)
- **Frontend**: React 18, Tailwind CSS 3, shadcn/ui, TanStack Query
- **Перевод**: OpenAI GPT-4o, HuggingFace Tilmash, DeepL API, Yandex Translate
- **Инфра**: Docker, Docker Compose, Nginx

## Лицензия

MIT
