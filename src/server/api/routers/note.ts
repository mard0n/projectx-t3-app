import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const noteRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ctx}) => {
    return ctx.db.query.notes.findMany()
  })
});
