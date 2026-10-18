import { requestJson } from "@/lib/server/request";
import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { currentUser, checkOrigin, rateLimit } from "@/lib/server/auth";
import { published, statistics } from "@/lib/server/content";
export async function GET() {
  return NextResponse.json(
    { content: await published(), stats: await statistics() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    await checkOrigin();
    const body = await requestJson(request);
    if (body.action === "contact") {
      if (!(await rateLimit("contact", 30)))
        return NextResponse.json(
          { error: "Please try again later." },
          { status: 429 },
        );
      const name = String(body.name ?? "").trim(),
        email = String(body.email ?? "").trim(),
        message = String(body.message ?? "").trim();
      if (
        name.length < 2 ||
        name.length > 120 ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        email.length > 254 ||
        message.length < 10 ||
        message.length > 5000
      )
        throw new Error(
          "Check your name, email, and message (10–5000 characters).",
        );
      await db.query(
        "INSERT INTO messages(name,email,message) VALUES($1,$2,$3)",
        [name, email, message],
      );
      return NextResponse.json({ ok: true });
    }
    const user = await currentUser();
    if (!user || user.status !== "approved")
      return NextResponse.json(
        { error: "Please sign in with an approved account." },
        { status: 401 },
      );
    if (body.action === "book") {
      const { rows } = await db.query(
        "SELECT id FROM content WHERE id=$1 AND kind='event' AND published AND event_date>now()",
        [body.eventId],
      );
      if (!rows.length)
        throw new Error("This event is not open for registration.");
      await db.query(
        "INSERT INTO attendance(event_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [body.eventId, user.id],
      );
      return NextResponse.json({ ok: true });
    }
    throw new Error("Unknown action");
  } catch {
    return NextResponse.json(
      { error: "Unable to save. Check the details and try again." },
      { status: 400 },
    );
  }
}
