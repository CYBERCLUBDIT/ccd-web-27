import "server-only";
import {
  randomBytes,
  createHash,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { db } from "./db";
const scrypt = promisify(derive);
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return salt + ":" + key.toString("hex");
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, stored] = hash.split(":");
  if (!salt || !stored) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const target = Buffer.from(stored, "hex");
  return target.length === key.length && timingSafeEqual(target, key);
}
export async function currentUser() {
  const token = (await cookies()).get("ccd_session")?.value;
  if (!token) return null;
  const { rows } = await db.query(
    "SELECT u.id,u.name,u.email,u.registration_number,u.phone,u.course,u.role,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [digest(token)],
  );
  return rows[0] ?? null;
}
export async function startSession(id: string) {
  const token = randomBytes(32).toString("hex");
  await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [
    digest(token),
    id,
  ]);
  (await cookies()).set("ccd_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 604800,
  });
}
export async function endSession() {
  const jar = await cookies();
  const token = jar.get("ccd_session")?.value;
  if (token)
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [digest(token)]);
  jar.delete("ccd_session");
}
export async function checkOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin || origin !== process.env.APP_ORIGIN)
    throw new Error("Invalid request origin");
}
export async function rateLimit(key: string, limit = 10) {
  const result = await db.query(
    "INSERT INTO login_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE login_limits.attempts+1 END,window_start=CASE WHEN login_limits.window_start<now()-interval '15 minutes' THEN now() ELSE login_limits.window_start END RETURNING attempts",
    [key],
  );
  return result.rows[0].attempts <= limit;
}
