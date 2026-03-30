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
import { eq, desc } from "drizzle-orm";

const dbPath = process.env.DB_PATH || "data.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Translations
  saveTranslation(data: InsertTranslation): Promise<Translation>;
  getTranslations(limit?: number): Promise<Translation[]>;
  rateTranslation(id: number, rating: number): Promise<Translation | undefined>;
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
}

export const storage = new DatabaseStorage();
