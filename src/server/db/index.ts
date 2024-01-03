import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "~/env";
import * as schema from "./schema";

const pool = mysql.createPool({
  uri: env.MYSQL_DB_URL,
});

export const db = drizzle(pool, { schema: schema, mode: "default" });
