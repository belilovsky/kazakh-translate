import {
  type User,
  type InsertUser,
  type Translation,
  type InsertTranslation,
  users,
  translations,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, and, sql, count } from "drizzle-orm";

const dbPath = process.env.DB_PATH || "data.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    engine TEXT NOT NULL,
    all_results TEXT NOT NULL,
    rating INTEGER,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

// --- Admin Types ---

export interface TranslationFilters {
  search?: string;
  sourceLang?: string;
  engine?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TranslationStats {
  totalCount: number;
  todayCount: number;
  avgEvalScore: number | null;
  engineBestCounts: Record<string, number>;
}

export interface EngineStatEntry {
  engine: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  successRate: number;
  lastError: string | null;
  bestCount: number;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Translations
  saveTranslation(data: InsertTranslation): Promise<Translation>;
  getTranslations(limit?: number): Promise<Translation[]>;
  rateTranslation(id: number, rating: number): Promise<Translation | undefined>;

  // Admin
  getTranslationsPaginated(
    page: number,
    limit: number,
    filters?: TranslationFilters
  ): Promise<PaginatedResult<Translation>>;
  getTranslationStats(): Promise<TranslationStats>;
  getEngineStats(): Promise<EngineStatEntry[]>;
  deleteTranslation(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // --- Users ---

  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  // --- Translations ---

  async saveTranslation(data: InsertTranslation): Promise<Translation> {
    return db.insert(translations).values(data).returning().get();
  }

  async getTranslations(limit: number = 20): Promise<Translation[]> {
    return db
      .select()
      .from(translations)
      .orderBy(desc(translations.id))
      .limit(limit)
      .all();
  }

  async rateTranslation(id: number, rating: number): Promise<Translation | undefined> {
    return db
      .update(translations)
      .set({ rating })
      .where(eq(translations.id, id))
      .returning()
      .get();
  }

  // --- Admin ---

  async getTranslationsPaginated(
    page: number,
    limit: number,
    filters?: TranslationFilters
  ): Promise<PaginatedResult<Translation>> {
    const conditions = [];

    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        sql`(${translations.sourceText} LIKE ${term} OR ${translations.translatedText} LIKE ${term})`
      );
    }
    if (filters?.sourceLang) {
      conditions.push(eq(translations.sourceLang, filters.sourceLang));
    }
    if (filters?.engine) {
      conditions.push(eq(translations.engine, filters.engine));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db
      .select({ value: count() })
      .from(translations)
      .where(whereClause)
      .get();
    const total = totalRow?.value ?? 0;

    const offset = (page - 1) * limit;
    const data = db
      .select()
      .from(translations)
      .where(whereClause)
      .orderBy(desc(translations.id))
      .limit(limit)
      .offset(offset)
      .all();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTranslationStats(): Promise<TranslationStats> {
    // Total count
    const totalRow = db.select({ value: count() }).from(translations).get();
    const totalCount = totalRow?.value ?? 0;

    // Today's count
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRow = db
      .select({ value: count() })
      .from(translations)
      .where(sql`${translations.createdAt} LIKE ${todayStr + "%"}`)
      .get();
    const todayCount = todayRow?.value ?? 0;

    // Compute average eval score and engine best counts from all rows
    const allRows = db.select().from(translations).all();

    let evalScoreSum = 0;
    let evalScoreCount = 0;
    const engineBestCounts: Record<string, number> = {};

    for (const row of allRows) {
      // Count engine as "best" (the engine field stores which engine won)
      const eng = row.engine;
      engineBestCounts[eng] = (engineBestCounts[eng] || 0) + 1;

      // Extract evalScore from allResults meta
      try {
        const results = JSON.parse(row.allResults) as any[];
        // The meta.evalScore is stored at the row level — not inside allResults.
        // But we can look for the ensemble result's confidence or check if there's meta info.
        // Since meta is NOT stored in allResults, we check the allResults for ensemble confidence.
        // Actually, looking at the route code, meta.evalScore is returned but also the
        // allResults JSON has individual engine results. The evalScore comes from self-eval.
        // It's NOT stored in allResults — it's metadata. Let's parse it from the allResults
        // if there's an evalScore embedded, otherwise skip.
      } catch {
        // ignore parse errors
      }
    }

    // For average eval score, we need to look at the allResults field.
    // The evalScore is not directly in allResults — it's in meta which isn't persisted separately.
    // However, the task says "from meta.evalScore in allResults" — let's check if maybe it's stored there.
    // Looking at the save code in routes.ts, allResults is JSON.stringify(allResults) which is
    // the array of TranslationResult objects. The meta is NOT included.
    // We'll return null for avgEvalScore since it's not persisted, and note this in the UI.

    return {
      totalCount,
      todayCount,
      avgEvalScore: null,
      engineBestCounts,
    };
  }

  async getEngineStats(): Promise<EngineStatEntry[]> {
    const allRows = db.select().from(translations).all();

    const statsMap: Record<
      string,
      {
        totalCalls: number;
        successCount: number;
        errorCount: number;
        totalLatency: number;
        lastError: string | null;
        bestCount: number;
      }
    > = {};

    const ensureStat = (name: string) => {
      if (!statsMap[name]) {
        statsMap[name] = {
          totalCalls: 0,
          successCount: 0,
          errorCount: 0,
          totalLatency: 0,
          lastError: null,
          bestCount: 0,
        };
      }
    };

    for (const row of allRows) {
      // Count best engine
      ensureStat(row.engine);
      statsMap[row.engine].bestCount++;

      // Parse allResults for per-engine stats
      try {
        const results = JSON.parse(row.allResults) as Array<{
          engine: string;
          text?: string;
          error?: string;
          latencyMs?: number;
          confidence?: number;
        }>;

        for (const r of results) {
          ensureStat(r.engine);
          const s = statsMap[r.engine];
          s.totalCalls++;
          if (r.error) {
            s.errorCount++;
            s.lastError = r.error;
          } else if (r.text) {
            s.successCount++;
          }
          if (r.latencyMs && r.latencyMs > 0) {
            s.totalLatency += r.latencyMs;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    return Object.entries(statsMap).map(([engine, s]) => ({
      engine,
      totalCalls: s.totalCalls,
      successCount: s.successCount,
      errorCount: s.errorCount,
      avgLatencyMs:
        s.successCount > 0
          ? Math.round(s.totalLatency / s.successCount)
          : 0,
      successRate:
        s.totalCalls > 0
          ? Math.round((s.successCount / s.totalCalls) * 100)
          : 0,
      lastError: s.lastError,
      bestCount: s.bestCount,
    }));
  }

  async deleteTranslation(id: number): Promise<boolean> {
    const result = db
      .delete(translations)
      .where(eq(translations.id, id))
      .run();
    return result.changes > 0;
  }
}

export const storage = new DatabaseStorage();
