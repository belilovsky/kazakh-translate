import type { TranslationEngine, TranslationResult } from "./types.js";
import { getSystemPrompt } from "./kazakh-rules.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const TIMEOUT_MS = 20000;

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

    const srcLabel = sourceLang === "ru" ? "Russian" : "English";
    if (!["ru", "en"].includes(sourceLang)) {
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

      const systemPrompt = getSystemPrompt(sourceLang, "detailed");

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              parts: [
                {
                  text: `Translate the following ${srcLabel} text to Kazakh:\n\n${text}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
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
