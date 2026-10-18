import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      className="container section"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="h-8 w-44 mb-8" />
      <Skeleton className="h-20 w-3/4 mb-6" />
      <Skeleton className="h-5 w-1/2 mb-12" />
      <div className="three-grid">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 w-full" />
        ))}
      </div>
    </main>
  );
}
