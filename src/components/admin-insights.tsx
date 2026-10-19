"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/button";
import { LoadingFeedback } from "./loading-feedback";
import styles from "./admin-insights.module.css";
type Audit = {
  id: string;
  action: string;
  actor_name: string;
  target_label: string;
  target_id: string;
  created_at: string;
};
type Analytics = {
  membership: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  months: { label: string; applications: number }[];
  content: { kind: string; published: number; drafts: number }[];
  events: {
    id: string;
    title: string;
    registrations: number;
  }[];
  visitors: {
    today: number;
    week: number;
    total: number;
    since: string | null;
    days: { day: string; label: string; visitors: number }[];
  };
  generatedAt: string;
};
const actionLabels: Record<string, string> = {
  approve: "Member approved",
  reject: "Member rejected",
  "content.create": "Content created",
  "content.update": "Content edited",
  "content.publish": "Content published",
  "content.unpublish": "Content unpublished",
  "attendance.present": "Attendance marked present",
  "attendance.absent": "Attendance marked absent",
};
const timestamp = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(value));
export function AdminInsights({
  view,
  search,
}: {
  view: "audit" | "analytics";
  search: string;
}) {
  const [report, setReport] = useState<Analytics | null>(null);
  const [items, setItems] = useState<Audit[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [cursors, setCursors] = useState([""]);
  const [action, setAction] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const before = cursors[cursors.length - 1];
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({ view, search, action, before });
          const response = await fetch("/api/admin/insights?" + params, {
            cache: "no-store",
            signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error ?? "Unable to load this report.");
          if (view === "analytics") setReport(data);
          else {
            setItems(data.items);
            setNext(data.nextCursor);
          }
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
  }, [view, search, action, before, refresh]);
  const total = report?.membership.total ?? 0;

  const peak = Math.max(
    1,
    ...(report?.months.map((m) => m.applications) ?? []),
  );
  return (
    <div className={styles.insights}>
      <div className="portal-page-heading">
        <div>
          <h1>{view === "audit" ? "Audit logs" : "Club analytics"}</h1>
          <p>
            {view === "audit"
              ? "A clear record of administrator changes."
              : "Visitors, membership, and publishing."}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className={styles.notice}>
          {error}
        </p>
      )}
      {loading && (
        <LoadingFeedback
          compact
          label={view === "audit" ? "Loading activity" : "Loading analytics"}
        />
      )}
      {view === "audit" ? (
        <section className={styles.panel} aria-busy={loading}>
          <div className={styles.panelHeading}>
            <div>
              <ClipboardList size={18} />
              <h2>Administrator activity</h2>
            </div>
            <label>
              Action
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setCursors([""]);
                }}
              >
                <option value="">All actions</option>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.note}>
            Newest first · Times in East Africa Time · 25 records per page.
            Older records may contain membership reviews only.
          </p>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Administrator</th>
                  <th>Action</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <time dateTime={item.created_at}>
                          {timestamp(item.created_at)}
                        </time>
                      </td>
                      <td>{item.actor_name}</td>
                      <td>
                        <span className={styles.badge}>
                          {actionLabels[item.action] ?? item.action}
                        </span>
                      </td>
                      <td>
                        {item.target_label}
                        <small>{item.target_id}</small>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!loading && !items.length && !error && (
            <p className={styles.empty}>No activity matches these filters.</p>
          )}
          <div className={styles.pagination}>
            <Button
              variant="outline"
              disabled={loading || cursors.length === 1}
              onClick={() => setCursors((v) => v.slice(0, -1))}
            >
              Previous
            </Button>
            <span>Page {cursors.length}</span>
            <Button
              variant="outline"
              disabled={loading || !next}
              onClick={() => {
                if (next) setCursors((v) => [...v, next]);
              }}
            >
              Next
            </Button>
          </div>
        </section>
      ) : (
        report && (
          <>
            <p className={styles.note}>
              Platform records · Refreshed {timestamp(report.generatedAt)} EAT
            </p>
            <div className={styles.metrics}>
              {[
                {
                  label: "Approved members",
                  value: report.membership.approved,
                  detail: `${total} submitted applications`,
                  Icon: Users,
                },
                {
                  label: "Awaiting review",
                  value: report.membership.pending,
                  detail: "Submitted membership applications",
                  Icon: ClipboardList,
                },
                {
                  label: "Visitors today",
                  value: report.visitors.today,
                  detail: "One browser, one visit per day  /  EAT",
                  Icon: Activity,
                },
                {
                  label: "Visitors this week",
                  value: report.visitors.week,
                  detail: "Unique browsers across the last 7 days",
                  Icon: CheckCircle2,
                },
              ].map(({ label, value, detail, Icon }) => (
                <section className={styles.metric} key={label}>
                  <Icon size={19} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </section>
              ))}
            </div>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <Activity size={18} />
                  <h2>Website visitors</h2>
                </div>
                <span className={styles.badge}>
                  {report.visitors.total} unique browsers overall
                </span>
              </div>
              <p className={styles.note}>
                Each browser counts once per day, even after repeated logins.
                Different browsers or devices count separately.{" "}
                {report.visitors.since
                  ? `Tracking since ${report.visitors.since}.`
                  : "Tracking begins with the first visit after this update is deployed."}
              </p>
              <div className={`${styles.chart} ${styles.visitorChart}`}>
                {report.visitors.days.map((day) => (
                  <div
                    key={day.day}
                    aria-label={`${day.label}: ${day.visitors} visitors`}
                  >
                    <strong>{day.visitors}</strong>
                    <div className={styles.barTrack}>
                      <span
                        style={{
                          height: `${(day.visitors / Math.max(1, ...report.visitors.days.map((d) => d.visitors))) * 100}%`,
                        }}
                      />
                    </div>
                    <small>{day.label}</small>
                  </div>
                ))}
              </div>
            </section>
            <div className={styles.twoColumns}>
              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <div>
                    <BarChart3 size={18} />
                    <h2>Applications over time</h2>
                  </div>
                </div>
                <p className={styles.note}>
                  Submitted applications · Last six months · EAT
                </p>
                <div className={styles.chart}>
                  {report.months.map((month) => (
                    <div
                      key={month.label}
                      aria-label={`${month.label}: ${month.applications} applications`}
                    >
                      <strong>{month.applications}</strong>
                      <div className={styles.barTrack}>
                        <span
                          style={{
                            height: `${(month.applications / peak) * 100}%`,
                          }}
                        />
                      </div>
                      <small>{month.label}</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <h2>Application status</h2>
                </div>
                {["approved", "pending", "rejected"].map((status) => {
                  const count =
                    report.membership[
                      status as "approved" | "pending" | "rejected"
                    ];
                  return (
                    <div className={styles.statusRow} key={status}>
                      <div>
                        <span>{status}</span>
                        <strong>{count}</strong>
                      </div>
                      <meter
                        aria-label={`${status} applications`}
                        min={0}
                        max={Math.max(total, 1)}
                        value={count}
                      />
                    </div>
                  );
                })}
                {!total && (
                  <p className={styles.note}>
                    No applications have been submitted yet.
                  </p>
                )}
              </section>
            </div>
            <div className={styles.twoColumns}>
              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <h2>Content library</h2>
                </div>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Published</th>
                        <th>Drafts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.content.map((row) => (
                        <tr key={row.kind}>
                          <td>
                            {row.kind === "resource" ? "Learning" : row.kind}
                          </td>
                          <td>{row.published}</td>
                          <td>{row.drafts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!report.content.length && (
                  <p className={styles.empty}>
                    No content has been created yet.
                  </p>
                )}
              </section>
              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <h2>Event registrations</h2>
                </div>
                <p className={styles.note}>Ten most recent published events.</p>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.events.map((row) => (
                        <tr key={row.id}>
                          <td>{row.title}</td>
                          <td>{row.registrations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!report.events.length && (
                  <p className={styles.empty}>No published events yet.</p>
                )}
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}
