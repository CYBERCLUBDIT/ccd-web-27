"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./shared";
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
export function AuthPage({ page }: { page: string }) {
  return (
    <div className={`auth-page${page === "join" ? " registration-page" : ""}`}>
      <aside className="auth-brand auth-brand-atmospheric">
        <img
          className="auth-panel-photo"
          src="/images/security.jpg"
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
            <AccountForm page={page} />
          </Suspense>
        </div>
        <div className="auth-foot">
          <Link href="/privacy">Privacy information</Link>
        </div>
      </main>
    </div>
  );
}
function AccountForm({ page }: { page: string }) {
  const router = useRouter(),
    params = useSearchParams();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const joining = page === "join",
    reset = page === "reset-password";
  if (
    page === "membership-status" ||
    page === "verify-email" ||
    (joining && done)
  )
    return (
      <>
        <h1>Application received.</h1>
        <p className="auth-description">
          An administrator will review your registration. You can sign in once
          your membership is approved.
        </p>
        <Button asChild>
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </>
    );
  if (page === "forgot-password")
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
  return (
    <>
      <h1>
        {joining
          ? "Join Cyber Club DIT."
          : reset
            ? "Set your password."
            : "Good to see you."}
      </h1>
      <p className="auth-description">
        {joining
          ? "Register your student details for admin approval."
          : reset
            ? "Choose a unique password of at least 12 characters."
            : "Sign in to your club account."}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <form
        className={`form-stack${joining ? " registration-fields" : ""}`}
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
              action: joining ? "register" : reset ? "reset" : "login",
              token: params.get("token"),
            });
            if (joining || reset) setDone(true);
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
        {joining && (
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
        {!reset && (
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
          />
        )}
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete={joining || reset ? "new-password" : "current-password"}
          minLength={12}
        />
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
            : joining
              ? "Submit registration"
              : reset
                ? "Save password"
                : "Sign in"}
        </Button>
      </form>
      {!reset && (
        <p className="auth-switch">
          {joining ? "Already registered?" : "New to the club?"}{" "}
          <Link href={joining ? "/sign-in" : "/join"}>
            {joining ? "Sign in" : "Register"}
          </Link>
        </p>
      )}
      {!joining && !reset && (
        <Link href="/forgot-password">Forgot password?</Link>
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
