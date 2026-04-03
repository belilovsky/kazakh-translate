import type { TranslationEngine, TranslationResult } from "./types.js";
import { getSystemPrompt } from "./kazakh-rules.js";

const TIMEOUT_MS = 20000;

export const perplexityEngine: TranslationEngine = {
  name: "perplexity",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return {
        engine: "perplexity",
        text: "",
        error: "PERPLEXITY_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    try {
      const srcLabel = sourceLang === "ru" ? "Russian" : "English";
      // Use "detailed" to include the full 13-section KAZAKH_GRAMMAR_RULES block,
      // consistent with all other LLM engines (openai, claude, gemini, etc.)
      const systemPrompt = getSystemPrompt(sourceLang, "detailed");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
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
          engine: "perplexity",
          text: "",
          error: `Perplexity API error ${response.status}: ${errText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const translatedText = data?.choices?.[0]?.message?.content?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "perplexity",
          text: "",
          error: "Empty response from Perplexity",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "perplexity",
        text: translatedText,
        confidence: 0.83,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "perplexity",
        text: "",
        error: isTimeout ? "Request timed out after 20s" : (err?.message ?? "Unknown Perplexity error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
