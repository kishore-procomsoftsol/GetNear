import { Skeleton } from '@/components/ui/skeleton'

export default function ListingLoading() {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Hero image skeleton */}
      <Skeleton className="h-56 w-full rounded-none" />

      {/* Content skeleton */}
      <div className="px-4 pt-5 pb-24 flex flex-col gap-4">
        {/* Title & rating */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-3/4 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

        {/* Info section skeleton */}
        <div className="flex flex-col gap-3 mt-2">
          <Skeleton className="h-5 w-32 rounded" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        </div>

        {/* Hours skeleton */}
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-5 w-28 rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Map skeleton */}
        <Skeleton className="h-40 w-full rounded-xl mt-2" />

        {/* Reviews skeleton */}
        <div className="flex flex-col gap-3 mt-2">
          <Skeleton className="h-5 w-24 rounded" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
