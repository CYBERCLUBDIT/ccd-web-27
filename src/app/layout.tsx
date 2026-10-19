import { VisitorTracker } from "@/components/visitor-tracker";
import type { Metadata } from "next";
import { Figtree, Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/lib/theme";
import { BackToTop } from "@/components/shared";
const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});
const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});
export const metadata: Metadata = {
  title: {
    default: "Cyber Club DIT — Learn. Defend. Make an impact.",
    template: "%s | Cyber Club DIT",
  },
  description:
    "A cybersecurity community at Dar es Salaam Institute of Technology. Explore learning, guided challenges, events, and a safer digital future.",
  icons: { icon: "/club-logo.jpeg", apple: "/club-logo.jpeg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${spaceGrotesk.variable} ${outfit.variable} dark`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <BackToTop />
        <VisitorTracker />
      </body>
    </html>
  );
}
