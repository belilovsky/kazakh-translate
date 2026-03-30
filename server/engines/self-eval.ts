import OpenAI from "openai";
import { KAZAKH_GRAMMAR_RULES } from "./kazakh-rules.js";

const TIMEOUT_MS = 20000;
const MAX_ITERATIONS = 2;
const MIN_SCORE_THRESHOLD = 8; // out of 10

export interface EvalResult {
  score: number;
  issues: string[];
  improvedText: string | null;
}

/**
 * Self-evaluation: GPT-4o evaluates the ensemble translation for quality
 * and, if it scores below threshold, iteratively improves it.
 * Returns the final (possibly improved) text and quality metadata.
 */
export async function selfEvaluateAndImprove(
  sourceText: string,
  sourceLang: string,
  translatedText: string
): Promise<{ finalText: string; evalScore: number; iterations: number; issues: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { finalText: translatedText, evalScore: 0, iterations: 0, issues: [] };
  }

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
  const srcLabel = sourceLang === "ru" ? "орыс" : "ағылшын";

  let currentText = translatedText;
  let lastScore = 0;
  let allIssues: string[] = [];
  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;

    // Step 1: Evaluate
    const evalResult = await evaluateTranslation(client, sourceText, srcLabel, currentText);
    lastScore = evalResult.score;

    if (evalResult.issues.length > 0) {
      allIssues = [...allIssues, ...evalResult.issues];
    }

    // If score is good enough, stop
    if (evalResult.score >= MIN_SCORE_THRESHOLD) {
      break;
    }

    // Step 2: Improve based on identified issues
    if (evalResult.improvedText && evalResult.improvedText !== currentText) {
      currentText = evalResult.improvedText;
    } else {
      // No improvement possible
      break;
    }
  }

  return {
    finalText: currentText,
    evalScore: lastScore,
    iterations,
    issues: [...new Set(allIssues)], // deduplicate
  };
}

async function evaluateTranslation(
  client: OpenAI,
  sourceText: string,
  srcLabel: string,
  translatedText: string
): Promise<EvalResult> {
  const systemPrompt = `Сен — қазақ тілінің сарапшысысың. Сенің міндетің — аударманың сапасын бағалау және қажет болса жақсарту.

${KAZAKH_GRAMMAR_RULES}

## БАҒАЛАУ КРИТЕРИЙЛЕРІ (1-10 балл):
1. **Мағына дәлдігі** (0-2): Бастапқы мәтіннің мағынасы толық берілген бе?
2. **Грамматика** (0-2): Септік, жалғау, жұрнақтар дұрыс қолданылған ба?
3. **Сингармонизм** (0-2): Дауысты дыбыстар үндесімі сақталған ба?
4. **Табиғилық** (0-2): Қазақ тілінде табиғи естіле ме? Калька жоқ па?
5. **Сөз тәртібі** (0-2): SOV тәртібі сақталған ба?

Жауабыңды мына JSON форматында ғана бер:
{
  "score": <1-10>,
  "issues": ["мәселе 1", "мәселе 2"],
  "improved": "жақсартылған аударма немесе null егер өзгеріс қажет болмаса"
}`;

  const userPrompt = `Бастапқы мәтін (${srcLabel} тілінен):
«${sourceText}»

Аударма:
«${translatedText}»

Осы аударманы бағала және қажет болса жақсарт.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { score: 5, issues: [], improvedText: null };

    const parsed = JSON.parse(content) as {
      score?: number;
      issues?: string[];
      improved?: string | null;
    };

    return {
      score: typeof parsed.score === "number" ? parsed.score : 5,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      improvedText: typeof parsed.improved === "string" && parsed.improved.length > 0
        ? parsed.improved.replace(/^[«"„""]|[»"""]$/g, "").trim()
        : null,
    };
  } catch (err: any) {
    console.error("Self-eval error:", err?.message);
    return { score: 5, issues: ["Evaluation failed"], improvedText: null };
  }
}
