import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { checkOrigin, currentUser } from "@/lib/server/auth";
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin" || user.status !== "approved")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const members = await db.query(
    "SELECT id,name,email,registration_number,phone,course,status,created_at FROM users WHERE role='member' AND (supabase_user_id IS NULL OR registration_number IS NOT NULL) ORDER BY created_at DESC",
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
    const body = await request.json();
    if (body.action === "approve" || body.action === "reject") {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          "UPDATE users SET status=$1,approved_at=CASE WHEN $1='approved' THEN now() ELSE NULL END WHERE id=$2 AND role='member' AND (supabase_user_id IS NULL OR registration_number IS NOT NULL) RETURNING id",
          [body.action === "approve" ? "approved" : "rejected", body.id],
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
        (!body.event_date || !Number.isFinite(Date.parse(body.event_date)))
      )
        throw new Error("Choose a valid event date.");
      await db.query(
        "INSERT INTO content(kind,title,description,body,category,image_url,external_url,event_date,location,published,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
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
      );
    } else if (body.action === "publish") {
      await db.query("UPDATE content SET published=$1 WHERE id=$2", [
        body.published === true,
        body.id,
      ]);
    } else if (body.action === "attendance") {
      await db.query(
        "UPDATE attendance SET attended=$1 WHERE event_id=$2 AND user_id=$3",
        [body.attended === true, body.eventId, body.userId],
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
