import { Skeleton } from '@/components/ui/skeleton'

export default function CustomerLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Category pills skeleton */}
      <div className="flex gap-2 overflow-hidden">
        <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />
        <Skeleton className="h-8 w-24 rounded-full flex-shrink-0" />
        <Skeleton className="h-8 w-16 rounded-full flex-shrink-0" />
        <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />
        <Skeleton className="h-8 w-24 rounded-full flex-shrink-0" />
      </div>

      {/* Content cards skeleton */}
      <div className="flex flex-col gap-3 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-gray-100 p-3">
            <Skeleton className="h-20 w-20 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2 py-1">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
