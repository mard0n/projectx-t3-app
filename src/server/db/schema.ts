/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql, relations } from "drizzle-orm";
import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { BLOCK_PARAGRAPH_TYPE } from "~/nodes/BlockParagraph";
import { BLOCK_HIGHLIGHT_TYPE } from "~/nodes/BlockHighlight";

export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  type: mysqlEnum("type", [BLOCK_HIGHLIGHT_TYPE, BLOCK_PARAGRAPH_TYPE])
    .notNull()
    .default(BLOCK_PARAGRAPH_TYPE),
  content: varchar("content", { length: 4096 }).notNull().default(""), // TODO: Fix the length
  indexWithinParent: int("indexWithinParent").notNull(),
  parentId: varchar("parentId", { length: 36 }),
  open: boolean("open").notNull().default(true),
  version: int("version").notNull().default(0),
  highlightText: varchar("highlightText", { length: 4096 }),
  highlightUrl: varchar("highlightUrl", { length: 2048 }),
  highlightRangePath: varchar("highlightRangePath", { length: 4096 }),
});

export type Note = typeof notes.$inferSelect;

export const parentIdToNotesRelations = relations(notes, ({ one, many }) => ({
  childBlocks: many(notes, {
    relationName: "notesToNotes",
  }),
  parent: one(notes, {
    fields: [notes.parentId],
    references: [notes.id],
    relationName: "notesToNotes",
  }),
}));
