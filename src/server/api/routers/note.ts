import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNodeSchema,
} from "~/nodes/BlockHighlight";
import { updatedBlocksSchema } from "~/plugins/SendingUpdatesPlugin";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { notes } from "~/server/db/schema";
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
});
