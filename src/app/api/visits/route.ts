import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/server/db";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== process.env.APP_ORIGIN)
    return NextResponse.json(
      { error: "Invalid origin" },
      { status: 403, headers },
    );
  // A stable random browser ID survives sign-out. It is never an authentication credential.
  const id = request.headers.get("x-visitor-id") ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    return NextResponse.json(
      { error: "Invalid visitor" },
      { status: 400, headers },
    );
  try {
    const hash = createHash("sha256").update(id).digest("hex");
    const result = await db.query(
      `INSERT INTO site_visits(visit_day,visitor_hash)
      VALUES((now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,$1)
      ON CONFLICT DO NOTHING RETURNING visit_day::text`,
      [hash],
    );
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Dar_es_Salaam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return NextResponse.json(
      { day, recorded: result.rowCount === 1 },
      { headers },
    );
  } catch {
    // Tracking failure must never prevent visitors from using the site.
    return NextResponse.json(
      { error: "Tracking unavailable" },
      { status: 503, headers },
    );
  }
}
