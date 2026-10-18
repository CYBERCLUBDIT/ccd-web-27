"use client";
import Link from "next/link";
import { useEffect, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Logo } from "./shared";
import {
  BookOpen,
  Images,
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
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { type ClubUser, type ClubContent, formatDate } from "@/lib/models";
import { LearningHub } from "./learning-hub";
import { Gallery } from "./gallery";
import { learningLabs } from "@/lib/learning-labs";
import styles from "./workspace.module.css";
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
}: {
  user: ClubUser;
  content: ClubContent[];
  admin?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState("overview"),
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
  const nav = admin
    ? [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
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
        { id: "gallery", label: "Gallery", icon: Images, group: "Community" },
        {
          id: "community",
          label: "Our community",
          icon: Users,
          group: "Community",
        },
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
                  setActive(n.id);
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
            <label className="portal-search">
              <Search size={15} />
              <input
                aria-label="Search current view"
                placeholder="Search this view…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <span className="portal-top-avatar" title={user.name}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main" className="portal-main">
          {admin ? (
            <AdminPortal tab={active} setTab={setActive} search={search} />
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
                <StudentHome
                  content={filtered}
                  user={user}
                  setActive={setActive}
                />
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
              {active === "gallery" && (
                <Gallery items={filtered.filter((c) => c.kind === "gallery")} />
              )}
              {active === "community" && (
                <ContentCollection
                  items={filtered.filter((c) =>
                    ["leader", "testimonial"].includes(c.kind),
                  )}
                  empty="Community profiles and stories will appear here."
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
  user,
  setActive,
}: {
  content: ClubContent[];
  user: ClubUser;
  setActive: (value: string) => void;
}) {
  const events = content.filter((c) => c.kind === "event");
  const news = content.filter((c) => c.kind === "news");
  return (
    <div className={styles.home}>
      <section className={styles.welcome}>
        <div>
          <span className={styles.eyebrow}>YOUR CLUB. YOUR NEXT STEP.</span>
          <h2>
            Build skills.
            <br />
            Make connections.
          </h2>
          <p>
            Practical labs, club events, and ideas worth sharing — all in your
            workspace.
          </p>
          <Button onClick={() => setActive("learning")}>
            Explore Learning <ArrowUpRight size={16} />
          </Button>
        </div>
        <img
          src="/illustrations/security-grid.svg"
          alt=""
          width={360}
          height={260}
        />
      </section>
      <div className="portal-summary-grid student-summary-row">
        <SummaryCard
          label="Membership"
          value="Active"
          detail={user.registration_number}
          icon={ShieldCheck}
        />
        <SummaryCard
          label="Club events"
          value={String(events.length)}
          detail="Upcoming sessions and past highlights"
          icon={CalendarDays}
        />
        <SummaryCard
          label="Practice labs"
          value={String(learningLabs.length)}
          detail="Short, interactive learning demos"
          icon={BookOpen}
        />
      </div>
      <div className={styles.sectionTitle}>
        <div>
          <span className={styles.eyebrow}>LEARN BY DOING</span>
          <h2>Your next small win</h2>
        </div>
        <button onClick={() => setActive("learning")}>
          All labs <ArrowUpRight size={15} />
        </button>
      </div>
      <div className={styles.labGrid}>
        {learningLabs.slice(0, 3).map((lab) => (
          <button
            key={lab.id}
            className={styles.labCard}
            onClick={() => setActive("learning")}
          >
            <BookOpen size={21} />
            <span className={styles.eyebrow}>PRACTICE LAB · DEMO</span>
            <h3>{lab.title}</h3>
            <p>{lab.description}</p>
            <span>
              Start learning <ArrowUpRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <div className={styles.sectionTitle}>
        <div>
          <span className={styles.eyebrow}>IN THE CLUB</span>
          <h2>Events & highlights</h2>
        </div>
        <button onClick={() => setActive("events")}>
          All events <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="portal-event-grid">
        {events.slice(0, 2).map((item) => (
          <PortalEvent key={item.id} item={item} />
        ))}
        {!events.length && <PortalEmpty text="Club events will appear here." />}
      </div>
      <div className={styles.sectionTitle}>
        <h2>Latest from the club</h2>
        <button onClick={() => setActive("news")}>
          All news <ArrowUpRight size={15} />
        </button>
      </div>
      <ContentCollection
        items={news.slice(0, 2)}
        empty="Club news will appear here."
      />
      <div className={styles.sectionTitle}>
        <h2>Life at Cyber Club DIT</h2>
        <button onClick={() => setActive("gallery")}>
          Open gallery <ArrowUpRight size={15} />
        </button>
      </div>
      <Gallery compact items={content.filter((c) => c.kind === "gallery")} />
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
function SummaryCard({
  label,
  value,
  detail,
  accent = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
  icon: typeof Users;
}) {
  return (
    <section className={`portal-summary${accent ? " accent" : ""}`}>
      <div>
        <span className="portal-summary-icon">
          <Icon size={19} />
        </span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail || "—"}</p>
    </section>
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
  async function load() {
    const r = await fetch("/api/admin", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setMembers(d.members);
    setContent(d.content);
    setAttendance(d.attendance);
    setMessages(d.messages);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
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
              ? "Membership, events, and club operations at a glance."
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
      {loading && (
        <p role="status" className={styles.loading}>
          Loading club activity…
        </p>
      )}
      {tab === "overview" && (
        <div className="admin-overview">
          <div className="portal-summary-grid">
            <SummaryCard
              label="Pending applications"
              value={String(
                members.filter((m) => m.status === "pending").length,
              )}
              detail="Awaiting your review"
              accent
              icon={Users}
            />
            <SummaryCard
              label="Approved members"
              value={String(
                members.filter((m) => m.status === "approved").length,
              )}
              detail="Registered on this platform"
              icon={ShieldCheck}
            />
            <SummaryCard
              label="Published events"
              value={String(
                content.filter((c) => c.kind === "event" && c.published).length,
              )}
              detail="On the club calendar"
              icon={CalendarDays}
            />
          </div>
          <div className="portal-overview-grid">
            <section className="portal-panel">
              <div className="portal-panel-heading">
                <h2>Membership applications</h2>
                <button onClick={() => setTab("members")}>
                  Review members <ArrowUpRight size={14} />
                </button>
              </div>
              <MembershipChart members={members} />
            </section>
            <section className="portal-panel">
              <div className="portal-panel-heading">
                <h2>Manage the club</h2>
              </div>
              <div className="portal-quick-actions">
                {[
                  {
                    tab: "members",
                    title: "Review applications",
                    icon: Users,
                    detail: `${members.filter((m) => m.status === "pending").length} pending`,
                  },
                  {
                    tab: "content",
                    title: "Publish club content",
                    icon: FileText,
                    detail: `${content.filter((c) => !c.published).length} drafts`,
                  },
                  {
                    tab: "attendance",
                    title: "Record attendance",
                    icon: ClipboardCheck,
                    detail: `${attendance.length} event registrations`,
                  },
                  {
                    tab: "messages",
                    title: "Read messages",
                    icon: MessageSquare,
                    detail: `${messages.length} received`,
                  },
                ].map((a) => (
                  <button key={a.tab} onClick={() => setTab(a.tab)}>
                    <a.icon size={18} />
                    <span>
                      <strong>{a.title}</strong>
                      <small>{a.detail}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          </div>
          <section className="portal-panel admin-recent-panel">
            <div className="portal-panel-heading">
              <h2>Recent applications</h2>
              <button onClick={() => setTab("members")}>
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            <ApplicantTable
              members={members
                .filter((m) =>
                  (m.name + " " + m.email + " " + m.registration_number)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .slice(0, 5)}
              busy={busy}
              save={save}
            />
          </section>
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === "members" && (
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
      {tab === "content" && (
        <div className="admin-content-grid">
          <form
            className="form-stack student-dashboard-card"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = Object.fromEntries(new FormData(form));
              if (
                await save({
                  ...data,
                  action: "content",
                  published: data.published === "on",
                  event_date: data.event_date
                    ? new Date(String(data.event_date)).toISOString()
                    : undefined,
                })
              )
                form.reset();
            }}
          >
            <h2>Publish real club content</h2>
            <Label htmlFor="kind">Type</Label>
            <select name="kind" id="kind" className="real-select">
              {[
                "event",
                "news",
                "resource",
                "gallery",
                "challenge",
                "leader",
                "testimonial",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <Label htmlFor="title">Title / name</Label>
            <Input
              name="title"
              id="title"
              required
              minLength={3}
              maxLength={200}
            />
            <Label htmlFor="description">Description</Label>
            <Textarea name="description" id="description" maxLength={2000} />
            <Label htmlFor="body">Full text</Label>
            <Textarea name="body" id="body" maxLength={20000} />
            <Label htmlFor="category">Category / role</Label>
            <Input
              name="category"
              id="category"
              placeholder="For events: Workshop or CTF"
            />
            <Label htmlFor="event_date">Date and time (events)</Label>
            <Input name="event_date" id="event_date" type="datetime-local" />
            <Label htmlFor="location">Location</Label>
            <Input name="location" id="location" />
            <Label htmlFor="image_url">Official image HTTPS URL</Label>
            <Input name="image_url" id="image_url" type="url" />
            <Label htmlFor="external_url">Resource / challenge HTTPS URL</Label>
            <Input name="external_url" id="external_url" type="url" />
            <label>
              <input name="published" type="checkbox" /> Publish now
            </label>
            <Button disabled={busy}>Save content</Button>
          </form>
          <div>
            {content.length === 0 && <p>No content has been added.</p>}
            {content
              .filter((c) =>
                (c.title + " " + c.kind)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((c) => (
                <section key={c.id} className="student-dashboard-card">
                  <span>
                    {c.kind} · {c.published ? "Published" : "Draft"}
                  </span>
                  <h3>{c.title}</h3>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      save({
                        action: "publish",
                        id: c.id,
                        published: !c.published,
                      })
                    }
                  >
                    {c.published ? "Unpublish" : "Publish"}
                  </Button>
                </section>
              ))}
          </div>
        </div>
      )}
      {tab === "attendance" && (
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
      {tab === "messages" && (
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
    <PortalEmpty text="No matching membership applications." />
  );
}
function MembershipChart({ members }: { members: Applicant[] }) {
  const gradientId = useId();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      count: members.filter((m) => {
        const d = new Date(m.created_at);
        return (
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth()
        );
      }).length,
    };
  });
  const max = Math.max(1, ...months.map((m) => m.count));
  const points = months.map((month, i) => ({
    x: 28 + i * 108,
    y: 166 - (month.count / max) * 130,
  }));
  const path = points.reduce((line, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const previous = points[i - 1];
    const middle = (previous.x + point.x) / 2;
    return `${line} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const area = `${path} L ${points[5].x} 166 L ${points[0].x} 166 Z`;
  return (
    <>
      <div className="portal-chart-total">
        <strong>{months.reduce((sum, m) => sum + m.count, 0)}</strong>
        <span>Applications · last 6 months</span>
      </div>
      <div className="portal-line-chart">
        <svg
          viewBox="0 0 596 206"
          role="img"
          aria-label={months
            .map((m) => `${m.label}: ${m.count} applications`)
            .join(", ")}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4b8be4" stopOpacity=".25" />
              <stop offset="100%" stopColor="#4b8be4" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {[36, 101, 166].map((y) => (
            <line
              key={y}
              x1="28"
              x2="568"
              y1={y}
              y2={y}
              className="portal-line-grid"
            />
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={path}
            fill="none"
            stroke="#4b8be4"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point, i) => (
            <g key={months[i].label}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="var(--portal-panel)"
                stroke="#4b8be4"
                strokeWidth="2"
              >
                <title>
                  {months[i].label}: {months[i].count} applications
                </title>
              </circle>
              <text
                x={point.x}
                y={point.y - 13}
                textAnchor="middle"
                className="portal-line-value"
              >
                {months[i].count}
              </text>
              <text
                x={point.x}
                y="197"
                textAnchor="middle"
                className="portal-line-month"
              >
                {months[i].label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}
