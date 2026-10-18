import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Target,
  Eye,
  HeartHandshake,
  BookOpen,
  Users,
  Flag,
  Quote,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell, Reveal } from "./shared";
import { ClubStats } from "./club-stats";
import { ActivityShowcase } from "./activity-showcase";
import { LandingExperience } from "./landing-motion";
import { published, statistics } from "@/lib/server/content";
import { Gallery } from "./gallery";
import { ContentCards } from "./public-pages";
import type { ClubContent } from "@/lib/models";
import { clubPhotos, photoSet } from "@/lib/photos";

function Heading({
  tag,
  title,
  text,
}: {
  tag: string;
  title: string;
  text?: string;
}) {
  return (
    <Reveal className="club-section-heading">
      <span className="eyebrow">{tag}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </Reveal>
  );
}
export async function HomePage() {
  const content = (await published()) as ClubContent[];
  const counts = await statistics();
  return (
    <LandingExperience>
      <div className="club-home">
        <PublicShell>
          <section className="orbital-hero">
            <div className="orbital-grid" aria-hidden="true" />
            <div className="orbital-traces" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="orbital-horizon" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="container orbital-inner">
              <Reveal className="orbital-copy">
                <h1>
                  Learn. Defend.
                  <br />
                  <span>Make an impact.</span>
                </h1>
                <p>
                  Your curiosity. Our community.
                  <br />A safer digital future, together.
                </p>
                <Button asChild className="orbital-join" size="lg">
                  <Link href="/join">
                    Join the club{" "}
                    <span>
                      <ArrowUpRight size={17} />
                    </span>
                  </Link>
                </Button>
              </Reveal>
              <div className="orbital-features">
                {[
                  {
                    icon: BookOpen,
                    title: "Build your foundations",
                    text: "Practical guides. A place to start.",
                    href: "/resources",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Think like a defender",
                    text: "Real curiosity. Responsible practice.",
                    href: "/activities",
                  },
                  {
                    icon: Users,
                    title: "Find your people",
                    text: "Workshops, conversations, community.",
                    href: "/events",
                  },
                ].map((item, i) => (
                  <Reveal
                    key={item.title}
                    delay={i * 0.08}
                    className="orbital-feature-wrap"
                  >
                    <Link href={item.href} className="orbital-feature">
                      <div>
                        <item.icon size={20} />
                        <ArrowUpRight size={15} />
                      </div>
                      <h2>{item.title}</h2>
                      <p>{item.text}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
          <section className="section container" id="overview">
            <div className="club-overview">
              <Reveal className="club-photo-frame" direction="left">
                <img
                  src={clubPhotos.community}
                  alt="People sharing ideas at a workshop"
                />
                <span>LEARNING IS BETTER TOGETHER</span>
              </Reveal>
              <Reveal>
                <span className="eyebrow">THE COMMUNITY</span>
                <h2>
                  Your curiosity.
                  <br />
                  Our shared journey.
                </h2>
                <p>
                  A student community at Dar es Salaam Institute of Technology,
                  learning to defend the digital world.
                </p>
                <p>
                  Hands-on workshops. Shared discoveries. A place to begin, and
                  room to grow.
                </p>
                <Button asChild variant="outline">
                  <Link href="/about">
                    Discover our story <ArrowUpRight size={16} />
                  </Link>
                </Button>
              </Reveal>
            </div>
          </section>
          <ClubStats counts={counts} />
          <section
            className="section club-purpose purpose-redesign"
            id="purpose"
          >
            <div className="container purpose-composition">
              <Reveal direction="left" className="purpose-intro">
                <span className="eyebrow">OUR PURPOSE</span>
                <h2>
                  Curiosity drives us.
                  <br />
                  <span>Purpose guides us.</span>
                </h2>
                <p>
                  Learn with intention.
                  <br />
                  Defend with integrity.
                </p>
                <span className="purpose-caption">Our club’s direction</span>
              </Reveal>
              <div className="purpose-statements">
                {[
                  {
                    icon: Eye,
                    title: "Our vision",
                    label: "THE FUTURE WE SEE",
                    text: "A confident community of cybersecurity defenders helping build a safer digital future.",
                  },
                  {
                    icon: Target,
                    title: "Our mission",
                    label: "HOW WE GET THERE",
                    text: "Make cybersecurity accessible through practical learning, responsible exploration, and opportunities to grow together.",
                  },
                ].map((x, i) => (
                  <Reveal
                    className="purpose-statement"
                    direction="right"
                    delay={i * 0.12}
                    key={x.title}
                  >
                    <div className="purpose-statement-top">
                      <span>
                        0{i + 1} / {x.label}
                      </span>
                      <x.icon size={25} />
                    </div>
                    <h3>{x.title}</h3>
                    <p>{x.text}</p>
                  </Reveal>
                ))}
              </div>
              <div className="purpose-values">
                <Reveal className="purpose-values-label">
                  <span className="eyebrow">THE WAY WE WORK</span>
                  <h3>Our core values</h3>
                </Reveal>
                <div className="purpose-values-grid">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "Integrity",
                      text: "Act ethically. Practise only with permission.",
                    },
                    {
                      icon: BookOpen,
                      title: "Curiosity",
                      text: "Ask questions and keep learning.",
                    },
                    {
                      icon: Users,
                      title: "Community",
                      text: "Share knowledge. Welcome every learner.",
                    },
                    {
                      icon: HeartHandshake,
                      title: "Impact",
                      text: "Help others stay safe.",
                    },
                  ].map((x, i) => (
                    <Reveal
                      key={x.title}
                      delay={i * 0.06}
                      className="purpose-value"
                    >
                      <span className="purpose-value-icon">
                        <x.icon size={20} />
                      </span>
                      <div>
                        <h4>{x.title}</h4>
                        <p>{x.text}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="section container">
            <Heading
              tag="WHAT WE DO"
              title="What we do at the club."
              text="Workshops, practical challenges, and campus awareness."
            />
            <Reveal>
              <ActivityShowcase />
            </Reveal>
          </section>
          {[
            {
              kind: "event",
              tag: "GATHER. LEARN. CONNECT.",
              title: "Events & shared experiences.",
            },
            { kind: "news", tag: "THE JOURNAL", title: "Club news." },
            { kind: "leader", tag: "OUR PEOPLE", title: "Club leadership." },
            {
              kind: "testimonial",
              tag: "COMMUNITY VOICES",
              title: "From our members.",
            },
            { kind: "gallery", tag: "IN THE MOMENT", title: "Club moments." },
          ].map((section) => {
            const items = content.filter((c) => c.kind === section.kind);
            return items.length ? (
              <section className="section container" key={section.kind}>
                <Heading tag={section.tag} title={section.title} />
                {section.kind === "gallery" ? (
                  <>
                    <Gallery items={items} compact />
                    <Link href="/gallery">Explore the gallery ↗</Link>
                  </>
                ) : (
                  <ContentCards items={items} />
                )}
              </section>
            ) : null;
          })}
        </PublicShell>
      </div>
    </LandingExperience>
  );
}
