"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  Menu,
  ChevronDown,
  ShieldCheck,
  Globe,
  MapPin,
  Command,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

export function Logo({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("brand", dark && "brand-dark")}
      aria-label="Cyber Club DIT home"
    >
      <span className="brand-mark">
        <img src="/club-logo.jpeg" alt="" width="44" height="44" />
      </span>
      <span>
        <strong>
          CYBER CLUB<span className="brand-dit"> DIT</span>
        </strong>
        {!compact && <small>DAR ES SALAAM INSTITUTE OF TECHNOLOGY</small>}
      </span>
    </Link>
  );
}
const links = [
  ["Home", "/"],
  ["About", "/about"],
  ["Activities", "/activities"],
  ["Events", "/events"],
  ["Resources", "/resources"],
];
export function Header() {
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "nav-link",
                (href === "/" ? path === "/" : path.startsWith(href)) &&
                  "active",
              )}
              aria-current={path === href ? "page" : undefined}
            >
              {name}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="nav-link flex items-center gap-1">
              More
              <ChevronDown size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/gallery">Gallery & news</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/contact">Contact & FAQ</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="sign-in-link" href="/sign-in">
            Sign in <ArrowUpRight size={14} />
          </Link>
          <Button asChild className="join-nav">
            <Link href="/join">
              Join the club <ArrowUpRight size={15} />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className="mobile-toggle"
                variant="outline"
                size="icon"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Explore Cyber Club DIT</SheetTitle>
              <SheetDescription>Learn, practise, and connect.</SheetDescription>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {[
                  ...links,
                  ["Gallery & news", "/gallery"],
                  ["Contact & FAQ", "/contact"],
                  ["Sign in", "/sign-in"],
                  ["Join the club", "/join"],
                ].map(([name, href]) => (
                  <SheetClose asChild key={href}>
                    <Link href={href}>
                      {name}
                      <ArrowUpRight size={18} />
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo dark />
            <p>
              Curious minds. Shared knowledge.
              <br />A community learning to protect
              <br />
              the world we connect to.
            </p>
            <span className="location">
              <MapPin size={14} /> Dar es Salaam, Tanzania
            </span>
          </div>
          <FooterGroup
            title="Discover"
            items={[
              ["Our story", "/about"],
              ["What we do", "/activities"],
              ["Resources", "/resources"],
              ["Gallery & news", "/gallery"],
            ]}
          />
          <FooterGroup
            title="Get involved"
            items={[
              ["Join the club", "/join"],
              ["Upcoming events", "/events"],
              ["Contact & FAQ", "/contact"],
            ]}
          />
          <FooterGroup
            title="Member access"
            items={[
              ["Sign in", "/sign-in"],
              ["Member workspace", "/member"],
              ["Admin portal", "/admin"],
            ]}
          />
        </div>
        <div className="footer-bottom">
          <span>Built by epro Tech</span>
          <span>© {new Date().getFullYear()} Cyber Club DIT</span>
          <span>
            <Globe size={13} /> A safer digital tomorrow, together.
          </span>
          <Link href="/privacy">
            Privacy & prototype information <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
function FooterGroup({ title, items }: { title: string; items: string[][] }) {
  return (
    <div className="footer-group">
      <h3>{title}</h3>
      {items.map(([name, url]) => (
        <Link href={url} key={url}>
          {name}
          <ArrowUpRight size={12} />
        </Link>
      ))}
    </div>
  );
}
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 400);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return visible ? (
    <Button
      className="back-to-top"
      size="icon"
      aria-label="Scroll to top"
      title="Back to top"
      onClick={() => {
        if (reduced) {
          const root = document.documentElement;
          const previous = root.style.scrollBehavior;
          root.style.scrollBehavior = "auto";
          window.scrollTo({ top: 0, behavior: "instant" });
          root.style.scrollBehavior = previous;
        } else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <ArrowUp size={20} />
    </Button>
  ) : null;
}
export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              y: direction === "up" ? 28 : 0,
              x: direction === "left" ? -32 : direction === "right" ? 32 : 0,
            }
      }
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -32px 0px" }}
      transition={{
        duration: reduced ? 0 : 0.65,
        delay: reduced ? 0 : Math.min(delay, 0.2),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
export function ActionLink({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link href={href} className={cn("text-link", light && "light")}>
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function PageIntro({
  tag,
  title,
  description,
  children,
}: {
  tag: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <img className="page-intro-photo" src="/images/summit/6956.webp" alt="" />
      <div className="container">
        <Reveal>
          <span className="eyebrow">
            <span className="tiny-square" />
            {tag}
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </Reveal>
        <span className="intro-watermark" aria-hidden="true">
          <ShieldCheck />
        </span>
      </div>
    </section>
  );
}
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <ShieldCheck size={30} />
      <h3>No matches yet</h3>
      <p>{text}</p>
    </div>
  );
}
export function Success({ children }: { children: React.ReactNode }) {
  return (
    <div className="success-message" role="status">
      <Check size={18} />
      <span>{children}</span>
    </div>
  );
}
export function NetworkArt({ small = false }: { small?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  return (
    <div
      ref={ref}
      className={cn("network-art", small && "small", visible && "in-view")}
      aria-hidden="true"
    >
      <svg viewBox="0 0 600 600" fill="none">
        <defs>
          <radialGradient id={small ? "orb-small" : "orb"}>
            <stop stopColor="#123f88" />
            <stop offset="1" stopColor="#061a36" />
          </radialGradient>
        </defs>
        <circle
          cx="300"
          cy="300"
          r="220"
          fill={`url(#${small ? "orb-small" : "orb"})`}
          stroke="#34649e"
          strokeWidth=".7"
        />
        {[55, 100, 145, 190, 220].map((r, i) => (
          <ellipse
            key={"v" + i}
            cx="300"
            cy="300"
            rx={r}
            ry="220"
            stroke="#4975ae"
            strokeWidth=".6"
            opacity=".5"
          />
        ))}
        {[100, 165, 210].map((r, i) => (
          <ellipse
            key={"h" + i}
            cx="300"
            cy="300"
            rx="220"
            ry={r}
            stroke="#4975ae"
            strokeWidth=".6"
            opacity=".5"
            transform={`rotate(-22 300 300)`}
          />
        ))}
        <ellipse
          cx="300"
          cy="300"
          rx="278"
          ry="130"
          stroke="#5e94e2"
          strokeWidth="1"
          transform="rotate(-30 300 300)"
        />
        <ellipse
          cx="300"
          cy="300"
          rx="260"
          ry="105"
          stroke="#4975ae"
          strokeWidth=".6"
          transform="rotate(55 300 300)"
        />
        <path
          d="M93 227 187 138 338 114 468 194 506 317 423 456 255 489 121 403 93 227 281 234 338 114M281 234 468 194M281 234 423 456M121 403 281 234 506 317M187 138 423 456M255 489 506 317"
          stroke="#6da9fa"
          strokeWidth="1"
          opacity=".75"
        />
        {[
          [93, 227],
          [187, 138],
          [338, 114],
          [468, 194],
          [506, 317],
          [423, 456],
          [255, 489],
          [121, 403],
          [281, 234],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={i === 8 ? 5 : 3.5}
              fill={i % 3 === 0 ? "#d7e68a" : "#98c4ff"}
            />
            <circle
              className="node-pulse"
              style={{ animationDelay: `${i * 0.6}s` }}
              cx={x}
              cy={y}
              r="11"
              stroke="#98c4ff"
              opacity=".25"
            />
          </g>
        ))}
        <circle className="orbit-dot" cx="300" cy="300" r="6" fill="#d7e68a" />
      </svg>
      <div className="art-label label-one">
        <span className="status-dot" /> CONNECTED BY CURIOSITY
      </div>
      <div className="art-label label-two">
        <ShieldCheck size={15} /> BUILT TO DEFEND
      </div>
      <span className="art-coordinates">06°48′ S &nbsp; 39°17′ E</span>
    </div>
  );
}


