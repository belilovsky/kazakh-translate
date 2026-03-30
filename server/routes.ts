import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage.js";
import { translateWithAll, selectBest, engines } from "./engines/index.js";

// --- Validation schemas ---

const translateBodySchema = z.object({
  text: z.string().min(1, "text is required"),
  sourceLang: z.enum(["ru", "en"], {
    errorMap: () => ({ message: 'sourceLang must be "ru" or "en"' }),
  }),
  targetLang: z.literal("kk", {
    errorMap: () => ({ message: 'targetLang must be "kk"' }),
  }),
});

const rateBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  /**
   * POST /api/translate
   * Body: { text, sourceLang, targetLang }
   * Returns: { id, bestTranslation, allResults, sourceLang, targetLang }
   */
  app.post("/api/translate", async (req, res) => {
    const parsed = translateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.errors,
      });
    }

    const { text, sourceLang, targetLang } = parsed.data;

    try {
      const allResults = await translateWithAll(text, sourceLang, targetLang);
      const best = selectBest(allResults);

      const saved = await storage.saveTranslation({
        sourceText: text,
        translatedText: best.text,
        sourceLang,
        targetLang,
        engine: best.engine,
        allResults: JSON.stringify(allResults),
        rating: null,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        id: saved.id,
        bestTranslation: {
          engine: best.engine,
          text: best.text,
        },
        allResults,
        sourceLang,
        targetLang,
      });
    } catch (err: any) {
      console.error("Translation error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * GET /api/translations
   * Query: ?limit=20
   * Returns: recent translation records
   */
  app.get("/api/translations", async (req, res) => {
    const limitParam = req.query.limit;
    const limit = limitParam ? Math.min(parseInt(String(limitParam), 10) || 20, 100) : 20;

    try {
      const rows = await storage.getTranslations(limit);
      return res.json(rows);
    } catch (err: any) {
      console.error("Get translations error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * POST /api/translations/:id/rate
   * Body: { rating: 1-5 }
   * Returns: updated translation record
   */
  app.post("/api/translations/:id/rate", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid translation id" });
    }

    const parsed = rateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid rating. Must be an integer between 1 and 5.",
        errors: parsed.error.errors,
      });
    }

    try {
      const updated = await storage.rateTranslation(id, parsed.data.rating);
      if (!updated) {
        return res.status(404).json({ message: "Translation not found" });
      }
      return res.json(updated);
    } catch (err: any) {
      console.error("Rate translation error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * GET /api/engines
   * Returns: list of available engines with status
   */
  app.get("/api/engines", (_req, res) => {
    const engineStatuses = engines.map((engine) => {
      let hasApiKey = false;
      let keyEnvVar = "";

      switch (engine.name) {
        case "openai":
          keyEnvVar = "OPENAI_API_KEY";
          hasApiKey = Boolean(process.env.OPENAI_API_KEY);
          break;
        case "tilmash":
          keyEnvVar = "HUGGINGFACE_API_KEY";
          hasApiKey = Boolean(process.env.HUGGINGFACE_API_KEY);
          break;
        case "deepl":
          keyEnvVar = "DEEPL_API_KEY";
          hasApiKey = Boolean(process.env.DEEPL_API_KEY);
          break;
        case "yandex":
          keyEnvVar = "YANDEX_API_KEY";
          hasApiKey = Boolean(process.env.YANDEX_API_KEY);
          break;
      }

      return {
        name: engine.name,
        status: hasApiKey ? "available" : "no_api_key",
        keyEnvVar,
        hasApiKey,
      };
    });

    return res.json({ engines: engineStatuses });
  });

  return httpServer;
}
