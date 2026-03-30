import type { TranslationEngine, TranslationResult } from "./types.js";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const TIMEOUT_MS = 15000;

const LANG_MAP: Record<string, string> = {
  ru: "RU",
  en: "EN",
};

export const deeplEngine: TranslationEngine = {
  name: "deepl",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return {
        engine: "deepl",
        text: "",
        error: "DEEPL_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    const srcLang = LANG_MAP[sourceLang];
    if (!srcLang) {
      return {
        engine: "deepl",
        text: "",
        error: `Unsupported source language: ${sourceLang}`,
        latencyMs: Date.now() - start,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const body = new URLSearchParams({
        text,
        source_lang: srcLang,
        target_lang: "KK",
      });

      const response = await fetch(DEEPL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          engine: "deepl",
          text: "",
          error: `DeepL API error ${response.status}: ${errorText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as {
        translations: Array<{ detected_source_language: string; text: string }>;
      };

      const translatedText = data?.translations?.[0]?.text ?? "";

      if (!translatedText) {
        return {
          engine: "deepl",
          text: "",
          error: "Empty translation from DeepL",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "deepl",
        text: translatedText,
        confidence: 0.88,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "deepl",
        text: "",
        error: isTimeout ? "Request timed out after 15s" : (err?.message ?? "Unknown error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
