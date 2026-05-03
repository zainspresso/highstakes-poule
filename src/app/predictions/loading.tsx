import { CardSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="sticky top-[57px] z-20 -mx-4 mb-3 border-b border-white/5 bg-ink-900/85 px-4 py-2 backdrop-blur">
        <div className="flex gap-1 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-[68px] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="mb-4 flex justify-between">
        <div>
          <Skeleton className="mb-1 h-6 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-12 w-16" />
      </div>
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
