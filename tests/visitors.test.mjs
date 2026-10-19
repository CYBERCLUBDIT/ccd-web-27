import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
process.loadEnvFile(".env.local");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
assert.ok(
  ["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  ),
);
const db = new Pool({ connectionString: process.env.DATABASE_URL });
test("Daily visitors are deduplicated by the database, including concurrent requests", async () => {
  const ids = [randomUUID(), randomUUID()];
  const hashes = ids.map((id) => createHash("sha256").update(id).digest("hex"));
  const post = (id, valid = true) =>
    fetch(origin + "/api/visits", {
      method: "POST",
      headers: { "x-visitor-id": id, ...(valid ? { Origin: origin } : {}) },
    });
  try {
    const responses = await Promise.all(
      Array.from({ length: 12 }, () => post(ids[0])),
    );
    assert.ok(responses.every((r) => r.status === 200));
    const results = await Promise.all(responses.map((r) => r.json()));
    assert.equal(results.filter((r) => r.recorded).length, 1);
    assert.equal((await post(ids[1])).status, 200);
    assert.equal((await post(ids[0])).status, 200);
    assert.equal((await post(ids[0], false)).status, 403);
    assert.equal((await post("invalid")).status, 400);
    const today = await db.query(
      "SELECT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date::text AS day",
    );
    assert.equal(results[0].day, today.rows[0].day);
    const rows = await db.query(
      "SELECT count(*)::int AS n FROM site_visits WHERE visitor_hash=ANY($1)",
      [hashes],
    );
    assert.equal(rows.rows[0].n, 2);
    // A return on another day is a new daily visit, but remains the same overall browser.
    await db.query(
      "INSERT INTO site_visits(visit_day,visitor_hash) VALUES((now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date-1,$1)",
      [hashes[0]],
    );
    const counts = await db.query(
      "SELECT count(*)::int AS days,count(DISTINCT visitor_hash)::int AS browsers FROM site_visits WHERE visitor_hash=ANY($1)",
      [hashes],
    );
    assert.deepEqual(counts.rows[0], { days: 3, browsers: 2 });
    const report = await fetch(origin + "/api/admin/insights?view=analytics");
    assert.equal(report.status, 403);
    assert.equal(report.headers.get("cache-control"), "no-store");
  } finally {
    await db.query("DELETE FROM site_visits WHERE visitor_hash=ANY($1)", [
      hashes,
    ]);
    await db.end();
  }
});
