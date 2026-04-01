import OpenAI from "openai";
import type { TranslationResult } from "./types.js";
import { KAZAKH_GRAMMAR_RULES } from "./kazakh-rules.js";

const TIMEOUT_MS = 25000;
const CRITIC_TIMEOUT_MS = 12000;

/**
 * Smart Ensemble with Critic:
 * 1. A fast critic model (Gemini) reviews all variants and identifies issues
 * 2. GPT-4o synthesizes the best translation using both variants AND the critique
 *
 * This "Council of Models" approach catches errors that individual models miss.
 */

/**
 * Fast critic: Gemini reviews all variants and returns a brief critique.
 * Runs in parallel-friendly timeout — if it fails, ensemble proceeds without it.
 */
async function getCritique(
  sourceText: string,
  sourceLang: string,
  variants: TranslationResult[]
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  const srcLabel = sourceLang === "ru" ? "орыс" : "ағылшын";
  const variantsBlock = variants
    .filter((v) => !v.error && v.text)
    .map((v, i) => `[${v.engine}]: ${v.text}`)
    .join("\n");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CRITIC_TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `Сен — қазақ тілінің сарапшысысың. Аударма нұсқаларын тексеріп, қысқа сын жаз. Тек нақты қателерді көрсет: сингармонизм, калька, сөз тәртібі, морфология. Жақсы нұсқаларды да атап өт. 3-4 сөйлем жеткілікті.`,
            }],
          },
          contents: [{
            parts: [{
              text: `Бастапқы мәтін (${srcLabel}):\n«${sourceText}»\n\nНұсқалар:\n${variantsBlock}\n\nҚысқа сын:`,
            }],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null; // Critic failure is non-fatal
  }
}

export async function postEditTranslation(
  sourceText: string,
  sourceLang: string,
  variants: TranslationResult[],
  emit?: (event: any) => void
): Promise<{ result: TranslationResult | null; critique: string | null }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { result: null, critique: null };

  const successful = variants.filter((v) => !v.error && v.text);
  if (successful.length < 2) {
    return { result: null, critique: null };
  }

  const start = Date.now();
  const srcLabel = sourceLang === "ru" ? "русского" : "английского";

  // Run critic in parallel — don't block if it's slow
  const critiquePromise = getCritique(sourceText, sourceLang, variants);

  const variantsBlock = successful
    .map((v, i) => `[Вариант ${i + 1} — ${v.engine}]:\n${v.text}`)
    .join("\n\n");

  // Wait for critique (with timeout already built in)
  const critique = await critiquePromise;

  const systemPrompt = `Сен — қазақ тілінің жоғары білікті редакторы мен лингвистсің. Сенің міндетің — бірнеше аударма нұсқаларын салыстырып, олардың ішінен ең жақсы элементтерін біріктіріп, мінсіз аударма жасау.

${KAZAKH_GRAMMAR_RULES}

## РЕДАКТОРДЫҢ ҚОСЫМША ЕРЕЖЕЛЕРІ:

### АНТИ-ПАТТЕРНДЕР (МІНДЕТТІ ТЕКСЕРУ):
1. ❌ Орыс/ағылшын сөз тәртібі (SVO) қалдырылған → ✅ SOV-ға ауыстыру
2. ❌ Сингармонизм бұзылған (жуан+жіңішке) → ✅ Дауысты дыбыстар үндесімін тексеру
3. ❌ Қажетсіз орыс сөздері қолданылған → ✅ Қазақ баламасын қолдану
4. ❌ Тікелей калька жасалған → ✅ Қазақ тіліне табиғи етіп қайта құру
5. ❌ Септік жалғаулары дұрыс емес → ✅ Тиісті септік жалғауын қою
6. ❌ Тәуелдік жалғаулары жоқ немесе қате → ✅ Тәуелдік жалғауларын тексеру

### FEW-SHOT МЫСАЛДАР:

МЫСАЛ 1 — Калькадан тазарту:
Нұсқалар: "Последние жылдарда елдің экономикасы стабильно дамуда" / "Соңғы жылдарда ел экономикасы тұрақты дамып келеді"
Ең жақсы: "Соңғы жылдары ел экономикасы тұрақты дамып келеді." (орыс сөздері ауыстырылды, "-дарда" → "-дары" дұрысталды)

МЫСАЛ 2 — Сөз тәртібін түзету:
Нұсқалар: "Үкімет жариялады жаңа шараларды" / "Үкімет жаңа шаралар жариялады"
Ең жақсы: "Үкімет жаңа шараларды жариялады." (табыс септік -ды дұрыс, SOV сақталған)

МЫСАЛ 3 — Морфологияны түзету:
Нұсқалар: "Балалар үйлар салды" / "Балалар үйлерді салды"
Ең жақсы: "Балалар үйлер салды." (сингармонизм: үй → жіңішке → -лер)

МЫСАЛ 4 — Табиғи тіл:
Нұсқалар: "Ол три жылдан бері жұмыс істеп жатыр осы проектте" / "Ол бұл жобада үш жылдан бері жұмыс істеп жүр"
Ең жақсы: "Ол бұл жобамен үш жылдан бері айналысып жүр." (табиғи сөз тіркесі, "жобамен айналысу")

Тек жақсартылған аударманы ғана жаз. Ешқандай түсіндірме, ескерту немесе тырнақша жазба.`;

  const critiqueSection = critique
    ? `\n\n## СЫН (осы нұсқаларды басқа AI модель бағалады):\n${critique}`
    : "";

  const userPrompt = `Бастапқы мәтін (${srcLabel} тілінен):
«${sourceText}»

${variantsBlock}${critiqueSection}

Осы нұсқаларды және сынды ескеріп, ең жақсы элементтерін біріктіріп, грамматикалық, морфологиялық және стилистикалық тұрғыдан мінсіз қазақша аударма жаз.`;

  try {
    const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.15,
      max_tokens: 2048,
    });

    const refined = response.choices[0]?.message?.content?.trim() ?? "";

    if (!refined) return { result: null, critique: critique };

    // Strip quotation marks if the model wrapped the output
    const cleaned = refined.replace(/^[«"„""]|[»"""]$/g, "").trim();

    return {
      result: {
        engine: "ensemble",
        text: cleaned,
        confidence: 0.98,
        latencyMs: Date.now() - start,
      },
      critique: critique,
    };
  } catch (err: any) {
    console.error("Post-editing error:", err?.message);
    return { result: null, critique: critique };
  }
}
