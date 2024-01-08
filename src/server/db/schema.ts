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

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */

export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  type: varchar("type", { length: 100 }) // TODO: Make it more specific. mysqlEnum("type", ['block-container'])
    .notNull()
    .default("block-container"),
  title: varchar("title", { length: 10000 }), // TODO: Fix the length
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
  // createdAt: timestamp("created_at")
  //   .default(sql`CURRENT_TIMESTAMP`)
  //   .notNull(),
  // updatedAt: timestamp("updatedAt").onUpdateNow(),
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
