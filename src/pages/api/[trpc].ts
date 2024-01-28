import type { TRPCErrorShape } from "@trpc/server/rpc";
import { createOpenApiNextHandler } from "trpc-openapi";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

// export API handler
export default createOpenApiNextHandler({
  router: appRouter,
  createContext: createTRPCContext,
  responseMeta: (opts: { clientErrors: [] }) => {
    console.log("responseMeta opts", opts);
  },
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }: { path: string; error: TRPCErrorShape }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
      : undefined,
});
