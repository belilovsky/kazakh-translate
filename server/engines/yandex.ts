import type { TranslationEngine, TranslationResult } from "./types.js";

const YANDEX_API_URL = "https://translate.api.cloud.yandex.net/translate/v2/translate";
const TIMEOUT_MS = 15000;

export const yandexEngine: TranslationEngine = {
  name: "yandex",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey) {
      return {
        engine: "yandex",
        text: "",
        error: "YANDEX_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(YANDEX_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texts: [text],
          sourceLanguageCode: sourceLang, // "ru" or "en"
          targetLanguageCode: "kk",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          engine: "yandex",
          text: "",
          error: `Yandex API error ${response.status}: ${errorText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as {
        translations: Array<{ text: string; detectedLanguageCode?: string }>;
      };

      const translatedText = data?.translations?.[0]?.text ?? "";

      if (!translatedText) {
        return {
          engine: "yandex",
          text: "",
          error: "Empty translation from Yandex",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "yandex",
        text: translatedText,
        confidence: 0.82,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "yandex",
        text: "",
        error: isTimeout ? "Request timed out after 15s" : (err?.message ?? "Unknown error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
