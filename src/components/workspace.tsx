"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Logo } from "./shared";
import {
  BarChart3,
  ScrollText,
  BookOpen,
  Newspaper,
  LayoutDashboard,
  Users,
  CalendarDays,
  Flag,
  FileText,
  MessageSquare,
  ClipboardCheck,
  UserRound,
  LogOut,
  Search,
  Menu,
  X,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { type ClubUser, type ClubContent, formatDate } from "@/lib/models";
import dynamic from "next/dynamic";
import { LoadingFeedback } from "./loading-feedback";
import { learningLabs } from "@/lib/learning-labs";
import styles from "./workspace.module.css";
const LearningHub = dynamic(
  () => import("./learning-hub").then((m) => m.LearningHub),
  { loading: () => <LoadingFeedback label="Opening Learning" /> },
);
const AdminInsights = dynamic(
  () => import("./admin-insights").then((m) => m.AdminInsights),
  { loading: () => <LoadingFeedback label="Opening report" /> },
);
const AdminContent = dynamic(
  () => import("./admin-content").then((m) => m.AdminContent),
  { loading: () => <LoadingFeedback label="Opening content library" /> },
);
type Applicant = ClubUser & { created_at: string };
type Entry = {
  event_id: string;
  user_id: string;
  attended: boolean;
  name: string;
  email: string;
  title: string;
};
export function Workspace({
  user,
  content,
  admin = false,
  initialTab = "overview",
}: {
  user: ClubUser;
  content: ClubContent[];
  admin?: boolean;
  initialTab?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(initialTab),
    [search, setSearch] = useState(""),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobile]);
  useEffect(() => {
    if (admin) setActive(pathname.split("/")[2] || "overview");
  }, [pathname, admin]);
  const navigate = (value: string) => {
    setActive(value);
    if (active !== value) window.scrollTo({ top: 0, behavior: "instant" });
    if (admin && active !== value)
      window.history.pushState(
        null,
        "",
        value === "overview" ? "/admin" : "/admin/" + value,
      );
  };
  const nav = admin
    ? [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
          group: "Workspace",
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          group: "Workspace",
        },
        {
          id: "audit",
          label: "Audit logs",
          icon: ScrollText,
          group: "Workspace",
        },
        { id: "members", label: "Members", icon: Users, group: "People" },
        {
          id: "attendance",
          label: "Attendance",
          icon: ClipboardCheck,
          group: "People",
        },
        {
          id: "content",
          label: "Content",
          icon: FileText,
          group: "Publishing",
        },
        {
          id: "messages",
          label: "Messages",
          icon: MessageSquare,
          group: "Communication",
        },
      ]
    : [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
          group: "Workspace",
        },
        { id: "events", label: "Events", icon: CalendarDays, group: "Explore" },
        { id: "challenges", label: "Challenges", icon: Flag, group: "Explore" },
        { id: "learning", label: "Learning", icon: BookOpen, group: "Explore" },
        { id: "news", label: "Club news", icon: Newspaper, group: "Community" },
        {
          id: "profile",
          label: "My profile",
          icon: UserRound,
          group: "Account",
        },
      ];
  const filtered = content.filter((c) =>
    (c.title + " " + c.description)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/sign-in");
    router.refresh();
  };
  return (
    <div
      className={`${styles.workspace} portal-shell${admin ? " admin-portal" : " student-portal"}`}
    >
      {mobile && (
        <button
          className="portal-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`portal-sidebar${mobile ? " is-open" : ""}`}>
        <div className="portal-brand">
          <Logo compact />
          <Button
            className="portal-mobile-close"
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </Button>
        </div>
        <span className="portal-role">
          {admin ? "ADMIN WORKSPACE" : "MEMBER WORKSPACE"}
        </span>
        <nav aria-label="Portal navigation">
          {nav.map((n, index) => (
            <div key={n.id}>
              {(index === 0 || nav[index - 1].group !== n.group) && (
                <p className={styles.navGroup}>{n.group}</p>
              )}
              <button
                className={active === n.id ? "is-active" : ""}
                aria-current={active === n.id ? "page" : undefined}
                onClick={() => {
                  navigate(n.id);
                  setSearch("");
                  setMobile(false);
                }}
              >
                <n.icon size={18} />
                {n.label}
                {active === n.id && <ChevronRight size={14} />}
              </button>
            </div>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <Link href="/">
            Club website <ArrowUpRight size={15} />
          </Link>
          <button onClick={logout}>
            <LogOut size={17} />
            Sign out
          </button>
          <div className="portal-account">
            <span>{user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{admin ? "Administrator" : "Approved member"}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="portal-body">
        <header className="portal-topbar">
          <div>
            <Button
              className="portal-mobile-toggle"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </Button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === active)?.label}</strong>
          </div>
          <div>
            {(!admin || !["analytics", "overview"].includes(active)) && (
              <label className="portal-search">
                <Search size={15} />
                <input
                  aria-label="Search current view"
                  placeholder="Search this view…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            )}
            <span className="portal-top-avatar" title={user.name}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main" className="portal-main">
          {admin ? (
            active === "analytics" || active === "audit" ? (
              <AdminInsights
                key={active + ":" + search}
                view={active}
                search={search}
              />
            ) : active === "content" ? (
              <AdminContent
                search={search}
                onClearSearch={() => setSearch("")}
              />
            ) : (
              <AdminPortal
                key={active}
                tab={active}
                setTab={navigate}
                search={search}
              />
            )
          ) : (
            <>
              <div className="portal-page-heading">
                <div>
                  <h1>
                    {active === "overview"
                      ? `Welcome back, ${user.name.split(" ")[0]}.`
                      : nav.find((n) => n.id === active)?.label}
                  </h1>
                  <p>
                    {active === "overview"
                      ? "Learn something new. Find your next event. Stay connected."
                      : "Your Cyber Club DIT workspace."}
                  </p>
                </div>
                <span className="portal-status">
                  <span />
                  Membership approved
                </span>
              </div>
              {active === "overview" && (
                <StudentHome content={filtered} setActive={setActive} />
              )}
              {active === "learning" && (
                <>
                  <LearningHub />
                  <ContentCollection
                    items={filtered.filter((c) => c.kind === "resource")}
                    empty="New reading material will appear here."
                  />
                </>
              )}
              {active === "news" && (
                <ContentCollection
                  items={filtered.filter((c) => c.kind === "news")}
                  empty="No matching club news."
                />
              )}
              {active === "events" && (
                <div className="portal-event-grid">
                  {filtered
                    .filter((c) => c.kind === "event")
                    .map((c) => (
                      <PortalEvent key={c.id} item={c} />
                    ))}
                  {!filtered.some((c) => c.kind === "event") && (
                    <PortalEmpty text="No matching events." />
                  )}
                </div>
              )}
              {active === "challenges" && (
                <section className="portal-panel">
                  {filtered
                    .filter((c) => c.kind === "challenge")
                    .map((c) => (
                      <div className="portal-list-row" key={c.id}>
                        <Flag size={20} />
                        <div>
                          <strong>{c.title}</strong>
                          <p>{c.description}</p>
                        </div>
                        {c.external_url && (
                          <a
                            href={c.external_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open challenge ↗
                          </a>
                        )}
                      </div>
                    ))}
                  {!filtered.some((c) => c.kind === "challenge") && (
                    <PortalEmpty text="No matching challenges." />
                  )}
                </section>
              )}
              {active === "profile" && (
                <section className="portal-panel portal-profile-panel">
                  <div className="portal-panel-heading">
                    <h2>Student details</h2>
                    <UserRound size={20} />
                  </div>
                  <dl className="portal-profile-list">
                    {[
                      ["Full name", user.name],
                      ["Registration number", user.registration_number],
                      ["Phone / WhatsApp", user.phone],
                      ["Email", user.email],
                      ["Course", user.course],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </>
          )}
        </main>
        <footer className="portal-footer">
          Cyber Club DIT<span>Built by epro Tech</span>
        </footer>
      </div>
    </div>
  );
}
function StudentHome({
  content,
  setActive,
}: {
  content: ClubContent[];
  setActive: (value: string) => void;
}) {
  const events = content.filter((c) => c.kind === "event");
  const nextEvent = events
    .filter(
      (c) => c.event_date && new Date(c.event_date).getTime() > Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime(),
    )[0];
  const featuredEvent =
    nextEvent ??
    events
      .slice()
      .sort(
        (a, b) =>
          new Date(b.event_date ?? 0).getTime() -
          new Date(a.event_date ?? 0).getTime(),
      )[0];
  const latestNews = content.find((c) => c.kind === "news");
  const lab = learningLabs[0];
  return (
    <div className={styles.home}>
      <section className={`${styles.welcome} ${styles.compactWelcome}`}>
        <div>
          <span className={styles.eyebrow}>YOUR NEXT SMALL WIN</span>
          <h2>
            Stay curious.
            <br />
            Build something stronger.
          </h2>
          <p>A little practice today. More confidence tomorrow.</p>
          <Button onClick={() => setActive("learning")}>
            Explore Learning <ArrowUpRight size={16} />
          </Button>
        </div>
        <span className={styles.labCount}>
          <BookOpen size={26} />
          <strong>{learningLabs.length}</strong>
          <span>
            practice labs
            <br />
            ready to explore
          </span>
        </span>
      </section>
      <div className={styles.focusGrid}>
        <section className={styles.focusCard}>
          <div className={styles.sectionTitle}>
            <span className={styles.eyebrow}>PICK UP A SKILL</span>
            <BookOpen size={18} />
          </div>
          <h3>{lab.title}</h3>
          <p>{lab.description}</p>
          <span className={styles.eventBadge}>
            {lab.level} · {lab.minutes} min · Demo
          </span>
          <button
            className={styles.focusLink}
            onClick={() => setActive("learning")}
          >
            Try a lab <ArrowUpRight size={15} />
          </button>
        </section>
        <section className={styles.focusCard}>
          <div className={styles.sectionTitle}>
            <span className={styles.eyebrow}>
              {nextEvent ? "NEXT ON THE CALENDAR" : "LATEST EVENT"}
            </span>
            <CalendarDays size={18} />
          </div>
          {featuredEvent ? (
            <>
              <h3>{featuredEvent.title}</h3>
              <p>
                {featuredEvent.event_date
                  ? formatDate(featuredEvent.event_date)
                  : "Date to be announced"}
                {featuredEvent.location ? " · " + featuredEvent.location : ""}
              </p>
              <span className={styles.eventBadge}>
                {nextEvent ? "Upcoming" : "Past event"}
              </span>
              <button
                className={styles.focusLink}
                onClick={() => setActive("events")}
              >
                {nextEvent ? "View events" : "Explore event highlights"}{" "}
                <ArrowUpRight size={15} />
              </button>
            </>
          ) : (
            <>
              <h3>Good things are coming.</h3>
              <p>New club sessions will appear here.</p>
              <button
                className={styles.focusLink}
                onClick={() => setActive("events")}
              >
                Browse events <ArrowUpRight size={15} />
              </button>
            </>
          )}
        </section>
      </div>
      {latestNews && (
        <section className={styles.newsStrip}>
          <Newspaper size={21} />
          <div>
            <span className={styles.eyebrow}>FROM THE CLUB</span>
            <h3>{latestNews.title}</h3>
          </div>
          <button
            className={styles.focusLink}
            onClick={() => setActive("news")}
          >
            Read news <ArrowUpRight size={15} />
          </button>
        </section>
      )}
    </div>
  );
}
function ContentCollection({
  items,
  empty,
}: {
  items: ClubContent[];
  empty: string;
}) {
  return (
    <div className={styles.contentGrid}>
      {items.map((item) => (
        <article className={styles.contentCard} key={item.id}>
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              loading="lazy"
              width={640}
              height={400}
            />
          )}
          <div>
            <span className={styles.eyebrow}>
              {item.category ||
                (item.kind === "resource" ? "Learning material" : item.kind)}
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.kind === "news" ? (
              <Link href={"/news/" + item.id}>
                Read story <ArrowUpRight size={15} />
              </Link>
            ) : item.external_url ? (
              <a href={item.external_url} target="_blank" rel="noreferrer">
                Explore <ArrowUpRight size={15} />
              </a>
            ) : (
              item.body && <p>{item.body}</p>
            )}
          </div>
        </article>
      ))}
      {!items.length && <PortalEmpty text={empty} />}
    </div>
  );
}
function PortalEmpty({ text }: { text: string }) {
  return (
    <div className="portal-empty">
      <span>
        <ClipboardCheck size={24} />
      </span>
      <p>{text}</p>
    </div>
  );
}
function PortalEvent({ item }: { item: ClubContent }) {
  const upcoming =
    !!item.event_date && new Date(item.event_date).getTime() > Date.now();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="student-dashboard-card student-event-card">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="student-event-cover"
          loading="lazy"
        />
      )}
      <h3>{item.title}</h3>
      <p>
        {item.event_date && formatDate(item.event_date)} · {item.location}
      </p>
      <p>{item.description}</p>
      <span className={styles.eventBadge}>
        {upcoming ? "Upcoming" : "Past event"}
      </span>
      {upcoming ? (
        <Button
          disabled={busy || message === "Registered"}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/club", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "book", eventId: item.id }),
              });
              const d = await r.json();
              setMessage(r.ok ? "Registered" : d.error);
            } catch {
              setMessage("Unable to register. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Register for event
        </Button>
      ) : (
        <Link className={styles.recapLink} href={"/events/" + item.id}>
          View event recap <ArrowUpRight size={15} />
        </Link>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
function AdminPortal({
  tab,
  setTab,
  search,
}: {
  tab: string;
  setTab: (value: string) => void;
  search: string;
}) {
  const [members, setMembers] = useState<Applicant[]>([]),
    [content, setContent] = useState<ClubContent[]>([]),
    [attendance, setAttendance] = useState<Entry[]>([]),
    [messages, setMessages] = useState<
      { id: string; name: string; email: string; message: string }[]
    >([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [memberStatus, setMemberStatus] = useState("all");
  async function load(signal?: AbortSignal) {
    const r = await fetch("/api/admin?view=" + tab, {
      cache: "no-store",
      signal,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setMembers(d.members ?? []);
    setContent(d.content ?? []);
    setAttendance(d.attendance ?? []);
    setMessages(d.messages ?? []);
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tab]);
  async function save(data: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setNotice("Saved successfully.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="portal-page-heading">
        <div>
          <h1>
            {tab === "overview"
              ? "Club overview"
              : tab[0].toUpperCase() + tab.slice(1)}
          </h1>
          <p>
            {tab === "overview"
              ? "What needs your attention today."
              : "Manage your club’s " + tab + "."}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </Button>
      </div>
      {loading && <LoadingFeedback label="Loading your desk" />}
      {!loading && tab === "overview" && (
        <div className={styles.actionOverview}>
          <section className={styles.actionWelcome}>
            <div>
              <span className={styles.eyebrow}>YOUR DAILY DESK</span>
              <h2>Keep the club moving.</h2>
              <p>
                Review applications, prepare updates, and reply to your
                community.
              </p>
            </div>
            <Button onClick={() => setTab("content")}>
              Open content <ArrowUpRight size={16} />
            </Button>
          </section>
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <div>
                <h2>Applications to review</h2>
                <p className={styles.deskHint}>
                  Latest five awaiting a decision
                </p>
              </div>
              <button onClick={() => setTab("members")}>
                Open members <ArrowUpRight size={14} />
              </button>
            </div>
            <ApplicantTable
              members={members.filter((m) =>
                (m.name + " " + m.email)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
              busy={busy}
              save={save}
            />
          </section>
          <div className={styles.deskGrid}>
            <section className="portal-panel">
              <div className="portal-panel-heading">
                <h2>Drafts to finish</h2>
                <button onClick={() => setTab("content")}>
                  Content library <ArrowUpRight size={14} />
                </button>
              </div>
              {content.length ? (
                content.map((c) => (
                  <button
                    className={styles.deskRow}
                    key={c.id}
                    onClick={() => setTab("content")}
                  >
                    <FileText size={18} />
                    <span>
                      <strong>{c.title}</strong>
                      <small>
                        {c.kind === "resource" ? "Learning" : c.kind} · Draft
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))
              ) : (
                <p className={styles.deskEmpty}>
                  All caught up. No drafts to finish.
                </p>
              )}
            </section>
            <section className="portal-panel">
              <div className="portal-panel-heading">
                <h2>Recent messages</h2>
                <button onClick={() => setTab("messages")}>
                  Open inbox <ArrowUpRight size={14} />
                </button>
              </div>
              {messages.length ? (
                messages.map((m) => (
                  <button
                    className={styles.deskRow}
                    key={m.id}
                    onClick={() => setTab("messages")}
                  >
                    <MessageSquare size={18} />
                    <span>
                      <strong>{m.name}</strong>
                      <small>{m.message.slice(0, 90)}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))
              ) : (
                <p className={styles.deskEmpty}>Your inbox is clear.</p>
              )}
            </section>
          </div>
          <div className={styles.deskLinks}>
            <button onClick={() => setTab("attendance")}>
              <ClipboardCheck size={17} /> Record attendance{" "}
              <ArrowUpRight size={14} />
            </button>
            <button onClick={() => setTab("analytics")}>
              <BarChart3 size={17} /> View trends in Analytics{" "}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!loading && tab === "members" && (
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Member applications</h2>
            <label className={styles.filterLabel}>
              Status
              <select
                value={memberStatus}
                onChange={(e) => setMemberStatus(e.target.value)}
              >
                <option value="all">All applications</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
          <ApplicantTable
            members={members
              .filter(
                (m) => memberStatus === "all" || m.status === memberStatus,
              )
              .filter((m) =>
                (
                  m.name +
                  " " +
                  m.email +
                  " " +
                  m.registration_number +
                  " " +
                  m.status
                )
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
            busy={busy}
            save={save}
          />
        </section>
      )}
      {!loading && tab === "attendance" && (
        <>
          {attendance.length === 0 && (
            <p className="live-empty">Event registrations will appear here.</p>
          )}
          {attendance
            .filter((a) =>
              (a.name + " " + a.title)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((a) => (
              <section
                className="student-dashboard-card admin-applicant"
                key={a.event_id + a.user_id}
              >
                <div>
                  <h3>{a.name}</h3>
                  <p>{a.title}</p>
                  <p>{a.email}</p>
                </div>
                <Button
                  disabled={busy}
                  variant={a.attended ? "default" : "outline"}
                  onClick={() =>
                    save({
                      action: "attendance",
                      eventId: a.event_id,
                      userId: a.user_id,
                      attended: !a.attended,
                    })
                  }
                >
                  {a.attended ? "Attended ✓" : "Mark attended"}
                </Button>
              </section>
            ))}
        </>
      )}
      {!loading && tab === "messages" && (
        <>
          {messages.length === 0 && (
            <p className="live-empty">No messages received.</p>
          )}
          {messages
            .filter((m) =>
              (m.name + " " + m.email + " " + m.message)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((m) => (
              <section key={m.id} className="student-dashboard-card">
                <h3>{m.name}</h3>
                <p>{m.email}</p>
                <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
              </section>
            ))}
        </>
      )}
    </>
  );
}

function ApplicantTable({
  members,
  busy,
  save,
}: {
  members: Applicant[];
  busy: boolean;
  save: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  return members.length ? (
    <div className="portal-table-scroll">
      <table className="portal-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Student details</th>
            <th>Applied</th>
            <th>Status</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                <strong>{m.name}</strong>
                <small>{m.email}</small>
                <small>{m.phone}</small>
              </td>
              <td>
                <strong>{m.registration_number}</strong>
                <small>{m.course}</small>
              </td>
              <td>{formatDate(m.created_at)}</td>
              <td>
                <span className={`portal-badge ${m.status}`}>{m.status}</span>
              </td>
              <td>
                <div className="portal-table-actions">
                  <Button
                    size="sm"
                    disabled={busy || m.status === "approved"}
                    onClick={() => save({ action: "approve", id: m.id })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || m.status === "rejected"}
                    onClick={() => save({ action: "reject", id: m.id })}
                  >
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <PortalEmpty text="No applications need your attention here." />
  );
}
