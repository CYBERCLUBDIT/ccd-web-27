import "server-only";
import { createClient, type User, type Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { db } from "./db";

export const supabaseAuthEnabled = () =>
  process.env.SUPABASE_AUTH_ENABLED === "true";

export async function saveRecoverySession(session: Session, userId: string) {
  const nonce = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO password_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')",
    [createHash("sha256").update(nonce).digest("hex"), userId],
  );
  (await cookies()).set(
    "ccd_recovery",
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      nonce,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_ORIGIN?.startsWith("https://"),
      path: "/",
      maxAge: 600,
    },
  );
}

// Supabase verifies identity; club access uses revocable opaque sessions.
// Only the temporary PKCE verifier persists across Supabase requests.
export async function identityClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Account services are not configured yet.");
  const jar = await cookies();
  const memory = new Map<string, string>();
  return createClient(url, key, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem: (key) =>
          key.endsWith("-code-verifier")
            ? (jar.get(`ccd-${key}`)?.value ?? null)
            : (memory.get(key) ?? null),
        setItem: (key, value) => {
          if (key.endsWith("-code-verifier")) {
            jar.set(`ccd-${key}`, value, {
              httpOnly: true,
              sameSite: "lax",
              path: "/auth",
              secure: process.env.APP_ORIGIN?.startsWith("https://"),
              maxAge: 600,
            });
          } else memory.set(key, value);
        },
        removeItem: (key) => {
          if (key.endsWith("-code-verifier"))
            jar.delete({ name: `ccd-${key}`, path: "/auth" });
          else memory.delete(key);
        },
      },
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: init?.signal ?? AbortSignal.timeout(15000),
        }),
    },
  });
}

export function studentDetails(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const registration = String(body.registrationNumber ?? "")
    .trim()
    .toUpperCase();
  const phone = String(body.phone ?? "").trim();
  const course = String(body.course ?? "").trim();
  if (
    name.length < 2 ||
    name.length > 120 ||
    registration.length < 3 ||
    registration.length > 80 ||
    !/^\+?[\d\s()-]{9,25}$/.test(phone) ||
    course.length < 2 ||
    course.length > 80
  ) {
    throw new Error("Please complete all student details with valid values.");
  }
  return { name, registration, phone, course };
}

export async function verifiedClubUser(identity: User) {
  if (!identity.email || !identity.email_confirmed_at) {
    throw new Error("Confirm your email address before signing in.");
  }
  const email = identity.email.toLowerCase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // Metadata never supplies roles or approval. Link only a verified email.
    let { rows } = await client.query(
      "SELECT * FROM users WHERE supabase_user_id=$1 OR email=$2 FOR UPDATE",
      [identity.id, email],
    );
    if (
      rows.length > 1 ||
      (rows[0]?.supabase_user_id && rows[0].supabase_user_id !== identity.id)
    ) {
      throw new Error(
        "This email is already linked to a different account. Contact the club.",
      );
    }
    if (rows.length) {
      ({ rows } = await client.query(
        "UPDATE users SET supabase_user_id=$1 WHERE id=$2 RETURNING *",
        [identity.id, rows[0].id],
      ));
    } else {
      const name = String(
        identity.user_metadata?.name ??
          identity.user_metadata?.full_name ??
          email,
      ).slice(0, 120);
      ({ rows } = await client.query(
        "INSERT INTO users(name,email,supabase_user_id) VALUES($1,$2,$3) RETURNING *",
        [name, email, identity.id],
      ));
    }
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function memberDestination(user: {
  role: string;
  status: string;
  registration_number?: string | null;
}) {
  if (user.role !== "admin" && !user.registration_number)
    return "/complete-profile";
  if (user.status !== "approved") return "/membership-status";
  return user.role === "admin" ? "/admin" : "/member";
}
