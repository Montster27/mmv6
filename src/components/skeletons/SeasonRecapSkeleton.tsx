import { Skeleton } from "@/components/ui/skeleton"

export function SeasonRecapSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      {/* Personal recap */}
      <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
      {/* World recap */}
      <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}
