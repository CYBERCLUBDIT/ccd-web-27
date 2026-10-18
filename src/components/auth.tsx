"use client";
import { Github } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./shared";
import { ApplicationSent, MembershipOnboarding } from "./membership-onboarding";
import styles from "./auth-flow.module.css";
import { EmailVerification } from "./email-verification";
async function accountRequest(data: Record<string, unknown>) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
export function AuthPage({
  page,
  managedAuth = false,
  githubEnabled = false,
}: {
  page: string;
  managedAuth?: boolean;
  githubEnabled?: boolean;
}) {
  return (
    <div
      className={`auth-page ${styles.authLayout}${page === "join" && !managedAuth ? " registration-page" : ""}`}
      data-managed-auth={managedAuth}
    >
      <aside className={`auth-brand ${styles.brandCanvas}`}>
        <img
          className="auth-panel-photo"
          src="/illustrations/security-grid.svg"
          alt=""
          width={1600}
          height={1067}
        />
        <div className="auth-onboarding">
          <Logo dark />
          <div className="auth-brand-copy">
            <h2>
              A safer future.
              <br />
              Starts with <em>you.</em>
            </h2>
            <p>A few small steps. A whole community to grow with.</p>
          </div>
        </div>
      </aside>
      <main id="main" className="auth-main">
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>
        <Link href="/" className="auth-back">
          ← Back to website
        </Link>
        <div className="auth-content">
          <Suspense fallback={<p>Loading…</p>}>
            <AccountForm
              page={page}
              managedAuth={managedAuth}
              githubEnabled={githubEnabled}
            />
          </Suspense>
        </div>
        <div className="auth-foot">
          <Link href="/privacy">Privacy information</Link>
          <Link href="/admin/sign-in">Administrator sign in</Link>
        </div>
      </main>
    </div>
  );
}
function AccountForm({
  page,
  managedAuth,
  githubEnabled,
}: {
  page: string;
  managedAuth: boolean;
  githubEnabled: boolean;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [error, setError] = useState(
      params.get("error") === "confirmation_failed"
        ? "The sign-in or confirmation link expired or could not be verified. Please try again."
        : "",
    ),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const joining = page === "join",
    reset = page === "reset-password",
    profile = page === "complete-profile",
    forgot = page === "forgot-password",
    resend = page === "verify-email";
  if (resend && managedAuth)
    return <EmailVerification initialEmail={params.get("email") ?? ""} />;
  if (profile) return <MembershipOnboarding />;
  if (page === "membership-rejected")
    return (
      <>
        <h1>Application not approved.</h1>
        <p className="auth-description">
          Please contact the club if you need help.
        </p>
        <Link href="/contact">Contact the club</Link>
      </>
    );
  if (page === "membership-status") return <ApplicationSent />;
  if (joining && done)
    return (
      <>
        <h1>
          {joining && managedAuth
            ? "Check your email."
            : "Application received."}
        </h1>
        <p className="auth-description">
          {joining && managedAuth
            ? "Enter the code from your email. Then finish your application."
            : "An administrator will review your registration. Your club workspace becomes available once your membership is approved."}
        </p>
        <Button asChild>
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
        {managedAuth && (
          <p>
            <Link href="/verify-email">Enter email code</Link>
          </p>
        )}
      </>
    );
  if (forgot && !managedAuth)
    return (
      <>
        <h1>Account recovery</h1>
        <p className="auth-description">
          Contact the club administrator for a password reset link. Automated
          recovery emails are not configured yet.
        </p>
        <Link href="/contact">Contact the club</Link>
      </>
    );
  if (reset && done)
    return (
      <>
        <h1>Password saved.</h1>
        <p>Your password has been updated.</p>
        <Link href="/sign-in">Sign in</Link>
      </>
    );
  if ((forgot || resend) && done)
    return (
      <>
        <h1>Check your email.</h1>
        <p>
          If your account is eligible, an email will arrive shortly. Check your
          spam folder too.
        </p>
        <Link href="/sign-in">Return to sign in</Link>
      </>
    );
  return (
    <>
      <h1>
        {profile
          ? "Complete your membership."
          : forgot
            ? "Reset your password."
            : resend
              ? "Confirm your email."
              : joining
                ? "Join Cyber Club DIT."
                : reset
                  ? "Set your password."
                  : page === "admin-sign-in"
                    ? "Administrator sign in."
                    : "Good to see you."}
      </h1>
      <p className="auth-description">
        {profile
          ? "Add your student details so the club can review your application."
          : forgot
            ? "Enter your account email to receive a password reset link."
            : resend
              ? "Enter your account email to request a new confirmation link."
              : joining
                ? managedAuth
                  ? "Create your account to get started."
                  : "Register your student details for admin approval."
                : reset
                  ? "Choose a unique password of at least 12 characters."
                  : page === "admin-sign-in"
                    ? "Use the verified email linked to your administrator account."
                    : "Sign in to your club account."}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <form
        className={`form-stack${joining && !managedAuth ? " registration-fields" : ""}`}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fields = Object.fromEntries(new FormData(e.currentTarget));
          if (
            fields.confirmPassword !== undefined &&
            fields.password !== fields.confirmPassword
          ) {
            setError("Passwords do not match.");
            setBusy(false);
            return;
          }
          try {
            const result = await accountRequest({
              ...fields,
              action: profile
                ? "complete_profile"
                : forgot
                  ? "forgot"
                  : resend
                    ? "resend"
                    : joining
                      ? "register"
                      : reset
                        ? "reset"
                        : "login",
              token: params.get("token"),
            });
            if (joining && managedAuth)
              router.push(
                "/verify-email?email=" +
                  encodeURIComponent(String(fields.email)),
              );
            else if (joining || reset || forgot || resend) setDone(true);
            else {
              router.push(result.destination);
              router.refresh();
            }
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {joining && !managedAuth && (
          <>
            <FormField id="name" label="Full Name" autoComplete="name" />
            <FormField id="registrationNumber" label="Registration Number" />
            <FormField
              id="phone"
              label="Phone number / WhatsApp"
              type="tel"
              autoComplete="tel"
            />
            <FormField id="course" label="Course" placeholder="e.g. od24coe" />
          </>
        )}
        {!reset && !profile && (
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
          />
        )}
        {!profile && !forgot && !resend && (
          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete={
              joining || reset ? "new-password" : "current-password"
            }
            minLength={12}
          />
        )}
        {(joining || reset) && (
          <FormField
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            minLength={12}
          />
        )}
        <Button type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : profile
              ? "Submit student details"
              : forgot
                ? "Send recovery email"
                : resend
                  ? "Resend confirmation"
                  : joining
                    ? managedAuth
                      ? "Create account"
                      : "Submit registration"
                    : reset
                      ? "Save password"
                      : "Sign in"}
        </Button>
      </form>
      {managedAuth &&
        (joining || ["sign-in", "admin-sign-in"].includes(page)) && (
          <div className={styles.providers}>
            <p className={styles.divider}>or</p>
            {(["google", "github"] as const).map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                disabled={busy || (provider === "github" && !githubEnabled)}
                title={
                  provider === "github" && !githubEnabled
                    ? "GitHub sign-in is coming soon"
                    : undefined
                }
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const response = await fetch("/auth/provider", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ provider }),
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    window.location.assign(result.url);
                  } catch (err) {
                    setError((err as Error).message);
                    setBusy(false);
                  }
                }}
              >
                {provider === "github" ? (
                  <Github size={18} aria-hidden="true" />
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.3 2.9-7.6ZM12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22ZM6.4 14a6 6 0 0 1 0-4V7.3H3a10 10 0 0 0 0 9.4L6.4 14ZM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.3L6.4 10c.8-2.3 3-4.1 5.6-4.1Z"
                    />
                  </svg>
                )}
                Continue with {provider === "google" ? "Google" : "GitHub"}
                {provider === "github" && !githubEnabled && (
                  <small>Coming soon</small>
                )}
              </Button>
            ))}
          </div>
        )}
      {!reset && !profile && !forgot && !resend && (
        <p className="auth-switch">
          {joining ? "Already registered?" : "New to the club?"}{" "}
          <Link href={joining ? "/sign-in" : "/join"}>
            {joining ? "Sign in" : "Register"}
          </Link>
        </p>
      )}
      {["sign-in", "admin-sign-in"].includes(page) && (
        <>
          <Link href="/forgot-password">Forgot password?</Link>
          {managedAuth && (
            <p>
              <Link href="/verify-email">Enter email code</Link>
            </p>
          )}
        </>
      )}
    </>
  );
}
function FormField({
  id,
  label,
  type = "text",
  autoComplete,
  minLength,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={type === "password" ? 128 : 200}
      />
    </div>
  );
}
