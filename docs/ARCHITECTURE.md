# Қазтілші — Architecture Overview

Technical deep-dive into the system design of the Kazakh Machine Translation service.

**Live:** https://kmt.qdev.run  
**GitHub:** https://github.com/belilovsky/kazakh-translate

---

## Table of Contents

- [Translation Pipeline](#translation-pipeline)
- [Engine Configuration](#engine-configuration)
- [SSE Event Flow](#sse-event-flow)
- [Linguistic Rules Map](#linguistic-rules-map)
- [MQM Scoring Formula](#mqm-scoring-formula)
- [File Structure Overview](#file-structure-overview)
- [Infrastructure](#infrastructure)

---

## Translation Pipeline

```
User Request
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│  POST /api/translate/stream  (SSE)                         │
│  POST /api/translate         (REST)                        │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│  PHASE 1: Parallel Engine Execution                        │
│                                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ openai  │ │ claude  │ │ gemini  │ │deepseek │         │
│  │ (0.95)  │ │ (0.93)  │ │ (0.90)  │ │ (0.87)  │         │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │
│       │           │           │            │              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │  grok   │ │tilmash  │ │perplxty │ │ yandex  │         │
│  │ (0.85)  │ │ (0.88)  │ │ (0.83)  │ │ (0.82)  │         │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │
│       └───────────┴───────────┴────────────┘              │
│                   Promise.allSettled()                     │
│                   rawResults[]: TranslationResult[]        │
└──────────────────────┬─────────────────────────────────────┘
                       │ (2+ successful results required)
                       ▼
┌────────────────────────────────────────────────────────────┐
│  PHASE 2a: Critic (non-blocking, parallel)                 │
│                                                            │
│  getCritique()  →  Gemini 2.5 Flash                        │
│    - 10 check points (see Linguistic Rules Map)            │
│    - timeout: 18s                                          │
│    - maxOutputTokens: 8192                                 │
│    - temperature: 0.1                                      │
│    - failure: returns null → ensemble proceeds anyway      │
│                                                            │
│  critique: string | null                                   │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  PHASE 2b: Ensemble Synthesis                              │
│                                                            │
│  postEditTranslation()  →  GPT-4o                          │
│    - input: all variants + critique (if available)         │
│    - system prompt: KAZAKH_GRAMMAR_RULES + anti-patterns   │
│    - temperature: 0.15                                     │
│    - max_tokens: 2048                                      │
│    - timeout: 25s                                          │
│    - output: cleaned translation, confidence: 0.98         │
│                                                            │
│  ensembleResult: TranslationResult                         │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  PHASE 3: MQM Self-evaluation Loop                         │
│                                                            │
│  selfEvaluateAndImprove()  →  GPT-4o                       │
│    - model: gpt-4o                                         │
│    - temperature: 0.1                                      │
│    - max_tokens: 1500                                      │
│    - response_format: json_object                          │
│    - timeout: 20s                                          │
│    - max iterations: 2                                     │
│    - improvement threshold: score < 8                      │
│                                                            │
│  Loop:                                                     │
│    1. evaluateTranslation() → score, mqmErrors, improved   │
│    2. if score >= 8 or score == -1: break                  │
│    3. if improved text exists: update currentText, repeat  │
│                                                            │
│  output: { finalText, evalScore, iterations,               │
│            issues, mqmErrors, mqmScore }                   │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Final Assembly                                            │
│                                                            │
│  results = [ensemble, ...successful(by confidence), ...failed]
│  best = selectBest(results)   ← priority order lookup      │
│  save to SQLite                                            │
│  emit SSE "result" event / return HTTP 200                 │
└────────────────────────────────────────────────────────────┘
```

---

## Engine Configuration

| Engine | Model | Confidence | Env Key | Prompt Lang | Grammar Style |
|--------|-------|------------|---------|-------------|---------------|
| `openai` | GPT-4o | 0.95 | `OPENAI_API_KEY` | English | detailed |
| `claude` | Claude Sonnet 4 | 0.93 | `CLAUDE_API_KEY` | English | detailed |
| `gemini` | Gemini 2.5 Flash | 0.90 | `GEMINI_API_KEY` | English | detailed |
| `deepseek` | DeepSeek V3 | 0.87 | `DEEPSEEK_API_KEY` | English | detailed |
| `grok` | Grok | 0.85 | `GROK_API_KEY` | English | detailed |
| `tilmash` | Qwen 72B | 0.88 | `HUGGINGFACE_API_KEY` | **Kazakh** | detailed |
| `mistral` | Mistral Small | 0.84 | `MISTRAL_API_KEY` | English | detailed |
| `perplexity` | Perplexity Sonar | 0.83 | `PERPLEXITY_API_KEY` | English | **detailed** (changed from concise) |
| `yandex` | Yandex Cloud v2 | 0.82 | `YANDEX_API_KEY` | — | no prompt |

**Special roles:**

| Engine | Role | Config |
|--------|------|--------|
| `gemini` | **Critic** | Gemini 2.5 Flash, 18s timeout, maxOutputTokens 8192 |
| `openai` | **Ensemble synthesizer** + **Self-eval** | GPT-4o, 25s / 20s timeout |

**Priority order** (selectBest):
```
ensemble → openai → claude → gemini → deepseek → grok → tilmash → mistral → perplexity → deepl → yandex
```

**DeepL** — removed from `allEngines` (does not support Kazakh as target language).  
**Mistral** — in `allEngines` but disabled in production due to 401 Unauthorized (key needs renewal).

---

## SSE Event Flow

```
Client                        Server
  │                              │
  │── POST /api/translate/stream ──▶│
  │                              │
  │◀── event: progress ──────────│  phase:"engines", detail:"Запуск 8 движков..."
  │◀── event: progress ──────────│  phase:"engines", engine:"openai", status:"running"
  │◀── event: progress ──────────│  phase:"engines", engine:"gemini", status:"running"
  │        ...                   │  (engines fire as they complete, not in fixed order)
  │◀── event: progress ──────────│  phase:"engines", engine:"openai", status:"done", latencyMs:1234, text:"..."
  │◀── event: progress ──────────│  phase:"engines", engine:"yandex", status:"done", latencyMs:340, text:"..."
  │        ...                   │
  │◀── : heartbeat ──────────────│  (every 10s — SSE comment, keeps connection alive)
  │        ...                   │
  │◀── event: progress ──────────│  phase:"critic", detail:"Критик Gemini анализирует варианты...", inputCount:6
  │◀── event: progress ──────────│  phase:"critic", detail:"Критик завершил анализ", critique:"..."
  │◀── event: progress ──────────│  phase:"ensemble", detail:"Ensemble GPT-4o синтезирует...", inputCount:6
  │◀── event: progress ──────────│  phase:"ensemble", detail:"Ensemble завершён", text:"...", outputLength:42
  │◀── event: progress ──────────│  phase:"selfeval", detail:"Самооценка качества перевода..."
  │◀── event: progress ──────────│  phase:"selfeval", evalScore:9, mqmScore:9.5, mqmErrors:[], evalImproved:false
  │◀── event: progress ──────────│  phase:"done", detail:"Перевод завершён"
  │◀── event: result ────────────│  { id, bestTranslation, allResults, meta }
  │                              │── res.end() ──▶
```

**Write-after-end guard:** every `res.write()` is preceded by `if (!res.writableEnded)` to handle client disconnects gracefully.

---

## Linguistic Rules Map

Which rules are applied at which stage:

```
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 1 — Each individual engine                                     │
│                                                                      │
│  getSystemPrompt("detailed") → full KAZAKH_GRAMMAR_RULES             │
│    §1  Agglutinative morphology                                      │
│    §2  Vowel harmony (сингармонизм)                                  │
│    §3  Consonant assimilation                                        │
│    §4  SOV word order                                                │
│    §5  Anti-calque rules                                             │
│    §6  Kazakh-specific constructions (neg, question, possession)     │
│    §7  Register and style (Сіз/Сен)                                  │
│    §8  3SG POSS + case special forms                                 │
│    §9  Numeral + singular noun                                       │
│    §10 Negation order                                                │
│    §11 Converb patterns (когда/если/чтобы/пока/после)               │
│    §12 «Который» → participial construction                          │
│    §13 Top-5 MT errors                                               │
│  +  5 few-shot examples (RU→KK or EN→KK)                            │
│                                                                      │
│  Tilmash (Qwen 72B): getSystemPromptKazakh() — same rules in Kazakh  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 2a — Gemini Critic (10 check points)                           │
│                                                                      │
│  1.  Vowel harmony violation?                                        │
│  2.  Calque from Russian/English?                                    │
│  3.  SOV word order preserved?                                       │
│  4.  Case/possessive suffixes correct?                               │
│  5.  Which variant is best and why?                                  │
│  6.  3SG POSS + case special forms (баласын/баласына/баласында)?     │
│  7.  Numeral + singular noun (бес бала, not бес балалар)?            │
│  8.  Subordinate clause converbs used (not literal)?                 │
│  9.  «Который» → participle construction (not literal)?              │
│  10. Negation order: stem + (voice) + NEG + tense + personal?        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 2b — Ensemble GPT-4o                                           │
│                                                                      │
│  Full KAZAKH_GRAMMAR_RULES (§1–§13) +                                │
│  Anti-pattern checklist (6 items):                                   │
│    ❌ SVO word order → ✅ convert to SOV                              │
│    ❌ Vowel harmony broken → ✅ check harmony                         │
│    ❌ Unnecessary Russian words → ✅ use Kazakh equivalents           │
│    ❌ Direct calque → ✅ natural Kazakh restructuring                 │
│    ❌ Wrong case suffixes → ✅ correct suffixes                       │
│    ❌ Missing/wrong possessives → ✅ check possessives                │
│  + 4 few-shot editor examples                                        │
│  + Critique text from Gemini (if available)                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 3 — MQM Self-eval GPT-4o                                       │
│                                                                      │
│  Full KAZAKH_GRAMMAR_RULES (§1–§13) +                                │
│  MQM error taxonomy (4 categories × N types) +                      │
│  5 additional morphological checks:                                  │
│    1. 3SG POSS + special case (баласын ✓ / баласыны ✗)              │
│    2. Numeral + singular (бес бала ✓ / бес балалар ✗)               │
│    3. Converbs (когда→-ғанда, если→-са, чтобы→үшін, пока→-ғанша)   │
│    4. «Который» → participle (-ған/-атын/-ар + noun)                 │
│    5. Negation order (stem + voice + NEG + tense + personal)         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## MQM Scoring Formula

Based on the [Multidimensional Quality Metrics](https://themqm.org/) framework, adapted for LLM reference-free evaluation.

### Error Categories and Types

| Category | Types | Description |
|----------|-------|-------------|
| **accuracy** | addition, omission, mistranslation, untranslated | Semantic fidelity to source |
| **fluency** | grammar, vowel_harmony, word_order, morphology | Linguistic correctness in Kazakh |
| **terminology** | wrong_term, calque | Domain terminology and calque avoidance |
| **style** | register, unnatural | Register match and naturalness |

### Severity Penalties

| Severity | Penalty | Condition |
|----------|---------|-----------|
| `critical` | 25 | Meaning seriously distorted |
| `major` | 5 | Noticeable error, reading impaired |
| `minor` | 1 | Small imperfection, reading not impaired |

### Score Formula

```
MQM Score = max(0,  10 − (Σ penalties) / sentence_count)
```

**Example:** 3 sentences, 1 major (5) + 2 minor (1+1) = `10 − 7/3 = 10 − 2.33 ≈ 7.67`

### Score Interpretation

| Score | Quality |
|-------|---------|
| 9–10 | Excellent — no significant errors |
| 8–9 | Good — minor issues only |
| 7–8 | Acceptable — some major issues |
| < 7 | Needs improvement — loop triggers |

### Improvement Loop

```
while iterations < MAX_ITERATIONS (2):
    result = evaluateTranslation(currentText)
    if result.score == -1:  break  # evaluation failed
    if result.score >= 8:   break  # threshold met
    if result.improvedText != currentText:
        currentText = result.improvedText
    else:
        break  # no improvement possible
```

**Score -1** is a sentinel value for evaluation failure (API error, parse error). It is never masked as a positive score. Self-tests do not count a run as passed if evalScore is null or -1.

---

## File Structure Overview

```
kazakh-translate/
│
├── server/
│   ├── index.ts              Entry point. Registers routes, starts server.
│   │                         In NODE_ENV=production: starts selftest every 6h.
│   │
│   ├── routes.ts             API route handlers:
│   │                           POST /api/translate/stream  (SSE)
│   │                           POST /api/translate          (REST)
│   │                           GET  /api/translations
│   │                           POST /api/translations/:id/rate
│   │                           GET  /api/engines
│   │                           GET/POST/DELETE /api/admin/*
│   │                           GET/POST /api/admin/selftest/*
│   │
│   ├── storage.ts            DatabaseStorage class.
│   │                         Wraps Drizzle ORM + better-sqlite3.
│   │                         Methods: saveTranslation, getTranslations,
│   │                           getTranslationStats, getTranslationsPaginated,
│   │                           deleteTranslation, rateTranslation, getEngineStats
│   │
│   ├── selftest.ts           Benchmark test runner.
│   │                         10 test cases (7 RU→KK, 3 EN→KK).
│   │                         Runs via translateWithAll() — one call per test.
│   │                         Stores last 20 runs in memory.
│   │                         Triggered: startPeriodicTesting(6) in production.
│   │
│   └── engines/
│       ├── types.ts          TranslationEngine interface, TranslationResult type
│       │
│       ├── kazakh-rules.ts   Linguistic knowledge base:
│       │                       KAZAKH_GRAMMAR_RULES (§1–§13)
│       │                       KAZAKH_FEWSHOT_RU (5 examples)
│       │                       KAZAKH_FEWSHOT_EN (5 examples)
│       │                       getSystemPrompt(sourceLang, "detailed"|"concise")
│       │                       getSystemPromptKazakh(sourceLang) — Kazakh lang prompt
│       │
│       ├── index.ts          Pipeline orchestration:
│       │                       translateWithAll() — 3-phase pipeline
│       │                       selectBest() — priority-based selection (null-safe)
│       │                       ProgressCallback type definition
│       │                       ENGINE_ENV_KEYS — key→envvar mapping
│       │                       engines[] — filtered at startup by env keys
│       │
│       ├── postprocess.ts    Phase 2: Critic + Ensemble
│       │                       getCritique() — Gemini 2.5 Flash, 10 checks, 18s timeout
│       │                       postEditTranslation() — GPT-4o synthesis, 25s timeout
│       │                       Returns { result, critique }
│       │
│       ├── self-eval.ts      Phase 3: MQM Self-evaluation
│       │                       selfEvaluateAndImprove() — main loop, up to 2 iterations
│       │                       evaluateTranslation() — single GPT-4o MQM eval
│       │                       Returns { finalText, evalScore, iterations, issues,
│       │                                 mqmErrors, mqmScore }
│       │
│       ├── openai.ts         GPT-4o engine
│       ├── claude.ts         Claude Sonnet 4
│       ├── gemini.ts         Gemini 2.5 Flash (also used as critic)
│       ├── deepseek.ts       DeepSeek V3
│       ├── grok.ts           Grok
│       ├── tilmash.ts        Qwen 72B via HuggingFace (prompt in Kazakh)
│       ├── mistral.ts        Mistral Small (⚠️ 401 in prod — needs key renewal)
│       ├── perplexity.ts     Perplexity Sonar (full "detailed" prompt)
│       ├── deepl.ts          DeepL (❌ not in allEngines — no KK support)
│       └── yandex.ts         Yandex Translate v2
│
├── client/src/
│   ├── App.tsx               Hash-based router (wouter useHashLocation)
│   ├── pages/
│   │   ├── translate-v2.tsx  Premium UI. SSE consumer. PipelineViz. TTS Player.
│   │   │                     MQM display. Glass cards. Shimmer loading.
│   │   ├── translate.tsx     Legacy UI. Preserved at /#/v1.
│   │   ├── history.tsx       Translation history.
│   │   └── admin/            5 admin pages (Dashboard, Translations,
│   │                         Engines, Lab, Settings)
│   └── components/
│       ├── theme-provider.tsx Dark/light theme
│       └── ui/               shadcn/ui components
│
├── shared/
│   └── schema.ts             Drizzle schema: translations table
│
└── docs/
    ├── API.md                Full API reference
    ├── ARCHITECTURE.md       This file
    ├── KNOWN-ISSUES.md       Known issues and workarounds
    └── kazakh-linguistics-research.md  1708-line linguistic reference
```

---

## Infrastructure

| Component | Details |
|-----------|---------|
| **VPS** | 62.72.32.112 (Ubuntu) |
| **Domain** | kmt.qdev.run |
| **SSL** | Let's Encrypt via Certbot (auto-renew) |
| **Reverse proxy** | Nginx → localhost:5000 |
| **Container** | Docker (multi-stage build) + Docker Compose |
| **Database** | SQLite at `/app/data/kaztilshi.db` in named volume |
| **Port** | 5000 (internal); 80/443 (public via Nginx) |
| **Node.js** | 20 LTS |
| **Selftest schedule** | Every 6 hours (production only), first run 30s after startup |

### Nginx SSE Configuration

```nginx
location / {
    proxy_pass         http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header   Connection '';    # required for SSE keep-alive
    proxy_buffering    off;              # required for SSE streaming
    proxy_cache        off;
    proxy_read_timeout 120s;
}
```
