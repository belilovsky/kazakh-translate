import type { TranslationEngine, TranslationResult } from "./types.js";
import { getSystemPrompt } from "./kazakh-rules.js";

const TIMEOUT_MS = 20000;

export const grokEngine: TranslationEngine = {
  name: "grok",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      return {
        engine: "grok",
        text: "",
        error: "GROK_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    try {
      const srcLabel = sourceLang === "ru" ? "Russian" : "English";
      const systemPrompt = getSystemPrompt(sourceLang, "detailed");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-3-mini-fast",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Translate the following ${srcLabel} text to Kazakh:\n\n${text}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        return {
          engine: "grok",
          text: "",
          error: `Grok API error ${response.status}: ${errText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const translatedText = data?.choices?.[0]?.message?.content?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "grok",
          text: "",
          error: "Empty response from Grok",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "grok",
        text: translatedText,
        confidence: 0.85,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "grok",
        text: "",
        error: isTimeout ? "Request timed out after 20s" : (err?.message ?? "Unknown Grok error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
