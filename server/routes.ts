import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage.js";
import { translateWithAll, selectBest, engines } from "./engines/index.js";

// --- Validation schemas ---

const translateBodySchema = z.object({
  text: z.string().min(1, "text is required").max(5000, "text exceeds 5000 character limit"),
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
   * Returns: { id, bestTranslation, allResults, sourceLang, targetLang, meta }
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
      const { results: allResults, meta } = await translateWithAll(text, sourceLang, targetLang);
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
        meta,
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

  // ===== ADMIN API ROUTES =====

  /**
   * GET /api/admin/stats
   * Returns: dashboard statistics
   */
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const stats = await storage.getTranslationStats();
      return res.json(stats);
    } catch (err: any) {
      console.error("Admin stats error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * GET /api/admin/translations
   * Query: ?page=1&limit=20&search=...&sourceLang=ru&engine=openai
   */
  app.get("/api/admin/translations", async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
    const search = req.query.search ? String(req.query.search) : undefined;
    const sourceLang = req.query.sourceLang ? String(req.query.sourceLang) : undefined;
    const engine = req.query.engine ? String(req.query.engine) : undefined;

    try {
      const result = await storage.getTranslationsPaginated(page, limit, {
        search,
        sourceLang,
        engine,
      });
      return res.json(result);
    } catch (err: any) {
      console.error("Admin translations error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * DELETE /api/admin/translations/:id
   */
  app.delete("/api/admin/translations/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid translation id" });
    }
    try {
      const deleted = await storage.deleteTranslation(id);
      if (!deleted) {
        return res.status(404).json({ message: "Translation not found" });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Delete translation error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * GET /api/admin/translations/export
   * Returns: CSV file of all translations
   */
  app.get("/api/admin/translations/export", async (_req, res) => {
    try {
      const result = await storage.getTranslationsPaginated(1, 10000);
      const rows = result.data;

      const csvHeader = "ID,Source Text,Translated Text,Source Lang,Target Lang,Engine,Rating,Created At";
      const csvRows = rows.map((r) => {
        const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return [
          r.id,
          escape(r.sourceText),
          escape(r.translatedText),
          r.sourceLang,
          r.targetLang,
          r.engine,
          r.rating ?? "",
          r.createdAt,
        ].join(",");
      });

      const csv = [csvHeader, ...csvRows].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=translations.csv");
      return res.send(csv);
    } catch (err: any) {
      console.error("Export error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * GET /api/admin/engine-stats
   * Returns: per-engine performance statistics
   */
  app.get("/api/admin/engine-stats", async (_req, res) => {
    try {
      const stats = await storage.getEngineStats();
      return res.json(stats);
    } catch (err: any) {
      console.error("Engine stats error:", err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  });

  /**
   * GET /api/admin/settings
   * Returns: current app settings (read-only for now)
   */
  app.get("/api/admin/settings", (_req, res) => {
    return res.json({
      selfEvalThreshold: 8,
      maxIterations: 2,
      enginePriority: [
        "ensemble", "openai", "claude", "gemini", "deepseek",
        "grok", "tilmash", "mistral", "perplexity", "deepl", "yandex",
      ],
      version: "1.0.0",
      uptime: Math.floor(process.uptime()),
    });
  });

  // ===== END ADMIN ROUTES =====

  /**
   * GET /api/engines
   * Returns: list of available engines with status
   */
  app.get("/api/engines", (_req, res) => {
    const KEY_MAP: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      claude: "CLAUDE_API_KEY",
      tilmash: "HUGGINGFACE_API_KEY",
      gemini: "GEMINI_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      grok: "GROK_API_KEY",
      mistral: "MISTRAL_API_KEY",
      perplexity: "PERPLEXITY_API_KEY",
      deepl: "DEEPL_API_KEY",
      yandex: "YANDEX_API_KEY",
    };

    const engineStatuses = engines.map((engine) => {
      const keyEnvVar = KEY_MAP[engine.name] ?? "";
      const hasApiKey = keyEnvVar ? Boolean(process.env[keyEnvVar]) : false;
      return {
        name: engine.name,
        status: hasApiKey ? "available" : "no_api_key",
        keyEnvVar,
        hasApiKey,
      };
    });

    // Add ensemble (always available if 2+ engines have keys)
    const availableCount = engineStatuses.filter((e) => e.hasApiKey).length;
    engineStatuses.unshift({
      name: "ensemble",
      status: availableCount >= 2 ? "available" : "no_api_key",
      keyEnvVar: "(auto)",
      hasApiKey: availableCount >= 2,
    });

    return res.json({ engines: engineStatuses });
  });

  return httpServer;
}
