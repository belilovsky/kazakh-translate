# Қазтілші — API Reference

Полная документация REST API сервиса Қазтілші.

**Базовый URL (production):** `https://kmt.qdev.run`  
**Базовый URL (локально):** `http://localhost:5000`

Все запросы и ответы используют формат **JSON** с кодировкой **UTF-8**.

---

## Содержание

- [POST /api/translate](#post-apitranslate) — перевод текста
- [GET /api/translations](#get-apitranslations) — история переводов
- [POST /api/translations/:id/rate](#post-apitranslationsidrate) — оценка перевода
- [GET /api/engines](#get-apiengines) — статус движков
- [Коды ошибок](#коды-ошибок)
- [Схема данных](#схема-данных)

---

## POST /api/translate

Запускает перевод текста с русского или английского на казахский язык.

Перевод выполняется в три фазы:
1. Параллельный запрос ко всем настроенным движкам
2. Ensemble постредактирование (GPT-4o синтезирует лучший вариант)
3. Цикл самооценки (GPT-4o оценивает 1–10, улучшает при оценке < 8)

Результат включает лучший перевод, все варианты от каждого движка и метаданные качества.

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
    },
    {
      "engine": "gemini",
      "text": "Сәлем, дүние!",
      "confidence": 0.90,
      "latencyMs": 978
    },
    {
      "engine": "deepl",
      "text": "Сәлем, дүние!",
      "confidence": 0.88,
      "latencyMs": 345
    },
    {
      "engine": "yandex",
      "text": "Сәлем, Дүниежүзі!",
      "confidence": 0.82,
      "latencyMs": 267
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

#### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | integer | ID записи в базе данных |
| `bestTranslation.engine` | string | Имя движка, давшего лучший результат |
| `bestTranslation.text` | string | Лучший перевод |
| `allResults` | array | Все результаты от всех движков |
| `allResults[].engine` | string | Идентификатор движка |
| `allResults[].text` | string | Текст перевода (пустая строка при ошибке) |
| `allResults[].confidence` | number \| undefined | Уверенность движка (0–1) |
| `allResults[].latencyMs` | number | Время выполнения в миллисекундах |
| `allResults[].error` | string \| undefined | Сообщение об ошибке (только при сбое) |
| `sourceLang` | string | Язык источника |
| `targetLang` | string | Язык перевода |
| `meta.evalScore` | number \| undefined | Оценка качества самооценки (1–10) |
| `meta.evalIterations` | number \| undefined | Число итераций самооценки |
| `meta.evalIssues` | string[] \| undefined | Выявленные проблемы с переводом |

#### Идентификаторы движков

| `engine` | Описание |
|----------|----------|
| `ensemble` | Ensemble AI — GPT-4o постредактор |
| `openai` | GPT-4o |
| `claude` | Claude Sonnet |
| `gemini` | Gemini 2.5 Flash |
| `deepseek` | DeepSeek Chat |
| `grok` | Grok 3 Mini |
| `tilmash` | Qwen 72B (HuggingFace) |
| `mistral` | Mistral Small |
| `perplexity` | Perplexity Sonar |
| `deepl` | DeepL API |
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
    "evalIssues": []
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

**Ответ:**

```json
{
  "id": 102,
  "bestTranslation": {
    "engine": "ensemble",
    "text": "Үкімет экономикалық дағдарысты шешу үшін жаңа шаралар жариялады."
  },
  "allResults": [
    {
      "engine": "ensemble",
      "text": "Үкімет экономикалық дағдарысты шешу үшін жаңа шаралар жариялады.",
      "confidence": 0.98,
      "latencyMs": 2980
    },
    {
      "engine": "openai",
      "text": "Үкімет экономикалық дағдарысқа қарсы жаңа шаралар жариялады.",
      "confidence": 0.95,
      "latencyMs": 1200
    },
    {
      "engine": "deepl",
      "text": "Үкімет экономикалық дағдарысты жою үшін жаңа шаралар жариялады.",
      "confidence": 0.88,
      "latencyMs": 412
    }
  ],
  "sourceLang": "en",
  "targetLang": "kk",
  "meta": {
    "evalScore": 8,
    "evalIterations": 1,
    "evalIssues": []
  }
}
```

#### Ошибка валидации — текст слишком длинный

```bash
curl -X POST https://kmt.qdev.run/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "'"$(python3 -c "print('а' * 5001)")"'",
    "sourceLang": "ru",
    "targetLang": "kk"
  }'
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
      "inclusive": true,
      "exact": false,
      "message": "text exceeds 5000 character limit",
      "path": ["text"]
    }
  ]
}
```

#### Ошибка валидации — неверный язык

```bash
curl -X POST https://kmt.qdev.run/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "sourceLang": "de", "targetLang": "kk"}'
```

**Ответ `400 Bad Request`:**

```json
{
  "message": "Invalid request body",
  "errors": [
    {
      "code": "invalid_enum_value",
      "received": "de",
      "options": ["ru", "en"],
      "path": ["sourceLang"],
      "message": "sourceLang must be \"ru\" or \"en\""
    }
  ]
}
```

---

## GET /api/translations

Возвращает историю переводов из базы данных в порядке убывания (сначала новые).

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
    "createdAt": "2026-03-31T05:00:00.000Z"
  },
  {
    "id": 101,
    "sourceText": "Искусственный интеллект меняет мир.",
    "translatedText": "Жасанды интеллект әлемді өзгертіп жатыр.",
    "sourceLang": "ru",
    "targetLang": "kk",
    "engine": "ensemble",
    "allResults": "[...]",
    "rating": null,
    "createdAt": "2026-03-31T04:55:00.000Z"
  }
]
```

#### Поля записи

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | integer | Уникальный ID записи |
| `sourceText` | string | Исходный текст |
| `translatedText` | string | Лучший перевод (сохранённый в БД) |
| `sourceLang` | string | Язык источника (`"ru"` или `"en"`) |
| `targetLang` | string | Язык перевода (всегда `"kk"`) |
| `engine` | string | Движок, давший лучший результат |
| `allResults` | string | JSON-строка со всеми результатами |
| `rating` | integer \| null | Оценка пользователя 1–5 или `null` |
| `createdAt` | string | ISO 8601 timestamp создания |

### Примеры

#### Получение последних 20 переводов (по умолчанию)

```bash
curl https://kmt.qdev.run/api/translations
```

#### Получение последних 5 переводов

```bash
curl "https://kmt.qdev.run/api/translations?limit=5"
```

#### Получение максимального количества записей

```bash
curl "https://kmt.qdev.run/api/translations?limit=100"
```

#### Разбор поля allResults в shell

```bash
curl -s "https://kmt.qdev.run/api/translations?limit=1" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
if data:
    results = json.loads(data[0]['allResults'])
    for r in results:
        print(f\"{r['engine']:12} {r.get('confidence', 'N/A'):.2f}  {r.get('text', r.get('error', ''))[:60]}\")
"
```

---

## POST /api/translations/:id/rate

Сохраняет оценку пользователя для конкретного перевода.

### Запрос

**Метод:** `POST`  
**Путь:** `/api/translations/:id/rate`  
**Content-Type:** `application/json`

#### Параметры пути

| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | integer | ID перевода (из поля `id` в ответе `/api/translate` или `/api/translations`) |

#### Тело запроса

```json
{
  "rating": 5
}
```

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `rating` | integer | 1–5 включительно | Оценка перевода |

### Ответ

**Код:** `200 OK` — обновлённая запись перевода (тот же формат, что элемент из `GET /api/translations`).

```json
{
  "id": 42,
  "sourceText": "Привет, мир!",
  "translatedText": "Сәлем, әлем!",
  "sourceLang": "ru",
  "targetLang": "kk",
  "engine": "ensemble",
  "allResults": "[...]",
  "rating": 5,
  "createdAt": "2026-03-31T05:00:00.000Z"
}
```

### Примеры

#### Положительная оценка

```bash
curl -X POST https://kmt.qdev.run/api/translations/42/rate \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}'
```

#### Низкая оценка

```bash
curl -X POST https://kmt.qdev.run/api/translations/42/rate \
  -H "Content-Type: application/json" \
  -d '{"rating": 2}'
```

#### Ошибка — перевод не найден

```bash
curl -X POST https://kmt.qdev.run/api/translations/99999/rate \
  -H "Content-Type: application/json" \
  -d '{"rating": 4}'
```

**Ответ `404 Not Found`:**

```json
{
  "message": "Translation not found"
}
```

#### Ошибка — оценка вне диапазона

```bash
curl -X POST https://kmt.qdev.run/api/translations/42/rate \
  -H "Content-Type: application/json" \
  -d '{"rating": 10}'
```

**Ответ `400 Bad Request`:**

```json
{
  "message": "Invalid rating. Must be an integer between 1 and 5.",
  "errors": [
    {
      "code": "too_big",
      "maximum": 5,
      "type": "number",
      "path": ["rating"],
      "message": "Number must be less than or equal to 5"
    }
  ]
}
```

---

## GET /api/engines

Возвращает список всех зарегистрированных движков перевода и их статус.

Используется также как **health check endpoint** (Docker HEALTHCHECK: `wget -qO- http://localhost:5000/api/engines`).

### Запрос

**Метод:** `GET`  
**Путь:** `/api/engines`

Параметров нет.

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
      "name": "claude",
      "status": "no_api_key",
      "keyEnvVar": "CLAUDE_API_KEY",
      "hasApiKey": false
    },
    {
      "name": "gemini",
      "status": "available",
      "keyEnvVar": "GEMINI_API_KEY",
      "hasApiKey": true
    },
    {
      "name": "deepseek",
      "status": "no_api_key",
      "keyEnvVar": "DEEPSEEK_API_KEY",
      "hasApiKey": false
    },
    {
      "name": "grok",
      "status": "no_api_key",
      "keyEnvVar": "GROK_API_KEY",
      "hasApiKey": false
    },
    {
      "name": "tilmash",
      "status": "available",
      "keyEnvVar": "HUGGINGFACE_API_KEY",
      "hasApiKey": true
    },
    {
      "name": "mistral",
      "status": "no_api_key",
      "keyEnvVar": "MISTRAL_API_KEY",
      "hasApiKey": false
    },
    {
      "name": "perplexity",
      "status": "no_api_key",
      "keyEnvVar": "PERPLEXITY_API_KEY",
      "hasApiKey": false
    },
    {
      "name": "deepl",
      "status": "available",
      "keyEnvVar": "DEEPL_API_KEY",
      "hasApiKey": true
    },
    {
      "name": "yandex",
      "status": "available",
      "keyEnvVar": "YANDEX_API_KEY",
      "hasApiKey": true
    }
  ]
}
```

#### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `engines` | array | Список движков |
| `engines[].name` | string | Идентификатор движка |
| `engines[].status` | `"available"` \| `"no_api_key"` | Статус (доступен / нет ключа) |
| `engines[].keyEnvVar` | string | Имя переменной окружения для ключа |
| `engines[].hasApiKey` | boolean | Установлен ли API-ключ |

**Примечание:** `ensemble` не требует отдельного ключа. Он `"available"`, если настроены 2+ движков. Его `keyEnvVar` — `"(auto)"`.

### Примеры

#### Быстрая проверка здоровья сервиса

```bash
curl -sf https://kmt.qdev.run/api/engines && echo "OK" || echo "DOWN"
```

#### Подсчёт доступных движков

```bash
curl -s https://kmt.qdev.run/api/engines | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
available = [e for e in data['engines'] if e['hasApiKey']]
print(f'Доступно движков: {len(available)} из {len(data[\"engines\"])}')
for e in available:
    print(f'  ✓ {e[\"name\"]} ({e[\"keyEnvVar\"]})')
"
```

---

## Коды ошибок

| HTTP-код | Ситуация |
|----------|---------|
| `200` | Успешный запрос |
| `400` | Ошибка валидации (неверные поля, тип, диапазон значений) |
| `404` | Ресурс не найден (запись с указанным ID отсутствует) |
| `500` | Внутренняя ошибка сервера (сбой движков, ошибка БД) |

**Формат ошибки:**

```json
{
  "message": "Краткое описание ошибки",
  "errors": [ ... ]  // массив Zod-ошибок для 400, опционален
}
```

---

## Схема данных

### TranslationResult

```typescript
interface TranslationResult {
  engine: string;       // идентификатор движка
  text: string;         // текст перевода (пустая строка при ошибке)
  confidence?: number;  // уверенность 0–1 (не у всех движков)
  error?: string;       // сообщение об ошибке (только при сбое)
  latencyMs: number;    // время выполнения в мс
}
```

### Translation (запись в БД)

```typescript
interface Translation {
  id: number;              // первичный ключ, autoincrement
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

### TranslationMeta

```typescript
interface TranslationMeta {
  evalScore?: number;      // оценка самооценки 1–10
  evalIterations?: number; // количество итераций
  evalIssues?: string[];   // список выявленных проблем на казахском
}
```

---

## Интеграционный пример (Node.js)

```javascript
// Полный пример: перевести текст и сохранить оценку
const BASE_URL = "https://kmt.qdev.run";

async function translateAndRate(text, sourceLang = "ru") {
  // 1. Перевод
  const translateRes = await fetch(`${BASE_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, targetLang: "kk" }),
  });

  if (!translateRes.ok) {
    const err = await translateRes.json();
    throw new Error(err.message);
  }

  const data = await translateRes.json();

  console.log("Лучший перевод:", data.bestTranslation.text);
  console.log("Движок:", data.bestTranslation.engine);
  console.log("Оценка качества:", data.meta?.evalScore, "/10");
  console.log("Всего вариантов:", data.allResults.length);

  // 2. Оценить перевод
  const rateRes = await fetch(
    `${BASE_URL}/api/translations/${data.id}/rate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5 }),
    }
  );

  if (rateRes.ok) {
    console.log("Оценка сохранена: 5/5");
  }

  return data;
}

// Использование
translateAndRate("Добро пожаловать в Казахстан!", "ru")
  .then(console.log)
  .catch(console.error);
```

---

## Интеграционный пример (Python)

```python
import requests
import json

BASE_URL = "https://kmt.qdev.run"

def translate(text: str, source_lang: str = "ru") -> dict:
    """Переводит текст на казахский язык."""
    response = requests.post(
        f"{BASE_URL}/api/translate",
        json={
            "text": text,
            "sourceLang": source_lang,
            "targetLang": "kk",
        },
        timeout=120,  # AI-движки могут отвечать долго
    )
    response.raise_for_status()
    return response.json()

def get_history(limit: int = 20) -> list:
    """Возвращает историю переводов."""
    response = requests.get(
        f"{BASE_URL}/api/translations",
        params={"limit": limit},
    )
    response.raise_for_status()
    return response.json()

def rate_translation(translation_id: int, rating: int) -> dict:
    """Оценивает перевод (1–5)."""
    response = requests.post(
        f"{BASE_URL}/api/translations/{translation_id}/rate",
        json={"rating": rating},
    )
    response.raise_for_status()
    return response.json()

# Пример использования
if __name__ == "__main__":
    result = translate("Привет! Как дела?", "ru")
    print(f"Перевод: {result['bestTranslation']['text']}")
    print(f"Движок: {result['bestTranslation']['engine']}")
    print(f"Качество: {result['meta'].get('evalScore', 'N/A')}/10")
    print()

    # Вывести все варианты
    for r in result["allResults"]:
        if not r.get("error"):
            conf = r.get("confidence", 0)
            print(f"  [{r['engine']:12}] ({conf:.2f}) {r['text']}")
    print()

    # Оценить
    rated = rate_translation(result["id"], 5)
    print(f"Оценка сохранена: {rated['rating']}/5")
```

---

## Примечания по производительности

- **Время ответа** зависит от количества настроенных движков и загрузки AI API. Типичное время: 2–8 секунд.
- **Timeout Nginx** установлен на 120 секунд (`proxy_read_timeout 120s`) — достаточно для самых медленных конфигураций.
- **Параллельное выполнение**: все движки запускаются одновременно через `Promise.allSettled()`, поэтому общее время ≈ времени самого медленного движка (не сумма).
- **Ensemble и самооценка** добавляют 1–3 секунды к общему времени (выполняются последовательно после параллельной фазы).
- **Лимит текста** — 5000 символов (проверяется на сервере через Zod до отправки в API).
