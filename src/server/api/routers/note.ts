import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  BLOCK_HIGHLIGHT_TYPE,
  SerializedBlockHighlightNodeSchema,
} from "~/nodes/BlockHighlight";
import { SerializedBlockParagraphNodeSchema } from "~/nodes/BlockParagraph";
import { updatedBlocksSchema } from "~/plugins/SendingUpdatesPlugin";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { notes } from "~/server/db/schema";
import { buildHierarchy } from "~/utils";
import type { Prettify, UnwrapArray } from "~/utils/types";

async function wait() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(null);
    }, 3000);
  });
}

export const noteRouter = createTRPCRouter({
  getAll: publicProcedure
    // TODO: Fix the type error
    // .output(
    //   z
    //     .union([
    //       SerializedBlockParagraphNodeSchema.omit({children: true}),
    //       SerializedBlockHighlightNodeSchema.omit({children: true}),
    //     ])
    //     .array(),
    // )
    .query(async ({ ctx }) => {
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
                childBlocks,
                children,
                direction,
                format,
                indent,
                ...rest
              } = note.updatedBlock; // TODO: find a better way of detecting unnecessary values
              await ctx.db
                .insert(notes)
                .values(note.updatedBlock)
                .onDuplicateKeyUpdate({
                  set: rest,
                });
            }
            break;
          case "updated":
            if (note.updatedBlock) {
              const {
                childBlocks,
                children,
                direction,
                format,
                indent,
                ...rest
              } = note.updatedBlock;

              const isDataExist = await ctx.db.query.notes.findFirst({
                where: eq(notes.id, note.updatedBlockId),
              });

              if (isDataExist) {
                await ctx.db
                  .update(notes)
                  .set(rest)
                  .where(eq(notes.id, note.updatedBlockId));
              } else {
                await ctx.db.insert(notes).values(note.updatedBlock);
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
    // .output(
    //   SerializedBlockHighlightNodeSchema.omit({
    //     children: true,
    //     direction: true,
    //     format: true,
    //     indent: true,
    //   }).array(),
    // )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.notes.findMany({
        where: and(
          eq(notes.type, BLOCK_HIGHLIGHT_TYPE),
          eq(notes.highlightUrl, input.url),
        ),
      });

      // Just to match output() type
      type HighlightBlockObj = UnwrapArray<typeof result>;
      type HighlightBlockObjWithType = Prettify<
        (Omit<HighlightBlockObj, "type"> & {
          type: typeof BLOCK_HIGHLIGHT_TYPE;
        })[]
      >;
      return result as HighlightBlockObjWithType;
    }),
});
