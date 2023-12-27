import { asc, isNull } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { notes } from "~/server/db/schema";

export const noteRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.query.notes.findMany({
      where: isNull(notes.indexWithinParent),
      with: {
        children: true,
      },
      orderBy: [asc(notes.indexWithinParent)],
    });
    return result;
  }),
});
