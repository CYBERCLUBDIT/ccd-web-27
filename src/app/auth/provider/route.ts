import { NextResponse } from "next/server";
import { checkOrigin, rateLimit } from "@/lib/server/auth";
import { identityClient, supabaseAuthEnabled } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    await checkOrigin();
    if (!supabaseAuthEnabled())
      return NextResponse.json(
        { error: "Social sign-in is not enabled yet." },
        { status: 503 },
      );
    const { provider } = await request.json();
    if (provider !== "google" && provider !== "github")
      return NextResponse.json(
        { error: "Unsupported provider." },
        { status: 400 },
      );
    if (
      !(await rateLimit(
        "oauth:" + request.headers.get("x-forwarded-for")?.split(",")[0],
        30,
      ))
    ) {
      return NextResponse.json(
        { error: "Please try again later." },
        { status: 429 },
      );
    }
    const client = await identityClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: process.env.APP_ORIGIN + "/auth/callback",
        skipBrowserRedirect: true,
        ...(provider === "github" ? { scopes: "read:user user:email" } : {}),
      },
    });
    if (error || !data.url)
      throw new Error("Sign-in is unavailable. Please try again later.");
    return NextResponse.json(
      { url: data.url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to start sign-in. Please try again." },
      { status: 400 },
    );
  }
}
