import { NextResponse } from "next/server";
import { startSession } from "@/lib/server/auth";
import {
  identityClient,
  memberDestination,
  supabaseAuthEnabled,
  saveRecoverySession,
  verifiedClubUser,
} from "@/lib/server/supabase";

export async function GET(request: Request) {
  const origin = process.env.APP_ORIGIN!;
  try {
    if (!supabaseAuthEnabled()) throw new Error("disabled");
    const url = new URL(request.url);
    const token_hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (!token_hash || (type !== "email" && type !== "recovery"))
      throw new Error("invalid token");
    const client = await identityClient();
    const { data, error } = await client.auth.verifyOtp({ token_hash, type });
    if (error || !data.user || !data.session) throw new Error("invalid token");
    const user = await verifiedClubUser(data.user);
    if (type === "recovery") {
      await saveRecoverySession(data.session, user.id);
      return NextResponse.redirect(origin + "/reset-password");
    }
    if (user.status === "rejected") throw new Error("rejected");
    await startSession(user.id);
    return NextResponse.redirect(origin + memberDestination(user));
  } catch {
    return NextResponse.redirect(origin + "/sign-in?error=confirmation_failed");
  }
}
