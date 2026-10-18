"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import styles from "./contact-form.module.css";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
export function ContactForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <span className="eyebrow">LET’S START A CONVERSATION</span>
        <h2>
          A question.
          <br />
          An idea.
          <br />
          <em>A connection.</em>
        </h2>
        <p>
          Curious about the club, interested in working together, or just
          finding your way? We’d like to hear from you.
        </p>
        <div className={styles.location}>
          <MapPin size={20} />
          <div>
            <strong>Find our community</strong>
            <span>
              Dar es Salaam Institute of Technology
              <br />
              Dar es Salaam, Tanzania
            </span>
          </div>
        </div>
        <Link href="/join">
          Looking to join? Start here <ArrowUpRight size={17} />
        </Link>
        <div className={styles.faq}>
          <h3>A few quick answers</h3>
          <details>
            <summary>Do I need cybersecurity experience?</summary>
            <p>
              You can start with curiosity. Explore the beginner exercises in
              Learning and learn alongside the club.
            </p>
          </details>
          <details>
            <summary>How does membership work?</summary>
            <p>
              Create an account, complete your student details, and submit your
              application for the club to review.
            </p>
          </details>
        </div>
      </aside>
      <section className={styles.panel}>
        {sent ? (
          <div role="status" className={styles.success}>
            <CheckCircle2 size={48} />
            <span className="eyebrow">MESSAGE RECEIVED</span>
            <h2>Thanks for reaching out.</h2>
            <p>
              Your message is with the club team. Keep an eye on the email
              address you shared for a reply.
            </p>
            <Button variant="outline" onClick={() => setSent(false)}>
              Send another message
            </Button>
          </div>
        ) : (
          <form
            className={styles.form}
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
            <div className={styles.formHeading}>
              <span className={styles.messageIcon}>
                <MessageCircle size={23} />
              </span>
              <h2>Send us a message.</h2>
              <p>Tell us a little about how we can help.</p>
            </div>
            <div className={styles.fields}>
              <div>
                <Label htmlFor="contact-name">Your name</Label>
                <Input
                  id="contact-name"
                  name="name"
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Email address</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </div>
            </div>
            <div className={styles.messageField}>
              <Label htmlFor="contact-message">What’s on your mind?</Label>
              <Textarea
                id="contact-message"
                name="message"
                placeholder="A question, an idea, or something you’d like to share…"
                required
                minLength={10}
                maxLength={5000}
                rows={7}
              />
              <span>
                At least 10 characters. Please don’t include passwords or
                private account details.
              </span>
            </div>
            {message && (
              <p role="alert" className={styles.error}>
                {message}
              </p>
            )}
            <div className={styles.submitRow}>
              <p>
                <ShieldCheck size={15} />
                <span>
                  Your details are used to respond to your message.{" "}
                  <Link href="/privacy">Privacy information</Link>
                </span>
              </p>
              <Button disabled={busy} type="submit">
                {busy ? "Sending…" : "Send message"}
                <ArrowUpRight size={17} />
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
