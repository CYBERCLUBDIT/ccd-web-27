import { requestJson } from "@/lib/server/request";
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
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin" || user.status !== "approved")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const members = await db.query(
    "SELECT id,name,email,registration_number,phone,course,status,created_at FROM users WHERE role='member' AND (NOT $1::boolean OR onboarding_completed_at IS NOT NULL) ORDER BY created_at DESC",
    [supabaseAuthEnabled()],
  );
  const content = await db.query(
    "SELECT * FROM content ORDER BY created_at DESC",
  );
  const messages = await db.query(
    "SELECT * FROM messages ORDER BY created_at DESC",
  );
  const attendance = await db.query(
    "SELECT a.*,u.name,u.email,c.title FROM attendance a JOIN users u ON u.id=a.user_id JOIN content c ON c.id=a.event_id ORDER BY a.created_at DESC",
  );
  return NextResponse.json(
    {
      members: members.rows,
      content: content.rows,
      messages: messages.rows,
      attendance: attendance.rows,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
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
      for (const url of [body.image_url, body.external_url]) {
        if (
          url &&
          (!String(url).startsWith("https://") || String(url).length > 2000)
        )
          throw new Error("Use a valid HTTPS URL.");
        if (url) new URL(String(url));
      }
      if (
        kind === "event" &&
        (!body.event_date ||
          !Number.isFinite(Date.parse(String(body.event_date))))
      )
        throw new Error("Choose a valid event date.");
      await auditedChange(
        "INSERT INTO content(kind,title,description,body,category,image_url,external_url,event_date,location,published,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
        [
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
          user.id,
        ],
        user.id,
        "content.create",
      );
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
