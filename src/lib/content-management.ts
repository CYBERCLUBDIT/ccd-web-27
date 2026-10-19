import type { ClubContent } from "./models";
export type ContentSummary = Omit<ClubContent, "body"> & { created_at: string };
export const contentTypes: Record<string, string> = {
  event: "Event",
  news: "News",
  resource: "Learning material",
  gallery: "Gallery photo",
  challenge: "Challenge",
  leader: "Team member",
  testimonial: "Testimonial",
};

export async function saveContent(data: Record<string, unknown>) {
  const r = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error ?? "Unable to save content.");
}
