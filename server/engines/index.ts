import { openaiEngine } from "./openai.js";
import { tilmashEngine } from "./tilmash.js";
import { geminiEngine } from "./gemini.js";
import { deeplEngine } from "./deepl.js";
import { yandexEngine } from "./yandex.js";
import { postEditTranslation } from "./postprocess.js";
import type { TranslationEngine, TranslationResult } from "./types.js";

// Priority order: ensemble > openai > gemini > tilmash > deepl > yandex
export const engines: TranslationEngine[] = [
  openaiEngine,
  geminiEngine,
  tilmashEngine,
  deeplEngine,
  yandexEngine,
];

const PRIORITY_ORDER = ["ensemble", "openai", "gemini", "tilmash", "deepl", "yandex"];

/**
 * Run all engines in parallel, then post-edit with ensemble if 2+ succeeded.
 * Returns all individual results + ensemble result at position 0.
 */
export async function translateWithAll(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult[]> {
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
  const ensembleResult = await postEditTranslation(text, sourceLang, rawResults);

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

  const failed = rawResults
    .filter((r) => r.error || !r.text)
    .sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.engine) - PRIORITY_ORDER.indexOf(b.engine)
    );

  // Ensemble goes first if successful
  const allResults: TranslationResult[] = [];
  if (ensembleResult) {
    allResults.push(ensembleResult);
  }
  allResults.push(...successful, ...failed);

  return allResults;
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
