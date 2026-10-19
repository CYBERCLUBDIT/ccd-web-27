"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Pencil,
  FileText,
  Plus,
  Eye,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { LoadingFeedback } from "./loading-feedback";
import {
  contentTypes,
  saveContent,
  type ContentSummary,
} from "@/lib/content-management";
import styles from "./admin-content.module.css";
const ContentEditor = dynamic(
  () => import("./content-editor").then((m) => m.ContentEditor),
  { loading: () => <EditorLoading /> },
);
const ContentPreview = dynamic(
  () => import("./content-editor").then((m) => m.ContentPreview),
  { loading: () => <EditorLoading /> },
);
function EditorLoading() {
  return (
    <div className={styles.opening}>
      <LoadingFeedback compact label="Opening content" />
    </div>
  );
}
export function AdminContent({
  search,
  onClearSearch,
}: {
  search: string;
  onClearSearch: () => void;
}) {
  const [items, setItems] = useState<ContentSummary[]>([]),
    [kind, setKind] = useState("all"),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [refresh, setRefresh] = useState(0),
    [editor, setEditor] = useState(false),
    [editingId, setEditingId] = useState<string | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [busy, setBusy] = useState<string | null>(null),
    [undo, setUndo] = useState<{ id: string; published: boolean } | null>(null);
  useEffect(() => setPage(1), [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({
            view: "content",
            kind,
            status,
            page: String(page),
            search,
          });
          const r = await fetch("/api/admin?" + params, {
            cache: "no-store",
            signal: controller.signal,
          });
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          setItems(d.content);
          setTotal(d.total);
        } catch (err) {
          if (!controller.signal.aborted) setError((err as Error).message);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      search ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, status, page, search, refresh]);
  async function publish(id: string, published: boolean, isUndo = false) {
    setBusy(id);
    setError("");
    try {
      await saveContent({ action: "publish", id, published });
      setNotice(published ? "Content published." : "Moved to drafts.");
      setUndo(isUndo ? null : { id, published: !published });
      setRefresh((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const pages = Math.max(1, Math.ceil(total / 12));
  useEffect(() => {
    if (!loading && !error && page > pages) setPage(pages);
  }, [loading, error, page, pages]);
  return (
    <div className={styles.library}>
      <div className="portal-page-heading">
        <div>
          <h1>Content library</h1>
          <p>Create updates. Review drafts. Publish when ready.</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setEditor(true);
          }}
        >
          <Plus size={17} /> New content
        </Button>
      </div>
      <div className={styles.toolbar}>
        <nav aria-label="Publication status">
          {[
            ["all", "All content"],
            ["draft", "Drafts"],
            ["published", "Published"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <label>
          Type
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            {Object.entries(contentTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <div className={styles.notice} role="status">
          <span>{notice}</span>
          {undo && (
            <button
              disabled={!!busy}
              onClick={() => publish(undo.id, undo.published, true)}
            >
              Undo
            </button>
          )}
          <button
            aria-label="Dismiss notification"
            onClick={() => {
              setNotice("");
              setUndo(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button onClick={() => setRefresh((v) => v + 1)}>Try again</button>
        </p>
      )}
      <section
        className={styles.panel}
        aria-label="Content entries"
        aria-busy={loading}
      >
        <div className={styles.listHeading}>
          <span>
            {loading
              ? "Loading library…"
              : `${total} ${total === 1 ? "entry" : "entries"}${search ? " matching your search" : ""}`}
          </span>
          <span>12 per page</span>
        </div>
        {loading ? (
          <LoadingFeedback label="Loading content" />
        ) : items.length ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.entry}>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            width={52}
                            height={52}
                          />
                        ) : (
                          <span className={styles.entryIcon}>
                            <FileText size={22} />
                          </span>
                        )}
                        <div>
                          <button
                            className={styles.entryTitle}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditor(true);
                            }}
                          >
                            {item.title}
                          </button>
                          <p>
                            {item.category ||
                              item.description.slice(0, 85) ||
                              "No summary added"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{contentTypes[item.kind] ?? item.kind}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${item.published ? styles.published : styles.draft}`}
                      >
                        {item.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreview(item.id)}
                          aria-label={"Preview " + item.title}
                        >
                          <Eye size={15} />
                          <span>Preview</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={"Edit " + item.title}
                          onClick={() => {
                            setEditingId(item.id);
                            setEditor(true);
                          }}
                        >
                          <Pencil size={15} />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!busy}
                          onClick={() => publish(item.id, !item.published)}
                        >
                          {busy === item.id
                            ? "Saving…"
                            : item.published
                              ? "Move to drafts"
                              : "Publish"}
                          {!item.published && <ArrowUpRight size={13} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error ? (
          <div className={styles.empty}>
            <FileText size={28} />
            <h2>
              {kind !== "all" || status !== "all" || search
                ? "No matching content."
                : "Your next update starts here."}
            </h2>
            <p>
              {kind !== "all" || status !== "all" || search
                ? "Try another type, status, or search."
                : "Create an event, story, or learning material for your community."}
            </p>
            {kind !== "all" || status !== "all" || search ? (
              <Button
                variant="outline"
                onClick={() => {
                  setKind("all");
                  setStatus("all");
                  setPage(1);
                  onClearSearch();
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setEditor(true);
                }}
              >
                Create content
              </Button>
            )}
          </div>
        ) : null}
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page === 1}
            onClick={() => setPage((v) => v - 1)}
          >
            <ChevronLeft size={15} /> Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= pages}
            onClick={() => setPage((v) => v + 1)}
          >
            Next <ChevronRight size={15} />
          </Button>
        </div>
      </section>
      {editor && (
        <ContentEditor
          id={editingId}
          onClose={() => setEditor(false)}
          onSaved={(published) => {
            setEditor(false);
            setNotice(
              published
                ? "Your content is published."
                : "Draft saved. Publish it whenever you’re ready.",
            );
            setUndo(null);
            setPage(1);
            setStatus(published ? "published" : "draft");
            setKind("all");
            onClearSearch();
            setRefresh((v) => v + 1);
          }}
        />
      )}
      {preview && (
        <ContentPreview id={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
