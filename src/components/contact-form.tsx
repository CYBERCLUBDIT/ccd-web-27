"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
export function ContactForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  return sent ? (
    <p role="status" className="student-dashboard-card">
      Your message has been sent to the club administrator.
    </p>
  ) : (
    <form
      className="form-stack contact-form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/club", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "contact",
              ...Object.fromEntries(new FormData(e.currentTarget)),
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setSent(true);
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Contact the club</h2>
      <Label htmlFor="contact-name">Name</Label>
      <Input id="contact-name" name="name" required maxLength={120} />
      <Label htmlFor="contact-email">Email</Label>
      <Input id="contact-email" name="email" type="email" required />
      <Label htmlFor="contact-message">Message</Label>
      <Textarea
        id="contact-message"
        name="message"
        required
        minLength={10}
        maxLength={5000}
      />
      {message && <p role="alert">{message}</p>}
      <Button disabled={busy}>{busy ? "Sending…" : "Send message"}</Button>
    </form>
  );
}
