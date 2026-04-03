import { openaiEngine } from "./openai.js";
import { claudeEngine } from "./claude.js";
import { deepseekEngine } from "./deepseek.js";
import { grokEngine } from "./grok.js";
import { tilmashEngine } from "./tilmash.js";
import { geminiEngine } from "./gemini.js";
import { mistralEngine } from "./mistral.js";
import { perplexityEngine } from "./perplexity.js";
import { deeplEngine } from "./deepl.js";
import { yandexEngine } from "./yandex.js";
import { postEditTranslation } from "./postprocess.js";
import { selfEvaluateAndImprove } from "./self-eval.js";
import type { TranslationEngine, TranslationResult } from "./types.js";

// Priority order: ensemble > openai > claude > gemini > deepseek > grok > tilmash > mistral > perplexity > deepl > yandex
// Only include engines whose API keys are configured
const allEngines: TranslationEngine[] = [
  openaiEngine,
  claudeEngine,
  geminiEngine,
  deepseekEngine,
  grokEngine,
  tilmashEngine,
  mistralEngine,
  perplexityEngine,
  // deeplEngine removed: DeepL does not support Kazakh (KK) as a target language
  yandexEngine,
];

const ENGINE_ENV_KEYS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  tilmash: "HUGGINGFACE_API_KEY",
  deepl: "DEEPL_API_KEY",
  yandex: "YANDEX_API_KEY",
  claude: "CLAUDE_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  grok: "GROK_API_KEY",
  mistral: "MISTRAL_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

export const engines: TranslationEngine[] = allEngines.filter((e) => {
  const envKey = ENGINE_ENV_KEYS[e.name];
  if (envKey && !process.env[envKey]) {
    console.log(`Skipping ${e.name}: ${envKey} not set`);
    return false;
  }
  return true;
});

const PRIORITY_ORDER = ["ensemble", "openai", "claude", "gemini", "deepseek", "grok", "tilmash", "mistral", "perplexity", "deepl", "yandex"];

export interface TranslationMeta {
  evalScore?: number;
  evalIterations?: number;
  evalIssues?: string[];
}

/**
 * Run all engines in parallel, then post-edit with ensemble if 2+ succeeded.
 * Then self-evaluate and iteratively improve if score is below threshold.
 * Returns all individual results + ensemble result at position 0, plus metadata.
 */
/**
 * Progress callback for streaming pipeline status to client.
 */
export type ProgressCallback = (event: {
  phase: "engines" | "critic" | "ensemble" | "selfeval" | "done";
  engine?: string;
  status?: "running" | "done" | "error";
  latencyMs?: number;
  detail?: string;
  /** Extended pipeline data for diagnostics */
  text?: string;
  critique?: string;
  evalScore?: number;
  evalIssues?: string[];
  evalImproved?: boolean;
  inputCount?: number;
  outputLength?: number;
  /** MQM quality metrics */
  mqmScore?: number;
  mqmErrors?: Array<{ category: string; type: string; severity: string; description: string }>;
}) => void;

export async function translateWithAll(
  text: string,
  sourceLang: string,
  targetLang: string,
  onProgress?: ProgressCallback
): Promise<{ results: TranslationResult[]; meta: TranslationMeta }> {
  const emit = onProgress ?? (() => {});

  // Phase 1: Run all engines in parallel, report each as it finishes
  emit({ phase: "engines", detail: `Запуск ${engines.length} движков...` });

  const rawResults: TranslationResult[] = [];
  const promises = engines.map(async (engine) => {
    emit({ phase: "engines", engine: engine.name, status: "running" });
    try {
      const result = await engine.translate(text, sourceLang, targetLang);
      // Send engine text for diagnostics
      emit({
        phase: "engines",
        engine: engine.name,
        status: result.error ? "error" : "done",
        latencyMs: result.latencyMs,
        text: result.error ? result.error : result.text,
      });
      return result;
    } catch (err: any) {
      const result: TranslationResult = {
        engine: engine.name,
        text: "",
        error: err?.message ?? "Engine threw unexpectedly",
        latencyMs: 0,
      };
      emit({ phase: "engines", engine: engine.name, status: "error", text: result.error });
      return result;
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      rawResults.push(outcome.value);
    }
  }

  const successCount = rawResults.filter(r => !r.error && r.text).length;

  // Phase 2: Critic + Ensemble
  // Emit critic phase start; ensemble event is emitted AFTER critic resolves (see below)
  emit({ phase: "critic", detail: "Критик Gemini анализирует варианты...", inputCount: successCount });
  const { result: ensembleRes, critique: critiqueText } = await postEditTranslation(text, sourceLang, rawResults, emit);
  let ensembleResult = ensembleRes;

  // Emit critic result (critic has now resolved)
  if (critiqueText) {
    emit({ phase: "critic", detail: "Критик завершил анализ", critique: critiqueText });
  }
  // Emit ensemble event AFTER critic resolves (Fix 11: correct SSE event sequencing)
  emit({ phase: "ensemble", detail: "Ensemble GPT-4o синтезирует лучший перевод...", inputCount: successCount });
  // Emit ensemble result
  if (ensembleResult) {
    emit({
      phase: "ensemble",
      detail: "Ensemble завершён",
      text: ensembleResult.text,
      outputLength: ensembleResult.text.length,
    });
  }

  // Phase 3: Self-evaluation loop
  let meta: TranslationMeta = {};
  if (ensembleResult && ensembleResult.text) {
    const textBeforeEval = ensembleResult.text;
    emit({ phase: "selfeval", detail: "Самооценка качества перевода..." });
    try {
      const evalResult = await selfEvaluateAndImprove(
        text,
        sourceLang,
        ensembleResult.text
      );
      
      meta.evalScore = evalResult.evalScore;
      meta.evalIterations = evalResult.iterations;
      meta.evalIssues = evalResult.issues;

      const wasImproved = evalResult.finalText !== textBeforeEval;

      if (wasImproved) {
        ensembleResult = {
          ...ensembleResult,
          text: evalResult.finalText,
          confidence: Math.min(0.99, (ensembleResult.confidence ?? 0.98) + 0.01),
          latencyMs: ensembleResult.latencyMs,
        };
      }

      // Emit self-eval details with MQM data
      emit({
        phase: "selfeval",
        detail: wasImproved ? "Текст улучшен" : "Текст не изменён",
        evalScore: evalResult.evalScore,
        evalIssues: evalResult.issues,
        evalImproved: wasImproved,
        text: wasImproved ? evalResult.finalText : undefined,
        mqmScore: evalResult.mqmScore,
        mqmErrors: evalResult.mqmErrors,
      });
    } catch (err: any) {
      console.error("Self-evaluation failed:", err?.message);
      emit({ phase: "selfeval", detail: `Ошибка: ${err?.message}`, evalScore: 0 });
    }
  }

  emit({ phase: "done", detail: "Перевод завершён" });

  // Sort raw results: successful by confidence desc, then failed by priority
  const successful = rawResults
    .filter((r) => !r.error && r.text)
    .sort((a, b) => {
      if (a.confidence !== undefined && b.confidence !== undefined) {
        return b.confidence - a.confidence;
      }
      if (a.confidence !== undefined) return -1;
      if (b.confidence !== undefined) return 1;
      return PRIORITY_ORDER.indexOf(a.engine) - PRIORITY_ORDER.indexOf(b.engine);
    });

  // Only include errors that are NOT about missing API keys (no point showing those)
  const failed = rawResults
    .filter((r) => r.error || !r.text)
    .filter((r) => !r.error?.toLowerCase().includes("key is not set") && !r.error?.toLowerCase().includes("api_key"))
    .sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.engine) - PRIORITY_ORDER.indexOf(b.engine)
    );

  // Ensemble goes first if successful
  const allResults: TranslationResult[] = [];
  if (ensembleResult) {
    allResults.push(ensembleResult);
  }
  allResults.push(...successful, ...failed);

  return { results: allResults, meta };
}

/**
 * Select the best result: ensemble first, then by priority order.
 * Returns null if no results are available (all engines failed).
 */
export function selectBest(results: TranslationResult[]): TranslationResult | null {
  for (const engineName of PRIORITY_ORDER) {
    const result = results.find((r) => r.engine === engineName && !r.error && r.text);
    if (result) return result;
  }
  // Fallback: any result with text, then first result, then null
  return results.find(r => !r.error && r.text) ?? results[0] ?? null;
}
