import OpenAI from "openai";
import type { TranslationResult } from "./types.js";
import { KAZAKH_GRAMMAR_RULES } from "./kazakh-rules.js";

const TIMEOUT_MS = 25000;

/**
 * Ensemble post-editing: takes all successful translation variants,
 * compares them, and produces a refined "best" translation that
 * fixes grammar, morphology, and naturalness issues.
 *
 * Uses GPT-4o as the referee/editor model with detailed Kazakh rules
 * and few-shot examples of good vs bad corrections.
 */
export async function postEditTranslation(
  sourceText: string,
  sourceLang: string,
  variants: TranslationResult[]
): Promise<TranslationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const successful = variants.filter((v) => !v.error && v.text);
  if (successful.length < 2) {
    // Not enough variants to ensemble — skip post-editing
    return null;
  }

  const start = Date.now();
  const srcLabel = sourceLang === "ru" ? "русского" : "английского";

  const variantsBlock = successful
    .map((v, i) => `[Вариант ${i + 1} — ${v.engine}]:\n${v.text}`)
    .join("\n\n");

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

  const userPrompt = `Бастапқы мәтін (${srcLabel} тілінен):
«${sourceText}»

${variantsBlock}

Осы нұсқаларды салыстырып, ең жақсы элементтерін біріктіріп, жоғарыдағы ережелерге сүйеніп, грамматикалық, морфологиялық және стилистикалық тұрғыдан мінсіз қазақша аударма жаз.`;

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

    if (!refined) return null;

    // Strip quotation marks if the model wrapped the output
    const cleaned = refined.replace(/^[«"„""]|[»"""]$/g, "").trim();

    return {
      engine: "ensemble",
      text: cleaned,
      confidence: 0.98,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    console.error("Post-editing error:", err?.message);
    return null;
  }
}
