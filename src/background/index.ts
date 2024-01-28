/* eslint-disable @typescript-eslint/no-floating-promises */
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { type AppRouter } from "~/server/api/root";
import superjson from "superjson";

export {};
console.log(
  "Live now; make now always the most precious time. Now will never come again.",
);

export const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      // You can pass any HTTP headers you wish here
      // async headers() {
      //   return {
      //     authorization: getAuthCookie(),
      //   };
      // },
    }),
  ],
  transformer: superjson,
});

const main = async () => {
  console.log("main background script");
};

main();
