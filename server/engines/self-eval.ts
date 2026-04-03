import OpenAI from "openai";
import { KAZAKH_GRAMMAR_RULES } from "./kazakh-rules.js";

const TIMEOUT_MS = 20000;
const MAX_ITERATIONS = 2;
const MIN_SCORE_THRESHOLD = 8; // out of 10

/**
 * MQM-aligned quality evaluation.
 * Based on the Multidimensional Quality Metrics framework used in
 * WMT Shared Metrics Task, adapted for LLM-based reference-free evaluation.
 *
 * Error categories:
 *   Accuracy   — addition, omission, mistranslation, untranslated
 *   Fluency    — grammar, vowel harmony, word order, register
 *   Terminology — wrong term, calque from source language
 *   Style      — unnatural phrasing, inconsistent register
 *
 * Severity:
 *   critical = 25 penalty (meaning is seriously distorted)
 *   major    = 5  penalty (noticeable error, reading impaired)
 *   minor    = 1  penalty (small imperfection, reading not impaired)
 *
 * MQM Score = max(0, 10 − Σ penalties / sentence_count)
 * We normalize to 0-10 scale for display.
 */

export interface MQMError {
  category: "accuracy" | "fluency" | "terminology" | "style";
  type: string;
  severity: "critical" | "major" | "minor";
  description: string;
}

export interface EvalResult {
  score: number;
  issues: string[];
  improvedText: string | null;
  mqmErrors?: MQMError[];
  mqmScore?: number;
}

export async function selfEvaluateAndImprove(
  sourceText: string,
  sourceLang: string,
  translatedText: string
): Promise<{
  finalText: string;
  evalScore: number;
  iterations: number;
  issues: string[];
  mqmErrors?: MQMError[];
  mqmScore?: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { finalText: translatedText, evalScore: 0, iterations: 0, issues: [] };
  }

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
  const srcLabel = sourceLang === "ru" ? "орыс" : "ағылшын";

  let currentText = translatedText;
  let lastScore = 0;
  let allIssues: string[] = [];
  let lastMqmErrors: MQMError[] | undefined;
  let lastMqmScore: number | undefined;
  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;

    const evalResult = await evaluateTranslation(client, sourceText, srcLabel, currentText);
    lastScore = evalResult.score;
    lastMqmErrors = evalResult.mqmErrors;
    lastMqmScore = evalResult.mqmScore;

    if (evalResult.issues.length > 0) {
      allIssues = [...allIssues, ...evalResult.issues];
    }

    // score === -1 means evaluation failed — break without counting
    if (evalResult.score === -1) {
      break;
    }

    if (evalResult.score >= MIN_SCORE_THRESHOLD) {
      break;
    }

    if (evalResult.improvedText && evalResult.improvedText !== currentText) {
      currentText = evalResult.improvedText;
    } else {
      break;
    }
  }

  return {
    finalText: currentText,
    evalScore: lastScore,
    iterations,
    issues: Array.from(new Set(allIssues)),
    mqmErrors: lastMqmErrors,
    mqmScore: lastMqmScore,
  };
}

async function evaluateTranslation(
  client: OpenAI,
  sourceText: string,
  srcLabel: string,
  translatedText: string
): Promise<EvalResult> {
  const systemPrompt = `Сен — қазақ тілінің сарапшысысың. Аударманың сапасын MQM (Multidimensional Quality Metrics) стандарты бойынша бағала.

${KAZAKH_GRAMMAR_RULES}

## MQM БАҒАЛАУ ЖҮЙЕСІ

Әрбір қатені мына категориялар бойынша жікте:

### ACCURACY (Мағына дәлдігі):
- **addition**: Бастапқы мәтінде жоқ ақпарат қосылған
- **omission**: Бастапқы мәтіндегі мағына түсіріліп қалған
- **mistranslation**: Мағына бұрмаланған
- **untranslated**: Сөз/фраза аударылмай қалған

### FLUENCY (Тіл сапасы):
- **grammar**: Септік, жалғау, жұрнақтар қатесі
- **vowel_harmony**: Сингармонизм бұзылған
- **word_order**: SOV тәртібі бұзылған
- **morphology**: Тәуелдік/көптік/болымсыздық қатесі

### TERMINOLOGY (Терминология):
- **wrong_term**: Қате терминологиялық сәйкестік
- **calque**: Тікелей калька (орыс/ағылшын тілінен)

### STYLE (Стиль):
- **register**: Стиль деңгейі сәйкес емес (сіз/сен)
- **unnatural**: Табиғи емес, жасанды құрылым

Қатенің ауырлығы:
- **critical**: Мағына бұрмаланған, оқуға кедергі (25 штраф)
- **major**: Байқалатын қате, оқу қиындайды (5 штраф)
- **minor**: Кішігірім кемшілік, оқуға кедергі емес (1 штраф)

## ҚОСЫМША ТЕКСЕРУ:
1. 3SG POSS + арнайы септік (баласын ✓ / баласыны ✗)
2. Сан есім + жекеше (бес бала ✓ / бес балалар ✗)
3. Конвербтер (когда→-ғанда, если→-са, чтобы→үшін, пока→-ғанша)
4. «Который» → есімше (-ған/-атын/-ар + зат есім)
5. Болымсыздық тәртібі (негіз + залық + NEG + шақ)

## MQM ҰПАЙ:
MQM Score = max(0, 10 − Σ(штрафтар) / сөйлем_саны)
Мысал: 2 сөйлем, 1 major (5) + 1 minor (1) = 10 − 6/2 = 10 − 3 = 7

## ЖАУАП ФОРМАТЫ (тек JSON):
{
  "score": <1-10 жалпы баға>,
  "mqm_score": <0-10 MQM ұпайы>,
  "mqm_errors": [
    {
      "category": "accuracy|fluency|terminology|style",
      "type": "addition|omission|mistranslation|...",
      "severity": "critical|major|minor",
      "description": "қысқа сипаттама"
    }
  ],
  "issues": ["адам оқитын тілде мәселе 1", "мәселе 2"],
  "improved": "жақсартылған аударма немесе null"
}`;

  const userPrompt = `Бастапқы мәтін (${srcLabel} тілінен):
«${sourceText}»

Аударма:
«${translatedText}»

MQM стандарты бойынша бағала.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { score: 5, issues: [], improvedText: null };

    const parsed = JSON.parse(content) as {
      score?: number;
      mqm_score?: number;
      mqm_errors?: Array<{
        category?: string;
        type?: string;
        severity?: string;
        description?: string;
      }>;
      issues?: string[];
      improved?: string | null;
    };

    // Parse MQM errors
    const mqmErrors: MQMError[] = Array.isArray(parsed.mqm_errors)
      ? parsed.mqm_errors
          .filter(e => e.category && e.type && e.severity && e.description)
          .map(e => ({
            category: e.category as MQMError["category"],
            type: e.type!,
            severity: e.severity as MQMError["severity"],
            description: e.description!,
          }))
      : [];

    return {
      score: typeof parsed.score === "number" ? parsed.score : 5,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      improvedText: typeof parsed.improved === "string" && parsed.improved.length > 0
        ? parsed.improved.replace(/^[«"„"\u201c]|[»""\u201d]$/g, "").trim()
        : null,
      mqmErrors,
      mqmScore: typeof parsed.mqm_score === "number" ? parsed.mqm_score : undefined,
    };
  } catch (err: any) {
    console.error("Self-eval error:", err?.message);
    return { score: -1, issues: ["Evaluation failed"], improvedText: null };
  }
}
