import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./db";
import { currentUser, startSession } from "./auth";
import {
  identityClient,
  memberDestination,
  studentDetails,
  verifiedClubUser,
} from "./supabase";

export async function supabaseAccount(body: Record<string, unknown>) {
  const action = body.action;
  if (action === "complete_profile") {
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 },
      );
    const details = studentDetails(body);
    if (user.role === "admin" || user.onboarding_completed_at) {
      return NextResponse.json(
        { error: "Your profile is already complete." },
        { status: 400 },
      );
    }
    await db.query(
      "UPDATE users SET name=$1,registration_number=$2,phone=$3,course=$4,onboarding_completed_at=now() WHERE id=$5 AND onboarding_completed_at IS NULL",
      [
        details.name,
        details.registration,
        details.phone,
        details.course,
        user.id,
      ],
    );
    return NextResponse.json({
      destination:
        user.status === "approved" ? "/application-sent" : "/membership-status",
    });
  }
  const client = await identityClient();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body.password ?? "");
  const origin = process.env.APP_ORIGIN!;
  if (action === "reset") {
    if (password.length < 12 || password.length > 128)
      throw new Error("Use a password of 12–128 characters.");
    const jar = await cookies();
    const raw = jar.get("ccd_recovery")?.value;
    if (!raw) throw new Error("Open the latest password recovery email first.");
    const tokens = JSON.parse(raw);
    const { error: sessionError } = await client.auth.setSession(tokens);
    if (sessionError)
      throw new Error("Your recovery link expired. Request a new one.");
    const {
      data: { user },
      error: identityError,
    } = await client.auth.getUser();
    if (identityError || !user?.email_confirmed_at)
      throw new Error("Your recovery link is invalid.");
    if (typeof tokens.nonce !== "string")
      throw new Error("Request a new recovery email.");
    const consumed = await db.query(
      "DELETE FROM password_tokens p USING users u WHERE p.user_id=u.id AND p.token_hash=$1 AND p.expires_at>now() AND u.supabase_user_id=$2 RETURNING p.user_id",
      [createHash("sha256").update(tokens.nonce).digest("hex"), user.id],
    );
    if (!consumed.rowCount)
      throw new Error("Your recovery link expired or was already used.");
    const { error } = await client.auth.updateUser({ password });
    if (error)
      throw new Error(
        "Unable to update your password. Request a new recovery link.",
      );
    await db.query(
      "DELETE FROM sessions WHERE user_id IN(SELECT id FROM users WHERE supabase_user_id=$1)",
      [user.id],
    );
    await client.auth.signOut({ scope: "global" });
    jar.delete("ccd_recovery");
    jar.delete("ccd_session");
    return NextResponse.json({ ok: true });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error("Enter a valid email address.");
  if (action === "forgot") {
    await client.auth.resetPasswordForEmail(email, {
      redirectTo: origin + "/auth/callback",
    });
    // Do not reveal whether an account exists.
    return NextResponse.json({ ok: true });
  }
  if (action === "resend") {
    await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: origin + "/auth/callback" },
    });
    return NextResponse.json({ ok: true });
  }
  if (action === "verify_otp") {
    const token = String(body.code ?? "").trim();
    if (!/^\d{6,10}$/.test(token))
      throw new Error("Enter the code from your email.");
    const { data, error } = await client.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error || !data.user)
      throw new Error("This code is incorrect or expired. Request a new code.");
    const user = await verifiedClubUser(data.user);
    if (user.status === "rejected")
      return NextResponse.json(
        { error: "Your membership has not been approved." },
        { status: 403 },
      );
    await startSession(user.id);
    return NextResponse.json({
      ok: true,
      destination: memberDestination(user),
    });
  }
  if (password.length < 12 || password.length > 128)
    throw new Error("Use a password of 12–128 characters.");
  if (action === "register") {
    if (body.confirmPassword !== password)
      throw new Error("Passwords do not match.");
    const existing = await db.query(
      "SELECT supabase_user_id FROM users WHERE email=$1",
      [email],
    );
    if (existing.rows.some((row) => row.supabase_user_id)) {
      return NextResponse.json(
        {
          error:
            "Already registered? Sign in, request a new email code, or reset your password.",
        },
        { status: 409 },
      );
    }
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: origin + "/auth/callback",
      },
    });
    if (error || !data.user)
      throw new Error(
        "Unable to send your email code. Please try again or contact the club.",
      );
    // Registration never grants a club session, even if confirmation was
    // accidentally disabled in Supabase. Verified login is a separate step.
    await db.query(
      "INSERT INTO users(name,email,supabase_user_id) VALUES($1,$1,$2) ON CONFLICT(email) DO NOTHING",
      [email, data.user.id],
    );
    return NextResponse.json(
      { ok: true, confirmationRequired: true },
      { status: 201 },
    );
  }
  if (action === "login") {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      const message =
        error?.code === "email_not_confirmed"
          ? "Verify your email first. Enter the code from your email, or request a new one."
          : "Email or password is incorrect.";
      return NextResponse.json({ error: message }, { status: 401 });
    }
    const user = await verifiedClubUser(data.user);
    if (user.status === "rejected")
      return NextResponse.json(
        { error: "Your membership has not been approved." },
        { status: 403 },
      );
    await startSession(user.id);
    return NextResponse.json({
      ok: true,
      destination: memberDestination(user),
    });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
