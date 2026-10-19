"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { LoadingFeedback } from "./loading-feedback";
import { contentTypes, saveContent } from "@/lib/content-management";
import { type ClubContent, formatDate } from "@/lib/models";
import styles from "./admin-content.module.css";
export function ContentEditor({
  id,
  onClose,
  onSaved,
}: {
  id?: string | null;
  onClose: () => void;
  onSaved: (published: boolean) => void;
}) {
  const [kind, setKind] = useState("event"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [initial, setInitial] = useState<ClubContent | null>(null);
  const [loading, setLoading] = useState(!!id);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch("/api/admin?view=content&id=" + encodeURIComponent(id), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setInitial(d.item);
        setKind(d.item.kind);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const published =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "publish";
    try {
      await saveContent({
        ...data,
        body: data.body ?? initial?.body ?? "",
        external_url: data.external_url ?? initial?.external_url ?? "",
        action: "content",
        ...(id ? { id } : {}),
        published,
        event_date:
          kind === "event" && data.event_date
            ? new Date(String(data.event_date) + ":00+03:00").toISOString()
            : undefined,
      });
      onSaved(published);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className={styles.dialog} showCloseButton={!busy}>
        <DialogTitle>{id ? "Edit content" : "Create content"}</DialogTitle>
        <DialogDescription>
          Start with the essentials. Save a draft or publish to your club.
        </DialogDescription>
        {loading ? (
          <LoadingFeedback compact label="Loading editor" />
        ) : id && !initial ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : (
          <form onSubmit={submit}>
            <section className={styles.formSection}>
              <Label htmlFor="content-kind">What are you creating?</Label>
              <select
                id="content-kind"
                name="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {Object.entries(contentTypes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </section>
            <section className={styles.formSection}>
              <h3>The essentials</h3>
              <div className={styles.field}>
                <Label htmlFor="content-title">
                  {["leader", "testimonial"].includes(kind) ? "Name" : "Title"}{" "}
                  <span>Required</span>
                </Label>
                <Input
                  id="content-title"
                  name="title"
                  defaultValue={initial?.title ?? ""}
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder={
                    kind === "event"
                      ? "e.g. Introduction to network security"
                      : "Give it a clear, short title"
                  }
                />
              </div>
              <div className={styles.field}>
                <Label htmlFor="content-description">Short description</Label>
                <Textarea
                  id="content-description"
                  name="description"
                  defaultValue={initial?.description ?? ""}
                  maxLength={2000}
                  rows={2}
                  placeholder="A quick summary people can scan."
                />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <Label htmlFor="content-category">
                    {kind === "leader" ? "Role" : "Category"}
                  </Label>
                  <Input
                    id="content-category"
                    name="category"
                    defaultValue={initial?.category ?? ""}
                    maxLength={100}
                    placeholder={
                      kind === "event"
                        ? "Workshop, CTF, or meetup"
                        : "A short topic or label"
                    }
                  />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="content-image">
                    Image URL <span>Optional</span>
                  </Label>
                  <Input
                    id="content-image"
                    name="image_url"
                    defaultValue={initial?.image_url ?? ""}
                    type="text"
                    inputMode="url"
                    maxLength={2000}
                    placeholder="https://…"
                  />
                </div>
              </div>
            </section>
            {kind === "event" && (
              <section className={styles.formSection}>
                <h3>Event details</h3>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <Label htmlFor="content-date">
                      Date and time <span>Required · EAT</span>
                    </Label>
                    <Input
                      id="content-date"
                      name="event_date"
                      defaultValue={
                        initial?.event_date
                          ? new Date(
                              new Date(initial.event_date).getTime() +
                                3 * 3600000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      type="datetime-local"
                      required
                    />
                    <small>East Africa Time (UTC+3)</small>
                  </div>
                  <div className={styles.field}>
                    <Label htmlFor="content-location">Location</Label>
                    <Input
                      id="content-location"
                      name="location"
                      defaultValue={initial?.location ?? ""}
                      maxLength={200}
                      placeholder="Venue or online meeting"
                    />
                  </div>
                </div>
              </section>
            )}
            {kind !== "gallery" && (
              <details
                className={`${styles.formSection} ${styles.optional}`}
                open={kind === "news"}
              >
                <summary>
                  {kind === "news" ? "Story and links" : "More details"}{" "}
                  <span>Optional</span>
                </summary>
                <div className={styles.field}>
                  <Label htmlFor="content-body">
                    {kind === "news" ? "Story" : "Full description"}
                  </Label>
                  <Textarea
                    id="content-body"
                    name="body"
                    defaultValue={initial?.body ?? ""}
                    maxLength={20000}
                    rows={4}
                    placeholder="Add context, details, or useful instructions."
                  />
                </div>
                {!["leader", "testimonial"].includes(kind) && (
                  <div className={styles.field}>
                    <Label htmlFor="content-link">
                      {kind === "resource"
                        ? "Learning material link"
                        : kind === "challenge"
                          ? "Challenge link"
                          : "Related link"}
                    </Label>
                    <Input
                      id="content-link"
                      name="external_url"
                      defaultValue={initial?.external_url ?? ""}
                      type="url"
                      pattern="https://.*"
                      maxLength={2000}
                      placeholder="https://…"
                    />
                  </div>
                )}
              </details>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <footer className={styles.editorFooter}>
              <p>
                Drafts stay private. Published content appears on the website.
              </p>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="draft"
                  variant="outline"
                  disabled={busy}
                >
                  Save draft
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="publish"
                  disabled={busy}
                >
                  {busy
                    ? "Saving…"
                    : id
                      ? "Publish changes"
                      : "Publish content"}
                </Button>
              </div>
            </footer>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function ContentPreview({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [item, setItem] = useState<ClubContent | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin?view=content&id=" + encodeURIComponent(id), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setItem(d.item);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={styles.dialog}>
        <DialogTitle>{item?.title ?? "Content preview"}</DialogTitle>
        <DialogDescription>
          {item
            ? `${contentTypes[item.kind]} · ${item.published ? "Published" : "Draft"}`
            : "Review your content before sharing it."}
        </DialogDescription>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : !item ? (
          <LoadingFeedback compact label="Loading preview" />
        ) : (
          <article className={styles.preview}>
            {item.image_url && (
              <img src={item.image_url} alt="" width={700} height={260} />
            )}
            <p>{item.description}</p>
            {item.event_date && (
              <p>
                {formatDate(item.event_date)} · {item.location}
              </p>
            )}
            {item.body && <div>{item.body}</div>}
            {item.external_url && (
              <a href={item.external_url} target="_blank" rel="noreferrer">
                Open related link ↗
              </a>
            )}
          </article>
        )}
      </DialogContent>
    </Dialog>
  );
}
