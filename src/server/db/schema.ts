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
import { BLOCK_HEADER_TYPE } from "~/nodes/BlockHeader";
import { BLOCK_HIGHLIGHT_COMMENT_TYPE } from "~/nodes/BlockHighlightComment";
import { BLOCK_HIGHLIGHT_PARAGRAPH_TYPE } from "~/nodes/BlockHighlightParagraph";
import { BLOCK_PARAGRAPH_TYPE } from "~/nodes/BlockParagraph";

export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  type: mysqlEnum("type", [
    BLOCK_PARAGRAPH_TYPE,
    BLOCK_HEADER_TYPE,
    BLOCK_HIGHLIGHT_PARAGRAPH_TYPE,
    BLOCK_HIGHLIGHT_COMMENT_TYPE,
  ]) // TODO: Make it more specific. mysqlEnum("type", ['block-container'])
    .notNull()
    .default(BLOCK_PARAGRAPH_TYPE),
  title: varchar("title", { length: 4096 }), // TODO: Fix the length
  indexWithinParent: int("indexWithinParent"),
  parentId: varchar("parentId", { length: 36 }),
  open: boolean("open").notNull().default(true),
  version: int("version").notNull().default(0),
  direction: mysqlEnum("direction", ["rtl", "ltr"]).default("ltr"),
  format: mysqlEnum("format", [
    "left",
    "start",
    "center",
    "right",
    "end",
    "justify",
    "",
  ]).default(""),
  indent: int("indent").default(0),
  tag: mysqlEnum("tag", ["h1", "h2", "h3", "h4"]),
  highlightText: varchar("highlightText", { length: 4096 }),
  highlightUrl: varchar("highlightUrl", { length: 2048 }),
  highlightRangePath: varchar("highlightRangePath", { length: 2048 }),
});

export type Note = typeof notes.$inferSelect;

export const parentIdToNotesRelations = relations(notes, ({ one, many }) => ({
  childNotes: many(notes, {
    relationName: "notesToNotes",
  }),
  parent: one(notes, {
    fields: [notes.parentId],
    references: [notes.id],
    relationName: "notesToNotes",
  }),
}));
