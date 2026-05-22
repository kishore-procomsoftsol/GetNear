import { Skeleton } from '@/components/ui/skeleton'

export default function SearchLoading() {
  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* Top bar skeleton */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl flex-shrink-0" />
        </div>

        {/* Location bar skeleton */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>

        {/* Filter pills skeleton */}
        <div className="flex items-center gap-2 mt-3 overflow-hidden">
          <Skeleton className="h-7 w-16 rounded-full flex-shrink-0" />
          <Skeleton className="h-7 w-20 rounded-full flex-shrink-0" />
          <Skeleton className="h-7 w-20 rounded-full flex-shrink-0" />
          <Skeleton className="h-7 w-16 rounded-full flex-shrink-0" />
          <Skeleton className="h-7 w-14 rounded-full flex-shrink-0" />
        </div>
      </div>

      {/* Map placeholder skeleton */}
      <div className="mx-4 mt-3">
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      {/* Results skeleton */}
      <div className="flex-1 px-4 mt-4">
        <Skeleton className="h-3 w-24 rounded mb-3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3">
              <Skeleton className="h-20 w-20 rounded-lg flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2 py-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <div className="flex items-center gap-2 mt-auto">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
