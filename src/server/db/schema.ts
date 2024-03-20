import { sql, relations } from "drizzle-orm";
import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { z } from "zod";
import {
  BLOCK_HIGHLIGHT_TYPE,
  SerializedBlockHighlightNodeSchema,
} from "~/nodes/BlockHighlight";
import { BLOCK_NOTE_TYPE } from "~/nodes/BlockNote";
import {
  BLOCK_REMARK_TYPE,
  SerializedBlockRemarkNodeSchema,
} from "~/nodes/BlockRemark";
import {
  BLOCK_TEXT_TYPE,
  SerializedBlockTextNodeSchema,
} from "~/nodes/BlockText";

const propertySchemas = z.union([
  SerializedBlockTextNodeSchema.shape.properties,
  SerializedBlockHighlightNodeSchema.shape.properties,
  SerializedBlockRemarkNodeSchema.shape.properties,
]);
type PropertiesType = z.infer<typeof propertySchemas>;

/* TODO: I would create different table for highlights and notes but recursively fetching and joining might be bit problematic */
export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  type: mysqlEnum("type", [
    BLOCK_TEXT_TYPE,
    BLOCK_HIGHLIGHT_TYPE,
    BLOCK_NOTE_TYPE,
    BLOCK_REMARK_TYPE,
  ]).notNull(),
  indexWithinParent: int("indexWithinParent").notNull(),
  parentId: varchar("parentId", { length: 36 }),
  open: boolean("open").default(true),
  version: int("version").notNull().default(0),
  properties: json("properties").$type<PropertiesType>(),
  webUrl: varchar("webUrl", { length: 1024 }),
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

export const webMetadata = mysqlTable("webMetadata", {
  webUrl: varchar("webUrl", { length: 512 }).primaryKey(),
  defaultNoteId: varchar("defaultNoteId", { length: 36 }).references(
    () => notes.id,
    { onDelete: "set null" },
  ),
  isTitleAdded: boolean("isTitleAdded").default(false).notNull(),
});

export const webMetadataRelations = relations(webMetadata, ({ one }) => ({
  defaultNote: one(notes, {
    fields: [webMetadata.defaultNoteId],
    references: [notes.id],
  }),
}));

export type WebMetadata = typeof webMetadata.$inferSelect;
