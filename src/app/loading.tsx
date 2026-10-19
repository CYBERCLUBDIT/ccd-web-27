import { LoadingFeedback } from "@/components/loading-feedback";
export default function Loading() {
  return (
    <main id="main" className="container section" aria-label="Loading page">
      <LoadingFeedback label="Getting things ready" />
    </main>
  );
}
