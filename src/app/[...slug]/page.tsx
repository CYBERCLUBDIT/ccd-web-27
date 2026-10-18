import { notFound, redirect, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { PublicPage } from "@/components/public-pages";
import { AuthPage } from "@/components/auth";
import { Workspace } from "@/components/workspace";
import { currentUser } from "@/lib/server/auth";
import { published } from "@/lib/server/content";
import { type ClubContent } from "@/lib/models";
import { supabaseAuthEnabled } from "@/lib/server/supabase";
type Props = { params: Promise<{ slug: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug[0].replaceAll("-", " "),
    robots: ["member", "admin", "leader", "reset-password"].includes(slug[0])
      ? { index: false, follow: false }
      : undefined,
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [first, second] = slug;
  if (first === "admin" && second === "sign-in" && slug.length === 2) {
    const user = await currentUser();
    if (user?.role === "admin" && user.status === "approved")
      redirect("/admin");
    return (
      <AuthPage
        page="admin-sign-in"
        managedAuth={supabaseAuthEnabled()}
        githubEnabled={process.env.SUPABASE_GITHUB_ENABLED === "true"}
      />
    );
  }
  if (["activities", "resources"].includes(first) && slug.length === 1)
    permanentRedirect("/learning");
  if (first === "complete-profile" && slug.length === 1) {
    const user = await currentUser();
    if (!user || !supabaseAuthEnabled()) redirect("/sign-in");
    if (user.onboarding_completed_at || user.role === "admin")
      redirect("/membership-status");
    return <AuthPage page="complete-profile" managedAuth />;
  }
  if (
    first === "membership-status" &&
    slug.length === 1 &&
    supabaseAuthEnabled()
  ) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");
    if (!user.onboarding_completed_at && user.role !== "admin")
      redirect("/complete-profile");
    if (user.status === "rejected")
      return <AuthPage page="membership-rejected" managedAuth />;
    if (user.status === "approved")
      redirect(user.role === "admin" ? "/admin" : "/member");
  }
  if (first === "application-sent" && slug.length === 1) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");
    if (!user.onboarding_completed_at) redirect("/complete-profile");
    if (user.status !== "approved") redirect("/membership-status");
    return <AuthPage page="application-approved" managedAuth />;
  }
  if (["member", "admin", "leader"].includes(first)) {
    const user = await currentUser();
    if (!user) redirect(first === "admin" ? "/admin/sign-in" : "/sign-in");
    if (
      supabaseAuthEnabled() &&
      user.role !== "admin" &&
      !user.onboarding_completed_at
    )
      redirect("/complete-profile");
    if (user.status !== "approved") redirect("/membership-status");
    const admin = first !== "member";
    if (
      slug.length > 2 ||
      (second &&
        (!admin ||
          ![
            "analytics",
            "audit",
            "members",
            "content",
            "attendance",
            "messages",
          ].includes(second)))
    )
      notFound();
    if (admin && user.role !== "admin") redirect("/member");
    return (
      <Workspace
        user={user}
        content={(await published()) as ClubContent[]}
        admin={admin}
        initialTab={second ?? "overview"}
      />
    );
  }
  if (
    [
      "sign-in",
      "join",
      "membership-status",
      "verify-email",
      "forgot-password",
      "reset-password",
    ].includes(first) &&
    slug.length === 1
  )
    return (
      <AuthPage
        page={first}
        managedAuth={supabaseAuthEnabled()}
        githubEnabled={process.env.SUPABASE_GITHUB_ENABLED === "true"}
      />
    );
  if (
    [
      "about",
      "learning",
      "gallery",
      "contact",
      "privacy",
      "news",
      "events",
    ].includes(first) &&
    slug.length <= 2
  ) {
    if (second) {
      if (!["news", "events"].includes(first)) notFound();
      const items = await published();
      if (
        !items.some(
          (c) =>
            c.id === second &&
            c.kind === (first === "events" ? "event" : "news"),
        )
      )
        notFound();
    }
    return <PublicPage page={first} id={second} />;
  }
  notFound();
}
