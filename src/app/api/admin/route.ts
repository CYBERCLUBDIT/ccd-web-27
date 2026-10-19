import { requestJson } from "@/lib/server/request";
import type { QueryResult } from "pg";
import { NextResponse } from "next/server";
import { supabaseAuthEnabled } from "@/lib/server/supabase";
import { db } from "@/lib/server/db";
import { checkOrigin, currentUser } from "@/lib/server/auth";
async function auditedChange(
  query: string,
  values: unknown[],
  actor: string,
  action: string,
) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(query, values);
    if (!result.rows[0]) throw new Error("Record not found.");
    await client.query(
      "INSERT INTO audit_log(actor_id,action,target_id) VALUES($1,$2,$3)",
      [actor, action, result.rows[0].id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "admin" || user.status !== "approved")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const params = new URL(request.url).searchParams;
  const view = params.get("view") ?? "all";
  const headers = { "Cache-Control": "no-store" };
  const memberSql =
    "SELECT id,name,email,registration_number,phone,course,status,created_at FROM users WHERE role='member' AND (NOT $1::boolean OR onboarding_completed_at IS NOT NULL)";
  const contentFields =
    "id,kind,title,description,category,image_url,external_url,event_date,location,published,created_at";
  if (view === "content") {
    const id = params.get("id");
    if (id) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        )
      )
        return NextResponse.json(
          { error: "Invalid content ID." },
          { status: 400, headers },
        );
      const result = await db.query(
        "SELECT " + contentFields + ",body FROM content WHERE id=$1",
        [id],
      );
      return NextResponse.json(
        result.rows[0]
          ? { item: result.rows[0] }
          : { error: "Content not found." },
        { status: result.rows.length ? 200 : 404, headers },
      );
    }
    const kind = params.get("kind") ?? "all",
      status = params.get("status") ?? "all",
      search = (params.get("search") ?? "").trim();
    const rawPage = params.get("page") ?? "1";
    if (
      !/^[1-9][0-9]{0,4}$/.test(rawPage) ||
      ![
        "all",
        "event",
        "news",
        "resource",
        "gallery",
        "challenge",
        "leader",
        "testimonial",
      ].includes(kind) ||
      !["all", "published", "draft"].includes(status) ||
      search.length > 160
    )
      return NextResponse.json(
        { error: "Invalid content filter." },
        { status: 400, headers },
      );
    const page = Number(rawPage),
      pageSize = 12;
    const where =
      " WHERE ($1='all' OR kind=$1) AND ($2='all' OR published=($2='published')) AND ($3='' OR title ILIKE '%'||$3||'%' OR description ILIKE '%'||$3||'%' OR category ILIKE '%'||$3||'%')";
    const [items, total] = await Promise.all([
      db.query(
        "SELECT " +
          contentFields +
          " FROM content" +
          where +
          " ORDER BY created_at DESC,id DESC LIMIT 12 OFFSET $4",
        [kind, status, search, (page - 1) * pageSize],
      ),
      db.query("SELECT count(*)::int AS total FROM content" + where, [
        kind,
        status,
        search,
      ]),
    ]);
    return NextResponse.json(
      { content: items.rows, total: total.rows[0].total, page, pageSize },
      { headers },
    );
  }
  if (!["all", "overview", "members", "messages", "attendance"].includes(view))
    return NextResponse.json(
      { error: "Unknown admin view." },
      { status: 400, headers },
    );
  const queries: Record<string, () => Promise<QueryResult>> = {
    members: () =>
      db.query(
        memberSql +
          (view === "overview"
            ? " AND status='pending' ORDER BY created_at DESC LIMIT 5"
            : " ORDER BY created_at DESC"),
        [supabaseAuthEnabled()],
      ),
    content: () =>
      db.query(
        view === "overview"
          ? "SELECT " +
              contentFields +
              " FROM content WHERE NOT published ORDER BY created_at DESC LIMIT 3"
          : "SELECT * FROM content ORDER BY created_at DESC",
      ),
    messages: () =>
      db.query(
        "SELECT id,name,email,message,created_at FROM messages ORDER BY created_at DESC" +
          (view === "overview" ? " LIMIT 3" : ""),
      ),
    attendance: () =>
      db.query(
        "SELECT a.*,u.name,u.email,c.title FROM attendance a JOIN users u ON u.id=a.user_id JOIN content c ON c.id=a.event_id ORDER BY a.created_at DESC",
      ),
  };
  const keys =
    view === "all"
      ? ["members", "content", "messages", "attendance"]
      : view === "overview"
        ? ["members", "content", "messages"]
        : [view];
  const data = await Promise.all(
    keys.map(async (key) => [key, (await queries[key]()).rows]),
  );
  return NextResponse.json(Object.fromEntries(data), { headers });
}

export async function POST(request: Request) {
  try {
    await checkOrigin();
    const user = await currentUser();
    if (user?.role !== "admin" || user.status !== "approved")
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    const body = await requestJson(request);
    if (body.action === "approve" || body.action === "reject") {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          "UPDATE users SET status=$1,approved_at=CASE WHEN $1='approved' THEN now() ELSE NULL END WHERE id=$2 AND role='member' AND (NOT $3::boolean OR onboarding_completed_at IS NOT NULL) RETURNING id",
          [
            body.action === "approve" ? "approved" : "rejected",
            body.id,
            supabaseAuthEnabled(),
          ],
        );
        if (!result.rowCount) throw new Error("Member not found.");
        await client.query("DELETE FROM sessions WHERE user_id=$1", [body.id]);
        await client.query(
          "INSERT INTO audit_log(actor_id,action,target_id) VALUES($1,$2,$3)",
          [user.id, body.action, body.id],
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } else if (body.action === "content") {
      const kind = String(body.kind),
        title = String(body.title ?? "").trim(),
        description = String(body.description ?? "").trim(),
        contentBody = String(body.body ?? ""),
        category = String(body.category ?? "").trim();
      if (
        ![
          "event",
          "news",
          "resource",
          "gallery",
          "challenge",
          "leader",
          "testimonial",
        ].includes(kind) ||
        title.length < 3 ||
        title.length > 200 ||
        description.length > 2000 ||
        contentBody.length > 20000
      )
        throw new Error("Check the content fields.");
      for (const [field, url] of [
        ["image_url", body.image_url],
        ["external_url", body.external_url],
      ]) {
        if (!url) continue;
        const value = String(url);
        if (value.length > 2000)
          throw new Error("Use a valid image or HTTPS URL.");
        if (
          field === "image_url" &&
          /^\/images\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif|svg)$/.test(value)
        )
          continue;
        if (!value.startsWith("https://"))
          throw new Error("Use a valid HTTPS URL.");
        new URL(value);
      }
      if (
        kind === "event" &&
        (!body.event_date ||
          !Number.isFinite(Date.parse(String(body.event_date))))
      )
        throw new Error("Choose a valid event date.");
      const values = [
        kind,
        title,
        description,
        contentBody,
        category,
        body.image_url || "",
        body.external_url || "",
        body.event_date || null,
        String(body.location ?? "").slice(0, 200),
        body.published === true,
      ];
      if (body.id !== undefined) {
        if (
          typeof body.id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            body.id,
          )
        )
          throw new Error("Invalid content ID.");
        await auditedChange(
          "UPDATE content SET kind=$1,title=$2,description=$3,body=$4,category=$5,image_url=$6,external_url=$7,event_date=$8,location=$9,published=$10 WHERE id=$11 RETURNING id",
          [...values, body.id],
          user.id,
          "content.update",
        );
      } else {
        await auditedChange(
          "INSERT INTO content(kind,title,description,body,category,image_url,external_url,event_date,location,published,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
          [...values, user.id],
          user.id,
          "content.create",
        );
      }
    } else if (body.action === "publish") {
      await auditedChange(
        "UPDATE content SET published=$1 WHERE id=$2 RETURNING id",
        [body.published === true, body.id],
        user.id,
        body.published === true ? "content.publish" : "content.unpublish",
      );
    } else if (body.action === "attendance") {
      await auditedChange(
        "UPDATE attendance SET attended=$1 WHERE event_id=$2 AND user_id=$3 RETURNING user_id AS id",
        [body.attended === true, body.eventId, body.userId],
        user.id,
        body.attended === true ? "attendance.present" : "attendance.absent",
      );
    } else throw new Error("Unknown action");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && !("code" in error)
            ? error.message
            : "Unable to save this change.",
      },
      { status: 400 },
    );
  }
}
