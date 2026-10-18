import "server-only";
import { db } from "./db";
export async function published(kind?: string) {
  const { rows } = await db.query(
    "SELECT id,kind,title,description,body,category,image_url,external_url,event_date,location,published FROM content WHERE published=true" +
      (kind ? " AND kind=$1" : "") +
      " ORDER BY event_date ASC NULLS LAST,created_at DESC",
    kind ? [kind] : [],
  );
  return rows;
}
export async function statistics() {
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM users WHERE role='member' AND status='approved') AS members,(SELECT count(*) FROM content WHERE kind='event' AND published AND event_date<now()) AS events,(SELECT count(*) FROM content WHERE kind='event' AND published AND event_date<now() AND lower(category)='workshop') AS workshops,(SELECT count(*) FROM content WHERE kind='event' AND published AND event_date<now() AND lower(category)='ctf') AS ctfs,(SELECT count(*) FROM attendance WHERE attended=true) AS attendance`,
  );
  const totals = Object.fromEntries(
    Object.entries(rows[0]).map(([k, v]) => [k, Number(v)]),
  );
  const historical = await db.query(
    "SELECT metric,value,lower_bound FROM reported_totals",
  );
  for (const row of historical.rows) {
    totals[row.metric] = Math.max(totals[row.metric] ?? 0, row.value);
    totals[row.metric + "LowerBound"] = row.lower_bound ? 1 : 0;
  }
  return totals;
}
