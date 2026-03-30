import { openaiEngine } from "./openai.js";
import { tilmashEngine } from "./tilmash.js";
import { geminiEngine } from "./gemini.js";
import { deeplEngine } from "./deepl.js";
import { yandexEngine } from "./yandex.js";
import { postEditTranslation } from "./postprocess.js";
import { selfEvaluateAndImprove } from "./self-eval.js";
import type { TranslationEngine, TranslationResult } from "./types.js";

// Priority order: ensemble > openai > gemini > tilmash > deepl > yandex
// Only include engines whose API keys are configured
const allEngines: TranslationEngine[] = [
  openaiEngine,
  geminiEngine,
  tilmashEngine,
  deeplEngine,
  yandexEngine,
];

const ENGINE_ENV_KEYS: Record<string, string> = {
  deepl: "DEEPL_API_KEY",
  yandex: "YANDEX_API_KEY",
};

export const engines: TranslationEngine[] = allEngines.filter((e) => {
  const envKey = ENGINE_ENV_KEYS[e.name];
  if (envKey && !process.env[envKey]) {
    console.log(`Skipping ${e.name}: ${envKey} not set`);
    return false;
  }
  return true;
});

const PRIORITY_ORDER = ["ensemble", "openai", "gemini", "tilmash", "deepl", "yandex"];

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
export async function translateWithAll(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ results: TranslationResult[]; meta: TranslationMeta }> {
  // Phase 1: Run all engines in parallel
  const settled = await Promise.allSettled(
    engines.map((engine) => engine.translate(text, sourceLang, targetLang))
  );

  const rawResults: TranslationResult[] = settled.map((outcome, i) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
    return {
      engine: engines[i].name,
      text: "",
      error: outcome.reason?.message ?? "Engine threw unexpectedly",
      latencyMs: 0,
    };
  });

  // Phase 2: Post-edit ensemble — compare all variants and synthesize the best
  let ensembleResult = await postEditTranslation(text, sourceLang, rawResults);

  // Phase 3: Self-evaluation loop — evaluate and iteratively improve
  let meta: TranslationMeta = {};
  if (ensembleResult && ensembleResult.text) {
    try {
      const evalResult = await selfEvaluateAndImprove(
        text,
        sourceLang,
        ensembleResult.text
      );
      
      meta.evalScore = evalResult.evalScore;
      meta.evalIterations = evalResult.iterations;
      meta.evalIssues = evalResult.issues;

      // If self-eval improved the text, update ensemble result
      if (evalResult.finalText !== ensembleResult.text) {
        ensembleResult = {
          ...ensembleResult,
          text: evalResult.finalText,
          confidence: Math.min(0.99, (ensembleResult.confidence ?? 0.98) + 0.01),
          latencyMs: ensembleResult.latencyMs + (Date.now() - Date.now()), // will be recalculated
        };
      }
    } catch (err: any) {
      console.error("Self-evaluation failed:", err?.message);
    }
  }

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
