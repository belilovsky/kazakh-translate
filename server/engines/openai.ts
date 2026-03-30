import OpenAI from "openai";
import type { TranslationEngine, TranslationResult } from "./types.js";
import { getSystemPrompt } from "./kazakh-rules.js";

const TIMEOUT_MS = 15000;

export const openaiEngine: TranslationEngine = {
  name: "openai",

  async translate(text: string, sourceLang: string, _targetLang: string): Promise<TranslationResult> {
    const start = Date.now();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        engine: "openai",
        text: "",
        error: "OPENAI_API_KEY is not set",
        latencyMs: Date.now() - start,
      };
    }

    try {
      const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });

      const srcLabel = sourceLang === "ru" ? "Russian" : "English";
      const systemPrompt = getSystemPrompt(sourceLang, "detailed");

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Translate the following ${srcLabel} text to Kazakh:\n\n${text}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      });

      const translatedText = response.choices[0]?.message?.content?.trim() ?? "";

      if (!translatedText) {
        return {
          engine: "openai",
          text: "",
          error: "Empty response from OpenAI",
          latencyMs: Date.now() - start,
        };
      }

      return {
        engine: "openai",
        text: translatedText,
        confidence: 0.95,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        engine: "openai",
        text: "",
        error: err?.message ?? "Unknown OpenAI error",
        latencyMs: Date.now() - start,
      };
    }
  },
};
