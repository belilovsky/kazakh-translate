import OpenAI from "openai";
import type { TranslationResult } from "./types.js";

const TIMEOUT_MS = 25000;

/**
 * Ensemble post-editing: takes all successful translation variants,
 * compares them, and produces a refined "best" translation that
 * fixes grammar, morphology, and naturalness issues.
 *
 * Uses GPT-4o as the referee/editor model.
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

  const systemPrompt = `Сен — қазақ тілінің кәсіби редакторысың және лингвистсің. Сенің міндетің — бірнеше аударма нұсқаларын салыстырып, олардың ішінен ең жақсы элементтерін біріктіріп, мінсіз аударма жасау.

Сен мыналарға назар аудару керек:
1. МОРФОЛОГИЯ: қазақ тілінің жалғамалы (агглютинативті) морфологиясын дұрыс қолдану — жалғаулар, жұрнақтар, септіктер
2. СӨЗ ТӘРТІБІ: SOV (бастауыш-толықтауыш-баяндауыш) тәртібін сақтау
3. ТАБИҒИЛЫҚ: қазақ тілінде табиғи, тұрмыстық сөйлеуге жақын болу
4. МАҒЫНА: бастапқы мәтіннің мағынасын толық сақтау, ештеңе қоспау
5. СТИЛЬ: бастапқы мәтіннің стилін (ресми/бейресми) сақтау
6. ЛЕКСИКА: дұрыс қазақ сөздерін таңдау, орыс тілінен тура калька жасамау

Тек аударманы ғана жаз, ешқандай түсіндірме, ескерту немесе пікір жазба.`;

  const userPrompt = `Бастапқы мәтін (${srcLabel} тілінен):
«${sourceText}»

${variantsBlock}

Осы нұсқаларды салыстырып, ең жақсы элементтерін біріктіріп, грамматикалық, морфологиялық және стилистикалық тұрғыдан мінсіз қазақша аударма жаз.`;

  try {
    const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const refined = response.choices[0]?.message?.content?.trim() ?? "";

    if (!refined) return null;

    // Strip quotation marks if the model wrapped the output
    const cleaned = refined.replace(/^[«"„"]|[»"""]$/g, "").trim();

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
