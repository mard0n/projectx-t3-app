import { eq } from "drizzle-orm";
import { z } from "zod";
import { BLOCK_NOTE_TYPE } from "~/nodes/BlockNote";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { notes, webMetadata } from "~/server/db/schema";
import { type Prettify } from "~/utils/types";

export const webMetadataRouter = createTRPCRouter({
  fetchWebMetadata: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .output(
      z
        .object({
          webUrl: z.string().url(),
          defaultNoteId: z.string().uuid(),
          isTitleAdded: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.webMetadata.findFirst({
        where: eq(webMetadata.webUrl, input.url),
      });

      if (!result) return;

      if (!result.defaultNoteId) {
        const newNoteId = crypto.randomUUID();

        await ctx.db.insert(notes).values({
          type: BLOCK_NOTE_TYPE,
          id: newNoteId,
          indexWithinParent: 0,
          version: 1,
          properties: null,
          parentId: null,
          open: null,
          webUrl: null,
        });

        await ctx.db
          .update(webMetadata)
          .set({ defaultNoteId: newNoteId })
          .where(eq(webMetadata.webUrl, result.webUrl));

        result.defaultNoteId = newNoteId;
        return { ...result, defaultNoteId: newNoteId };
      }

      type ResultType = Prettify<
        Omit<typeof result, "defaultNoteId"> & { defaultNoteId: string }
      >;

      return result as ResultType;
    }),
  postWebMetadata: publicProcedure
    .input(
      z.object({
        webUrl: z.string().url(),
        defaultNoteId: z.string().uuid(),
        isTitleAdded: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { webUrl, defaultNoteId, isTitleAdded } = input;

      await ctx.db.insert(notes).values({
        type: BLOCK_NOTE_TYPE,
        id: defaultNoteId,
        indexWithinParent: 0,
        version: 1,
        properties: null,
        parentId: null,
        open: null,
        webUrl: null,
      });

      await ctx.db
        .insert(webMetadata)
        .values({ webUrl, defaultNoteId, isTitleAdded });
    }),
  updateTitleStatus: publicProcedure
    .input(z.object({ webUrl: z.string().url(), status: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(webMetadata)
        .set({ isTitleAdded: input.status })
        .where(eq(webMetadata.webUrl, input.webUrl));
    }),
});
