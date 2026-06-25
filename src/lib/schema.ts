// lib/schema.ts
import { pgTable, text, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";

export const roasts = pgTable("roasts", {
  id: varchar("id", { length: 12 }).primaryKey(),
  mode: text("mode").notNull().default("product"),
  inputUrl: text("input_url"),
  inputType: text("input_type").notNull().default("url"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Roast = typeof roasts.$inferSelect;
export type NewRoast = typeof roasts.$inferInsert;
