import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { supabaseAuthEnabled } from "@/lib/server/supabase";
const headers = { "Cache-Control": "no-store" };
const actions = [
  "approve",
  "reject",
  "content.create",
  "content.update",
  "content.publish",
  "content.unpublish",
  "attendance.present",
  "attendance.absent",
];
export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "admin" || user.status !== "approved")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403, headers },
    );
  const params = new URL(request.url).searchParams;
  const view = params.get("view") ?? "analytics";
  if (view === "audit") {
    const cursor = params.get("before") || null;
    const action = params.get("action") ?? "";
    const search = (params.get("search") ?? "").trim();
    if (
      (cursor &&
        (!/^[0-9]{1,19}$/.test(cursor) ||
          BigInt(cursor) > BigInt("9223372036854775807"))) ||
      (action && !actions.includes(action)) ||
      search.length > 160
    )
      return NextResponse.json(
        { error: "Invalid audit filter." },
        { status: 400, headers },
      );
    const result = await db.query(
      `SELECT a.id,a.action,a.target_id,a.created_at,coalesce(actor.name,'Former administrator') AS actor_name,coalesce(target.name,c.title,a.target_id::text,'Unknown record') AS target_label
      FROM audit_log a LEFT JOIN users actor ON actor.id=a.actor_id LEFT JOIN users target ON target.id=a.target_id LEFT JOIN content c ON c.id=a.target_id
      WHERE ($1::bigint IS NULL OR a.id<$1::bigint) AND ($2='' OR a.action=$2) AND ($3='' OR coalesce(actor.name,'') ILIKE '%'||$3||'%' OR coalesce(target.name,c.title,'') ILIKE '%'||$3||'%' OR a.action ILIKE '%'||$3||'%')
      ORDER BY a.id DESC LIMIT 26`,
      [cursor, action, search],
    );
    const items = result.rows.slice(0, 25);
    return NextResponse.json(
      { items, nextCursor: result.rows.length > 25 ? items[24].id : null },
      { headers },
    );
  }
  if (view !== "analytics")
    return NextResponse.json(
      { error: "Unknown report." },
      { status: 400, headers },
    );
  const managed = supabaseAuthEnabled();
  const [membership, months, content, events, attendance] = await Promise.all([
    db.query(
      `SELECT count(*)::int AS total,count(*) FILTER(WHERE status='approved')::int AS approved,count(*) FILTER(WHERE status='pending')::int AS pending,count(*) FILTER(WHERE status='rejected')::int AS rejected FROM users WHERE role='member' AND (NOT $1::boolean OR onboarding_completed_at IS NOT NULL)`,
      [managed],
    ),
    db.query(
      `WITH months AS (SELECT generate_series(date_trunc('month',now() AT TIME ZONE 'Africa/Dar_es_Salaam')-interval '5 months',date_trunc('month',now() AT TIME ZONE 'Africa/Dar_es_Salaam'),interval '1 month') AS month)
      SELECT to_char(m.month,'Mon YYYY') AS label,count(u.id)::int AS applications FROM months m LEFT JOIN users u ON u.role='member' AND (NOT $1::boolean OR u.onboarding_completed_at IS NOT NULL) AND date_trunc('month',coalesce(u.onboarding_completed_at,u.created_at) AT TIME ZONE 'Africa/Dar_es_Salaam')=m.month GROUP BY m.month ORDER BY m.month`,
      [managed],
    ),
    db.query(
      "SELECT kind,count(*) FILTER(WHERE published)::int AS published,count(*) FILTER(WHERE NOT published)::int AS drafts FROM content GROUP BY kind ORDER BY kind",
    ),
    db.query(
      `SELECT c.id,c.title,c.event_date,count(a.user_id)::int AS registrations,count(a.user_id) FILTER(WHERE a.attended)::int AS attended FROM content c LEFT JOIN attendance a ON a.event_id=c.id WHERE c.kind='event' AND c.published GROUP BY c.id ORDER BY c.event_date DESC NULLS LAST,c.created_at DESC LIMIT 10`,
    ),
    db.query(
      "SELECT count(*)::int AS registrations,count(*) FILTER(WHERE attended)::int AS attended FROM attendance",
    ),
  ]);
  return NextResponse.json(
    {
      membership: membership.rows[0],
      months: months.rows,
      content: content.rows,
      events: events.rows,
      attendance: attendance.rows[0],
      generatedAt: new Date().toISOString(),
    },
    { headers },
  );
}
