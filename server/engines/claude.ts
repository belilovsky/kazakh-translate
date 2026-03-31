import type { TranslationEngine, TranslationResult } from "./types.js";
import { getSystemPrompt } from "./kazakh-rules.js";

const TIMEOUT_MS = 20000;

export const claudeEngine: TranslationEngine = {
  name: "claude",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return {
        engine: "claude",
        text: "",
        error: "CLAUDE_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    try {
      const srcLabel = sourceLang === "ru" ? "Russian" : "English";
      const systemPrompt = getSystemPrompt(sourceLang, "detailed");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          temperature: 0.2,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Translate the following ${srcLabel} text to Kazakh:\n\n${text}`,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        return {
          engine: "claude",
          text: "",
          error: `Claude API error ${response.status}: ${errText}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      const translatedText = data?.content?.[0]?.text?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "claude",
          text: "",
          error: "Empty response from Claude",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "claude",
        text: translatedText,
        confidence: 0.93,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        engine: "claude",
        text: "",
        error: isTimeout ? "Request timed out after 20s" : (err?.message ?? "Unknown Claude error"),
        latencyMs: Date.now() - start,
      };
    }
  },
};
