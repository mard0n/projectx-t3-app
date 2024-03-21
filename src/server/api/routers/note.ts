import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNode,
} from "~/nodes/BlockHighlight";
import {
  BLOCK_LINK_TYPE,
  type SerializedBlockLinkNode,
} from "~/nodes/BlockLink";
import {
  BLOCK_REMARK_TYPE,
  type SerializedBlockRemarkNode,
} from "~/nodes/BlockRemark";
import { updatedBlocksSchema } from "~/plugins/SendingUpdatesPlugin";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { notes } from "~/server/db/schema";
import { buildHierarchy } from "~/utils";

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
        const block = note.updatedBlock;
        switch (note.updateType) {
          case "created":
          case "updated":
            if (block) {
              await ctx.db
                .insert(notes)
                .values({
                  id: block.id,
                  type: block.type,
                  indexWithinParent: block.indexWithinParent,
                  version: block.version,
                  parentId: "parentId" in block ? block.parentId : null,
                  open: "open" in block ? block.open : null,
                  properties: "properties" in block ? block.properties : null,
                  webUrl: "webUrl" in block ? block.webUrl : null,
                })
                .onDuplicateKeyUpdate({
                  set: {
                    type: block.type,
                    indexWithinParent: block.indexWithinParent,
                    version: block.version,
                    parentId: "parentId" in block ? block.parentId : null,
                    open: "open" in block ? block.open : null,
                    properties: "properties" in block ? block.properties : null,
                    webUrl: "webUrl" in block ? block.webUrl : null,
                  },
                });
            }
            break;
          case "destroyed":
            await ctx.db.delete(notes).where(eq(notes.id, note.updatedBlockId));
            break;

          default:
            break;
        }
      }
      return "success";
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

      // type HighlightBlockObj = UnwrapArray<typeof result>;
      // type HighlightBlockObjWithType = Prettify<
      //   Omit<HighlightBlockObj, "type" | "properties"> & {
      //     type: typeof BLOCK_HIGHLIGHT_TYPE;
      //     properties: z.infer<
      //       typeof SerializedBlockHighlightNodeSchema.shape.properties
      //     >;
      //   }
      // >;
      // return result as HighlightBlockObjWithType[];
      return result as SerializedBlockHighlightNode[];
    }),
  fetchRemarks: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.notes.findMany({
        where: and(
          eq(notes.type, BLOCK_REMARK_TYPE),
          eq(notes.webUrl, input.url),
        ),
      });

      return result as SerializedBlockRemarkNode[];
    }),
  fetchBookmarks: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.type, BLOCK_LINK_TYPE),
            eq(notes.webUrl, input.url),
            sql`JSON_EXTRACT(properties, '$.linkType') = 'block-link-bookmark'`,
          ),
        );

      return result as SerializedBlockLinkNode[];
    }),
});
