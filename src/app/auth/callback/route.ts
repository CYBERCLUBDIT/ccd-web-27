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
    const code = url.searchParams.get("code");
    if (!code) throw new Error("missing code");
    const flowId = url.searchParams.get("sb_flow_id");
    const client = await identityClient();
    const { data, error } = await client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error || !data.user) throw new Error("invalid code");
    const user = await verifiedClubUser(data.user);
    if (
      "redirectType" in data &&
      data.redirectType === "recovery" &&
      data.session
    ) {
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
