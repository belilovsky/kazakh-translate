# Changelog — Қазтілші

Все значимые изменения в проекте фиксируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).  
Проект придерживается [Семантического версионирования](https://semver.org/lang/ru/).

---

## [4.0.0] — 2026-04-05

### Добавлено
- **Новый главный интерфейс translate-v2.tsx** — премиальный дизайн, вдохновлённый DeepL/Google Translate/Papago:
  - Pill-селекторы языка
  - Шрифт результата 22px
  - Glassmorphism-карточки
  - Shimmer-анимация загрузки
  - Отображение MQM-метрик с цветовой индикацией
  - Шрифтовая система: Plus Jakarta Sans (display), Inter (body), JetBrains Mono (code)
  - Warm gold palette `#c89b37`, noise texture, gradient backgrounds
- **TTS Player** — компонент воспроизведения синтезированной речи:
  - Голос kk-KZ (Web Speech Synthesis API)
  - Управление: play/pause/stop
  - Регулятор скорости воспроизведения
  - Progress bar
- **PipelineViz** — 3-этапная визуализация конвейера перевода:
  - Фаза 1: Engines (с бейджами правил per engine)
  - Фаза 2: Critic + Ensemble
  - Фаза 3: MQM Self-eval
- **MQM Self-evaluation** (`server/engines/self-eval.ts`) полностью переработан по стандарту Multidimensional Quality Metrics:
  - 4 категории: Accuracy, Fluency, Terminology, Style
  - 3 уровня ауырлости: critical (штраф 25), major (штраф 5), minor (штраф 1)
  - Формула: `MQM Score = max(0, 10 − Σ(штрафы) / кол-во_предложений)`
  - 9 критериев (4 MQM + 5 морфологических проверок)
  - Ответ в формате JSON Object с полями `score`, `mqm_score`, `mqm_errors`, `issues`, `improved`
- **SSE streaming endpoint** (`POST /api/translate/stream`):
  - Server-Sent Events с событиями `progress`, `result`, `error`
  - Типы событий: `engines`, `critic`, `ensemble`, `selfeval`, `done`
  - `ProgressCallback` передаёт `mqmScore`, `mqmErrors` клиенту в реальном времени
- **Heartbeat SSE каждые 10 секунд** — предотвращает разрыв соединения через прокси/load-balancer
- **Selftest API** (4 новых эндпоинта):
  - `GET /api/admin/selftest` — последний прогон
  - `GET /api/admin/selftest/history` — история прогонов
  - `POST /api/admin/selftest/run` — ручной запуск
  - `GET /api/admin/selftest/cases` — список тест-кейсов
- **10 бенчмарк-тест-кейсов** в `server/selftest.ts`:
  - Категории: everyday, formal, culture, tech, economics, politics, education
  - RU→KK: 7 кейсов; EN→KK: 3 кейса
  - Тест засчитывается как пройденный при: 2+ движков ответили + evalScore >= 7 (реальный score, не null)
  - Запуск каждые 6 часов в production (NODE_ENV=production)
- **Расширение лингвистической базы до 13 разделов** (`server/engines/kazakh-rules.ts`):
  - §8 3SG POSS+case special forms
  - §9 Numeral+singular
  - §10 Negation order
  - §11 Converb patterns
  - §12 Participle constructions («который»→причастная конструкция)
  - §13 Top-5 MT errors
- **Gemini Critic 10 контрольных точек** в `server/engines/postprocess.ts`:
  - 3SG POSS + специальные падежные формы (п. 6)
  - Числительное + единственное число (п. 7)
  - Конвербы для подчинённых предложений (п. 8)
  - «Который» → причастная конструкция (п. 9)
  - Порядок отрицания (п. 10)
- **`ENGINE_ENV_KEYS` дополнен** для полного автоматического определения: добавлены `openai`, `gemini`, `tilmash`
- **Маршрут `/#/v1`** — старый интерфейс сохранён по этому адресу

### Изменено
- **Главная страница** теперь по умолчанию показывает `translate-v2.tsx` (маршрут `/#/`)
- **Critic timeout** очищается в блоке `finally` (предотвращает утечку ресурсов при любом исходе запроса)
- **Perplexity** теперь получает полный «detailed» вариант грамматических правил (ранее — «concise»)
- **SSE event sequencing** исправлен: событие `ensemble` отправляется только после завершения критика (Fix 11)
- **Self-eval score** при сбое = `-1` (ранее маскировался как `5`), selftest не засчитывает тест с `null` score как пройденный
- **Selftest** больше не вызывает все движки дважды (Fix: одна точка входа через `translateWithAll()`)
- **mdash (—) заменён на ndash (–)** в элементах диапазонов по всему UI

### Удалено
- **DeepL** удалён из `allEngines` — DeepL API не поддерживает казахский язык (KK) в качестве целевого

### Исправлено
- **`selectBest()` null crash** — функция теперь возвращает `null` вместо исключения при пустом массиве результатов; маршруты API корректно обрабатывают `null` и возвращают 503
- **SSE write-after-end guard** — добавлена проверка `!res.writableEnded` перед каждой записью в SSE-поток (предотвращает исключения при разрыве соединения клиентом)
- **Self-test double API calls** исправлен — `runSingleTest()` использует результаты из `translateWithAll()` вместо повторного вызова движков

---

## [3.4.0] — 2026-03-31

### Добавлено
- **Smart Ensemble с критиком**: Gemini выступает как независимый критик — анализирует все варианты перевода и пишет рецензию (калька, сингармонизм, морфология). GPT-4o Ensemble получает и варианты, и критику для информированного синтеза. Критик non-blocking — если не отвечает, Ensemble работает как раньше
- **Лингвистическое исследование** (56KB, 966 строк → расширено до 1708 строк): диалекты, история языка, региональные особенности, академические ресурсы (KazParC 371K предложений, Termincom 383K терминов, Apertium-kaz, KazRoBERTa). Сохранено в `docs/kazakh-linguistics-research.md`

---

## [3.3.0] — 2026-03-31

### Добавлено
- **Админ-панель** (`/#/admin`) с 5 страницами:
  - **Обзор**: статистика переводов, графики рейтинга движков и латентности (Recharts)
  - **Переводы**: полная таблица с поиском, фильтрами по языку/движку, пагинацией, удалением, экспортом CSV
  - **Движки**: карточки со статусом, вызовами, латентностью, успешностью, ошибками
  - **Лаборатория**: тестовый перевод с отображением всех движков бок о бок
  - **Настройки**: параметры самооценки, приоритет движков, версия, аптайм
- 6 новых API-эндпоинтов под `/api/admin/*`
- Адаптивный сайдбар с мобильным drawer

### Изменено
- Админ-панель полностью на русском языке
- Формат дат переключён на ru-RU

---

## [3.2.0] — 2026-03-31

### Добавлено
- Подключён Yandex Translate с реальным API-ключом — движок теперь полноценно работает в production
- Деплой на домен `kmt.qdev.run` с полной SSL-защитой (Let's Encrypt) и обратным прокси Nginx
- Полная OpenGraph-разметка: `og:title`, `og:description`, `og:image`, `og:locale`, `og:locale:alternate`
- Twitter Card с `summary_large_image` и OG-изображением 1200×630px
- JSON-LD структурированные данные (`WebApplication` schema.org)
- `robots.txt` и `sitemap.xml`
- `manifest.json` для PWA-поддержки с фирменным цветом `#c89b37`
- Canonical URL (`https://kmt.qdev.run/`)

### Изменено
- Интерфейс переключён **с казахского на русский язык** для лучшей доступности
- Удалены флаг-эмодзи из всех элементов интерфейса
- Описания движков и подписи кнопок переведены на русский

---

## [3.1.0] — 2026-03-31

### Добавлено
- **5 новых движков перевода:**
  - **Claude Sonnet** (Anthropic) — confidence 0.93
  - **DeepSeek Chat** — confidence 0.87
  - **Grok 3 Mini** (xAI) — confidence 0.85
  - **Mistral Small** (Mistral AI) — confidence 0.84
  - **Perplexity Sonar** — confidence 0.83
- `ENGINE_LABELS` обновлён на фронтенде
- `KEY_MAP` в `GET /api/engines` обновлён

### Исправлено
- `latencyMs` в Ensemble-результате при отсутствии ключей
- Серверная валидация длины текста (максимум 5000 символов) через Zod
- Движки без API-ключей автоматически пропускаются при запуске

---

## [3.0.0] — 2026-03-30

### Добавлено
- **Полный редизайн** — палитра казахской золотой степи: `#c89b37`, тёплые бежевые тона
- **Логотип** — стилизованный шаңырақ, реализован как SVG-компонент
- **Цикл самооценки** (`server/engines/self-eval.ts`) — первая версия:
  - GPT-4o оценивает по 5 критериям (0–2 балла каждый, итого 1–10)
  - Системный промпт на казахском языке
  - Улучшение при оценке < 8, до 2 итераций
  - Поля `evalScore`, `evalIterations`, `evalIssues` в `meta` ответа
- **Расширенные правила казахского языка** (первые 7 разделов):
  - §1–3: морфология, сингармонизм, ассимиляция согласных
  - §4: SOV-порядок слов
  - §5: антикальки с конкретными лексическими заменами
  - §6: казахские конструкции (отрицание, вопрос, косвенная речь)
  - §7: регистр и стиль
- **Few-shot примеры** (`KAZAKH_FEWSHOT_RU`, `KAZAKH_FEWSHOT_EN`) — по 5 примеров
- **Значок качества** (`QualityBadge`) — зелёный ≥9, жёлтый ≥7, красный < 7
- **Тёмная тема** с тёплыми коричневыми тонами

### Изменено
- Системный промпт Qwen 72B переписан **на казахском языке**
- `translateWithAll()` возвращает `{ results, meta }`

---

## [2.0.0] — 2026-03-30

### Добавлено
- **Ensemble постредактирование** (`server/engines/postprocess.ts`) — GPT-4o синтезирует лучший перевод
- **Разделённый интерфейс** в стиле Google Translate — два панели бок о бок
- **Голосовой ввод** через Web Speech API
- **TTS** — кнопка озвучивания через `window.speechSynthesis`
- **Страница истории переводов** (`history.tsx`)
- **Система оценок** (`POST /api/translations/:id/rate`)
- **Клавиатурное сокращение** `Ctrl+Enter`

### Изменено
- Роутинг через Wouter (`/` и `/history`)
- `GET /api/translations` и `POST /api/translations/:id/rate` — новые эндпоинты

---

## [1.0.0] — 2026-03-30

### Добавлено
- **Первый релиз** — базовый переводчик RU/EN → KK
- **4 движка:** GPT-4o, Qwen 72B (HuggingFace), DeepL, Yandex Translate v2
- Параллельный запрос через `Promise.allSettled()` и автовыбор лучшего (`selectBest()`)
- **SQLite-хранилище** через `better-sqlite3` и Drizzle ORM
- **Docker-сборка**: многоэтапный Dockerfile, `docker-compose.yml`, volume
- **Nginx-конфиг** с SSL и редиректом HTTP→HTTPS
- **`deploy.sh`** — скрипт автодеплоя на Ubuntu/Debian
- Базовые правила казахской грамматики в AI-промптах

---

[4.0.0]: https://github.com/belilovsky/kazakh-translate/compare/v3.4.0...v4.0.0
[3.4.0]: https://github.com/belilovsky/kazakh-translate/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/belilovsky/kazakh-translate/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/belilovsky/kazakh-translate/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/belilovsky/kazakh-translate/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/belilovsky/kazakh-translate/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/belilovsky/kazakh-translate/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/belilovsky/kazakh-translate/releases/tag/v1.0.0
