import { env } from "~/env.mjs";
import * as schema from "./schema";

export const db = drizzle(
  connect({
    url: env.DATABASE_URL,
  }),
  { schema },
);
