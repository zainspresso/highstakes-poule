import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="card">
        <Skeleton className="mb-2 h-3 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="card space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
