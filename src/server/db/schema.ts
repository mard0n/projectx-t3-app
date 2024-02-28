import { sql, relations } from "drizzle-orm";
import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { type z } from "zod";
import {
  BLOCK_TEXT_TYPE,
  SerializedBlockTextNodeSchema,
} from "~/nodes/BlockText";

const propertySchemas = SerializedBlockTextNodeSchema.shape.properties;
type PropertiesType = z.infer<typeof propertySchemas>;

export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  type: mysqlEnum("type", [BLOCK_TEXT_TYPE]).notNull(),
  indexWithinParent: int("indexWithinParent").notNull(),
  parentId: varchar("parentId", { length: 36 }),
  open: boolean("open").notNull().default(true),
  version: int("version").notNull().default(0),
  properties: json("properties").$type<PropertiesType>().notNull(),
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
