import Link from "next/link";
import { PublicShell, PageIntro, Reveal } from "./shared";
import { published } from "@/lib/server/content";
import { type ClubContent, formatDate } from "@/lib/models";
import { LearningHub } from "./learning-hub";
import { Gallery } from "./gallery";
import { notFound } from "next/navigation";
import { clubPhotos } from "@/lib/photos";
import { ContactForm } from "./contact-form";
export function ContentCards({ items }: { items: ClubContent[] }) {
  return (
    <div className="club-card-grid">
      {items.map((item) => (
        <Reveal key={item.id}>
          <article className="club-image-card">
            {item.image_url && (
              <img src={item.image_url} alt={item.title} loading="lazy" />
            )}
            <div>
              <span className="eyebrow">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.event_date && (
                <p>
                  {formatDate(item.event_date)} · {item.location}
                </p>
              )}
              {["event", "news"].includes(item.kind) ? (
                <Link
                  href={
                    (item.kind === "event" ? "/events/" : "/news/") + item.id
                  }
                >
                  Read more ↗
                </Link>
              ) : item.external_url ? (
                <a href={item.external_url} target="_blank" rel="noreferrer">
                  Open resource ↗
                </a>
              ) : null}
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
export async function PublicPage({ page, id }: { page: string; id?: string }) {
  const all = (await published()) as ClubContent[];
  const intro: Record<string, [string, string, string]> = {
    about: [
      "OUR STORY",
      "About Us",
      "A cybersecurity club at Dar es Salaam Institute of Technology, built around learning, responsible practice, and shared discovery.",
    ],
    activities: [
      "WHAT WE DO",
      "Club Activities",
      "Workshops, CTFs, and cybersecurity awareness.",
    ],
    events: [
      "CLUB CALENDAR",
      "Events",
      "Upcoming sessions and past club events.",
    ],
    learning: [
      "EXPLORE. PRACTISE. GROW.",
      "Learning",
      "Small challenges. Practical skills. A place to build your confidence.",
    ],
    gallery: [
      "THE CLUB, IN FOCUS",
      "Club Gallery",
      "Official photographs and stories from the club.",
    ],
    contact: [
      "GET IN TOUCH",
      "Contact Us",
      "Questions about membership or club activities? Get in touch.",
    ],
    privacy: [
      "YOUR INFORMATION",
      "Privacy",
      "How this club website handles your information.",
    ],
    news: [
      "THE JOURNAL",
      "Club News",
      "Updates and stories from Cyber Club DIT.",
    ],
  };
  const [tag, title, description] = intro[page] ?? intro.about;
  const detail = id
    ? all.find(
        (c) => c.id === id && c.kind === (page === "events" ? "event" : "news"),
      )
    : null;
  if (id && !detail) notFound();
  return (
    <PublicShell>
      <PageIntro
        tag={detail?.category || tag}
        title={detail?.title || title}
        description={detail?.description || description}
      />
      <div className="container section">
        {detail ? (
          <article className="article-body">
            {detail.image_url && (
              <img
                className="article-photo"
                src={detail.image_url}
                alt={detail.title}
              />
            )}
            {detail.event_date && (
              <p>
                {formatDate(detail.event_date)} · {detail.location}
              </p>
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>{detail.body}</div>
            {detail.kind === "event" &&
              (detail.event_date &&
              new Date(detail.event_date).getTime() > Date.now() ? (
                <Link href="/member">Sign in to register for this event ↗</Link>
              ) : (
                <Link href="/gallery">Explore summit photos ↗</Link>
              ))}
          </article>
        ) : page === "contact" ? (
          <ContactForm />
        ) : page === "learning" ? (
          <>
            <LearningHub />
            {all.some((item) => item.kind === "resource") && (
              <section className="section">
                <h2>From the club</h2>
                <ContentCards
                  items={all.filter((item) => item.kind === "resource")}
                />
              </section>
            )}
          </>
        ) : page === "privacy" ? (
          <article className="article-body">
            <h2>Membership information</h2>
            <p>
              We store the name, registration number, phone number, email,
              course you submit in the club’s PostgreSQL database.
              Administrators use these details to review membership and manage
              events.
            </p>
            <h2>Account security</h2>
            <p>
              Passwords are stored as salted hashes. Sign-in sessions use an
              HTTP-only cookie. Only approved members can access the student
              portal. Administrator actions require an administrator account.
            </p>
            <h2>Your choices</h2>
            <p>
              Contact the club to request corrections or deletion of your
              information. Event registration and attendance are recorded for
              club administration.
            </p>
            <p>
              Your display theme is saved in your browser. The site does not use
              browser storage for membership or authentication.
            </p>
          </article>
        ) : page === "about" ? (
          <>
            <img
              className="article-photo"
              src={clubPhotos.community}
              alt="Cyber Club DIT members learning together at the Cybersecurity Summit"
              loading="lazy"
            />
            <section className="about-live">
              <h2>Learning to defend, together.</h2>
              <p>
                Cyber Club DIT brings students together to explore cybersecurity
                through practical learning, responsible investigation, and
                shared knowledge.
              </p>
            </section>
            <h2>Club leadership</h2>
            {all.some((c) => c.kind === "leader") ? (
              <ContentCards items={all.filter((c) => c.kind === "leader")} />
            ) : (
              <p className="live-empty">
                Leadership information has not been published yet.
              </p>
            )}
          </>
        ) : page === "activities" ? (
          <>
            <div className="club-card-grid">
              {[
                {
                  title: "Security workshops",
                  text: "Explore network security, digital forensics, and incident response.",
                },
                {
                  title: "Capture the flag",
                  text: "Practise security skills through authorised challenges and teamwork.",
                },
                {
                  title: "Security awareness",
                  text: "Help students recognise online threats and build safer digital habits.",
                },
              ].map((c) => (
                <section className="student-dashboard-card" key={c.title}>
                  <h2>{c.title}</h2>
                  <p>{c.text}</p>
                </section>
              ))}
            </div>
            <p className="live-empty">
              Check the events calendar for published sessions.
            </p>
            <Link href="/events">View events ↗</Link>
          </>
        ) : (
          <>
            {page === "gallery" && (
              <div className="admin-tabs">
                <Link href="/gallery">Photos</Link>
                <Link href="/news">News</Link>
              </div>
            )}
            {(() => {
              const kind = (
                {
                  events: "event",
                  resources: "resource",
                  gallery: "gallery",
                  news: "news",
                } as Record<string, string>
              )[page];
              const items = all.filter((c) => c.kind === kind);
              return items.length ? (
                page === "gallery" ? (
                  <Gallery items={items} />
                ) : (
                  <ContentCards items={items} />
                )
              ) : (
                <p className="live-empty">
                  No {page === "gallery" ? "photos" : page} have been published
                  yet.
                </p>
              );
            })()}
          </>
        )}
      </div>
    </PublicShell>
  );
}
