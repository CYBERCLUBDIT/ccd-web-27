"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
const dayNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function VisitorTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let cancelled = false;
    const record = async () => {
      try {
        if (cancelled || localStorage.getItem("ccd-visit-day") === dayNow())
          return;
        let id = localStorage.getItem("ccd-visitor-id");
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem("ccd-visitor-id", id);
        }
        const response = await fetch("/api/visits", {
          method: "POST",
          headers: { "x-visitor-id": id },
          keepalive: true,
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("ccd-visit-day", data.day);
        }
      } catch {
        /* Analytics is optional when storage or the network is unavailable. */
      }
    };
    const track = () => {
      if (navigator.locks) void navigator.locks.request("ccd-visit", record);
      else void record();
    };
    track();
    // Count a new day for visitors who leave the page open overnight.
    const visible = () => {
      if (document.visibilityState === "visible") track();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", visible);
    };
  }, [pathname]);
  return null;
}
