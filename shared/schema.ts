import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const translations = sqliteTable("translations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  sourceLang: text("source_lang").notNull(), // "ru" or "en"
  targetLang: text("target_lang").notNull(), // always "kk"
  engine: text("engine").notNull(),
  allResults: text("all_results").notNull(), // JSON string of all engine results
  rating: integer("rating"), // nullable, user feedback 1-5
  createdAt: text("created_at").notNull(), // ISO date string
});

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
});

export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;
