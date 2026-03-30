import type { TranslationEngine, TranslationResult } from "./types.js";

const LANG_MAP: Record<string, string> = {
  ru: "rus_Cyrl",
  en: "eng_Latn",
};

const TARGET_LANG = "kaz_Cyrl";
const HF_MODEL_URL = "https://api-inference.huggingface.co/models/issai/tilmash";
const TIMEOUT_MS = 15000;

export const tilmashEngine: TranslationEngine = {
  name: "tilmash",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return {
        engine: "tilmash",
        text: "",
        error: "HUGGINGFACE_API_KEY is required to use the Tilmash engine",
        latencyMs: Date.now() - start,
      };
    }

    const srcLang = LANG_MAP[sourceLang];
    if (!srcLang) {
      return {
        engine: "tilmash",
        text: "",
        error: `Unsupported source language: ${sourceLang}`,
        latencyMs: Date.now() - start,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(HF_MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            src_lang: srcLang,
            tgt_lang: TARGET_LANG,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          engine: "tilmash",
          text: "",
          error: `HuggingFace API error ${response.status}: ${errorText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as any;

      // HF inference API returns [{ translation_text: "..." }] for translation models
      let translatedText = "";
      if (Array.isArray(data) && data.length > 0 && data[0].translation_text) {
        translatedText = data[0].translation_text;
      } else if (data?.translation_text) {
        translatedText = data.translation_text;
      } else if (typeof data === "string") {
        translatedText = data;
      } else {
        return {
          engine: "tilmash",
          text: "",
          error: `Unexpected response format: ${JSON.stringify(data)}`,
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "tilmash",
        text: translatedText,
        confidence: 0.85,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "tilmash",
        text: "",
        error: isTimeout ? "Request timed out after 15s" : (err?.message ?? "Unknown error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
