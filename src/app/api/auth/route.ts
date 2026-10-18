import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  checkOrigin,
  currentUser,
  startSession,
  endSession,
  hashPassword,
  verifyPassword,
  digest,
  rateLimit,
} from "@/lib/server/auth";
import { headers, cookies } from "next/headers";
import { supabaseAuthEnabled } from "@/lib/server/supabase";
import { supabaseAccount } from "@/lib/server/supabase-account";
export async function GET() {
  return NextResponse.json(
    { user: await currentUser() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    await checkOrigin();
    const body = await request.json();
    const action = body.action;
    if (action === "logout") {
      await endSession();
      return NextResponse.json({ ok: true });
    }
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
    const rateIdentity =
      action === "complete_profile"
        ? ((await currentUser())?.id ?? ip)
        : action === "reset"
          ? digest(
              String(
                body.token ??
                  (await cookies()).get("ccd_recovery")?.value ??
                  "",
              ),
            )
          : email;
    if (
      !(await rateLimit(`${action}:${ip}`, 30)) ||
      !(await rateLimit(`${action}:${rateIdentity}`, 10))
    )
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    if (supabaseAuthEnabled()) return await supabaseAccount(body);
    if (action === "reset") {
      if (password.length < 12 || password.length > 128)
        throw new Error("Use a password of 12–128 characters.");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          "DELETE FROM password_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id",
          [digest(String(body.token ?? ""))],
        );
        if (!rows.length)
          throw new Error("This setup link is invalid or expired.");
        await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
          await hashPassword(password),
          rows[0].user_id,
        ]);
        await client.query("DELETE FROM sessions WHERE user_id=$1", [
          rows[0].user_id,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return NextResponse.json({ ok: true });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new Error("Enter a valid email address.");
    if (password.length < 12 || password.length > 128)
      throw new Error("Use a password of 12–128 characters.");
    if (action === "register") {
      const name = String(body.name ?? "").trim(),
        registration = String(body.registrationNumber ?? "").trim(),
        phone = String(body.phone ?? "").trim(),
        course = String(body.course ?? "").trim();
      if (
        name.length < 2 ||
        name.length > 120 ||
        registration.length < 3 ||
        registration.length > 80 ||
        !/^\+?[\d\s()-]{9,25}$/.test(phone) ||
        course.length < 2 ||
        course.length > 80
      )
        throw new Error(
          "Please complete all student details with valid values.",
        );
      try {
        await db.query(
          "INSERT INTO users(name,email,registration_number,phone,course,password_hash) VALUES($1,$2,$3,$4,$5,$6)",
          [
            name,
            email,
            registration.toUpperCase(),
            phone,
            course,
            await hashPassword(password),
          ],
        );
      } catch (error) {
        if ((error as { code: string }).code === "23505")
          return NextResponse.json(
            {
              error:
                "An account with this email or registration number already exists.",
            },
            { status: 409 },
          );
        throw error;
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    if (action === "login") {
      const { rows } = await db.query("SELECT * FROM users WHERE email=$1", [
        email,
      ]);
      const user = rows[0];
      const fallback =
        "95b9c30dd47fb0bdd9c70b7f795b62aa:140d3882d561a6b0334c8231a997ad6f828b0f3ce797efab9886cf06cf9b690c84f0676d93d18a7c5cf06e8073beca626eb19a5ee90e26be7e1da7b2da2ec4f3";
      const valid = await verifyPassword(
        password,
        user?.password_hash ?? fallback,
      );
      if (!user || !valid)
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      if (user.status !== "approved")
        return NextResponse.json(
          {
            error:
              user.status === "pending"
                ? "Your application is awaiting administrator approval."
                : "Your membership application has not been approved.",
          },
          { status: 403 },
        );
      await startSession(user.id);
      return NextResponse.json({
        ok: true,
        destination: user.role === "admin" ? "/admin" : "/member",
      });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error(
      "Account request failed:",
      (error as { code?: string }).code ?? "validation",
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error && !("code" in error)
            ? error.message
            : "Unable to complete this request. Please try again.",
      },
      { status: 400 },
    );
  }
}
