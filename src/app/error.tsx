"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="container not-found">
      <span className="eyebrow">LET’S TRY THAT AGAIN</span>
      <h1>A small interruption.</h1>
      <p>
        The page could not finish loading. You can retry or return to the
        website.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/" className="text-link mt-4">
        Back to home
      </Link>
    </main>
  );
}
