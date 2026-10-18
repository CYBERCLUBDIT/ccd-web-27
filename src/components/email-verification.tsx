"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function EmailVerification({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(action: "verify_otp" | "resend") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      if (action === "resend") setMessage("If your account needs verification, a new code will arrive shortly. Check your spam folder too.");
      else { router.push(result.destination); router.refresh(); }
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <h1>Check your email.</h1>
    <p className="auth-description">Enter the code we sent to your email. Then finish your application.</p>
    {error && <p role="alert" className="field-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit("verify_otp"); }}>
      <div className="field"><Label htmlFor="verification-email">Email address</Label>
        <Input id="verification-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setCode(""); }} /></div>
      <div className="field"><Label htmlFor="verification-code">Email code</Label>
        <Input id="verification-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required minLength={6} maxLength={10} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} /></div>
      <Button disabled={busy} type="submit">{busy ? "Please wait…" : "Verify email"}</Button>
      <Button disabled={busy || !email} type="button" variant="outline" onClick={() => void submit("resend")}>Send a new code</Button>
    </form>
  </>;
}
