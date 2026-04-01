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
  deeplEngine,
  yandexEngine,
];

const ENGINE_ENV_KEYS: Record<string, string> = {
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
      emit({ phase: "engines", engine: engine.name, status: result.error ? "error" : "done", latencyMs: result.latencyMs });
      return result;
    } catch (err: any) {
      const result: TranslationResult = {
        engine: engine.name,
        text: "",
        error: err?.message ?? "Engine threw unexpectedly",
        latencyMs: 0,
      };
      emit({ phase: "engines", engine: engine.name, status: "error" });
      return result;
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      rawResults.push(outcome.value);
    }
  }

  // Phase 2: Critic + Ensemble
  emit({ phase: "critic", detail: "Критик Gemini анализирует варианты..." });
  emit({ phase: "ensemble", detail: "Ensemble GPT-4o синтезирует лучший перевод..." });
  let ensembleResult = await postEditTranslation(text, sourceLang, rawResults);

  // Phase 3: Self-evaluation loop
  let meta: TranslationMeta = {};
  if (ensembleResult && ensembleResult.text) {
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

      if (evalResult.finalText !== ensembleResult.text) {
        ensembleResult = {
          ...ensembleResult,
          text: evalResult.finalText,
          confidence: Math.min(0.99, (ensembleResult.confidence ?? 0.98) + 0.01),
          latencyMs: ensembleResult.latencyMs,
        };
      }
    } catch (err: any) {
      console.error("Self-evaluation failed:", err?.message);
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
 */
export function selectBest(results: TranslationResult[]): TranslationResult {
  for (const engineName of PRIORITY_ORDER) {
    const result = results.find((r) => r.engine === engineName && !r.error && r.text);
    if (result) return result;
  }
  return results[0];
}
