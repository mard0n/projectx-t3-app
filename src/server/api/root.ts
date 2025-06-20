import { noteRouter } from "~/server/api/routers/note";
import { createTRPCRouter } from "~/server/api/trpc";
import { webMetadataRouter } from "./routers/webMetadata";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  note: noteRouter,
  webMetadata: webMetadataRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
