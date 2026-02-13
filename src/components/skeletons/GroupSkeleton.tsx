import { Skeleton } from "@/components/ui/skeleton"

export function GroupSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      {/* Create group card */}
      <div className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-28" />
      </div>
      {/* Join group card */}
      <div className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  )
}
