import Link from "next/link";
import { ShieldQuestion, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared";
export default function NotFound() {
  return (
    <PublicShell>
      <section className="container not-found">
        <ShieldQuestion size={65} strokeWidth={1} />
        <span className="eyebrow">404 / A DIFFERENT TRAIL</span>
        <h1>This page is off the map.</h1>
        <p>Let’s get you back to something worth discovering.</p>
        <Button asChild>
          <Link href="/">
            Back to the club <ArrowRight size={17} />
          </Link>
        </Button>
      </section>
    </PublicShell>
  );
}
