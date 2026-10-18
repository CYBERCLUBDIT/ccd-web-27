import { readFileSync } from "node:fs";
import { Pool } from "pg";

if (!process.env.DATABASE_URL)
  throw new Error(
    "Set DATABASE_URL or use node --env-file=.env.local scripts/seed-summit.mjs",
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const result = await pool.query(
    readFileSync(new URL("./seed-summit.sql", import.meta.url), "utf8"),
  );
  console.log(
    `Summit content ready: ${result.rowCount} new records. Existing records preserved.`,
  );
} finally {
  await pool.end();
}
