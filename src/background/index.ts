/* eslint-disable @typescript-eslint/no-floating-promises */
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { type AppRouter } from "~/server/api/root";
import superjson from "superjson";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCQueryUtils } from "@trpc/react-query";

const queryClient = new QueryClient();

export {};
console.log(
  "Live now; make now always the most precious time. Now will never come again.",
);

export const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      // You can pass any HTTP headers you wish here
      // async headers() {
      //   return {
      //     authorization: getAuthCookie(),
      //   };
      // },
      transformer: superjson,
    }),
  ],
});
export const clientUtils = createTRPCQueryUtils({ queryClient, client });

const main = async () => {
  console.log("main background script");
};

main();
