import { eq } from "drizzle-orm";
import { z } from "zod";
import { SerializedBlockContainerNodeSchema } from "~/nodes/Block/BlockContainer";
import { SerializedBlockHeaderNodeSchema } from "~/nodes/BlockHeader/BlockHeaderNode";
import { type UpdatedBlock } from "~/plugins/SendingUpdatesPlugin";
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
  updatedBlock: z.union([
    SerializedBlockContainerNodeSchema.nullable(),
    SerializedBlockHeaderNodeSchema.nullable(),
  ]),
});

function buildHierarchy(items: (Note & { childNotes?: Note[] })[]) {
  const tree: (Note & { childNotes: Note[] })[] = [];
  const mappedArr: Record<string, Note & { childNotes: Note[] }> = {};

  for (const item of items) {
    const id = item.id;
    if (!mappedArr.hasOwnProperty(id)) {
      mappedArr[id] = { ...item, childNotes: [] };
    }
  }

  // Loop over hash table
  for (const id in mappedArr) {
    if (mappedArr.hasOwnProperty(id)) {
      const mappedElem = mappedArr[id]!;

      if (mappedElem?.parentId) {
        const parentId = mappedElem?.parentId;
        const parentNote = mappedArr[parentId];
        if (parentNote) {
          // TODO: Need to find a better way of sorting
          const childNotes = parentNote.childNotes;
          childNotes.push(mappedElem);
          const sortedChildNotes = childNotes.sort(
            (a, b) => a.indexWithinParent! - b.indexWithinParent!,
          );
          parentNote.childNotes = sortedChildNotes;
        }
      } else {
        tree.push(mappedElem);
      }
    }
  }

  return tree.sort((a, b) => a.indexWithinParent! - b.indexWithinParent!); // TODO: Better way of sorting
}

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
