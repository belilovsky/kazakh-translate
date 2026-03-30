import { openaiEngine } from "./openai.js";
import { tilmashEngine } from "./tilmash.js";
import { geminiEngine } from "./gemini.js";
import { deeplEngine } from "./deepl.js";
import { yandexEngine } from "./yandex.js";
import type { TranslationEngine, TranslationResult } from "./types.js";

// Priority order: openai > gemini > tilmash > deepl > yandex
export const engines: TranslationEngine[] = [
  openaiEngine,
  geminiEngine,
  tilmashEngine,
  deeplEngine,
  yandexEngine,
];

const PRIORITY_ORDER = ["openai", "gemini", "tilmash", "deepl", "yandex"];

/**
 * Run all engines in parallel and return results sorted by priority/confidence.
 * Never throws — each engine catches its own errors.
 */
export async function translateWithAll(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult[]> {
  const settled = await Promise.allSettled(
    engines.map((engine) => engine.translate(text, sourceLang, targetLang))
  );

  const results: TranslationResult[] = settled.map((outcome, i) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
    // Should not normally reach here since engines catch internally, but just in case
    return {
      engine: engines[i].name,
      text: "",
      error: outcome.reason?.message ?? "Engine threw unexpectedly",
      latencyMs: 0,
    };
  });

  // Sort: successful results first by confidence (desc), then failed results by priority
  const successful = results
    .filter((r) => !r.error && r.text)
    .sort((a, b) => {
      // Sort by confidence if both have it
      if (a.confidence !== undefined && b.confidence !== undefined) {
        return b.confidence - a.confidence;
      }
      if (a.confidence !== undefined) return -1;
      if (b.confidence !== undefined) return 1;
      // Fall back to priority order
      return PRIORITY_ORDER.indexOf(a.engine) - PRIORITY_ORDER.indexOf(b.engine);
    });

  const failed = results
    .filter((r) => r.error || !r.text)
    .sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.engine) - PRIORITY_ORDER.indexOf(b.engine)
    );

  return [...successful, ...failed];
}

/**
 * Select the best (first non-error) result by priority order.
 * Falls back to the first result if all have errors.
 */
export function selectBest(results: TranslationResult[]): TranslationResult {
  // Try priority order: openai > gemini > tilmash > deepl > yandex
  for (const engineName of PRIORITY_ORDER) {
    const result = results.find((r) => r.engine === engineName && !r.error && r.text);
    if (result) return result;
  }
  // All engines failed — return the first result (whatever it is)
  return results[0];
}
