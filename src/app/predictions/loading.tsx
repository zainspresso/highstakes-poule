import { CardSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 mb-5 border-b border-line bg-bg/90 backdrop-blur sm:top-14">
        <div className="flex gap-2 overflow-hidden px-3 py-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-16 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="mb-6 flex justify-between">
        <div>
          <Skeleton className="mb-2 h-7 w-56" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-14 w-20 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
