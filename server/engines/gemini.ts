import type { TranslationEngine, TranslationResult } from "./types.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const TIMEOUT_MS = 20000;

const LANG_LABELS: Record<string, string> = {
  ru: "Russian",
  en: "English",
};

export const geminiEngine: TranslationEngine = {
  name: "gemini",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        engine: "gemini",
        text: "",
        error: "GEMINI_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    const srcLabel = LANG_LABELS[sourceLang];
    if (!srcLabel) {
      return {
        engine: "gemini",
        text: "",
        error: `Unsupported source language: ${sourceLang}`,
        latencyMs: Date.now() - start,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert Kazakh language translator. Translate the following ${srcLabel} text to Kazakh (Қазақ тілі). Provide ONLY the translation, no explanations. Ensure grammatically correct, natural-sounding Kazakh that a native speaker would approve of. Pay attention to proper agglutinative morphology, correct word order (SOV), and appropriate register.\n\nTranslate:\n${text}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          engine: "gemini",
          text: "",
          error: `Gemini API error ${response.status}: ${errorText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = (await response.json()) as any;
      const translatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "gemini",
          text: "",
          error: "Empty response from Gemini",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "gemini",
        text: translatedText,
        confidence: 0.90,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "gemini",
        text: "",
        error: isTimeout ? "Request timed out after 20s" : (err?.message ?? "Unknown Gemini error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
