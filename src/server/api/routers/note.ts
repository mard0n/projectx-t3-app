import { eq } from "drizzle-orm";
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
});
