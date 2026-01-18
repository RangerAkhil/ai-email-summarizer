import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";

export const emails = pgTable("emails", {
    id: uuid("id").defaultRandom().primaryKey(),

    sender: text("sender").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),

    contentHash: text("content_hash").notNull().unique(),

    summary: text("summary"),
    category: text("category").notNull().default("General"),

    keywords: text("keywords").array().notNull().default([]),

    summaryCount: integer("summary_count").notNull().default(0),
    lastSummarizedAt: timestamp("last_summarized_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EmailRow = typeof emails.$inferSelect;
export type NewEmailRow = typeof emails.$inferInsert;
