import { Skeleton } from "@/components/ui/skeleton"

export function JournalSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3"
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}
