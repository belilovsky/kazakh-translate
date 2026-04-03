/**
 * Self-testing module for Қазтілші.
 * Periodically translates benchmark phrases through all engines,
 * measures latency, quality (via self-eval), and stores results.
 */
import { engines, translateWithAll, selectBest, type TranslationMeta } from "./engines/index.js";
import type { TranslationResult } from "./engines/types.js";

// ── Benchmark test cases ──────────────────────────────────────────────

export interface TestCase {
  id: string;
  text: string;
  sourceLang: "ru" | "en";
  category: string;
  /** Key phrases that MUST appear in any good translation */
  expectedFragments?: string[];
}

export const TEST_CASES: TestCase[] = [
  // Short everyday
  {
    id: "ru-short-1",
    text: "Привет, как дела?",
    sourceLang: "ru",
    category: "everyday",
    expectedFragments: ["Сәлем"],
  },
  {
    id: "ru-short-2",
    text: "Спасибо за помощь",
    sourceLang: "ru",
    category: "everyday",
    expectedFragments: ["рахмет", "көмек"],
  },
  // Medium formal
  {
    id: "ru-formal-1",
    text: "Президент подписал закон о защите персональных данных граждан",
    sourceLang: "ru",
    category: "formal",
    expectedFragments: ["Президент", "заң"],
  },
  {
    id: "ru-formal-2",
    text: "Конституционный суд рассмотрит обращение граждан на следующей неделе",
    sourceLang: "ru",
    category: "formal",
    expectedFragments: ["сот", "азамат"],
  },
  // Cultural
  {
    id: "ru-culture-1",
    text: "Наурыз — один из главных праздников казахского народа, символизирующий обновление природы",
    sourceLang: "ru",
    category: "culture",
    expectedFragments: ["Наурыз", "мереке"],
  },
  // Technical
  {
    id: "ru-tech-1",
    text: "Искусственный интеллект меняет мир быстрее, чем мы ожидали",
    sourceLang: "ru",
    category: "tech",
    expectedFragments: ["интеллект", "әлем"],
  },
  // Long paragraph
  {
    id: "ru-long-1",
    text: "В последние годы экономика страны стабильно развивается. Рост ВВП составил 5,1% в прошлом году. Правительство планирует привлечь иностранные инвестиции в ключевые отрасли промышленности.",
    sourceLang: "ru",
    category: "economics",
    expectedFragments: ["экономика", "ЖІӨ"],
  },
  // English
  {
    id: "en-short-1",
    text: "The government announced new policies to combat climate change.",
    sourceLang: "en",
    category: "politics",
    expectedFragments: ["үкімет", "саясат"],
  },
  {
    id: "en-formal-1",
    text: "Students should develop critical thinking skills throughout their education.",
    sourceLang: "en",
    category: "education",
    expectedFragments: ["студент", "білім"],
  },
  {
    id: "en-culture-1",
    text: "Kazakhstan is the largest landlocked country in the world with a rich nomadic heritage.",
    sourceLang: "en",
    category: "culture",
    expectedFragments: ["Қазақстан"],
  },
];

// ── Test result types ─────────────────────────────────────────────────

export interface EngineTestResult {
  engine: string;
  available: boolean;
  latencyMs: number;
  text: string;
  error?: string;
  fragmentsFound: number;
  fragmentsTotal: number;
}

export interface TestResult {
  testId: string;
  sourceLang: string;
  category: string;
  sourceText: string;
  timestamp: string;
  totalMs: number;
  engineResults: EngineTestResult[];
  ensembleText: string;
  evalScore: number | null;
  evalIssues: string[];
  passed: boolean;
}

export interface TestRunSummary {
  runId: string;
  timestamp: string;
  totalMs: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  engineHealth: Record<string, {
    available: boolean;
    avgLatencyMs: number;
    successRate: number;
    testsRun: number;
  }>;
  avgEvalScore: number | null;
  results: TestResult[];
}

// ── In-memory storage for last N test runs ────────────────────────────

const MAX_STORED_RUNS = 20;
const testRunHistory: TestRunSummary[] = [];

export function getTestHistory(): TestRunSummary[] {
  return testRunHistory;
}

export function getLastRun(): TestRunSummary | null {
  return testRunHistory[0] ?? null;
}

// ── Run a single test case ────────────────────────────────────────────

async function runSingleTest(tc: TestCase): Promise<TestResult> {
  const start = Date.now();

  // Run the full pipeline once — engine results are available in `results`.
  // This avoids calling all engines twice (separate loop + translateWithAll).
  const engineResults: EngineTestResult[] = [];
  let ensembleText = "";
  let evalScore: number | null = null;
  let evalIssues: string[] = [];

  try {
    const { results, meta } = await translateWithAll(tc.text, tc.sourceLang, "kk");
    const best = selectBest(results);
    ensembleText = best?.text ?? "";
    // Treat score -1 as "evaluation failed" (sentinel from self-eval.ts)
    const rawScore = meta.evalScore ?? null;
    evalScore = (rawScore !== null && rawScore >= 0) ? rawScore : null;
    evalIssues = meta.evalIssues ?? [];

    const frags = tc.expectedFragments ?? [];

    // Build per-engine results from allResults returned by translateWithAll
    for (const r of results) {
      if (r.engine === "ensemble") continue; // skip the ensemble entry
      const found = frags.filter((f) =>
        r.text?.toLowerCase().includes(f.toLowerCase())
      ).length;
      engineResults.push({
        engine: r.engine,
        available: !r.error && !!r.text,
        latencyMs: r.latencyMs,
        text: r.text ?? "",
        error: r.error,
        fragmentsFound: found,
        fragmentsTotal: frags.length,
      });
    }
  } catch (err: any) {
    console.error(`Self-test pipeline error for ${tc.id}:`, err?.message);
  }

  const totalMs = Date.now() - start;

  // A test passes if: at least 2 engines returned text AND eval score is a real
  // measurement (not null) AND score >= 7. evalScore=null means eval was unavailable
  // so we cannot confirm quality — do not count as passed.
  const availableCount = engineResults.filter((r) => r.available).length;
  const passed = availableCount >= 2 && evalScore !== null && evalScore >= 7;

  return {
    testId: tc.id,
    sourceLang: tc.sourceLang,
    category: tc.category,
    sourceText: tc.text,
    timestamp: new Date().toISOString(),
    totalMs,
    engineResults,
    ensembleText,
    evalScore,
    evalIssues,
    passed,
  };
}

// ── Run full test suite ───────────────────────────────────────────────

export async function runFullTestSuite(): Promise<TestRunSummary> {
  console.log(`[selftest] Starting test suite (${TEST_CASES.length} cases)...`);
  const runStart = Date.now();

  const results: TestResult[] = [];
  // Run sequentially to avoid overwhelming APIs
  for (const tc of TEST_CASES) {
    try {
      const result = await runSingleTest(tc);
      results.push(result);
      console.log(
        `[selftest] ${tc.id}: ${result.passed ? "PASS" : "FAIL"} (${result.totalMs}ms, score=${result.evalScore})`
      );
    } catch (err: any) {
      console.error(`[selftest] ${tc.id}: ERROR — ${err?.message}`);
    }
  }

  // Compute engine health
  const engineHealth: Record<string, { available: boolean; avgLatencyMs: number; successRate: number; testsRun: number }> = {};

  for (const engine of engines) {
    const engineResults = results.flatMap((r) =>
      r.engineResults.filter((er) => er.engine === engine.name)
    );
    const total = engineResults.length;
    const successes = engineResults.filter((r) => r.available).length;
    const avgLat =
      total > 0
        ? Math.round(
            engineResults.reduce((sum, r) => sum + r.latencyMs, 0) / total
          )
        : 0;

    engineHealth[engine.name] = {
      available: successes > 0,
      avgLatencyMs: avgLat,
      successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
      testsRun: total,
    };
  }

  const evalScores = results
    .map((r) => r.evalScore)
    .filter((s): s is number => s !== null && s > 0);
  const avgEvalScore =
    evalScores.length > 0
      ? Math.round((evalScores.reduce((a, b) => a + b, 0) / evalScores.length) * 10) / 10
      : null;

  const summary: TestRunSummary = {
    runId: `run-${Date.now()}`,
    timestamp: new Date().toISOString(),
    totalMs: Date.now() - runStart,
    testsRun: results.length,
    testsPassed: results.filter((r) => r.passed).length,
    testsFailed: results.filter((r) => !r.passed).length,
    engineHealth,
    avgEvalScore,
    results,
  };

  // Store in history
  testRunHistory.unshift(summary);
  if (testRunHistory.length > MAX_STORED_RUNS) {
    testRunHistory.pop();
  }

  console.log(
    `[selftest] Suite complete: ${summary.testsPassed}/${summary.testsRun} passed, avg score=${summary.avgEvalScore}, ${(summary.totalMs / 1000).toFixed(1)}s total`
  );

  return summary;
}

// ── Periodic scheduling ───────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startPeriodicTesting(intervalHours: number = 6) {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  const ms = intervalHours * 60 * 60 * 1000;
  console.log(`[selftest] Scheduled every ${intervalHours}h (${ms}ms)`);

  // Run first test after 30s startup delay
  setTimeout(() => {
    runFullTestSuite().catch((err) =>
      console.error("[selftest] Initial run failed:", err?.message)
    );
  }, 30000);

  intervalHandle = setInterval(() => {
    runFullTestSuite().catch((err) =>
      console.error("[selftest] Periodic run failed:", err?.message)
    );
  }, ms);
}

export function stopPeriodicTesting() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
