import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNodeSchema,
} from "~/nodes/BlockHighlight";
import { BLOCK_NOTE_TYPE } from "~/nodes/BlockNote";
import { updatedBlocksSchema } from "~/plugins/SendingUpdatesPlugin";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { notes, webMetadata } from "~/server/db/schema";
import { buildHierarchy } from "~/utils";
import { type Prettify, type UnwrapArray } from "~/utils/types";

export const noteRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.query.notes.findMany();
    return buildHierarchy(result);
  }),
  saveChanges: publicProcedure
    .input(updatedBlocksSchema.array())
    .mutation(async ({ ctx, input }) => {
      const customOrder = { created: 1, updated: 2, destroyed: 3 };

      const orderedUpdates = input.sort(
        (a, b) => customOrder[a.updateType] - customOrder[b.updateType],
      );

      for (const note of orderedUpdates) {
        switch (note.updateType) {
          case "created":
            if (note.updatedBlock) {
              const {
                id,
                type,
                indexWithinParent,
                parentId,
                open,
                version,
                properties,
                webUrl,
              } = note.updatedBlock; // TODO: find a better way of detecting unnecessary values

              await ctx.db
                .insert(notes)
                .values({
                  id,
                  type,
                  indexWithinParent,
                  parentId,
                  open,
                  version,
                  properties,
                  webUrl,
                })
                .onDuplicateKeyUpdate({
                  set: {
                    type,
                    indexWithinParent,
                    parentId,
                    open,
                    version,
                    properties,
                    webUrl,
                  },
                });
            }
            break;
          case "updated":
            if (note.updatedBlock) {
              const {
                id,
                type,
                indexWithinParent,
                parentId,
                open,
                version,
                properties,
                webUrl,
              } = note.updatedBlock;

              const isDataExist = await ctx.db.query.notes.findFirst({
                where: eq(notes.id, note.updatedBlockId),
              });

              if (isDataExist) {
                await ctx.db
                  .update(notes)
                  .set({
                    type,
                    indexWithinParent,
                    parentId,
                    open,
                    version,
                    properties,
                    webUrl,
                  })
                  .where(eq(notes.id, note.updatedBlockId));
              } else {
                await ctx.db.insert(notes).values({
                  id,
                  type,
                  indexWithinParent,
                  parentId,
                  open,
                  version,
                  properties,
                  webUrl,
                });
              }
            }
            break;
          case "destroyed":
            await ctx.db.delete(notes).where(eq(notes.id, note.updatedBlockId));
            break;

          default:
            break;
        }
      }
    }),
  fetchHighlights: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.notes.findMany({
        where: and(
          eq(notes.type, BLOCK_HIGHLIGHT_TYPE),
          eq(notes.webUrl, input.url),
        ),
      });

      type HighlightBlockObj = UnwrapArray<typeof result>;
      type HighlightBlockObjWithType = Prettify<
        Omit<HighlightBlockObj, "type" | "properties"> & {
          type: typeof BLOCK_HIGHLIGHT_TYPE;
          properties: z.infer<
            typeof SerializedBlockHighlightNodeSchema.shape.properties
          >;
        }
      >;
      return result as HighlightBlockObjWithType[];
    }),
  fetchNoteHighlightContainer: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.notes.findFirst({
        where: and(
          eq(notes.type, BLOCK_NOTE_TYPE),
          eq(notes.webUrl, input.url),
        ),
      });

      return result;
    }),
  fetchWebmeta: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .output(
      z.object({
        webUrl: z.string().url(),
        defaultNoteId: z.string().uuid(),
        isTitleAdded: z.boolean(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.webMetadata.findFirst({
        where: eq(webMetadata.webUrl, input.url),
      });

      if (result?.defaultNoteId) {
        const defaultNote = await ctx.db.query.notes.findFirst({
          where: eq(notes.id, result.defaultNoteId),
        });

        if (defaultNote) {
          return result;
        } else {
          const newNoteId = crypto.randomUUID();

          await ctx.db.insert(notes).values({
            type: BLOCK_NOTE_TYPE,
            id: newNoteId,
            indexWithinParent: 0,
            version: 1,
            properties: null,
            parentId: null,
            open: null,
            webUrl: input.url,
          });

          await ctx.db.update(webMetadata).set({ defaultNoteId: newNoteId });

          return { ...result, defaultNoteId: newNoteId };
        }
      } else {
        const newNoteId = crypto.randomUUID();

        await ctx.db.insert(notes).values({
          type: BLOCK_NOTE_TYPE,
          id: newNoteId,
          indexWithinParent: 0,
          version: 1,
          properties: null,
          parentId: null,
          open: null,
          webUrl: input.url,
        });

        await ctx.db.insert(webMetadata).values({
          webUrl: input.url,
          defaultNoteId: newNoteId,
          isTitleAdded: false,
        });

        return {
          webUrl: input.url,
          defaultNoteId: newNoteId,
          isTitleAdded: false,
        };
      }
    }),
});
