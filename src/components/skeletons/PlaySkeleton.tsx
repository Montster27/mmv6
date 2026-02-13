import { Skeleton } from "@/components/ui/skeleton"

export function PlaySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        {/* Stage section */}
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        {/* Storylet section */}
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
      {/* Sidebar */}
      <div className="space-y-4">
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          <Skeleton className="h-5 w-20 pt-2" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-5 w-16 pt-2" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
