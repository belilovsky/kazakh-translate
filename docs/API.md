# Қазтілші — API Reference

Полная документация REST API сервиса Қазтілші.

**Базовый URL (production):** `https://kmt.qdev.run`  
**Базовый URL (локально):** `http://localhost:5000`

Все запросы и ответы используют формат **JSON** с кодировкой **UTF-8**.

---

## Содержание

- [POST /api/translate/stream](#post-apitranslatestream) — SSE стриминг конвейера
- [POST /api/translate](#post-apitranslate) — синхронный перевод
- [GET /api/translations](#get-apitranslations) — история переводов
- [POST /api/translations/:id/rate](#post-apitranslationsidrate) — оценка перевода
- [GET /api/engines](#get-apiengines) — статус движков
- [Admin API](#admin-api) — управление и мониторинг
- [Selftest API](#selftest-api) — автотестирование
- [Коды ошибок](#коды-ошибок)
- [Схема данных](#схема-данных)
- [Примеры интеграции](#примеры-интеграции)

---

## POST /api/translate/stream

SSE-эндпоинт. Запускает конвейер перевода и транслирует прогресс в реальном времени через Server-Sent Events. Рекомендуется для основного UI — позволяет показывать пользователю состояние каждого движка по мере их ответа.

### Запрос

**Метод:** `POST`  
**Путь:** `/api/translate/stream`  
**Content-Type:** `application/json`

#### Тело запроса

```json
{
  "text": "string",
  "sourceLang": "ru" | "en",
  "targetLang": "kk"
}
```

| Поле | Тип | Обязательно | Ограничения | Описание |
|------|-----|-------------|-------------|----------|
| `text` | string | Да | 1–5000 символов | Текст для перевода |
| `sourceLang` | string | Да | `"ru"` или `"en"` | Язык исходного текста |
| `targetLang` | string | Да | только `"kk"` | Язык перевода (казахский) |

### Ответ — SSE поток

**Content-Type:** `text/event-stream`  
**Заголовок:** `X-Accel-Buffering: no` (отключает буферизацию Nginx)

Ответ — поток SSE-событий. Каждое событие:

```
event: <тип>
data: <JSON>

```

**Типы событий:**

| `event` | Описание | Когда отправляется |
|---------|----------|--------------------|
| `progress` | Обновление состояния конвейера | В процессе перевода |
| `result` | Финальный результат перевода | По завершении |
| `error` | Ошибка | При сбое |

**Heartbeat:** каждые 10 секунд отправляется комментарий `: heartbeat\n\n` для поддержания соединения через прокси.

---

#### Формат события `progress`

Поле `phase` определяет тип обновления:

**phase = "engines"** — обновление отдельного движка:

```json
{
  "phase": "engines",
  "engine": "openai",
  "status": "running" | "done" | "error",
  "latencyMs": 1234,
  "text": "Сәлем, әлем!",
  "detail": "Запуск 8 движков..."
}
```

**phase = "critic"** — анализ Gemini-критика:

```json
{
  "phase": "critic",
  "detail": "Критик завершил анализ",
  "critique": "Вариант [openai] имеет корректный SOV-порядок...",
  "inputCount": 6
}
```

**phase = "ensemble"** — синтез GPT-4o:

```json
{
  "phase": "ensemble",
  "detail": "Ensemble завершён",
  "text": "Жасанды интеллект әлемді өзгертіп жатыр.",
  "outputLength": 42,
  "inputCount": 6
}
```

**phase = "selfeval"** — MQM самооценка:

```json
{
  "phase": "selfeval",
  "detail": "Текст улучшен",
  "evalScore": 8,
  "evalIssues": ["Кішігірім SOV бұзылысы"],
  "evalImproved": true,
  "text": "Жасанды интеллект әлемді біз күткеннен де тезірек өзгертіп жатыр.",
  "mqmScore": 7.5,
  "mqmErrors": [
    {
      "category": "fluency",
      "type": "word_order",
      "severity": "minor",
      "description": "SOV тәртібі аздап бұзылған"
    }
  ]
}
```

**phase = "done"** — конвейер завершён:

```json
{
  "phase": "done",
  "detail": "Перевод завершён"
}
```

---

#### Формат события `result`

```json
{
  "id": 42,
  "bestTranslation": {
    "engine": "ensemble",
    "text": "Жасанды интеллект әлемді біз күткеннен де тезірек өзгертіп жатыр."
  },
  "allResults": [
    {
      "engine": "ensemble",
      "text": "Жасанды интеллект әлемді біз күткеннен де тезірек өзгертіп жатыр.",
      "confidence": 0.98,
      "latencyMs": 3120
    },
    {
      "engine": "openai",
      "text": "Жасанды интеллект біз күткеннен тезірек әлемді өзгертуде.",
      "confidence": 0.95,
      "latencyMs": 1340
    }
  ],
  "sourceLang": "ru",
  "targetLang": "kk",
  "meta": {
    "evalScore": 9,
    "evalIterations": 1,
    "evalIssues": [],
    "mqmScore": 9.5,
    "mqmErrors": []
  }
}
```

#### Формат события `error`

```json
{
  "message": "Все движки вернули ошибки. Нет доступного перевода."
}
```

### Пример (JavaScript EventSource)

```javascript
async function translateStream(text, sourceLang) {
  const response = await fetch("https://kmt.qdev.run/api/translate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, targetLang: "kk" }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop();

    for (const chunk of lines) {
      const eventLine = chunk.match(/^event: (.+)/m)?.[1];
      const dataLine = chunk.match(/^data: (.+)/m)?.[1];
      if (!dataLine) continue;

      const data = JSON.parse(dataLine);

      if (eventLine === "progress") {
        if (data.phase === "engines" && data.engine) {
          console.log(`[${data.engine}] ${data.status} (${data.latencyMs}ms)`);
        }
        if (data.phase === "selfeval") {
          console.log(`MQM Score: ${data.mqmScore}, Overall: ${data.evalScore}/10`);
        }
      } else if (eventLine === "result") {
        console.log("Best:", data.bestTranslation.text);
        console.log("Quality:", data.meta?.evalScore, "/10");
      }
    }
  }
}
```

---

## POST /api/translate

Синхронный перевод. Ждёт полного завершения конвейера и возвращает результат одним ответом. Используйте для серверных интеграций и пакетной обработки.

### Запрос

**Метод:** `POST`  
**Путь:** `/api/translate`  
**Content-Type:** `application/json`

#### Тело запроса

```json
{
  "text": "string",
  "sourceLang": "ru" | "en",
  "targetLang": "kk"
}
```

| Поле | Тип | Обязательно | Ограничения | Описание |
|------|-----|-------------|-------------|----------|
| `text` | string | Да | 1–5000 символов | Текст для перевода |
| `sourceLang` | string | Да | `"ru"` или `"en"` | Язык исходного текста |
| `targetLang` | string | Да | только `"kk"` | Язык перевода (казахский) |

### Ответ

**Код:** `200 OK`

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
      "latencyMs": 2890
    },
    {
      "engine": "openai",
      "text": "Сәлем, дүние!",
      "confidence": 0.95,
      "latencyMs": 1234
    },
    {
      "engine": "claude",
      "text": "Сәлем, әлем!",
      "confidence": 0.93,
      "latencyMs": 1456
    }
  ],
  "sourceLang": "ru",
  "targetLang": "kk",
  "meta": {
    "evalScore": 9,
    "evalIterations": 1,
    "evalIssues": [],
    "mqmScore": 9.5,
    "mqmErrors": []
  }
}
```

#### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | integer | ID записи в базе данных |
| `bestTranslation.engine` | string | Имя движка лучшего результата |
| `bestTranslation.text` | string | Лучший перевод |
| `allResults` | array | Все результаты от всех движков |
| `allResults[].engine` | string | Идентификатор движка |
| `allResults[].text` | string | Текст перевода (пустая строка при ошибке) |
| `allResults[].confidence` | number \| undefined | Уверенность движка (0–1) |
| `allResults[].latencyMs` | number | Время выполнения в мс |
| `allResults[].error` | string \| undefined | Сообщение об ошибке (только при сбое) |
| `sourceLang` | string | Язык источника |
| `targetLang` | string | Язык перевода |
| `meta.evalScore` | number \| undefined | Общий балл качества (1–10) |
| `meta.evalIterations` | number \| undefined | Число итераций самооценки |
| `meta.evalIssues` | string[] \| undefined | Выявленные проблемы (на казахском) |
| `meta.mqmScore` | number \| undefined | MQM-балл (0–10) |
| `meta.mqmErrors` | MQMError[] \| undefined | Список MQM-ошибок |

#### Идентификаторы движков

| `engine` | Описание |
|----------|----------|
| `ensemble` | Ensemble AI — Gemini Critic + GPT-4o синтез |
| `openai` | GPT-4o |
| `claude` | Claude Sonnet 4 |
| `gemini` | Gemini 2.5 Flash |
| `deepseek` | DeepSeek V3 |
| `grok` | Grok |
| `tilmash` | Qwen 72B (HuggingFace) |
| `mistral` | Mistral Small (⚠️ 401 в production) |
| `perplexity` | Perplexity Sonar |
| `yandex` | Yandex Translate v2 |

### Примеры

#### Перевод с русского

```bash
curl -X POST https://kmt.qdev.run/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Искусственный интеллект меняет мир быстрее, чем мы ожидали.",
    "sourceLang": "ru",
    "targetLang": "kk"
  }'
```

**Ответ:**

```json
{
  "id": 101,
  "bestTranslation": {
    "engine": "ensemble",
    "text": "Жасанды интеллект әлемді біз күткеннен де тезірек өзгертіп жатыр."
  },
  "allResults": [
    {
      "engine": "ensemble",
      "text": "Жасанды интеллект әлемді біз күткеннен де тезірек өзгертіп жатыр.",
      "confidence": 0.98,
      "latencyMs": 3120
    },
    {
      "engine": "openai",
      "text": "Жасанды интеллект біз күткеннен тезірек әлемді өзгертуде.",
      "confidence": 0.95,
      "latencyMs": 1340
    }
  ],
  "sourceLang": "ru",
  "targetLang": "kk",
  "meta": {
    "evalScore": 9,
    "evalIterations": 1,
    "evalIssues": [],
    "mqmScore": 9.5,
    "mqmErrors": []
  }
}
```

#### Перевод с английского

```bash
curl -X POST https://kmt.qdev.run/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The government announced new measures to address the economic crisis.",
    "sourceLang": "en",
    "targetLang": "kk"
  }'
```

#### Ошибка — текст слишком длинный

```bash
curl -X POST https://kmt.qdev.run/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "'$(python3 -c "print('а' * 5001)")'", "sourceLang": "ru", "targetLang": "kk"}'
```

**Ответ `400 Bad Request`:**

```json
{
  "message": "Invalid request body",
  "errors": [
    {
      "code": "too_big",
      "maximum": 5000,
      "type": "string",
      "message": "text exceeds 5000 character limit",
      "path": ["text"]
    }
  ]
}
```

---

## GET /api/translations

Возвращает историю переводов из базы данных (сначала новые).

### Запрос

**Метод:** `GET`  
**Путь:** `/api/translations`

#### Query-параметры

| Параметр | Тип | По умолчанию | Максимум | Описание |
|----------|-----|--------------|----------|----------|
| `limit` | integer | `20` | `100` | Количество записей |

### Ответ

**Код:** `200 OK`

```json
[
  {
    "id": 102,
    "sourceText": "The government announced new measures.",
    "translatedText": "Үкімет жаңа шаралар жариялады.",
    "sourceLang": "en",
    "targetLang": "kk",
    "engine": "ensemble",
    "allResults": "[{\"engine\":\"ensemble\",\"text\":\"...\",\"confidence\":0.98,\"latencyMs\":2980}]",
    "rating": 5,
    "createdAt": "2026-04-05T15:00:00.000Z"
  }
]
```

#### Поля записи

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | integer | Уникальный ID записи |
| `sourceText` | string | Исходный текст |
| `translatedText` | string | Лучший перевод |
| `sourceLang` | string | `"ru"` или `"en"` |
| `targetLang` | string | Всегда `"kk"` |
| `engine` | string | Движок лучшего результата |
| `allResults` | string | JSON-строка `TranslationResult[]` |
| `rating` | integer \| null | Оценка пользователя 1–5 или `null` |
| `createdAt` | string | ISO 8601 timestamp |

### Примеры

```bash
# Последние 20 (по умолчанию)
curl https://kmt.qdev.run/api/translations

# Последние 5
curl "https://kmt.qdev.run/api/translations?limit=5"
```

---

## POST /api/translations/:id/rate

Сохраняет оценку пользователя для перевода.

### Запрос

**Метод:** `POST`  
**Путь:** `/api/translations/:id/rate`  
**Content-Type:** `application/json`

| Параметр пути | Тип | Описание |
|---------------|-----|----------|
| `id` | integer | ID перевода |

```json
{ "rating": 5 }
```

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `rating` | integer | 1–5 включительно | Оценка перевода |

### Ответ

**Код:** `200 OK` — обновлённая запись (формат как в `GET /api/translations`).

### Коды ошибок

| Код | Описание |
|-----|----------|
| `400` | Неверный ID или оценка вне диапазона 1–5 |
| `404` | Перевод не найден |

---

## GET /api/engines

Возвращает статус всех зарегистрированных движков. Используется также как **health check endpoint** (Docker HEALTHCHECK).

### Ответ

**Код:** `200 OK`

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
      "name": "mistral",
      "status": "no_api_key",
      "keyEnvVar": "MISTRAL_API_KEY",
      "hasApiKey": false
    }
  ]
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `engines[].name` | string | Идентификатор движка |
| `engines[].status` | `"available"` \| `"no_api_key"` | Статус |
| `engines[].keyEnvVar` | string | Переменная окружения |
| `engines[].hasApiKey` | boolean | Ключ установлен? |

```bash
# Health check
curl -sf https://kmt.qdev.run/api/engines && echo "OK" || echo "DOWN"
```

---

## Admin API

Все эндпоинты под `/api/admin/` не требуют авторизации в текущей версии — не публикуйте их публично без защиты.

### GET /api/admin/stats

Общая статистика для дашборда.

```bash
curl https://kmt.qdev.run/api/admin/stats
```

### GET /api/admin/translations

Пагинированный список переводов с поиском.

**Query-параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | integer | Номер страницы (по умолч. 1) |
| `limit` | integer | Записей на страницу (максимум 100) |
| `search` | string | Поиск по тексту |
| `sourceLang` | `"ru"` \| `"en"` | Фильтр по языку источника |
| `engine` | string | Фильтр по движку |

```bash
curl "https://kmt.qdev.run/api/admin/translations?page=1&limit=20&search=казахстан&sourceLang=ru"
```

### DELETE /api/admin/translations/:id

Удалить перевод.

```bash
curl -X DELETE https://kmt.qdev.run/api/admin/translations/42
```

### GET /api/admin/translations/export

Скачать все переводы в CSV.

```bash
curl https://kmt.qdev.run/api/admin/translations/export -o translations.csv
```

### GET /api/admin/engine-stats

Статистика по каждому движку (вызовы, латентность, успешность).

### GET /api/admin/settings

Текущая конфигурация (`selfEvalThreshold`, `maxIterations`, `enginePriority`, `version`, `uptime`).

---

## Selftest API

### GET /api/admin/selftest

Результат последнего автоматического прогона.

```json
{
  "runId": "run-1743865200000",
  "timestamp": "2026-04-05T15:00:00.000Z",
  "totalMs": 45230,
  "testsRun": 10,
  "testsPassed": 9,
  "testsFailed": 1,
  "engineHealth": {
    "openai": { "available": true, "avgLatencyMs": 1340, "successRate": 100, "testsRun": 10 },
    "mistral": { "available": false, "avgLatencyMs": 0, "successRate": 0, "testsRun": 10 }
  },
  "avgEvalScore": 8.7,
  "results": [...]
}
```

### GET /api/admin/selftest/history

Список последних 20 прогонов.

### POST /api/admin/selftest/run

Немедленный запуск полного набора тестов (10 кейсов, синхронно).

```bash
curl -X POST https://kmt.qdev.run/api/admin/selftest/run
```

### GET /api/admin/selftest/cases

Список тест-кейсов (`id`, `text`, `sourceLang`, `category`, `expectedFragments`).

**Тест считается пройденным**, если:
- 2+ движка вернули непустой перевод
- `evalScore` — реальное значение (не `null`, не `-1`)
- `evalScore >= 7`

---

## Коды ошибок

| HTTP-код | Ситуация |
|----------|---------|
| `200` | Успешный запрос |
| `400` | Ошибка валидации (неверные поля, тип, диапазон) |
| `404` | Ресурс не найден |
| `500` | Внутренняя ошибка сервера |
| `503` | Все движки вернули ошибки |

**Формат ошибки:**

```json
{
  "message": "Краткое описание ошибки",
  "errors": [ ... ]
}
```

---

## Схема данных

### TranslationResult

```typescript
interface TranslationResult {
  engine: string;       // идентификатор движка
  text: string;         // текст перевода (пустая строка при ошибке)
  confidence?: number;  // уверенность 0–1
  error?: string;       // сообщение об ошибке (только при сбое)
  latencyMs: number;    // время выполнения в мс
}
```

### MQMError

```typescript
interface MQMError {
  category: "accuracy" | "fluency" | "terminology" | "style";
  type: string;         // напр. "word_order", "calque", "vowel_harmony"
  severity: "critical" | "major" | "minor";
  description: string;  // текст на казахском
}
```

### TranslationMeta

```typescript
interface TranslationMeta {
  evalScore?: number;        // общий балл 1–10 (–1 при сбое)
  evalIterations?: number;   // количество итераций улучшения
  evalIssues?: string[];     // список проблем на казахском
  mqmScore?: number;         // MQM-балл 0–10
  mqmErrors?: MQMError[];    // подробный список MQM-ошибок
}
```

### Translation (запись в БД)

```typescript
interface Translation {
  id: number;              // первичный ключ
  sourceText: string;      // исходный текст
  translatedText: string;  // лучший перевод
  sourceLang: string;      // "ru" | "en"
  targetLang: string;      // всегда "kk"
  engine: string;          // движок лучшего перевода
  allResults: string;      // JSON-строка TranslationResult[]
  rating: number | null;   // оценка 1–5 или null
  createdAt: string;       // ISO 8601 timestamp
}
```

---

## Примеры интеграции

### Node.js — синхронный перевод

```javascript
const BASE_URL = "https://kmt.qdev.run";

async function translateAndRate(text, sourceLang = "ru") {
  const res = await fetch(`${BASE_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, targetLang: "kk" }),
  });

  if (!res.ok) throw new Error((await res.json()).message);

  const data = await res.json();
  console.log("Перевод:", data.bestTranslation.text);
  console.log("MQM:", data.meta?.mqmScore, "Overall:", data.meta?.evalScore, "/10");

  if (data.meta?.mqmErrors?.length) {
    for (const err of data.meta.mqmErrors) {
      console.log(`  [${err.severity}] ${err.category}/${err.type}: ${err.description}`);
    }
  }

  // Оценить
  await fetch(`${BASE_URL}/api/translations/${data.id}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: 5 }),
  });

  return data;
}
```

### Python — с MQM-метриками

```python
import requests

BASE_URL = "https://kmt.qdev.run"

def translate(text: str, source_lang: str = "ru") -> dict:
    response = requests.post(
        f"{BASE_URL}/api/translate",
        json={"text": text, "sourceLang": source_lang, "targetLang": "kk"},
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()

    print(f"Перевод: {data['bestTranslation']['text']}")
    print(f"Движок:  {data['bestTranslation']['engine']}")
    print(f"Score:   {data['meta'].get('evalScore', 'N/A')}/10")
    print(f"MQM:     {data['meta'].get('mqmScore', 'N/A')}/10")

    for err in data["meta"].get("mqmErrors") or []:
        print(f"  [{err['severity']:8}] {err['category']}/{err['type']}: {err['description']}")

    return data

if __name__ == "__main__":
    translate("Добро пожаловать в Казахстан!")
```

---

## Примечания по производительности

- **Типичное время ответа:** 3–10 секунд при 6–8 активных движках.
- **SSE-эндпоинт** позволяет показывать пользователю прогресс во время ожидания.
- **Nginx timeout** установлен на 120 секунд (`proxy_read_timeout 120s`). Для SSE добавьте `proxy_buffering off`.
- **Параллельное выполнение:** все движки работают одновременно; общее время ≈ времени самого медленного.
- **Critic + Ensemble + Self-eval:** добавляют 3–8 секунд последовательно.
- **Gemini Critic** может занять до 18 секунд (таймаут). При превышении таймаута Ensemble работает без рецензии.
- **Лимит текста:** 5000 символов (Zod-валидация на сервере).
