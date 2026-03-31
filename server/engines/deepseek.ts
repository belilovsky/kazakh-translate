import type { TranslationEngine, TranslationResult } from "./types.js";
import { getSystemPrompt } from "./kazakh-rules.js";

const TIMEOUT_MS = 20000;

export const deepseekEngine: TranslationEngine = {
  name: "deepseek",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        engine: "deepseek",
        text: "",
        error: "DEEPSEEK_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    try {
      const srcLabel = sourceLang === "ru" ? "Russian" : "English";
      const systemPrompt = getSystemPrompt(sourceLang, "detailed");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
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
          engine: "deepseek",
          text: "",
          error: `DeepSeek API error ${response.status}: ${errText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const translatedText = data?.choices?.[0]?.message?.content?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "deepseek",
          text: "",
          error: "Empty response from DeepSeek",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "deepseek",
        text: translatedText,
        confidence: 0.87,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "deepseek",
        text: "",
        error: isTimeout ? "Request timed out after 20s" : (err?.message ?? "Unknown DeepSeek error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
