import { asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { UpdatedBlock } from "~/components/lexical/CollapsibleParagraphPlugin";
import { serializedCPContainerNodeSchema } from "~/components/lexical/CollapsibleParagraphPlugin/CPContainer";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Note } from "~/server/db/schema";
import { notes } from "~/server/db/schema";

const updatedBlocksSchema: z.ZodSchema<UpdatedBlock> = z.object({
  updateType: z.union([
    z.literal("created"),
    z.literal("updated"),
    z.literal("destroyed"),
  ]),
  updatedBlockId: z.string().uuid(),
  updatedBlock: serializedCPContainerNodeSchema.nullable(),
});

function buildHierarchy(
  items: (Note & { childNotes?: Note[] })[],
  parentId: string | null = null,
) {
  const result = [];

  for (const item of items) {
    if (item.parentId === parentId) {
      const children = buildHierarchy(items, item.id);
      if (children.length) {
        item.childNotes = children;
      }
      result.push(item);
    }
  }

  return result.sort((a, b) => a.indexWithinParent! - b.indexWithinParent!);
}

export const noteRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    // const result1 = await ctx.db.query.notes.findMany({
    //   where: isNull(notes.parentId),
    //   with: {
    //     childNotes: true,
    //   },
    //   orderBy: [asc(notes.indexWithinParent)],
    // });

    const result = await ctx.db.query.notes.findMany();
    console.log("result", result);
    const hierarchicalObj = buildHierarchy(result);
    console.log("hierarchicalObj", hierarchicalObj);
    return hierarchicalObj;
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
              const { id, childNotes, children, ...rest } = note.updatedBlock;
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
              const { childNotes, children, ...rest } = note.updatedBlock;
              console.log("rest", rest);

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
});
