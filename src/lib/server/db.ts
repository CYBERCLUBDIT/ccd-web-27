import "server-only";
import { Pool } from "pg";
const globalDb = globalThis as unknown as { clubPool?: Pool };
export const db =
  globalDb.clubPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") globalDb.clubPool = db;
