import type { TranslationEngine, TranslationResult } from "./types.js";

const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const TIMEOUT_MS = 30000;

const LANG_NAMES: Record<string, string> = {
  ru: "русского",
  en: "английского",
};

export const tilmashEngine: TranslationEngine = {
  name: "tilmash",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return {
        engine: "tilmash",
        text: "",
        error: "HUGGINGFACE_API_KEY is required",
        latencyMs: Date.now() - start,
      };
    }

    const langName = LANG_NAMES[sourceLang];
    if (!langName) {
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

      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_MODEL,
          messages: [
            {
              role: "system",
              content: `Сен кәсіби қазақ тілі аудармашысысың. Берілген мәтінді ${langName} тілінен қазақ тіліне (қазақша) аудар. Аударманы ғана жаз, басқа ештеңе жазба. Түпнұсқаның мағынасы мен стилін сақта.`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          max_tokens: 2000,
          temperature: 0.3,
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
      const translatedText = data?.choices?.[0]?.message?.content?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "tilmash",
          text: "",
          error: "Empty response from model",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "tilmash",
        text: translatedText,
        confidence: 0.88,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "tilmash",
        text: "",
        error: isTimeout ? "Request timed out after 30s" : (err?.message ?? "Unknown error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
